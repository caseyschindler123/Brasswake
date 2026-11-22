/* ===== ENGINE: run SQL, judge answers, detect which skills a query used ===== */
const Engine = (() => {
  let SQL = null, base = null, ro = null, sandbox = null;
  const ROWCAP = 5000;

  function init(sqlLib, world) {
    SQL = sqlLib; const db = world.build(SQL); base = db.export(); db.close();
    ro = new SQL.Database(base); ro.run('PRAGMA query_only = ON');
    sandbox = new SQL.Database(base);
  }
  const clone = () => new SQL.Database(base);
  function resetSandbox() { if (sandbox) sandbox.close(); sandbox = new SQL.Database(base); }

  // phones love to "fix" punctuation; undo it before SQLite sees it
  function clean(sql) {
    return String(sql || '').replace(/[‘’‛′]/g, "'").replace(/[“”″]/g, '"')
      .replace(/ /g, ' ').replace(/—/g, '--').replace(/–/g, '-').replace(/…/g, '...').trim();
  }
  // Match quoted SQL before comments: '--' inside a value is ordinary text.
  const MASKED = /'(?:[^']|'')*'|"(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g;
  // strip literals, quoted identifiers and comments for technique detection
  function bare(sql) {
    return clean(sql).replace(MASKED, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  }
  // Rule-specific validators see code without comments; quoted contents stay.
  const uncomment = sql => clean(sql).replace(MASKED, part => /^(--|\/\*)/.test(part) ? ' ' : part);
  function statements(sql) {
    const out = []; let cur = '', q = null;
    const source = uncomment(sql);
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (q) { cur += ch; if (ch === q) { if (q !== ']' && source[i + 1] === q) cur += source[++i]; else q = null; } }
      else if (ch === "'" || ch === '"' || ch === '`' || ch === '[') { q = ch === '[' ? ']' : ch; cur += ch; }
      else if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim()); return out;
  }
  function friendly(e) {
    const m = String(e && e.message || e);
    if (m === 'ROWCAP') return `Over ${ROWCAP.toLocaleString()} rows. Stopped. A join is missing its ON condition.`;
    let tip = '';
    if (/no such column/i.test(m)) tip = ' Check spelling in the Atlas. Text needs single quotes.';
    else if (/no such table/i.test(m)) tip = ' See the Atlas.';
    else if (/syntax error/i.test(m)) tip = ' Look just before that word: a comma, or clause order (SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT).';
    else if (/ambiguous column/i.test(m)) tip = ' Two tables share that name. Prefix it: o.customer_id.';
    else if (/misuse of aggregate/i.test(m)) tip = ' Aggregates go in HAVING, not WHERE.';
    else if (/misuse of window/i.test(m)) tip = ' Compute the window in a CTE, then filter outside it.';
    else if (/readonly|read-only|query_only/i.test(m)) tip = ' This task only reads the ledger. Use SELECT.';
    return m.charAt(0).toUpperCase() + m.slice(1) + '.' + tip;
  }
  function select(db, sql) {
    const st = db.prepare(sql);
    try { const cols = st.getColumnNames(), rows = []; while (st.step()) { rows.push(st.get()); if (rows.length > ROWCAP) throw new Error('ROWCAP'); } return { cols, rows }; }
    finally { st.free(); }
  }
  function runRead(sql) {
    const ss = statements(sql);
    if (!ss.length) return { err: 'Write a query first.' };
    if (ss.length > 1) return { err: 'One statement at a time.' };
    if (/^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE|PRAGMA|ATTACH|BEGIN|COMMIT|ROLLBACK)\b/i.test(ss[0].replace(/^\s*(--[^\n]*\n\s*)*/, ''))) return { err: 'Read-only task. Start with SELECT or WITH.' };
    try { return select(ro, ss[0]); } catch (e) { return { err: friendly(e) }; }
  }
  // free play: anything goes, against a private copy of the ledger
  function runSandbox(sql) {
    const ss = statements(sql); if (!ss.length) return { err: 'Write a query first.' };
    try {
      let last = null, changed = 0;
      for (const s of ss) { if (/^\s*(SELECT|WITH|VALUES|PRAGMA|EXPLAIN)\b/i.test(s)) last = select(sandbox, s); else { sandbox.run(s); changed += sandbox.getRowsModified(); last = null; } }
      return last || { cols: [], rows: [], note: `Done. ${changed} row${changed === 1 ? '' : 's'} changed in your sandbox copy.` };
    } catch (e) { return { err: friendly(e) }; }
  }

  const num = v => typeof v === 'number' ? v : (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? parseFloat(v) : NaN);
  function cellEq(a, b) {
    if (a === null || a === undefined) return b === null || b === undefined;
    if (b === null || b === undefined) return false;
    const x = num(a), y = num(b);
    if (!isNaN(x) && !isNaN(y)) return Math.abs(x - y) <= 0.0051 + 1e-9 * Math.abs(x);
    return String(a) === String(b);
  }
  const key = row => row.map(v => v === null || v === undefined ? '\u0000' : (isNaN(num(v)) ? 's' + v : 'n' + (Math.round(num(v) * 1e4) / 1e4).toFixed(4))).join('\u0001');
  const rowEq = (a, b) => a.length === b.length && a.every((v, i) => cellEq(v, b[i]));

  // compare a result with the target. order = column indexes whose sequence must match (null = any order)
  function judge(got, want, order) {
    const info = { gotRows: got.rows.length, wantRows: want.rows.length, gotCols: got.cols.length, wantCols: want.cols.length };
    if (got.cols.length !== want.cols.length)
      return { ok: false, why: 'colcount', info, msg: `Target: ${want.cols.length} column${want.cols.length === 1 ? '' : 's'} (${want.cols.join(', ')}). Yours: ${got.cols.length}.` };
    if (got.rows.length !== want.rows.length) {
      const more = got.rows.length > want.rows.length;
      return { ok: false, why: 'rowcount', info, msg: `Target: ${want.rows.length} row${want.rows.length === 1 ? '' : 's'}. Yours: ${got.rows.length}. ` + (more ? 'Missing a filter, or a join is multiplying rows.' : 'Filter too strict, or a join is dropping rows.') };
    }
    const g = got.rows.slice().sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0), w = want.rows.slice().sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
    for (let i = 0; i < w.length; i++) if (!rowEq(g[i], w[i])) {
      // right values in the wrong column order?
      const gs = got.rows.map(r => r.slice().map(String).sort().join('|')).sort().join('#'), ws = want.rows.map(r => r.slice().map(String).sort().join('|')).sort().join('#');
      if (gs === ws) return { ok: false, why: 'colorder', info, msg: `Right values, wrong column order. Target: ${want.cols.join(', ')}.` };
      return { ok: false, why: 'values', info, msg: 'Right shape. Some values differ.', diff: { yours: g[i], target: w[i] } };
    }
    if (order && order.length) {
      for (let i = 0; i < want.rows.length; i++) for (const c of order) if (!cellEq(got.rows[i][c], want.rows[i][c]))
        return { ok: false, why: 'order', info, msg: `Right rows, wrong order. Row ${i + 1} should have ${want.cols[c]} = ${want.rows[i][c]}.` };
    }
    return { ok: true, info };
  }

  // task: {sql, order, must?, kind?:'dml', setup?, check?}
  function target(task) {
    if (task.kind === 'dml') { const d = clone(); try { if (task.setup) d.run(task.setup); d.run(task.sql); return select(d, task.check); } finally { d.close(); } }
    return select(ro, task.sql);
  }
  function check(task, userSql) {
    const b = bare(userSql);
    let want; try { want = target(task); } catch (e) { return { ok: false, err: 'Internal: target query failed (' + e.message + ')' }; }
    let got;
    if (task.kind === 'dml') {
      const ss = statements(userSql); if (!ss.length) return { ok: false, err: 'Write a statement first.' };
      const d = clone();
      try { if (task.setup) d.run(task.setup); for (const s of ss) d.run(s); got = select(d, task.check); }
      catch (e) { return { ok: false, err: friendly(e), want }; } finally { d.close(); }
      const v = judge(got, want, want.cols.map((_, i) => i));
      if (!v.ok) v.msg = 'The ledger does not match the target afterwards. ' + (v.diff ? '' : `Target check: ${want.rows.length} row(s). Yours: ${got.rows.length}.`);
      return Object.assign(v, { got, want, used: skillsUsed(b) });
    }
    got = runRead(userSql); if (got.err) return { ok: false, err: got.err, want };
    const v = judge(got, want, task.order || null);
    if (v.ok && task.must) for (const m of task.must) if (!MUST[m].re.test(b)) { v.ok = false; v.why = 'must'; v.msg = `Rows are right, but this one needs ${MUST[m].label}.`; break; }
    return Object.assign(v, { got, want, used: skillsUsed(b) });
  }

  // how much of the target a result holds: matching rows over the larger of the two row counts
  function shareOf(got, want) {
    if (!got || !want || got.cols.length !== want.cols.length || !want.rows.length) return 0;
    const m = new Map(); for (const r of want.rows) { const k = key(r); m.set(k, (m.get(k) || 0) + 1); }
    let hit = 0; for (const r of got.rows) { const k = key(r), n = m.get(k); if (n) { hit++; m.set(k, n - 1); } }
    return hit / Math.max(want.rows.length, got.rows.length);
  }
  // check, then grade: correct | close (right rows, wrong order or column order or technique) | partial (half the rows or more) | wrong
  function grade(task, userSql) {
    const v = check(task, userSql); if (v.err) return v;
    v.share = v.ok ? 1 : shareOf(v.got, v.want);
    v.grade = v.ok ? 'correct' : (v.why === 'order' || v.why === 'colorder' || v.why === 'must') ? 'close' : v.share >= .5 ? 'partial' : 'wrong';
    return v;
  }
  const MUST = {
    cte: { re: /^\s*WITH\b/, label: 'a CTE (WITH ... AS)' }, leftjoin: { re: /\bLEFT\s+(OUTER\s+)?JOIN\b/, label: 'LEFT JOIN' },
    window: { re: /\bOVER\s*\(/, label: 'a window function (OVER)' }, casewhen: { re: /\bCASE\b/, label: 'CASE WHEN' },
    exists: { re: /\bEXISTS\b/, label: 'EXISTS' }, union: { re: /\bUNION\b/, label: 'UNION' }, having: { re: /\bHAVING\b/, label: 'HAVING' },
    join: { re: /\bJOIN\b/, label: 'JOIN' }, subquery: { re: /\(\s*SELECT\b/, label: 'a subquery' }, groupby: { re: /\bGROUP\s+BY\b/, label: 'GROUP BY' }
  };
  function skillsUsed(b) {
    const u = [], has = re => re.test(b);
    if (has(/\bSELECT\b/)) u.push('select');
    if (has(/\bORDER\s+BY\b|\bLIMIT\b/)) u.push('sort');
    if (has(/\bWHERE\b/)) u.push('filter');
    if (has(/\b(COUNT|SUM|AVG|MIN|MAX|TOTAL|GROUP_CONCAT)\s*\(/)) u.push('agg');
    if (has(/\bGROUP\s+BY\b|\bHAVING\b/)) u.push('group');
    if (has(/\bJOIN\b/)) u.push('join');
    if (has(/\b(LEFT|RIGHT|FULL)\s+(OUTER\s+)?JOIN\b/)) u.push('outer');
    if (has(/\bCASE\b|\b(COALESCE|IFNULL|NULLIF|ROUND|CAST|UPPER|LOWER|SUBSTR|LENGTH|REPLACE|TRIM|ABS|IIF)\s*\(|\|\|/)) u.push('expr');
    if (has(/\b(STRFTIME|JULIANDAY|DATE|DATETIME)\s*\(/)) u.push('date');
    if (has(/^\s*WITH\b/)) u.push('cte');
    if (/\(\s*SELECT\b|\bEXISTS\b|\b(UNION|INTERSECT|EXCEPT)\b/.test(b.replace(/\bAS\s*\(\s*SELECT\b/g, 'AS CTE'))) u.push('sub');
    if (has(/\bOVER\s*\(/)) u.push('window');
    if (has(/^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/) || has(/;\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/)) u.push('write');
    return u;
  }
  function atlas() {
    const out = [];
    for (const t of World.ORDER) { const r = select(ro, `SELECT name, type, pk FROM pragma_table_info('${t}')`); out.push({ name: t, note: World.NOTES[t], cols: r.rows.map(x => ({ name: x[0], type: x[1], pk: x[2] })), count: select(ro, `SELECT COUNT(*) FROM ${t}`).rows[0][0] }); }
    return out;
  }
  const peek = (t, n) => select(ro, `SELECT * FROM ${t} LIMIT ${n || 4}`);
  function sandboxScript(sql) { try { sandbox.exec(sql); } catch (e) { /* hero tables are a convenience */ } }
  // a small throwaway database built from a script, for games that deal their own tables
  function scratch(script) {
    const d = new SQL.Database(); d.exec(script); d.run('PRAGMA query_only = ON');
    return { read(sql) { const ss = statements(sql); if (!ss.length) return { err: 'Write a query first.' }; if (ss.length > 1) return { err: 'One statement at a time.' }; if (!/^\s*SELECT\b/i.test(ss[0])) return { err: 'Start with SELECT.' }; try { return select(d, ss[0]); } catch (e) { return { err: friendly(e) }; } }, close() { d.close(); } };
  }
  return { init, scratch, check, grade, shareOf, target, runRead, runSandbox, resetSandbox, skillsUsed, bare, clean, uncomment, atlas, peek, judge, sandboxScript, ready: () => !!ro };
})();
if (typeof module !== 'undefined') module.exports = Engine;
