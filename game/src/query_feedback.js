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
  function explain(res) {
    if (res.err) return 'The query could not run. Compare the highlighted SQL.';
    if (res.why === 'order') return 'You found the right rows. Change their sorting order.';
    if (res.why === 'colorder') return 'You found the right values. Put the columns in the requested order.';
    if (res.why === 'must') return res.msg;
    if (res.why === 'colcount') return `The result needs ${res.info.wantCols} columns; yours has ${res.info.gotCols}.`;
    if (res.got && res.want) {
      if (res.got.rows.length > res.want.rows.length) return `Your result has ${res.got.rows.length - res.want.rows.length} more rows than requested. Check the filter or JOIN.`;
      if (res.got.rows.length < res.want.rows.length) return `Your result has ${res.want.rows.length - res.got.rows.length} fewer rows than requested. Check the filter or JOIN.`;
    }
    return 'Some result values differ. Compare the expressions and conditions.';
  }
  function prepare(task, yours, res, engine) {
    const reference = task.sql, d = difference(yours, reference); let solution = reference, corrected = false;
    if (yours.length <= 8000 && d.yours.count <= RULES.repairTokens && d.solution.count <= RULES.repairTokens) {
      const replacement = reference.slice(d.solution.start, d.solution.end);
      const candidate = yours.slice(0, d.yours.start) + ' ' + replacement + ' ' + yours.slice(d.yours.end);
      if (engine.check(task, candidate).ok) { solution = candidate.trim(); corrected = true; }
    }
    const diff = difference(yours, solution), replacement = solution.slice(diff.solution.start, diff.solution.end).trim();
    const limitFix = corrected && /\bLIMIT\s*$/i.test(solution.slice(0, diff.solution.start)) && /^\d+$/.test(replacement);
    return { yours, solution, corrected, diff, message: limitFix ? `Use LIMIT ${replacement} to return the requested ${replacement} rows.` : explain(res), error: res.err || '', counts: res.got && res.want ? `${res.got.rows.length} rows returned · ${res.want.rows.length} needed` : '' };
  }
  function power(res, { shown = false, hint = 0 } = {}) {
    if (shown) return RULES.shownPower;
    const q = Number.isFinite(res.quality) ? res.quality : ({ correct: 1, close: .6, partial: .4, wrong: 0 }[res.grade] || 0);
    return hint >= 2 ? Math.min(RULES.shapePower, q) : q;
  }
  function code(sql, range, full, limit = RULES.snippet) {
    const focus = range.start, half = Math.floor(limit / 2);
    const start = full ? 0 : Math.max(0, focus - half), end = full ? sql.length : Math.min(sql.length, Math.max(focus + half, start + limit));
    const lo = Math.max(start, range.start), hi = Math.min(end, range.end);
    return (start ? '…' : '') + esc(sql.slice(start, lo)) + (hi > lo ? '<mark>' + esc(sql.slice(lo, hi)) + '</mark>' : '') + esc(sql.slice(Math.max(lo, hi), end)) + (end < sql.length ? '…' : '');
  }
  function html(model, { power: effect = 0, free = false, open = false, hidePower = false, note = '' } = {}) {
    const pct = Math.round(Math.max(0, Math.min(1, effect)) * 100);
    const bar = free ? '<b>One free fix</b>' : hidePower ? '' : `<div class="query-power"><b>${pct}% power</b><span>${esc(note || (pct === 100 ? 'Full strength' : pct ? 'Reduced strength' : 'No useful effect'))}</span></div><div class="query-meter" role="meter" aria-label="Query power" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`;
    if (!model && hidePower) return '';
    if (!model) return `<section class="query-feedback query-clean">${bar}</section>`;
    const limit = free ? 55 : RULES.snippet, long = model.yours.length > limit || model.solution.length > limit || !!model.error;
    return `<section class="query-feedback${free ? ' query-fix' : ''}" aria-label="Query comparison">${bar}<p class="query-explain">${esc(model.message)}</p>${model.error && open ? `<p class="query-error">${esc(model.error)}</p>` : ''}<div class="query-pair"><div class="query-yours"><b>Your query</b><pre>${code(model.yours, model.diff.yours, open, limit)}</pre></div><div class="query-solution"><b>${model.corrected ? 'Corrected query' : 'One correct solution'}</b><pre>${code(model.solution, model.diff.solution, open, limit)}</pre></div></div>${model.counts ? `<small>${esc(model.counts)}</small>` : ''}${long ? `<button class="btn sm quiet" data-a="fcompare" aria-expanded="${open}">${open ? 'Show less' : 'Full queries'}</button>` : ''}${free ? '<p class="cap2">Edit and try again. Another query that cannot run uses your turn.</p>' : ''}</section>`;
  }
  return { RULES, tokens, difference, prepare, power, html };
})();
if (typeof module !== 'undefined') module.exports = QueryFeedback;
