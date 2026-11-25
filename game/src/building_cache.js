// Retain nearby building views by estimated RGBA bytes. A view used by either
// drawing pass stays alive until the frame has finished using its canvases.
const BuildingCache = (() => {
  function create(budgetBytes) {
    if (!Number.isSafeInteger(budgetBytes) || budgetBytes < 0) throw new RangeError('Invalid building cache budget');
    const entries = new Map(), references = new Map(), retired = [];
    let bytes = 0, version, frame = null;

    function release(entry) {
      for (const canvas of entry.canvases) {
        const ref = references.get(canvas);
        if (--ref.count) continue;
        references.delete(canvas);
        bytes -= ref.bytes;
        canvas.width = canvas.height = 0;
      }
    }

    function detach(owner) {
      entries.delete(owner);
      owner.view = null;
      owner.viewVersion = null;
    }

    function get(owner, nextVersion, factory) {
      if (version !== nextVersion) {
        for (const [oldOwner, entry] of entries) {
          detach(oldOwner);
          if (frame) retired.push(entry);
          else release(entry);
        }
        version = nextVersion;
      }

      let entry = entries.get(owner);
      if (entry) {
        // Move a hit to the most recent end without replacing its canvases.
        entries.delete(owner);
      } else {
        const view = factory();
        const canvases = new Set([view.floor, view.roof,
          ...view.walls.map(layer => layer.image), ...(view.upperWalls || []).map(layer => layer.image),
          ...view.furniture.map(layer => layer.image)]);
        for (const canvas of canvases) {
          let ref = references.get(canvas);
          if (!ref) {
            ref = { bytes: canvas.width * canvas.height * 4, count: 0 };
            references.set(canvas, ref);
            bytes += ref.bytes;
          }
          ref.count++;
        }
        entry = { view, canvases };
        owner.view = view;
        owner.viewVersion = version;
      }
      entry.frame = frame;
      entries.set(owner, entry);
      return entry.view;
    }

    function beginFrame() {
      if (frame) throw new Error('Building cache frame already active');
      frame = {};
    }

    function endFrame() {
      if (!frame) return;
      for (const entry of retired) release(entry);
      retired.length = 0;
      for (const [owner, entry] of entries) {
        if (bytes <= budgetBytes) break;
        if (entry.frame === frame) continue;
        detach(owner);
        release(entry);
      }
      frame = null;
    }

    const stats = () => ({ budgetBytes, bytes, views: entries.size, canvases: references.size });
    return { get, beginFrame, endFrame, stats };
  }

  return { create };
})();

if (typeof module !== 'undefined') module.exports = BuildingCache;
