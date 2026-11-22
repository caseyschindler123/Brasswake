/* ===== SQLED: colouring, formatting and the word lists for the query box =====
   Pure functions, no DOM: tokens, a highlighter that returns HTML, a formatter, and the lists the Commands panel shows. */
const SqlEd = (() => {
  const KW = new Set(('select distinct from where group by having order limit offset join left right inner outer full cross on as and or not in between like is null ' +
    'exists case when then else end with union all insert into values update set delete create table view index drop alter asc desc over partition rows range preceding following current row ' +
    'unbounded primary key integer text real distinct intersect except recursive if glob escape collate default unique check references').split(' '));
  const FN = new Set('count sum avg min max round coalesce ifnull nullif length upper lower substr substring trim ltrim rtrim replace instr abs cast strftime date datetime julianday time printf total group_concat row_number rank dense_rank ntile lag lead first_value last_value cume_dist percent_rank iif typeof random'.split(' '));
  // a SQL word that becomes capitals as soon as it is finished; functions only when a bracket follows, so a column called "date" or "count" is left alone
  const UPWORD = new Set([...KW].filter(w => !['key', 'row', 'rows', 'range', 'current', 'text', 'real', 'integer', 'check', 'default', 'index', 'view', 'set', 'values'].includes(w)).concat(['set', 'values']));
  function tokens(s) {
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i], rest = s.slice(i); let m;
      if (c === "'") { let j = i + 1; while (j < s.length) { if (s[j] === "'") { if (s[j + 1] === "'") { j += 2; continue; } j++; break; } j++; } out.push(['str', s.slice(i, j)]); i = j; continue; }
      if (rest.startsWith('--')) { const j = s.indexOf('\n', i); const e = j < 0 ? s.length : j; out.push(['cm', s.slice(i, e)]); i = e; continue; }
      if ((m = /^\s+/.exec(rest))) { out.push(['ws', m[0]]); i += m[0].length; continue; }
      if ((m = /^\d+(\.\d+)?/.exec(rest))) { out.push(['num', m[0]]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { out.push(['w', m[0]]); i += m[0].length; continue; }
      if ((m = /^(<=|>=|<>|!=|\|\||==)/.exec(rest))) { out.push(['op', m[0]]); i += 2; continue; }
      out.push([c === '(' || c === ')' ? 'par' : c === ',' ? 'com' : 'op', c]); i++;
    }
    return out;
  }
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // tables: the names to colour as tables
  function hl(s, tables, caret) {
    const T = tables || new Set(), tk = tokens(s); let h = '', at = 0; const CAR = '<span class="caret"></span>';
    for (let k = 0; k < tk.length; k++) { const [t, v] = tk[k]; let cls = null;
      if (t === 'w') { const lw = v.toLowerCase(), next = tk.slice(k + 1).find(x => x[0] !== 'ws'); if (FN.has(lw) && next && next[1] === '(') cls = 'fn'; else if (KW.has(lw)) cls = 'kw'; else if (T.has(lw)) cls = 'tb'; }
      else if (t === 'str') cls = 'st'; else if (t === 'num') cls = 'nu'; else if (t === 'cm') cls = 'cm'; else if (t === 'op' || t === 'com' || t === 'par') cls = 'op';
      const wrap = x => cls ? `<span class="s-${cls}">${esc(x)}</span>` : esc(x);
      if (caret != null && caret >= at && caret < at + v.length) { h += (caret > at ? wrap(v.slice(0, caret - at)) : '') + CAR + wrap(v.slice(caret - at)); caret = null; } else h += wrap(v); at += v.length; }
    if (caret != null) h += CAR;
    return h;
  }
  /* Format: capitals for keywords, each clause on its own line, long select lists one column a line, AND/OR on their own line, subqueries indented. */
  const CLAUSE = ['select', 'from', 'where', 'group by', 'having', 'order by', 'limit', 'join', 'left join', 'right join', 'inner join', 'left outer join', 'cross join', 'union', 'union all', 'values', 'set', 'with', 'insert into', 'update', 'delete from', 'create table', 'create view', 'create index', 'window'];
  function format(src) {
    const tk = tokens(src.trim()).filter(t => t[0] !== 'ws' && t[0] !== 'cm').map(([t, v]) => [t, t === 'w' && KW.has(v.toLowerCase()) ? v.toUpperCase() : v]);
    // function names in capitals when a bracket follows
    for (let i = 0; i < tk.length; i++) if (tk[i][0] === 'w' && FN.has(tk[i][1].toLowerCase()) && tk[i + 1] && tk[i + 1][1] === '(') tk[i][1] = tk[i][1].toUpperCase();
    // join multi-word clauses into one token
    const W = []; for (let i = 0; i < tk.length; i++) { let hit = null; for (const c of CLAUSE.slice().sort((a, b) => b.length - a.length)) { const p = c.split(' '); if (p.every((w, j) => tk[i + j] && tk[i + j][0] === 'w' && tk[i + j][1].toLowerCase() === w)) { hit = p.length; W.push(['cl', c.toUpperCase()]); break; } } if (hit) i += hit - 1; else W.push(tk[i]); }
    let out = '', depth = 0, line = '', sel = null; const stack = [], IND = '  ', pad = () => IND.repeat(depth);
    const nl = () => { if (line.trim()) out += line.replace(/\s+$/, '') + '\n'; line = pad(); };
    const put = (v, sp) => { if (line.trim() && sp !== false && !/[(.]$/.test(line) ) line += ' '; line += v; };
    // decide per SELECT whether its column list breaks one column a line
    function selLong(i) { let d = 0, n = 0, len = 0; for (let j = i + 1; j < W.length; j++) { const v = W[j][1]; if (v === '(') d++; else if (v === ')') { if (!d) break; d--; } else if (!d && W[j][0] === 'cl') break; else if (!d && v === ',') n++; len += String(v).length + 1; } return n >= 3 || len > 48; }
    let inWhere = false;
    for (let i = 0; i < W.length; i++) {
      const [t, v] = W[i], prev = W[i - 1];
      if (t === 'cl' && stack.length && stack[stack.length - 1] === 'p') { put(v); continue; }
      if (t === 'cl') { nl(); line = pad() + v; inWhere = /WHERE|HAVING|ON|JOIN/.test(v); if (v === 'SELECT') { sel = selLong(i) ? depth : null; if (sel !== null) { nl(); line = pad() + IND; } } else sel = null; continue; }
      if (v === '(' ) { const nx = W[i + 1]; put(v, !(prev && (prev[0] === 'w' || prev[1] === ')') && !(prev[0] === 'w' && KW.has(prev[1].toLowerCase()) && !FN.has(prev[1].toLowerCase()))) || (W[i - 2] && W[i - 2][0] === 'cl' && /INSERT|CREATE/.test(W[i - 2][1]))); if (nx && nx[0] === 'cl' && /SELECT|WITH/.test(nx[1])) { stack.push(sel); depth++; sel = null; } else stack.push('p'); continue; }
      if (v === ')') { const s = stack.pop(); if (s !== 'p' && s !== undefined) { depth--; nl(); line = pad() + ')'; sel = s; } else line += ')'; continue; }
      if (v === ',') { line += ','; if (sel !== null && sel === depth && !stack.filter(x => x === 'p').length) { nl(); line = pad() + IND; } continue; }
      if (t === 'w' && /^(AND|OR)$/.test(v) && inWhere && !(stack.length && stack[stack.length - 1] === 'p')) { const between = W.slice(Math.max(0, i - 3), i).some(x => x[1] === 'BETWEEN'); if (!between) { nl(); line = pad() + IND + v; continue; } }
      if (t === 'w' && v === 'ON') { put(v); inWhere = true; continue; }
      if (v === '.') { line = line.replace(/\s+$/, '') + '.'; continue; }
      put(v, !(prev && prev[1] === '.'));
    }
    nl(); return out.replace(/\n+$/, '').replace(/^\s*\n/, '');
  }
  // the Commands panel
  const LISTS = [['Clauses', ['SELECT', 'DISTINCT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'AS', 'JOIN', 'LEFT JOIN', 'ON', 'WITH', 'UNION', 'UNION ALL']],
    ['Conditions', ['AND', 'OR', 'NOT', '=', '<>', '<', '>', '<=', '>=', 'IN (', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL', 'EXISTS (', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END']],
    ['Functions', ['COUNT(', 'COUNT(*)', 'SUM(', 'AVG(', 'MIN(', 'MAX(', 'ROUND(', 'COALESCE(', 'NULLIF(', 'LENGTH(', 'UPPER(', 'LOWER(', 'SUBSTR(', 'CAST(', "strftime('%Y-%m', ", 'date(', 'julianday(']],
    ['Windows', ['OVER (', 'PARTITION BY', 'ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'LAG(', 'LEAD(', 'SUM(', 'ROWS BETWEEN', 'UNBOUNDED PRECEDING', 'CURRENT ROW']],
    ['Changing data', ['INSERT INTO', 'VALUES (', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'CREATE VIEW', 'CREATE INDEX']],
    ['Symbols', ['*', ',', '(', ')', "'", '%', '.', ';', '||', '+', '-', '/']]];
  const STARTS_LINE = new Set(['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'JOIN', 'LEFT JOIN', 'UNION', 'UNION ALL', 'WITH', 'INSERT INTO', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'CREATE VIEW', 'CREATE INDEX', 'VALUES (']);
  return { tokens, hl, format, LISTS, STARTS_LINE, UPWORD, FN };
})();
if (typeof module !== 'undefined') module.exports = SqlEd;
