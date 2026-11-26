/* Result-based battle feedback. SQL text is escaped before it enters the UI. */
const QueryFeedback = (() => {
  const RULES = Object.freeze({ shapePower: .6, shownPower: .05, snippet: 150, repairTokens: 6 });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tokens = sql => Array.from(String(sql).matchAll(/'(?:[^']|'')*'|"(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|[\w]+|!=|<>|<=|>=|[^\s]/g))
    .filter(m => !/^(--|\/\*)/.test(m[0]) && m[0] !== ';')
    .map(m => ({ text: m[0], at: m.index, end: m.index + m[0].length, key: /^['"]/.test(m[0]) ? m[0] : m[0].toUpperCase() }));
  function difference(a, b) {
    const x = tokens(a), y = tokens(b); let start = 0, tail = 0;
    while (start < x.length && start < y.length && x[start].key === y[start].key) start++;
    while (tail < x.length - start && tail < y.length - start && x[x.length - 1 - tail].key === y[y.length - 1 - tail].key) tail++;
    const range = (t, source) => ({ start: t[start]?.at ?? (t.at(-1)?.end || source.length), end: t.length - tail > start ? t[t.length - tail - 1].end : t[start]?.at ?? (t.at(-1)?.end || source.length), count: t.length - tail - start });
    return { yours: range(x, a), solution: range(y, b) };
  }
  function repairRange(sql, error) {
    const words = tokens(sql);
    const near = /^Near "(.+)": syntax error\./i.exec(error);
    const missing = /^No such (?:column|table): (.+)\. Check/i.exec(error);
    const name = (near?.[1] || missing?.[1].split('.').at(-1) || '').toUpperCase();
    const candidates = name ? words.filter(t => t.text.toUpperCase() === name) : [];
    if (candidates.length === 1) return { start: candidates[0].at, end: candidates[0].end };
    const at = /^Incomplete input\./i.test(error) ? words.at(-1)?.end : words[0]?.at;
    return { start: at ?? 0, end: at ?? 0 };
  }
  function projectionAdvice(yours, got, want) {
    // Diagnose simple SELECT lists where the token and the result prove what SQLite used.
    const words = tokens(yours), from = words.findIndex(t => t.key === 'FROM');
    if (words[0]?.key !== 'SELECT' || from < 2) return '';
    const start = ['DISTINCT', 'ALL'].includes(words[1].key) ? 2 : 1;
    const parts = [[]];
    for (const t of words.slice(start, from)) {
      if (t.text === '(' || t.text === ')' || t.text === '*') return '';
      if (t.text === ',') parts.push([]);
      else parts.at(-1).push(t.text);
    }
    if (parts.length !== got.cols.length) return '';
    const targetNames = new Set(want.cols.map(col => col.toUpperCase()));
    for (let i = 0; i < parts.length; i++) {
      const [word, alias] = parts[i];
      if (got.cols.length < want.cols.length && parts[i].length === 2 && /^\w+$/.test(word) && /^\w+$/.test(alias) &&
          got.cols[i].toUpperCase() === alias.toUpperCase() && targetNames.has(word.toUpperCase()) && targetNames.has(alias.toUpperCase()))
        return `SQLite used ${alias} as a name for ${word}. Add a comma between them to return both columns.`;
      const literal = /^(['"])([A-Za-z_]\w*)\1$/.exec(word);
      if (!literal || (literal[1] === '"' && got.cols[i] !== word)) continue;
      const simple = parts[i].length === 1 || parts[i].length === 2 || (parts[i].length === 3 && alias.toUpperCase() === 'AS');
      if (simple && got.rows.length && got.rows.every(row => row[i] === literal[2]) && want.rows.some(row => row[i] !== literal[2]))
        return `SQLite returned the text ${word} for each row. If you meant to read a column, look up its name in Tables and use the column name on its own.`;
    }
    return '';
  }
  function explain(task, yours, res) {
    if (res.err) return res.err;
    if (res.ok) return '';
    if (res.why === 'order') return 'You found the right rows. Change their sorting order.';
    if (res.why === 'colorder') return 'You found the right values. Put the columns in the requested order.';
    if (res.why === 'must') return res.msg;
    const advice = res.got && res.want && task.kind !== 'dml' && projectionAdvice(yours, res.got, res.want);
    if (res.why === 'colcount') {
      const { wantCols, gotCols } = res.info;
      const count = `The task needs ${wantCols} column${wantCols === 1 ? '' : 's'}. Your query returned ${gotCols}.`;
      return `${count} ${advice ? advice + ' ' : ''}Query power compares complete rows. A different column count earns no power.`;
    }
    if (advice) return advice;
    const referenceWords = new Set(tokens(task.sql).map(t => t.key));
    const limited = referenceWords.has('LIMIT');
    if (res.why === 'rowcount') {
      const extra = res.info.gotRows - res.info.wantRows;
      const count = `Your result has ${Math.abs(extra)} ${extra > 0 ? 'more' : 'fewer'} ${Math.abs(extra) === 1 ? 'row' : 'rows'} than requested.`;
      if (limited) return count + ' Check how many rows LIMIT allows' + (task.order?.length ? ' and which rows ORDER BY puts first.' : '.');
      if (referenceWords.has('DISTINCT')) return count + ' Check which columns the task asks you to make unique with DISTINCT.';
      if (extra > 0 && new Set(res.got.rows.map(row => JSON.stringify(row))).size < res.got.rows.length)
        return count + ' Some rows repeat. Check whether the task asks for those repeated rows.';
      if (tokens(yours).some(t => t.key === 'LIMIT')) return count + ' Check whether the task asks for a row limit.';
      return count;
    }
    if (limited && task.order?.length) return 'The row count matches. Check which rows ORDER BY puts first before LIMIT.';
    return 'Some result values differ. Compare the expressions and conditions.';
  }
  function prepare(task, yours, res, engine) {
    if (res.err) return { yours, diff: { yours: repairRange(yours, res.err) }, error: res.err };
    const reference = task.sql, d = difference(yours, reference); let solution = reference, corrected = false;
    if (yours.length <= 8000 && d.yours.count <= RULES.repairTokens && d.solution.count <= RULES.repairTokens) {
      const replacement = reference.slice(d.solution.start, d.solution.end);
      const candidate = yours.slice(0, d.yours.start) + ' ' + replacement + ' ' + yours.slice(d.yours.end);
      if (engine.check(task, candidate).ok) { solution = candidate.trim(); corrected = true; }
    }
    const diff = difference(yours, solution), replacement = solution.slice(diff.solution.start, diff.solution.end).trim();
    const limitFix = corrected && /\bLIMIT\s*$/i.test(solution.slice(0, diff.solution.start)) && /^\d+$/.test(replacement) && Number(replacement) === res.info?.wantRows;
    return { yours, solution, corrected, diff, message: limitFix ? `Use LIMIT ${replacement} to return the requested ${replacement} rows.` : explain(task, yours, res), counts: res.got && res.want ? `${res.got.rows.length} rows returned · ${res.want.rows.length} needed` : '' };
  }
  function power(res, { shown = false, hint = 0 } = {}) {
    if (shown) return RULES.shownPower;
    const q = Number.isFinite(res.quality) ? res.quality : ({ correct: 1, close: .6, partial: .4, wrong: 0 }[res.grade] || 0);
    return hint >= 2 ? Math.min(RULES.shapePower, q) : q;
  }
  function code(sql, range, full, limit = RULES.snippet) {
    const focus = range.start, half = Math.floor(limit / 2);
    const start = full || sql.length <= limit ? 0 : Math.min(Math.max(0, focus - half), sql.length - limit), end = full ? sql.length : Math.min(sql.length, start + limit);
    const lo = Math.max(start, range.start), hi = Math.min(end, range.end);
    return (start ? '…' : '') + esc(sql.slice(start, lo)) + (hi > lo ? '<mark>' + esc(sql.slice(lo, hi)) + '</mark>' : '') + esc(sql.slice(Math.max(lo, hi), end)) + (end < sql.length ? '…' : '');
  }
  function html(model, { power: effect = 0, free = false, open = false, hidePower = false, note = '' } = {}) {
    const pct = Math.round(Math.max(0, Math.min(1, effect)) * 100);
    const bar = free ? '<b>One free fix</b>' : hidePower ? '' : `<div class="query-power"><b>${pct}% power</b><span>${esc(note || (pct === 100 ? 'Full strength' : pct ? 'Reduced strength' : 'No useful effect'))}</span></div><div class="query-meter" role="meter" aria-label="Query power" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`;
    if (!model && hidePower) return '';
    if (!model) return `<section class="query-feedback query-clean">${bar}</section>`;
    const solution = !free && !model.error && model.solution;
    const limit = free ? 55 : RULES.snippet, errorLimit = 220;
    const long = model.yours.length > limit || solution?.length > limit || model.error?.length > errorLimit;
    const error = model.error && !open && model.error.length > errorLimit ? model.error.slice(0, errorLimit) + '…' : model.error;
    const explanation = error ? `<p class="query-error">${esc(error)}</p>` : !free && model.message ? `<p class="query-explain">${esc(model.message)}</p>` : '';
    const pair = solution ? `<div class="query-solution"><b>${model.corrected ? 'Corrected query' : 'One correct solution'}</b><pre>${code(solution, model.diff.solution, open, limit)}</pre></div>` : '';
    const counts = solution && model.counts ? `<small>${esc(model.counts)}</small>` : '';
    const expand = long ? `<button class="btn sm quiet" data-a="fcompare" aria-expanded="${open}">${open ? 'Show less' : solution ? 'Full queries' : 'Full query'}</button>` : '';
    return `<section class="query-feedback${free ? ' query-fix' : ''}" aria-label="${solution ? 'Query comparison' : 'Query feedback'}">${bar}${explanation}<div class="query-pair"><div class="query-yours"><b>Your query</b><pre>${code(model.yours, model.diff.yours, open, limit)}</pre></div>${pair}</div>${counts}${expand}${free ? '<p class="cap2">Edit and try again. Another query that cannot run uses your turn.</p>' : ''}</section>`;
  }
  return { RULES, tokens, difference, explain, prepare, power, html };
})();
if (typeof module !== 'undefined') module.exports = QueryFeedback;
