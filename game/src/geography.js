const Geography = (() => {
  // Coordinates from the northwest corner in 16px world tiles.
  const size = Object.freeze([768, 1152]);
  const [width, height] = size;
  const tuples = rows => Object.freeze(rows.map(row => row && Object.freeze(row)));
  const towns = tuples([null, [320, 930], [640, 1020], [570, 770], [350, 700],
    [100, 520], [610, 430], [640, 150], [330, 200]]);
  const mainland = [1, 3, 4, 6, 7, 8];
  const roadLinks = tuples([[1, 4], [1, 3], [3, 4], [3, 6], [4, 8], [4, 6], [6, 7], [6, 8], [7, 8]]);

  // Town footprints include service yards. Aldermoot's walls fit its dry rectangle.
  const cities = tuples(towns.map((town, r) => {
    if (!town) return null;
    const [x, y] = town;
    return r === 8 ? [x - 80, y - 65, x + 80, y + 65] : [x - 26, y - 21, x + 26, y + 14];
  }));
  const city = r => cities[r] || null;
  function inTown(x, y, pad = 0) {
    for (let r = 1; r < cities.length; r++) {
      const [x0, y0, x1, y1] = cities[r];
      if (x >= x0 - pad && y >= y0 - pad && x <= x1 + pad && y <= y1 + pad) return r;
    }
    return 0;
  }

  // Authored coastal bends, in clockwise order. Large inlets are part of the
  // outline, so coast variation never creates an arbitrary border of water.
  const outlines = [
    { id: 1, points: [
      [236, 165], [232, 113], [264, 81], [318, 83], [365, 48], [413, 65],
      [451, 96], [486, 94], [528, 60], [570, 54], [596, 92], [627, 101],
      [669, 81], [705, 121], [711, 179], [678, 222], [683, 266], [646, 296],
      [660, 330], [714, 347], [720, 401], [703, 451], [675, 484], [683, 526],
      [653, 567], [661, 615], [714, 635], [721, 680], [685, 727], [688, 767],
      [663, 805], [631, 821], [627, 859], [577, 884], [554, 855], [522, 876],
      [503, 917], [468, 939], [470, 978], [445, 1004], [447, 1034], [404, 1071],
      [349, 1067], [305, 1038], [281, 999], [274, 970], [254, 949], [257, 926],
      [229, 904], [211, 874], [233, 843], [228, 800], [248, 768], [233, 743],
      [209, 706], [222, 651], [256, 631], [276, 593], [257, 555], [270, 522],
      [251, 491], [218, 477], [221, 442], [207, 408], [226, 380], [262, 388],
      [283, 356], [255, 332], [231, 322], [218, 290], [234, 261], [220, 231],
      [225, 202],
    ] },
    { id: 2, points: [
      [592, 949], [620, 931], [656, 939], [672, 929], [704, 950], [723, 977],
      [714, 1001], [739, 1030], [723, 1054], [725, 1081], [688, 1100],
      [660, 1114], [631, 1093], [599, 1101], [565, 1081], [572, 1056],
      [544, 1032], [553, 1008], [576, 992], [565, 964],
    ] },
    { id: 5, points: [
      [54, 429], [77, 403], [106, 384], [137, 409], [161, 416], [178, 448],
      [169, 485], [187, 513], [178, 552], [154, 580], [170, 611], [134, 644],
      [98, 650], [68, 631], [54, 607], [28, 591], [23, 548], [39, 516],
      [25, 488], [27, 457],
    ] },
    { id: 9, points: [[164, 234], [176, 228], [188, 240], [178, 249], [166, 244]] },
    { id: 10, points: [[171, 266], [185, 260], [192, 273], [184, 285], [174, 279]] },
    { id: 11, points: [[177, 818], [187, 809], [201, 823], [188, 833], [178, 828]] },
    { id: 12, points: [[511, 1051], [525, 1042], [536, 1055], [526, 1072], [513, 1064]] },
    { id: 13, points: [[698, 859], [711, 849], [725, 861], [718, 878], [702, 871]] },
    { id: 14, points: [[487, 50], [500, 44], [506, 52], [498, 63], [489, 57]] },
  ];

  // These coordinates are on the land side of each landing. The scene owns
  // the pier footprint, walkable gangway, and the ship's route through water.
  const landing = (region, landmass, tile) => Object.freeze({ region, landmass, tile: Object.freeze(tile) });
  const ferries = Object.freeze([
    { id: 'tallyport-brackwater', from: landing(1, 1, [261, 949]), to: landing(2, 2, [559, 1022]) },
    { id: 'brackwater-haverly', from: landing(2, 2, [622, 940]), to: landing(3, 1, [614, 865]) },
    { id: 'four-fords-cinderwick', from: landing(4, 1, [222, 708]), to: landing(5, 5, [161, 608]) },
    { id: 'cinderwick-aldermoot', from: landing(5, 5, [152, 428]), to: landing(8, 1, [229, 298]) },
  ].map(Object.freeze));

  // A closed spline rounds the large turns. Small waves displace the perimeter
  // in tile units to give the shore a mix of long slopes and short irregularities.
  function shore(points, scale) {
    const line = [];
    const n = points.length;
    const curve = (a, b, c, d, t) => b + t * ((c - a) + t * ((2 * a - 5 * b + 4 * c - d) + t * (-a + 3 * b - 3 * c + d))) / 2;
    for (let i = 0; i < n; i++) {
      const a = points[(i + n - 1) % n], b = points[i], c = points[(i + 1) % n], d = points[(i + 2) % n];
      const steps = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 2);
      for (let j = 0; j < steps; j++) {
        const t = j / steps, x = curve(a[0], b[0], c[0], d[0], t), y = curve(a[1], b[1], c[1], d[1], t);
        const dx = 3.2 * Math.sin(y / 13 + x / 37) + 1.3 * Math.sin((x + y) / 4.4);
        const dy = 3.6 * Math.sin(x / 15 - y / 47) + 1.2 * Math.sin((x - y) / 5.1);
        line.push([x + dx * scale, y + dy * scale]);
      }
    }
    return line;
  }

  // Rasterize tile centers with a half-open scanline rule. The private mask is
  // reused by collision, terrain and map consumers and costs one byte per tile.
  function compile() {
    const mask = new Uint8Array(width * height);
    for (const { id, points } of outlines) {
      const rows = Array.from({ length: height }, () => []);
      const line = shore(points, id > 8 ? .35 : 1);
      for (let i = 0; i < line.length; i++) {
        const [ax, ay] = line[i], [bx, by] = line[(i + 1) % line.length];
        const start = Math.max(0, Math.ceil(Math.min(ay, by) - .5));
        const end = Math.min(height, Math.ceil(Math.max(ay, by) - .5));
        for (let y = start; y < end; y++) rows[y].push(ax + (y + .5 - ay) * (bx - ax) / (by - ay));
      }
      for (let y = 0; y < height; y++) {
        const row = rows[y].sort((a, b) => a - b), offset = y * width;
        for (let j = 0; j < row.length; j += 2) {
          const start = Math.max(0, Math.ceil(row[j] - .5));
          const end = Math.min(width, Math.ceil(row[j + 1] - .5));
          mask.fill(id, offset + start, offset + end);
        }
      }
    }
    return mask;
  }
  let mask;
  const inBounds = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
  function landmass(x, y) {
    if (!inBounds(x, y)) return 0;
    if (!mask) mask = compile();
    return mask[Math.floor(y) * width + Math.floor(x)];
  }
  const land = (x, y) => landmass(x, y) !== 0;

  // Water and skerries use the nearest mainland region for local palette and
  // fishing context. Only an inhabited island uses its island region ID.
  function region(x, y) {
    if (!inBounds(x, y)) return 0;
    const mass = landmass(x, y);
    if (mass === 2 || mass === 5) return mass;
    let best = Infinity, result = 0;
    for (const r of mainland) {
      const [tx, ty] = towns[r];
      const d = (x - tx) ** 2 + (y - ty) ** 2;
      if (d < best) { best = d; result = r; }
    }
    return result;
  }
  return { size, towns, city, inTown, roadLinks, ferries, landmass, land, region };
})();

if (typeof module !== 'undefined') module.exports = Geography;
