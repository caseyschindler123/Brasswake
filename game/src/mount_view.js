/* Compose the painted horse, its rider, and its directional overlap. */
const MountView = (() => {
  // Scene facing order is S, SW, W, NW, N, NE, E, SE.
  const directions = [0, 1, 5, 3, 4, 3, 2, 1];
  const mirrored = [false, true, false, true, false, false, false, false];
  const headings = [0, -.8, -1, -.7, 0, .7, 1, .8];
  const stances = [
    [[-18, 17], [18, 17]], [[-14, 21]], [[-12, 24]], [[0, 24]],
    [[-18, 17], [18, 17]], [[0, 24]], [[12, 24]], [[14, 21]],
  ];
  const lifts = [1, 0, -1, -2, 1, 0, -1, -2];
  const riderRise = 58;
  const standingFrames = new WeakMap();
  const riderFrames = new WeakMap();
  let image;

  function preload() {
    if (!image && typeof Image !== 'undefined') {
      image = new Image();
      image.src = 'art/' + MountArt.image;
    }
    return image;
  }

  function ready() {
    const atlas = preload();
    return atlas?.complete && atlas.naturalWidth > 0;
  }

  function pose({ direction, distance, moving, running } = {}) {
    const facing = Number.isInteger(direction) && direction >= 0 && direction < 8 ? direction : 0;
    const stride = running ? 2.9 : 1.65;
    const parts = lifts.length;
    const travelled = Number.isFinite(distance) && distance > 0 ? distance : 0;
    const phase = moving ? Math.floor((travelled % stride) / stride * parts) : -1;
    return {
      facing, row: directions[facing], flip: mirrored[facing], column: phase + 1,
      lift: phase < 0 ? 0 : lifts[phase], lean: moving && running ? 1.5 * headings[facing] : 0,
    };
  }

  function newFrame(withRider = false) {
    const canvas = document.createElement('canvas');
    const [width, height] = MountArt.size;
    canvas.width = width;
    canvas.height = height + (withRider ? riderRise : 0);
    canvas.hr = 1;
    [canvas.originX, canvas.originY] = MountArt.origin;
    if (withRider) canvas.originY += riderRise;
    return canvas;
  }

  function horseLayer(g, { column, row, flip }, y) {
    const [width, height] = MountArt.size;
    g.save();
    if (flip) {
      g.translate(width, 0);
      g.scale(-1, 1);
    }
    g.drawImage(image, column * width, row * height, width, height, 0, y, width, height);
    g.restore();
  }

  function standing(direction) {
    if (!ready()) return null;
    const position = pose({ direction });
    let frames = standingFrames.get(image);
    if (!frames) standingFrames.set(image, frames = []);
    if (!frames[position.facing]) {
      const canvas = newFrame();
      horseLayer(canvas.getContext('2d'), position, 0);
      frames[position.facing] = canvas;
    }
    return frames[position.facing];
  }

  function shadow(g, x, y, facing) {
    const heading = facing * Math.PI / 4 + Math.PI / 2;
    g.save();
    g.translate(x, y + 3);
    g.scale(1, .46);
    g.rotate(heading);
    for (const [radiusX, radiusY, alpha] of [[39, 17, .12], [34, 13, .16]]) {
      g.fillStyle = `rgba(21,17,15,${alpha})`;
      g.beginPath();
      g.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI);
      g.fill();
    }
    g.restore();
  }

  function leg(g, rider, hipY, originX, x, y, foot, source, dual) {
    const [shift, length] = foot, [footX, footY] = source;
    const halfWidth = Math.max(4, Math.round((rider.anchor?.[2] || 9) * .48));
    const start = originX + (dual ? Math.sign(shift) * halfWidth : shift * .2);
    const bottom = Math.min(rider.height - 1, Math.ceil(footY + halfWidth));
    for (let row = 0; row < length; row++) {
      const progress = row / (length - 1);
      const bend = shift * (progress < .55 ? progress / .55 : 1 - (progress - .55) * .56);
      const center = start + (footX - start) * progress;
      const left = Math.max(0, Math.round(center - halfWidth));
      const width = Math.min(rider.width - left, halfWidth * 2);
      const sourceY = Math.round(hipY + (bottom - hipY) * progress);
      g.drawImage(rider, left, sourceY, width, 1,
        Math.round(x + bend + start - originX - halfWidth), y + row, width, 1);
    }
  }

  function compose(rider, position) {
    const canvas = newFrame(true), g = canvas.getContext('2d');
    const { facing, row, flip, lift, lean } = position;
    const [saddleX, saddleY] = MountArt.saddles[row];
    const groundX = canvas.originX;
    const x = (flip ? canvas.width - saddleX : saddleX);
    const y = saddleY + riderRise + lift;
    const [headY, headX, headWidth] = rider.anchor || [0, rider.width / 2, 9];
    const groundY = Math.min(rider.height - 1, rider.originY ?? rider.height - 1);
    const hipY = Math.max(1, Math.min(rider.height - 1, Math.round(headY + (groundY - headY) * .58)));
    const originX = Math.round(rider.originX ?? rider.width / 2);
    const upperX = Math.round(x - originX + lean);
    const upperY = y - hipY;

    shadow(g, groundX, canvas.originY, facing);
    horseLayer(g, position, riderRise + lift);
    const feet = stances[facing];
    const lower = (rider.feet?.length === 2 ? rider.feet : [[originX - 4, groundY], [originX + 4, groundY]]).slice();
    const dual = feet.length === 2;
    lower.sort((a, b) => dual ? a[0] - b[0] : b[1] - a[1]);
    for (let i = 0; i < feet.length; i++) leg(g, rider, hipY, originX, x, y, feet[i], lower[i], dual);
    g.drawImage(rider, 0, 0, rider.width, hipY, upperX, upperY, rider.width, hipY);
    horseLayer(g, { ...position, column: MountArt.frames + 1 }, riderRise + lift);
    canvas.anchor = [headY + upperY, headX + upperX, headWidth];
    return canvas;
  }

  function frame(rider, options) {
    if (!rider || rider.height < 2 || !ready()) return null;
    const position = pose(options);
    let frames = riderFrames.get(rider);
    if (!frames) riderFrames.set(rider, frames = new Map());
    const key = `${position.facing}:${position.column}:${position.lean}`;
    let canvas = frames.get(key);
    if (!canvas) {
      canvas = compose(rider, position);
      frames.set(key, canvas);
      if (frames.size > 17) frames.delete(frames.keys().next().value);
    }
    return canvas;
  }

  return { preload, pose, standing, frame };
})();
if (typeof module !== 'undefined') module.exports = MountView;
