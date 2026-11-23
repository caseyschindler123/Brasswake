/* Cardinal surface paths. A ferry is an explicit graph edge between two dry boarding tiles. */
const Navigation = (() => {
  const distance = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

  function create(width, height, walkable) {
    const size = width * height;
    // Reuse search memory; short local routes never need to clear the whole world.
    const generation = new Uint32Array(size), previous = new Int32Array(size), cost = new Uint32Array(size);
    let search = 0;
    const valid = at => Array.isArray(at) && Number.isInteger(at[0]) && Number.isInteger(at[1])
      && at[0] >= 0 && at[1] >= 0 && at[0] < width && at[1] < height;
    const index = at => at[1] * width + at[0];

    function route(start, goal, ferries = [], limit = size) {
      if (!valid(start) || !valid(goal) || !walkable(...start) || !walkable(...goal)) return null;
      const endpoints = [], crossings = new Map();
      for (const ferry of ferries) {
        if (![ferry.from, ferry.to].every(p => valid(p) && walkable(...p))) continue;
        for (const side of ['from', 'to']) {
          const at = ferry[side], other = ferry[side === 'from' ? 'to' : 'from'];
          endpoints.push(at);
          const id = index(at);
          if (!crossings.has(id)) crossings.set(id, []);
          crossings.get(id).push({ to: index(other), route: ferry.id, side });
        }
      }
      // Distances in the small obstacle-free graph are admissible, also across multiple ferries.
      const lower = endpoints.map((p, i) => endpoints.map((q, j) => j === (i ^ 1) ? 1 : distance(p, q)));
      for (let k = 0; k < endpoints.length; k++)
        for (let i = 0; i < endpoints.length; i++)
          for (let j = 0; j < endpoints.length; j++) lower[i][j] = Math.min(lower[i][j], lower[i][k] + lower[k][j]);
      const toGoal = endpoints.map((_, i) => Math.min(...endpoints.map((p, j) => lower[i][j] + distance(p, goal))));
      const estimate = (x, y) => {
        let best = Math.abs(x - goal[0]) + Math.abs(y - goal[1]);
        for (let i = 0; i < endpoints.length; i++) best = Math.min(best,
          Math.abs(x - endpoints[i][0]) + Math.abs(y - endpoints[i][1]) + toGoal[i]);
        return best;
      };
      const heap = [], earlier = (a, b) => a.f < b.f || (a.f === b.f && a.g > b.g);
      function push(node) {
        let i = heap.length;
        heap.push(node);
        while (i > 0) {
          const parent = (i - 1) >> 1;
          if (!earlier(node, heap[parent])) break;
          heap[i] = heap[parent]; i = parent;
        }
        heap[i] = node;
      }
      function pop() {
        const first = heap[0], last = heap.pop();
        if (!heap.length) return first;
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let child = i * 2 + 1;
          if (child + 1 < heap.length && earlier(heap[child + 1], heap[child])) child++;
          if (!earlier(heap[child], last)) break;
          heap[i] = heap[child]; i = child;
        }
        heap[i] = last;
        return first;
      }

      if (++search >= 0xffffffff) { generation.fill(0); search = 1; }
      const startId = index(start), endId = index(goal), usedCrossing = new Map();
      generation[startId] = search; cost[startId] = 0; previous[startId] = -1;
      push({ id: startId, f: estimate(...start), g: 0 });
      let expanded = 0;
      while (heap.length && expanded < Math.min(size, limit)) {
        const node = pop(), id = node.id;
        if (node.g !== cost[id]) continue;
        expanded++;
        if (id === endId) {
          let boarding = null;
          const path = [];
          for (let at = id; at >= 0; at = previous[at]) {
            const edge = usedCrossing.get(at);
            if (edge) {
              boarding = { route: edge.route, side: edge.side };
              path.length = 0;
            } else path.push([at % width, Math.floor(at / width)]);
          }
          path.reverse();
          return { path, boarding, distance: cost[id] };
        }
        const x = id % width, y = Math.floor(id / width), step = node.g + 1;
        function visit(nx, ny, edge) {
          const ni = ny * width + nx;
          if ((generation[ni] === search && cost[ni] <= step) || !walkable(nx, ny)) return;
          generation[ni] = search; cost[ni] = step; previous[ni] = id;
          if (edge) usedCrossing.set(ni, edge);
          else if (usedCrossing.has(ni)) usedCrossing.delete(ni);
          push({ id: ni, f: step + estimate(nx, ny), g: step });
        }
        if (x > 0) visit(x - 1, y);
        if (x + 1 < width) visit(x + 1, y);
        if (y > 0) visit(x, y - 1);
        if (y + 1 < height) visit(x, y + 1);
        for (const edge of crossings.get(id) || []) visit(edge.to % width, Math.floor(edge.to / width), edge);
      }
      return null;
    }
    return { route };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = Navigation;
