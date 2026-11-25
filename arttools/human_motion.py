"""Rebuild the game locomotion poses from pinned CMU ASF/AMC downloads.

From the repository root: python -I arttools/human_motion.py
Use --check to compare the generated data without rewriting it.
"""

import argparse
import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
import re
from statistics import median
from urllib.parse import urlsplit
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "arttools" / "human_motion_sources.json"
CACHE = ROOT / "work" / "human-motion-source"
OUTPUT = ROOT / "game" / "src" / "human_motion_data.js"
IDENTITY = ((1, 0, 0), (0, 1, 0), (0, 0, 1))


@dataclass(frozen=True)
class Bone:
    offset: tuple
    axes: tuple
    axes_inverse: tuple
    dof: str


def load_source(spec):
    filename = Path(urlsplit(spec["url"]).path).name
    path = CACHE / filename
    cached = path.is_file()
    if cached:
        data = path.read_bytes()
    else:
        with urlopen(spec["url"], timeout=30) as response:
            data = response.read()
    if hashlib.sha256(data).hexdigest() != spec["sha256"]:
        raise ValueError(f"SHA-256 mismatch for {path if cached else spec['url']}")
    if not cached:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return data.decode("ascii")


def product(a, b):
    return tuple(tuple(sum(x * y for x, y in zip(row, col)) for col in zip(*b)) for row in a)


def rotate(matrix, vector):
    return tuple(sum(x * y for x, y in zip(row, vector)) for row in matrix)


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def subtract(a, b):
    return tuple(x - y for x, y in zip(a, b))


def rotation(axes, angles):
    result = IDENTITY
    for axis, angle in zip(axes, angles):
        radians = math.radians(angle)
        c, s = math.cos(radians), math.sin(radians)
        turns = {
            "X": ((1, 0, 0), (0, c, -s), (0, s, c)),
            "Y": ((c, 0, s), (0, 1, 0), (-s, 0, c)),
            "Z": ((c, -s, 0), (s, c, 0), (0, 0, 1)),
        }
        result = product(turns[axis], result)
    return result


def read_skeleton(source):
    # This converter targets the pinned subject's ASF, which has a zero root
    # position/orientation and translates XYZ before the XYZ angle channels.
    root, bone_data = source.split(":root", 1)[1].split(":bonedata", 1)
    root_fields = {parts[0]: " ".join(parts[1:]) for line in root.splitlines() if (parts := line.split())}
    if root_fields != {
        "order": "TX TY TZ RX RY RZ", "axis": "XYZ",
        "position": "0 0 0", "orientation": "0 0 0",
    }:
        raise ValueError("Unexpected ASF root channel layout")
    bonedata, hierarchy = bone_data.split(":hierarchy", 1)
    bones = {}
    for block in re.findall(r"\bbegin\b(.*?)\bend\b", bonedata, re.DOTALL):
        fields = {parts[0]: parts[1:] for line in block.splitlines() if (parts := line.split())}
        name = fields["name"][0]
        length = float(fields["length"][0])
        direction = tuple(float(value) * length for value in fields["direction"])
        axis_x, axis_y, axis_z, order = fields["axis"]
        basis = rotation(order, map(float, (axis_x, axis_y, axis_z)))
        dof = "".join(channel[1].upper() for channel in fields.get("dof", ()))
        bones[name] = Bone(direction, basis, tuple(zip(*basis)), dof)
    parents = {}
    for line in hierarchy.splitlines():
        fields = line.split()
        if len(fields) > 1:
            parent, *children = fields
            parents.update((child, parent) for child in children)
    if parents.keys() != bones.keys():
        raise ValueError("ASF hierarchy and bone definitions disagree")
    return bones, parents


def read_clip(source, bones):
    if ":DEGREES" not in source or ":FULLY-SPECIFIED" not in source:
        raise ValueError("Expected fully specified AMC degree channels")
    frames = []
    for line in source.splitlines():
        fields = line.split()
        if not fields or fields[0].startswith(("#", ":")):
            continue
        name, *channels = fields
        if name.isdecimal():
            if int(name) != len(frames) + 1:
                raise ValueError("AMC frames are not consecutive")
            frames.append({})
        else:
            frames[-1][name] = tuple(map(float, channels))
    channel_counts = {"root": 6, **{name: len(bone.dof) for name, bone in bones.items() if bone.dof}}
    if not frames or any({name: len(values) for name, values in frame.items()} != channel_counts for frame in frames):
        raise ValueError("AMC channels do not match the ASF skeleton")
    return frames


def endpoints(bones, parents, channels):
    root = channels.get("root", (0,) * 6)
    orientations = {"root": rotation("XYZ", root[3:])}
    joints = {"root": root[:3]}
    for name, parent in parents.items():
        bone = bones[name]
        motion = rotation(bone.dof, channels.get(name, ()))
        local = product(product(bone.axes, motion), bone.axes_inverse)
        orientations[name] = product(orientations[parent], local)
        joints[name] = add(joints[parent], rotate(orientations[name], bone.offset))
    return joints


def signed_angle(to_angle, from_angle):
    return (to_angle - from_angle + 180) % 360 - 180


