/* ===== WORLD: the Brasswake Trading Company ledger (deterministic seed data) ===== */
const World = (() => {
  const TODAY = '2026-06-30';
  const SCHEMA = `
CREATE TABLE employees (employee_id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, manager_id INTEGER, hire_date TEXT NOT NULL, salary REAL NOT NULL);
CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, region TEXT NOT NULL, tier TEXT NOT NULL, credit_limit REAL NOT NULL, joined_date TEXT NOT NULL, rep_id INTEGER);
CREATE TABLE vendors (vendor_id INTEGER PRIMARY KEY, name TEXT NOT NULL, realm TEXT NOT NULL, lead_time_days INTEGER NOT NULL, rating INTEGER NOT NULL);
CREATE TABLE items (item_id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, unit_cost REAL NOT NULL, unit_price REAL NOT NULL, stock_qty INTEGER NOT NULL, reorder_point INTEGER NOT NULL, vendor_id INTEGER NOT NULL, discontinued INTEGER NOT NULL DEFAULT 0);
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, order_date TEXT NOT NULL, status TEXT NOT NULL, rep_id INTEGER NOT NULL);
CREATE TABLE order_lines (order_id INTEGER NOT NULL, line_no INTEGER NOT NULL, item_id INTEGER NOT NULL, qty INTEGER NOT NULL, unit_price REAL NOT NULL, discount REAL NOT NULL DEFAULT 0, PRIMARY KEY (order_id, line_no));
CREATE TABLE invoices (invoice_id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, customer_id INTEGER NOT NULL, invoice_date TEXT NOT NULL, due_date TEXT NOT NULL, amount REAL NOT NULL, amount_paid REAL NOT NULL DEFAULT 0, paid_date TEXT);
CREATE TABLE purchase_orders (po_id INTEGER PRIMARY KEY, vendor_id INTEGER NOT NULL, order_date TEXT NOT NULL, expected_date TEXT NOT NULL, received_date TEXT, status TEXT NOT NULL);
CREATE TABLE po_lines (po_id INTEGER NOT NULL, line_no INTEGER NOT NULL, item_id INTEGER NOT NULL, qty INTEGER NOT NULL, unit_cost REAL NOT NULL, PRIMARY KEY (po_id, line_no));`;

  // table notes shown in the Atlas
  const NOTES = {
    customers: 'Shops and guilds that buy from us. rep_id is NULL when no sales factor is assigned.',
    orders: 'Sales orders. status is Shipped, Open or Cancelled.',
    order_lines: 'One row per item on an order. Line revenue = qty * unit_price * (1 - discount).',
    items: 'What we stock. unit_cost is what we pay; unit_price is what we charge.',
    invoices: 'Bills for shipped orders. paid_date is NULL until paid in full. Open balance = amount - amount_paid.',
    vendors: 'Who we import from. lead_time_days is their promised delivery time.',
    purchase_orders: 'Our orders to vendors. received_date is NULL until goods arrive.',
    po_lines: 'One row per item on a purchase order.',
    employees: 'Company staff. manager_id points at another employee.'
  };
  const ORDER = ['customers', 'orders', 'order_lines', 'items', 'invoices', 'vendors', 'purchase_orders', 'po_lines', 'employees'];

  const CITIES = { Tallyport: 'Coast', Saltmere: 'Coast', Greywater: 'Coast', Emberfall: 'Midlands', Thornwick: 'Midlands', Highmoor: 'North', Frostgate: 'North' };
  const CATS = ['Arms', 'Armor', 'Potions', 'Provisions', 'Reagents', 'Tools'];
  const TIERS = ['Bronze', 'Silver', 'Gold'];
  const REPS = [3, 4, 5, 6, 7];

  const EMP = [
    [1, 'Maren Holt', 'Guildmaster', null, '2012-03-14', 9800],
    [2, 'Tobin Ash', 'Sales Warden', 1, '2014-09-01', 6400],
    [3, 'Ilse Fenn', 'Sales Factor', 2, '2016-05-20', 4100],
    [4, 'Corwin Dale', 'Sales Factor', 2, '2018-02-11', 3900],
    [5, 'Bryn Okoro', 'Sales Factor', 2, '2019-11-04', 3850],
    [6, 'Sefa Lund', 'Sales Factor', 2, '2022-06-27', 3300],
    [7, 'Hale Verity', 'Sales Factor', 2, '2025-08-18', 2900],
    [8, 'Odalys Brine', 'Quartermaster', 1, '2013-07-30', 5600],
    [9, 'Pim Underhill', 'Stock Clerk', 8, '2024-01-15', 2400],
    [10, 'Maud Tallow', 'Reckoner', 1, '2015-04-02', 6100],
    [11, 'Nym Sable', 'Ledger Clerk', 10, '2021-10-12', 2800],
    [12, 'Brannoch Reeve', 'Buyer', 8, '2017-12-05', 4300]
  ];
  const VEN = [
    [1, 'Dwarrowdeep Foundry', 'Dwarrowdeep', 45, 4],
    [2, 'Deepdelve Mining Co', 'Dwarrowdeep', 60, 3],
    [3, 'Sylvan Looms', 'Sylvanreach', 30, 5],
    [4, 'Sunspire Alchemical', 'Sunspire', 21, 4],
    [5, 'Sunspire Glassworks', 'Sunspire', 28, 2],
    [6, 'Ashland Tannery', 'Ashlands', 35, 3],
    [7, 'Greywater Coopers', 'Coastlands', 7, 5],
    [8, 'Frostgate Mills', 'Northmarch', 14, 4]
  ];
  // name, category, vendor, base cost
  const ITEMS = [
    ['Iron Shortsword', 'Arms', 1, 14], ['Steel Longsword', 'Arms', 1, 38], ['Ashwood Longbow', 'Arms', 3, 22], ['Iron Hand Axe', 'Arms', 1, 11],
    ['Bodkin Arrow Sheaf', 'Arms', 3, 4], ['Boar Spear', 'Arms', 1, 16], ['Steel Dagger', 'Arms', 1, 9], ['Dwarven Warhammer', 'Arms', 2, 55],
    ['Leather Jerkin', 'Armor', 6, 18], ['Iron Helm', 'Armor', 1, 21], ['Chain Hauberk', 'Armor', 1, 72], ['Steel Buckler', 'Armor', 1, 26],
    ['Padded Gambeson', 'Armor', 3, 15], ['Iron Greaves', 'Armor', 1, 24], ['Wool Travel Cloak', 'Armor', 3, 8], ['Kite Shield', 'Armor', 6, 31],
    ['Healing Draught', 'Potions', 4, 6], ['Greater Healing Draught', 'Potions', 4, 19], ['Antidote Vial', 'Potions', 4, 7], ['Stamina Tonic', 'Potions', 4, 5],
    ['Night-Eye Elixir', 'Potions', 5, 13], ['Frostward Philter', 'Potions', 5, 17], ['Fever Cordial', 'Potions', 4, 4], ['Sleeping Draught', 'Potions', 5, 9],
    ['Hardtack Crate', 'Provisions', 8, 3], ['Salt Pork Barrel', 'Provisions', 7, 12], ['Dried Apple Sack', 'Provisions', 8, 5], ['Week Rations', 'Provisions', 8, 7],
    ['Ale Keg', 'Provisions', 7, 10], ['Lamp Oil Flask', 'Provisions', 7, 2], ['Smoked Cheese Wheel', 'Provisions', 8, 6], ['Tea Brick', 'Provisions', 8, 4],
    ['Moonpetal Bundle', 'Reagents', 4, 8], ['Sulfur Pouch', 'Reagents', 2, 3], ['Quicksilver Phial', 'Reagents', 2, 27], ['Iron Filings Jar', 'Reagents', 2, 2],
    ['Ghostcap Spores', 'Reagents', 4, 15], ['Amber Resin', 'Reagents', 3, 11], ['Saltpeter Sack', 'Reagents', 2, 6], ['Wyrmscale Dust', 'Reagents', 2, 64],
    ['Iron Crowbar', 'Tools', 1, 5], ['Hemp Rope Coil', 'Tools', 3, 3], ['Tinderbox', 'Tools', 7, 2], ['Steel Lockpicks', 'Tools', 1, 12],
    ['Canvas Tent', 'Tools', 3, 20], ['Iron Lantern', 'Tools', 1, 7], ['Surveyor Chain', 'Tools', 2, 14], ['Whetstone', 'Tools', 2, 1]
  ];
  const NEVER_SOLD = [8, 22, 40, 47];      // item ids with no sales
  const DISCONTINUED = [22, 40, 31];
  const CUST = [
    ['The Gilded Anvil', 'Tallyport'], ['Harborlight Outfitters', 'Tallyport'], ['Brine & Barrel', 'Tallyport'], ['Tallyport Watch Armory', 'Tallyport'],
    ['Quay Street Apothecary', 'Tallyport'], ['Gull & Compass Supply', 'Tallyport'], ['Saltmere Chandlery', 'Saltmere'], ['The Drowned Lantern', 'Saltmere'],
    ['Saltmere Shipwrights Guild', 'Saltmere'], ['Tidewater Provisioners', 'Saltmere'], ['Mistral Herbs', 'Saltmere'], ['Greywater Arms', 'Greywater'],
    ['Fenwick & Daughters', 'Greywater'], ['The Copper Kettle', 'Greywater'], ['Greywater Rangers Lodge', 'Greywater'], ['Lowtide Sundries', 'Greywater'],
    ['Emberfall Forgeworks', 'Emberfall'], ['Cinder & Coal Trading', 'Emberfall'], ['The Alembic', 'Emberfall'], ['Emberfall Caravan Company', 'Emberfall'],
    ['Hearthstone Goods', 'Emberfall'], ['Redmantle Outfitters', 'Emberfall'], ['Thornwick Apothecary', 'Thornwick'], ['Bramble Lane Supply', 'Thornwick'],
    ['The Thorn & Thistle', 'Thornwick'], ['Thornwick Militia Stores', 'Thornwick'], ['Oakhollow Traders', 'Thornwick'], ['Highmoor Outpost', 'Highmoor'],
    ['Stag & Pine Mercantile', 'Highmoor'], ['Highmoor Wardens', 'Highmoor'], ['Cairn Road Supply', 'Highmoor'], ['Frostgate Garrison', 'Frostgate'],
    ['The Rime Lantern', 'Frostgate'], ['Northwind Furs & Steel', 'Frostgate'], ['Icefall Alchemists', 'Frostgate'], ['Last Hearth Trading Post', 'Frostgate']
  ];
  const NO_ORDERS = [16, 27, 36];          // customer ids that never ordered
  const NO_REP = [6, 16, 24, 33];

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const D0 = Date.UTC(2025, 0, 1) / 864e5;
  const iso = d => new Date(d * 864e5).toISOString().slice(0, 10);
  const dnum = s => Date.parse(s + 'T00:00:00Z') / 864e5;

  function generate() {
    const r = rng(20260630), ri = (a, b) => a + Math.floor(r() * (b - a + 1)), pick = a => a[Math.floor(r() * a.length)];
    const T = { employees: EMP.map(e => e.slice()), vendors: VEN.map(v => v.slice()), customers: [], items: [], orders: [], order_lines: [], invoices: [], purchase_orders: [], po_lines: [] };
    const today = dnum(TODAY);
    // customers
    CUST.forEach(([name, city], i) => {
      const id = i + 1, tier = TIERS[[0, 0, 0, 1, 1, 1, 1, 2, 2][ri(0, 8)]];
      const limit = (tier === 'Gold' ? ri(12, 24) : tier === 'Silver' ? ri(5, 12) : ri(1, 5)) * 500;
      const joined = NO_ORDERS.includes(id) ? iso(today - ri(3, 25)) : iso(dnum('2019-01-01') + ri(0, 2300));
      T.customers.push([id, name, city, CITIES[city], tier, limit, joined, NO_REP.includes(id) ? null : pick(REPS.slice(0, 4))]);
    });
    T.customers[1][7] = 7; T.customers[18][7] = 7; T.customers[29][7] = 7; // the new factor has a small book
    // items: prices are multiples of 0.20 so discounted lines land on whole cents
    const stocks = []; for (let i = 0; i < ITEMS.length; i++) stocks.push(7 + i * 9 + ri(0, 6));
    for (let i = stocks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [stocks[i], stocks[j]] = [stocks[j], stocks[i]]; }
    const seenPrice = new Set();
    ITEMS.forEach(([name, cat, ven, base], i) => {
      const id = i + 1, cost = Math.round((base + r() * base * 0.2) * 100) / 100;
      let price = Math.round(cost * (1.3 + r() * 0.8) * 5) / 5; while (seenPrice.has(price)) price = Math.round((price + 0.2) * 5) / 5; seenPrice.add(price);
      let stock = stocks[i]; const reorder = ri(4, 16) * 10;
      if (id === 18 || id === 35) stock = 0;
      T.items.push([id, name, cat, cost, price, stock, reorder, ven, DISCONTINUED.includes(id) ? 1 : 0]);
    });
    // orders + lines + invoices
    const sellable = T.items.filter(it => !NEVER_SOLD.includes(it[0]));
    const buyers = []; T.customers.forEach(c => { if (NO_ORDERS.includes(c[0])) return; const w = c[4] === 'Gold' ? 5 : c[4] === 'Silver' ? 3 : 1; for (let k = 0; k < w + ri(0, 2); k++) buyers.push(c); });
    let oid = 1000, inv = 5000, noise = 0; const HIRE = dnum('2025-08-18'), r2 = rng(4242);
    const span = today - 2 - D0;
    const days = []; for (let k = 0; k < 330; k++) days.push(D0 + 4 + Math.floor(Math.pow(r(), 0.8) * (span - 4))); days.sort((a, b) => a - b);
    days.forEach(d => {
      const c = pick(buyers), id = ++oid, age = today - d;
      let rep = c[7] || pick(REPS); if (rep === 7 && d < HIRE) rep = 3;   // Hale Verity was hired 2025-08-18
      let status = age <= 14 ? (r() < 0.85 ? 'Open' : 'Shipped') : age <= 32 ? (r() < 0.35 ? 'Open' : 'Shipped') : 'Shipped';
      if (r() < 0.06) status = 'Cancelled';
      T.orders.push([id, c[0], iso(d), status, rep]);
      const n = ri(1, 5), used = new Set(); let total = 0;
      for (let ln = 1; ln <= n; ln++) {
        let it = pick(sellable); while (used.has(it[0])) it = pick(sellable); used.add(it[0]);
        const qty = it[4] > 60 ? ri(1, 6) : it[4] > 20 ? ri(2, 14) : ri(5, 40);
        const disc = c[4] === 'Gold' ? pick([0, 0.05, 0.1, 0.1, 0.15]) : c[4] === 'Silver' ? pick([0, 0, 0.05, 0.1]) : pick([0, 0, 0, 0.05]);
        T.order_lines.push([id, ln, it[0], qty, it[4], disc]);
        total += Math.round(qty * it[4] * (1 - disc) * 100);
      }
      const scheme = c[0] === 2 && d >= HIRE;                  // the story: one account, one factor, goods shipped and never billed
      if (status === 'Shipped' && r() >= 0.965) { if (noise++ % 5 && !scheme) { const idate = d + 1 + Math.floor(r2() * 5), pd = idate + 4 + Math.floor(r2() * 40), amount = total / 100, paid = idate + 30 < today && pd <= today; T.invoices.push([6000 + noise, id, c[0], iso(idate), iso(idate + 30), amount, paid ? amount : 0, paid ? iso(pd) : null]); } }
      else if (status === 'Shipped') {
        const idate = d + ri(1, 5), due = idate + 30, amount = total / 100;
        let paid = null, amtPaid = 0;
        const slow = c[0] % 7 === 3;                      // a few habitually late payers
        if (due < today) { if (r() < (slow ? 0.6 : 0.9)) { paid = idate + (slow ? ri(25, 70) : ri(4, 44)); if (paid > today) paid = null; } }
        else if (r() < 0.3) { paid = idate + ri(3, 20); if (paid > today) paid = null; }
        if (paid) amtPaid = amount; else if (r() < 0.12) amtPaid = Math.round(amount * pick([0.25, 0.5]) * 100) / 100;
        ++inv; if (!scheme) T.invoices.push([inv, id, c[0], iso(idate), iso(due), amount, amtPaid, paid ? iso(paid) : null]);
      }
    });
    // purchase orders
    let po = 700;
    for (let k = 0; k < 52; k++) {
      const v = pick(T.vendors), d = D0 + ri(0, span - 3), exp = d + v[3];
      let status = 'Open', rec = null;
      if (r() < 0.05) status = 'Cancelled';
      else if (exp < today - 18 || (exp < today && r() < 0.5)) { const late = v[4] >= 5 ? ri(-4, 2) : v[4] >= 4 ? ri(-3, 9) : ri(-2, 24); rec = Math.min(exp + late, today - 1); status = 'Received'; }
      const id = ++po; T.purchase_orders.push([id, v[0], iso(d), iso(exp), rec ? iso(rec) : null, status]);
      const mine = T.items.filter(it => it[7] === v[0]), n = Math.min(mine.length, ri(2, 4)), used = new Set();
      for (let ln = 1; ln <= n; ln++) { let it = pick(mine); while (used.has(it[0])) it = pick(mine); used.add(it[0]); T.po_lines.push([id, ln, it[0], ri(2, 20) * 10, it[3]]); }
    }
    T.purchase_orders.sort((a, b) => a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] - b[0]);
    const remap = {}; T.purchase_orders.forEach((p, i) => { remap[p[0]] = 701 + i; p[0] = 701 + i; });
    T.po_lines.forEach(l => { l[0] = remap[l[0]]; }); T.po_lines.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return T;
  }

  function build(SQL) {
    const db = new SQL.Database(); db.run(SCHEMA);
    const T = generate(); db.run('BEGIN');
    for (const t of Object.keys(T)) {
      if (!T[t].length) continue;
      const st = db.prepare(`INSERT INTO ${t} VALUES (${T[t][0].map(() => '?').join(',')})`);
      for (const row of T[t]) st.run(row); st.free();
    }
    db.run('COMMIT'); return db;
  }
  return { TODAY, SCHEMA, NOTES, ORDER, CITIES, CATS, TIERS, REPS, EMP, VEN, CUST, build, generate };
})();
if (typeof module !== 'undefined') module.exports = World;
