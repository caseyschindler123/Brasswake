/* A small practice copy of the Marigold's manifest. It never changes the town's records. */
const FirstDay = (() => {
  const columns = ['name', 'quantity', 'destination'];
  const rows = [['Bread', 12, 'Galley'], ['Healing Draught', 4, 'Healer'], ['Rope', 6, 'Harbour']];
  const script = "CREATE TABLE manifest (name TEXT, quantity INTEGER, destination TEXT); INSERT INTO manifest VALUES ('Bread',12,'Galley'),('Healing Draught',4,'Healer'),('Rope',6,'Harbour');";
  const tasks = [
    { ask: 'The cook needs the supply names. Show the name of every supply in manifest.', ret: 'name', sql: 'SELECT name FROM manifest', tip: 'SELECT says which column you want. FROM says which table holds it.', tables: ['manifest'], practice: true },
    { ask: 'The porter needs the destinations. Show the destination of every supply in manifest.', ret: 'destination', sql: 'SELECT destination FROM manifest', tip: 'Use the same structure. Change the column after SELECT.', tables: ['manifest'], practice: true },
    { ask: 'Show the name and quantity of every supply in manifest.', ret: 'name, quantity', sql: 'SELECT name, quantity FROM manifest', tip: 'Put a comma between the two column names. Their order determines the result columns.', tables: ['manifest'], practice: true },
    { ask: 'Show every column for every supply in manifest.', ret: 'all columns', sql: 'SELECT * FROM manifest', tip: 'The star (*) means all columns. It keeps every row.', tables: ['manifest'], practice: true },
    { ask: 'Now use the harbour records. Show the name of every item in items.', ret: 'name', sql: 'SELECT name FROM items', tip: 'This is the full town Ledger, with more rows. The SELECT/FROM pattern works here too.', tables: ['items'] },
    { ask: 'Wex needs to contact customers. Show the name and city of every customer in customers.', ret: 'name, city', sql: 'SELECT name, city FROM customers', tip: 'Look at the table columns in Fields if you need a reminder. Choose the two facts Wex asked for.', tables: ['customers'] }
  ].map(t => Object.assign({ kind: 'read', title: 'Help unload the Marigold', kw: ['SELECT', 'FROM'] }, t));
  function grade(db, task, sql, engine) {
    const got = db.read(sql), want = db.read(task.sql);
    if (got.err) return { ok: false, err: got.err, want };
    const judged = engine.judge(got, want, null);
    return Object.assign(judged, { got, want, used: ['select'], grade: judged.ok ? 'correct' : 'wrong' });
  }
  function dialogue(line) {
    if (Array.isArray(line)) return line.map(String).filter(Boolean);
    return String(line).split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  }
  return { columns, rows, script, tasks, grade, dialogue };
})();
if (typeof module !== 'undefined') module.exports = FirstDay;