def interpolate_channels(first, second, fraction, seam, correction):
    result = {}
    for name, channels in first.items():
        values = []
        for index, a in enumerate(channels):
            b = second[name][index]
            if name == "root" and index < 3:
                values.append(a + fraction * (b - a))
            else:
                value = a + fraction * signed_angle(b, a)
                values.append(value - correction * seam[name][index])
        result[name] = values
    return result


def contact_points(joints, side):
    ankle = joints[side + "tibia"]
    ball = joints[side + "foot"]
    toe = joints[side + "toes"]
    # The ASF ends the tibia at the ankle and the foot bone at the ball.
    # Estimate a heel ahead of contact detection by following the reverse foot axis.
    heel = add(ankle, tuple(-0.25 * component for component in subtract(ball, ankle)))
    return heel, ball, toe


def stance_windows(world, period, scale, fps):
    # World poses include two neighbouring samples on each side for the
    # velocity estimate, even when contact spans a loop boundary.
    start, repeat = 2, 2 + period
    traces = {}
    for side in ("l", "r"):
        traces[side] = [contact_points(pose, side) for pose in world]
    ground = median(sorted(min(point[1] for point in pose) for trace in traces.values()
                           for pose in trace[start:repeat])[:max(1, (repeat - start) // 5)])
    windows = {}
    for side, trace in traces.items():
        scores = []
        for index in range(start, repeat):
            point_scores = []
            for segment, point in enumerate(trace[index]):
                before = trace[index - 2][segment]
                after = trace[index + 2][segment]
                speed = math.dist(before, after) * scale * fps / 4
                height = max(0, (point[1] - ground) * scale)
                # Low, slow points indicate contact. Prefer the ball/heel
                # estimates when the toe motion is noisy.
                point_scores.append(1 - (height / 0.065) ** 2 - (speed / 1.25) ** 2
                                    - (0.12 if segment == 2 else 0))
            scores.append(max(point_scores))
        smoothed = [sum(scores[(i + offset) % period] for offset in (-2, -1, 0, 1, 2)) / 5
                    for i in range(period)]
        center = max(range(period), key=lambda i: smoothed[i])
        if smoothed[center] <= 0:
            raise ValueError(f"No captured stance for {side} foot")
        first = last = center
        while first > center - period + 1 and smoothed[(first - 1) % period] > 0:
            first -= 1
        while last - first < period - 1 and smoothed[(last + 1) % period] > 0:
            last += 1
        windows[side] = (first % period, last - first + 1)
    return ground, windows


def convert_clip(label, spec, frames, bones, parents, rest_hip_height, scale, fps, frame_count):
    start = spec["sourceStartFrame"] - 1
    repeat = spec["sourceRepeatFrame"] - 1
    if not 2 <= start < repeat <= len(frames) - 2:
        raise ValueError("Clip has insufficient frames around its cycle boundary")
    period = repeat - start
    world = [endpoints(bones, parents, channels) for channels in frames[start - 2:repeat + 2]]
    ground, windows = stance_windows(world, period, scale, fps)
    initial, terminal = world[2], world[-2]
    dx, dy, dz = subtract(terminal["root"], initial["root"])
    distance = math.hypot(dx, dz)
    if distance <= 0:
        raise ValueError("Expected a forward-travelling clip")
    forward_x, forward_z = dx / distance, dz / distance
    # The source subject's anatomical left points toward CMU +X. Output +X
    # is the anatomical right, so flip the transverse coordinate after heading alignment.
    def align(joints, phase):
        start_x, _, start_z = initial["root"]
        linear_root = (start_x + dx * phase, ground + dy * phase, start_z + dz * phase)
        result = {}
        for name, joint in joints.items():
            x, y, z = subtract(joint, linear_root)
            result[name] = (
                (z * forward_x - x * forward_z) * scale,
                y * scale,
                (x * forward_x + z * forward_z) * scale,
            )
        return result

    seam_a, seam_b = align(initial, 0), align(terminal, 1)
    seam_rms = math.sqrt(sum(math.dist(seam_a[name], seam_b[name]) ** 2 for name in seam_a) / len(seam_a))
    if seam_rms > 0.08:
        raise ValueError(f"Captured loop endpoint mismatch is {seam_rms:.3f} m RMS")
    now, end = frames[start], frames[repeat]
    seam = {name: [signed_angle(b, a) for a, b in zip(values, end[name])] for name, values in now.items()}
    poses = []
    for index in range(frame_count + 1):
        phase = index / frame_count
        offset = phase * period
        lower = math.floor(offset)
        before = frames[start + lower]
        after = frames[start + lower + 1]
        # Close the seam in joint-angle space to preserve every bone length.
        correction = phase * phase * (3 - 2 * phase)
        channels = interpolate_channels(before, after, offset - lower, seam, correction)
        joints = align(endpoints(bones, parents, channels), phase)
        contacts = {}
        for foot in ("left", "right"):
            first, length = windows[foot[0]]
            contacts[foot] = (offset - first) % period < length
        poses.append({"joints": joints, "contacts": contacts})
    verify_poses(poses, bones, parents, scale, distance * scale, label, rest_hip_height)
    for pose in poses:
        pose["joints"] = {name: [round(value, 6) or 0 for value in coords]
                          for name, coords in pose["joints"].items()}
    return {
        "cadence": spec["cadence"],
        "stride": round(distance * scale, 6),
        "sourceStartFrame": spec["sourceStartFrame"],
        "sourceRepeatFrame": spec["sourceRepeatFrame"],
        "sourceCadence": round(120 * fps / period, 3),
        "sourceLoopRms": round(seam_rms, 6),
        "frames": poses[:-1],
    }


def verify_poses(poses, bones, parents, scale, stride, label, rest_hip_height):
    period = len(poses) - 1
    for pose in poses:
        joints = pose["joints"]
        for name, point in joints.items():
            if not all(math.isfinite(value) for value in point):
                raise ValueError(f"Non-finite coordinate at {name}")
        for name, parent in parents.items():
            actual = math.dist(joints[name], joints[parent])
            expected = math.hypot(*bones[name].offset) * scale
            if abs(actual - expected) > 1e-8:
                raise ValueError(f"Bone length changed at {name}")
    for name in poses[0]["joints"]:
        before, last, first, after = (poses[i]["joints"][name] for i in (-3, -2, 0, 1))
        if math.dist(first, poses[-1]["joints"][name]) > 1e-8:
            raise ValueError(f"Loop seam did not close at {name}")
        adjacent = max(math.dist(before, last), math.dist(first, after))
        if math.dist(last, first) > adjacent * 1.5 + 0.002:
            raise ValueError(f"Loop seam jumps at {name}")
    if not math.isfinite(stride) or not 0.8 < stride < 3.5:
        raise ValueError(f"Unexpected normalized stride of {stride:.3f} m")
    if not all(0.7 < pose["joints"]["root"][1] / rest_hip_height < 1.3 for pose in poses):
        raise ValueError("Root height left the expected range")
    onset = {}
    for side in ("left", "right"):
        flags = [pose["contacts"][side] for pose in poses[:-1]]
        starts = [i for i, flag in enumerate(flags) if flag and not flags[i - 1]]
        if len(starts) != 1 or not 0.14 < sum(flags) / period < 0.72:
            raise ValueError(f"Expected one contiguous stance for the {side} foot, got {sum(flags)}/{period}: {starts}")
        onset[side] = starts[0]
    if not 0.38 < (onset["right"] - onset["left"]) % period / period < 0.62:
        raise ValueError(f"Contact onsets do not alternate at half-stride spacing: {onset}")
    airborne = sum(not any(pose["contacts"].values()) for pose in poses[:-1])
    double_support = sum(all(pose["contacts"].values()) for pose in poses[:-1])
    if label == "walk" and (airborne or not double_support):
        raise ValueError("Expected continuous ground contact and double support in the walking capture")
    if label == "run" and (not airborne or double_support):
        raise ValueError("Expected running flight without double support")


def serialize(data, acknowledgment):
    # Keep one pose per line for a compact file and readable diffs.
    header = {key: value for key, value in data.items() if key not in ("walk", "run")}
    lines = [
        "// Generated by arttools/human_motion.py. Do not edit by hand.",
        "// " + acknowledgment,
        "const HumanMotionData = " + json.dumps(header, ensure_ascii=True)[:-1] + ",",
    ]
    for name in ("walk", "run"):
        clip = data[name]
        details = {key: value for key, value in clip.items() if key != "frames"}
        lines.append(f'  "{name}": ' + json.dumps(details)[:-1] + ', "frames": [')
        lines.append(",\n".join("    " + json.dumps(frame, separators=(",", ":"), allow_nan=False)
                                 for frame in clip["frames"]))
        lines.append("  ]}" + ("," if name == "walk" else ""))
    lines.append("};\n")
    return "\n".join(lines).encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify generated data without rewriting it")
    args = parser.parse_args()
    source = json.loads(MANIFEST.read_text(encoding="utf-8"))
    bones, parents = read_skeleton(load_source(source["skeleton"]))
    rest = endpoints(bones, parents, {})
    rest_ground = min(rest["ltoes"][1], rest["rtoes"][1])
    scale = source["height"] / (rest["head"][1] - rest_ground)
    rest_hip_height = -rest_ground * scale
    data = {
        "version": 1,
        "axes": "x-right,y-up,z-forward",
        "height": source["height"],
        "captureFps": source["captureFps"],
        "skeleton": {"parents": parents},
    }
    for label, spec in source["clips"].items():
        data[label] = convert_clip(label, spec, read_clip(load_source(spec), bones), bones, parents,
                                   rest_hip_height, scale, source["captureFps"], source["framesPerCycle"])
        clip = data[label]
        print(f"{label}: {len(clip['frames'])} poses, {clip['stride']:.3f} m stride, "
              f"{clip['sourceLoopRms']:.3f} m source seam RMS")
    payload = serialize(data, source["acknowledgment"])
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_bytes() != payload:
            parser.exit(1, f"Generated motion differs from {OUTPUT}\n")
    else:
        OUTPUT.write_bytes(payload)


if __name__ == "__main__":
    main()
