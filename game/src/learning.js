/* ===== LEARNING: SQL lessons, deliberate practice and world-owned evidence ===== */
const Learning = (() => {
  const source = typeof Content === 'undefined' ? require('./quests.js') : Content;
  const CONCEPTS = [];
  function lesson(id, circle, title, prerequisites, commands, body, code, example) {
    CONCEPTS.push({ id, circle, title, prerequisites, commands, body, code, example });
  }

  lesson('select', 0, 'Reading a table', [], ['SELECT', 'FROM'],
    'Choose a table with FROM, then use SELECT to name the columns you want. The result columns stay in the order you name them. A star gives you every column.',
    'SELECT name, city FROM customers;', 'One row reads The Gilded Anvil | Tallyport. The other columns of that account stay in the table.');
  lesson('sort', 1, 'Sorting rows', ['select'], ['ORDER BY', 'ASC', 'DESC'],
    'Use ORDER BY when the order of the rows matters. ASC goes from low to high or A to Z. DESC reverses that direction. Add a second key to sort rows tied on the first key.',
    'SELECT realm, name FROM vendors\nORDER BY realm ASC, name DESC;', 'Both Dwarrowdeep vendors stay together, with Deepdelve Mining Co after Dwarrowdeep Foundry.');
  lesson('limit', 1, 'Keeping the first rows', ['sort'], ['LIMIT'],
    'LIMIT keeps the first rows of the result. Sort before taking the first few, and give tied rows a second sort key if you need to decide which ones to keep.',
    'SELECT name, lead_time_days FROM vendors\nORDER BY lead_time_days ASC, name ASC\nLIMIT 2;', 'The result keeps the vendors with delivery times of 7 and 14 days.');
  lesson('distinct', 1, 'Removing duplicate rows', ['select'], ['DISTINCT'],
    'Use DISTINCT to list each different result once. With one column it keeps one row per value. With several columns it checks their whole combination.',
    'SELECT DISTINCT city, tier FROM customers;', 'Two Gold customers in the same city give one city-and-tier row. A Silver customer there still gives a separate row.');
  lesson('arithmetic', 1, 'Calculating a value on each row', ['select'], [],
    'Use +, -, * or / to calculate from the values on a row. Parentheses group work you want done first. With two whole numbers, SQLite division drops the fractional part, so use a decimal operand when you need it.',
    'SELECT name, unit_price - unit_cost FROM items;', 'A price of 25 and a cost of 18 give a margin of 7.');
  lesson('alias', 1, 'Naming an output column', ['select'], ['AS'],
    'Put AS and a name after a result column or calculation. The name labels the result without changing the table. You can also use it as a sort key.',
    'SELECT name, salary * 12 AS yearly_pay\nFROM employees;', 'A monthly salary of 2,400 appears as 28,800 under yearly_pay.');
  lesson('filter', 2, 'Choosing rows with WHERE', ['select'], ['WHERE', '=', '<>', '<', '>', '<=', '>='],
    'WHERE tests each row and keeps it when the condition is true. Use = for equal or <> for different. Put text values in single quotes and write numbers as numbers. You can also compare two columns on the same row.',
    "SELECT name FROM customers WHERE tier = 'Gold';", 'A Gold account appears in the result and a Silver account is left out.');
  lesson('boolean', 2, 'Combining conditions', ['filter'], ['AND', 'OR', 'NOT'],
    'AND requires both conditions, OR requires at least one, and NOT reverses a true or false condition. SQL applies AND before OR. Use parentheses to keep an either-or choice together.',
    "SELECT name FROM customers\nWHERE region = 'North' AND (tier = 'Gold' OR tier = 'Silver');", 'A Silver account in North passes. A Gold account outside North is left out.');
  lesson('in', 2, 'Checking a list of values', ['filter'], ['IN ('],
    'IN checks whether one value matches any member of a list. NOT IN leaves those matches out. A NULL in the list can leave a nonmatching comparison unknown, so use a list of known values when excluding rows.',
    "SELECT name, city FROM customers\nWHERE city IN ('Saltmere', 'Greywater');", 'A Saltmere or Greywater customer passes the test.');
  lesson('between', 2, 'Checking an inclusive range', ['filter'], ['BETWEEN'],
    'BETWEEN checks whether a value falls between a lower and upper bound, including both ends. Dates written as YYYY-MM-DD sort chronologically as text and can use the same range test.',
    'SELECT name FROM items WHERE unit_price BETWEEN 20 AND 60;', 'Prices of 20 and 60 both pass. A price of 60.01 falls outside the range.');
  lesson('like', 2, 'Searching for a pattern', ['filter'], ['LIKE'],
    'LIKE matches a text pattern. A percent sign matches any number of characters, and an underscore matches exactly one. In these SQLite records, ordinary A to Z letters match regardless of case.',
    "SELECT name FROM items WHERE name LIKE 'Iron %';", 'Iron Shortsword fits the pattern. Steel Longsword is left out.');
  lesson('null', 2, 'Checking missing values', ['select'], ['IS NULL', 'IS NOT NULL'],
    'NULL represents a missing value. Use IS NULL to find missing entries and IS NOT NULL to keep entries with values. A blank string and a zero still count as values.',
    'SELECT name FROM customers WHERE rep_id IS NULL;', 'An account without an assigned sales factor appears in the result.');
  lesson('agg', 3, 'Counting and measuring rows', ['select'], ['COUNT(', 'COUNT(*)', 'SUM(', 'AVG(', 'MIN(', 'MAX('],
    'An aggregate returns one measurement for several rows. COUNT(*) counts rows. COUNT(column) counts known values. SUM adds values, AVG takes their average, and MIN and MAX find the ends of the range.',
    'SELECT COUNT(*), COUNT(rep_id) FROM customers;', 'The two counts are 36 total accounts and 32 accounts with a known sales factor.');
  lesson('group', 3, 'One result row per group', ['agg'], ['GROUP BY'],
    'GROUP BY puts rows with equal keys together before you calculate an aggregate. Include the grouping columns in SELECT when you need to identify which group each result describes.',
    'SELECT category, COUNT(*) FROM items GROUP BY category;', 'The result has one row per category, including Arms | 8.');
  lesson('having', 3, 'Filtering after counting', ['group', 'filter'], ['HAVING'],
    'WHERE filters the individual rows before grouping. HAVING evaluates the result of each group. Use it when a condition depends on a count, total or other aggregate.',
    'SELECT city, COUNT(*) FROM customers\nGROUP BY city HAVING COUNT(*) >= 5;', 'A city with five customers stays on the list, and a city with four is left out.');
  lesson('join', 4, 'Connecting related rows', ['select'], ['JOIN', 'ON'],
    'JOIN combines records whose ON condition matches. Use identifiers that describe the relationship. One matching row on the right gives one result, and several matches can produce several results for the same left row.',
    'SELECT items.name, vendors.name FROM items\nJOIN vendors ON items.vendor_id = vendors.vendor_id;', 'Iron Shortsword appears beside Dwarrowdeep Foundry, the vendor with its vendor_id.');
  lesson('outer', 4, 'Keeping rows with no match', ['join', 'null'], ['LEFT JOIN'],
    'A LEFT JOIN keeps a row from the left table even if the right table has no match. Right-side columns are NULL on that row. To count matches, count a known right-side identifier instead of counting all result rows.',
    'SELECT customers.name, employees.name FROM customers\nLEFT JOIN employees ON customers.rep_id = employees.employee_id;', 'A customer with no sales factor still has a row with the employee name blank.');
  lesson('self', 4, 'Joining two copies of a table', ['join', 'relation-alias'], [],
    'A self-join looks at the same table in two roles. Give each side a different table alias, then write a condition that links the right records without pairing a row with itself by accident.',
    'SELECT e.name, lead.name FROM employees e\nJOIN employees lead ON e.manager_id = lead.employee_id;', 'Tobin Ash and Maren Holt appear on a row as employee and manager.');
  lesson('relation-alias', 4, 'Giving tables short names', ['select'], ['AS'],
    'Write a short name after a table name to give that table an alias. Prefix a column with the alias and a dot to show which table it comes from. Each copy of a table needs its own alias in a self-join.',
    'SELECT o.order_id, c.name FROM orders o\nJOIN customers c ON o.customer_id = c.customer_id;', 'The order number comes from o and the customer name comes from c.');
  lesson('case', 5, 'Choosing a value with CASE', ['select'], ['CASE', 'WHEN', 'THEN', 'ELSE', 'END'],
    'CASE tests its WHEN conditions in order and returns the value of the first match. An ELSE value covers the rows with no match. Without ELSE, those rows get NULL.',
    "SELECT name, CASE WHEN stock_qty = 0 THEN 'Out' ELSE 'In stock' END\nFROM items;", 'A quantity of zero reads Out. A quantity of 12 reads In stock.');
  lesson('coalesce', 5, 'Filling blanks in a report', ['null'], ['COALESCE('],
    'COALESCE returns the first value that is present. Use it to display a substitute on the report while leaving the original records alone.',
    'SELECT name, COALESCE(rep_id, 0) FROM customers;', 'A customer with rep_id 7 keeps 7. A customer with no rep gets 0 on the report.');
  lesson('text', 5, 'Working with text', ['select'], ['LENGTH(', 'UPPER(', 'LOWER(', 'SUBSTR(', '||'],
    'Use || to join pieces of text. UPPER and LOWER change letter case. LENGTH counts characters, and SUBSTR takes a piece starting from a position. In SQLite, the first character is at position 1.',
    "SELECT UPPER(tier), name || ' (' || city || ')' FROM customers;", 'Gold becomes GOLD. The city appears in parentheses after the customer name.');
  lesson('rounding', 5, 'Rounding a calculation', ['arithmetic'], ['ROUND('],
    'ROUND(value, places) gives a number rounded to that many decimal places. Round after the calculation so you keep the full precision while working.',
    'SELECT ROUND(5.376, 2);', 'The result is 5.38.');
  lesson('safe-math', 5, 'Handling zero and number types', ['arithmetic', 'null'], ['NULLIF(', 'CAST('],
    'NULLIF(a, b) returns NULL when the values match and returns a otherwise. Use it to mark a zero divisor as missing. CAST can turn a whole number into a REAL before dividing so you keep any fraction.',
    'SELECT CAST(1 AS REAL) / NULLIF(2, 0), 1 / NULLIF(0, 0);', 'The first result is 0.5 and the second is NULL.');
  lesson('date', 5, 'Reporting dates and time spans', ['select'], ["strftime('%Y-%m', ", 'date(', 'julianday('],
    'Use strftime to extract parts such as year and month. The date function can move a date forward or back by days. Subtract two julianday values to count the days between dates.',
    "SELECT strftime('%Y-%m', '2026-06-30'),\n  date('2026-06-30', '+2 days'),\n  julianday('2026-06-30') - julianday('2026-06-25');", 'The result is 2026-06 | 2026-07-02 | 5.');
  lesson('sub', 6, 'Using a query inside a query', ['filter'], ['IN ('],
    'A subquery supplies a result for the surrounding query. Use one value for a single comparison, or one column of values with IN. If you expect one value, ask for it explicitly with a calculation such as MAX or AVG.',
    'SELECT name FROM items\nWHERE unit_price > (SELECT AVG(unit_price) FROM items);', 'An item priced at 25 stays on the list if the average price is 20.');
  lesson('exists', 6, 'Finding matching records', ['sub'], ['EXISTS ('],
    'EXISTS tests whether the subquery returns any row. Use it when one match is enough. The column list inside is immaterial, so SELECT 1 is enough.',
    'SELECT name FROM items\nWHERE EXISTS (SELECT 1 FROM order_lines\n  WHERE order_lines.item_id = items.item_id);', 'An item with three sales still appears only once. One sale is enough for the test.');
  lesson('correlated', 6, 'Checking each outer row', ['sub', 'relation-alias'], [],
    'A correlated subquery reads a value from the outer query. Link the inner and outer records with a condition when you need to check each account, order or item on its own.',
    'SELECT c.name FROM customers c\nWHERE NOT EXISTS (SELECT 1 FROM orders o\n  WHERE o.customer_id = c.customer_id);', 'For each account, the check looks for orders with that account’s number. An account without any orders stays on the list.');
  lesson('derived', 6, 'Reading a result as a table', ['sub'], [],
    'Put a SELECT in parentheses after FROM to read its result like a table. Use this when you need to measure or filter values that a first query has already calculated.',
    'SELECT AVG(n) FROM (\n  SELECT city, COUNT(*) AS n FROM customers GROUP BY city\n) AS city_counts;', 'The inner query counts customers in each city. The outer query takes the average of those city counts.');
  lesson('cte', 6, 'Naming the steps with WITH', ['select'], ['WITH'],
    'WITH gives a result a name for the rest of the statement. Later parts of the query can use that result like a table. Put a comma between named steps when you need several.',
    "WITH coast AS (SELECT name FROM customers WHERE region = 'Coast')\nSELECT COUNT(*) FROM coast;", 'The first step collects the Coast accounts. The second counts that list.');
  lesson('window', 7, 'Calculating across related rows', ['select'], ['OVER ('],
    'A window calculation sees several rows while keeping a result for each individual row. OVER states which rows and order the calculation can see. Empty parentheses give it the whole result.',
    'SELECT name, salary, AVG(salary) OVER () FROM employees;', 'Maren Holt keeps her own salary on her row and the staff average appears beside it.');
  lesson('rank', 7, 'Numbering and ranking rows', ['window', 'sort'], ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()'],
    'ROW_NUMBER gives every row its own position. RANK gives tied rows the same place and leaves a gap. DENSE_RANK gives tied rows the same place and closes that gap.',
    'SELECT name, rating, RANK() OVER (ORDER BY rating DESC) FROM vendors;', 'If two vendors share first place, the next vendor is third with RANK and second with DENSE_RANK.');
  lesson('partition', 7, 'Restarting a window by group', ['window'], ['PARTITION BY'],
    'PARTITION BY sets up a separate window for each group of rows. Every original result row stays on the list. A ranking or total starts again when it moves to another group.',
    'SELECT name, category, COUNT(*) OVER (PARTITION BY category)\nFROM items;', 'Each Arms item carries the Arms count of 8, and each item in another category carries that category’s count.');
  lesson('frame', 7, 'Choosing which ordered rows count', ['window', 'sort'], ['ROWS BETWEEN', 'UNBOUNDED PRECEDING', 'CURRENT ROW'],
    'A window frame chooses a range around the current row. ROWS BETWEEN 2 PRECEDING AND CURRENT ROW includes the current row and up to two earlier rows. UNBOUNDED PRECEDING starts at the beginning.',
    'SELECT vendor_id, SUM(rating) OVER (ORDER BY vendor_id\n  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)\nFROM vendors;', 'For vendor 2 the running sum is 7, from ratings of 4 and 3.');
  lesson('lag', 7, 'Comparing with an adjacent row', ['window', 'sort'], ['LAG(', 'LEAD('],
    'LAG reads a value from the preceding row in the window order. LEAD looks ahead. At the edge where that row does not exist, the result is NULL unless you give a different default.',
    'SELECT vendor_id, rating, LAG(rating) OVER (ORDER BY vendor_id)\nFROM vendors;', 'Vendor 1 has no previous rating, and vendor 2 has a previous rating of 4.');
  lesson('insert', 8, 'Adding rows in a practice copy', [], ['INSERT INTO', 'VALUES ('],
    'INSERT adds rows to a table. Name the destination columns and put the values in that same order. In these exercises you work on a fresh practice copy of the books.',
    "INSERT INTO vendors (vendor_id, name, realm, lead_time_days, rating)\nVALUES (9, 'Quay Ropeworks', 'Coastlands', 10, 4);", 'The copy gets a new vendor with ID 9.');
  lesson('update', 8, 'Changing rows in a practice copy', ['filter'], ['UPDATE', 'SET'],
    'UPDATE changes existing rows. SET names the columns and their new values. Use WHERE to choose which rows change, and preview that condition with SELECT before you run the update.',
    'UPDATE vendors SET lead_time_days = 8 WHERE vendor_id = 7;', 'Vendor 7 changes from 7 days to 8 days. Other delivery times stay the same.');
  lesson('delete', 8, 'Removing rows in a practice copy', ['filter'], ['DELETE FROM'],
    'DELETE removes rows. Use WHERE to choose the rows, and preview the same condition with SELECT. A DELETE without WHERE empties the table in your copy.',
    'DELETE FROM employees WHERE employee_id = 12;', 'The employee with ID 12 is removed from the copy. The other employees stay.');
  lesson('create', 8, 'Defining a table', [], ['CREATE TABLE'],
    'CREATE TABLE defines a new table and the names and types of its columns. It creates an empty table ready to receive rows in the copy.',
    'CREATE TABLE dock_notes (note_id INTEGER, body TEXT);', 'The new table has columns note_id and body, and starts with zero rows.');
  lesson('constraints', 8, 'Setting rules for a table', ['create', 'null'], ['PRIMARY KEY', 'NOT NULL', 'UNIQUE', 'CHECK ('],
    'A constraint requires the stored data to follow a rule. A primary key identifies each row. NOT NULL requires a value, UNIQUE rejects duplicate values, and CHECK tests a condition.',
    'CREATE TABLE dock_slots (slot_id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL UNIQUE, crates INTEGER CHECK (crates >= 0));', 'A slot with a name and 3 crates can be stored. A slot with a missing name or a negative crate count is rejected.');
  lesson('view', 8, 'Saving a report as a view', ['select'], ['CREATE VIEW'],
    'A view stores a query under a name. Reading the view runs that query on the current records. Use one for a report that clerks will run repeatedly.',
    "CREATE VIEW coast_accounts AS\nSELECT name, city FROM customers WHERE region = 'Coast';", 'Reading coast_accounts returns the Coast customer names and cities.');
  lesson('index', 8, 'Creating a lookup index', [], ['CREATE INDEX'],
    'An index lets SQLite look up matching values without always scanning the whole table. Choose a column people search often. The index adds work when the table changes and leaves query results the same.',
    'CREATE INDEX idx_orders_customer ON orders (customer_id);', 'The practice copy now has an index for customer lookups in orders.');
  lesson('union', 8, 'Combining result lists', ['select', 'distinct'], ['UNION', 'UNION ALL'],
    'UNION puts two results into one list and removes duplicate rows. UNION ALL keeps every row. Give both queries the same number of columns in matching order.',
    'SELECT city FROM customers\nUNION SELECT realm FROM vendors;', 'A city with many customers appears once, alongside the vendor realms.');
  lesson('transaction', 8, 'Reviewing changes together', [], ['BEGIN', 'COMMIT', 'ROLLBACK'],
    'BEGIN starts a transaction. COMMIT keeps the work. ROLLBACK cancels the uncommitted changes. Read the records inside the transaction to check them before choosing to keep or cancel the work.',
    'BEGIN;\nUPDATE vendors SET rating = 3 WHERE vendor_id = 7;\nSELECT rating FROM vendors WHERE vendor_id = 7;\nROLLBACK;', 'The check inside the transaction reads 3. After ROLLBACK the rating is 5 again.');

  const byId = new Map(CONCEPTS.map(c => [c.id, c]));
  const curriculum = [
    [],
    [['Sorting rows', 'sort'], ['Top and bottom lists', 'limit'], ['Removing duplicates', 'distinct']],
    [['Choosing rows', 'filter', 'boolean'], ['Lists and ranges', 'in', 'between'], ['Patterns and blanks', 'like', 'null']],
    [['Measuring rows', 'agg'], ['Measuring by group', 'group'], ['Keeping groups that qualify', 'having']],
    [['Connecting records', 'join'], ['Keeping unmatched records', 'outer'], ['Two roles for one table', 'self', 'relation-alias']],
    [['Labels and fallback values', 'case', 'coalesce'], ['Text and calculations', 'text', 'rounding', 'safe-math'], ['Dates and time spans', 'date']],
    [['Values from another query', 'sub'], ['Checking related records', 'exists', 'correlated'], ['Named steps and derived results', 'derived', 'cte']],
    [['Numbering and ranking', 'window', 'rank'], ['Groups and running totals', 'partition', 'frame', 'window'], ['Comparing adjacent rows', 'lag']],
    [['Adding, changing and removing rows', 'insert', 'update', 'delete'], ['Tables, views and indexes', 'create', 'constraints', 'view', 'index'], ['Combining lists and reviewing changes', 'union', 'transaction']]
  ];
  function specialists(circle) {
    return (curriculum[circle] || []).map(([title, ...concepts], i) => ({ id: `${circle}.${i}`, title, concepts }));
  }
  const regionConcepts = circle => CONCEPTS.filter(c => c.circle === circle).map(c => c.id);

  /* Tokenize the SQL needed by the game catalog. Literal and quoted identifier
     tokens stay distinct, so names such as "order by" cannot teach a clause. */
  const TOKEN = /--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|'(?:[^']|'')*'|"(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[a-z_][a-z_\d]*|\|\||<>|<=|>=|!=|==|[^\s]/gi;
  function tokens(sql) {
    const engine = typeof Engine === 'undefined' ? require('./engine.js') : Engine;
    return (engine.clean(sql).match(TOKEN) || [])
      .filter(t => !/^(--|\/\*)/.test(t))
      .map(t => /^[a-z_]/i.test(t) ? t.toUpperCase() : t);
  }
  const isIdentifier = name => !!name && /^[A-Z_"`\[]/.test(name);
  const identifier = name => /^(["`\[])/.test(name) ? name.slice(1, -1).toUpperCase() : name;
  const columnBoundary = new Set(['FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'ON', 'USING', 'UNION', 'EXCEPT', 'INTERSECT', 'SET', 'VALUES', 'RETURNING', 'WINDOW', 'INDEXED', 'NOT', 'SELECT', 'ASC', 'DESC', 'END', 'COLLATE']);
  function inspect(sql) {
    const parts = tokens(sql), found = new Set(), tables = new Set();
    const query = parent => ({ parent, aliases: new Set(), names: new Set() });
    const frames = [{ query: query(null), between: 0 }], locations = [];
    const dataset = name => { if (isIdentifier(name)) tables.add(identifier(name).toLowerCase()); };
    const add = (...ids) => ids.forEach(id => found.add(id));
    for (let i = 0; i < parts.length; i++) {
      const t = parts[i], next = parts[i + 1], prev = parts[i - 1];
      let frame = frames.at(-1);
      if (t === '(') {
        const nested = next === 'SELECT' || next === 'WITH';
        if (nested && prev !== 'AS') add('sub');
        frame = { query: nested ? query(frame.query) : frame.query, between: 0,
          window: prev === 'OVER' || frame.window, cast: prev === 'CAST', derived: nested && ['FROM', 'JOIN'].includes(prev) };
        frames.push(frame);
      }
      if (t === ')' && frames.length > 1) {
        const closed = frames.pop();
        if (closed.derived) {
          const explicit = next === 'AS', alias = parts[i + (explicit ? 2 : 1)];
          if (isIdentifier(alias) && !columnBoundary.has(alias)) {
            frames.at(-1).query.aliases.add(identifier(alias));
            add('relation-alias');
            if (explicit) i++;
          }
        }
      }
      if ([';', 'UNION', 'EXCEPT', 'INTERSECT'].includes(t)) frame.query = query(frame.query.parent);
      locations[i] = frame.query;
      if (t === 'SELECT') { add('select'); frame.projection = true; }
      if (t === 'FROM' || t === ';' || columnBoundary.has(t) && t !== 'SELECT' && t !== 'END') frame.projection = false;
      if (t === 'ORDER' && next === 'BY' || ['ASC', 'DESC'].includes(t)) add('sort');
      if (t === 'LIMIT') add('limit');
      if (t === 'DISTINCT') add('distinct');
      if (['+', '-', '/', '%'].includes(t) ||
          (t === '*' && !['SELECT', 'DISTINCT', '(', '.'].includes(prev) && next !== 'FROM')) add('arithmetic');
      if (t === 'WHERE') add('filter');
      if (frame.window && ['ROWS', 'RANGE', 'GROUPS'].includes(t) &&
          ['BETWEEN', 'UNBOUNDED', 'CURRENT'].includes(next)) add('frame');
      if (t === 'BETWEEN') {
        frame.between++;
        if (!frame.window || !['ROWS', 'RANGE', 'GROUPS'].includes(prev)) add('between');
      }
      if (t === 'AND') {
        if (frame.between) frame.between--;
        else add('boolean');
      }
      if (t === 'OR' || (t === 'NOT' && !['NULL', 'EXISTS', 'IN', 'LIKE', 'BETWEEN', 'INDEXED'].includes(next) && prev !== 'IS')) add('boolean');
      if (t === 'IN' && next === '(') add('in');
      if (t === 'LIKE' || t === 'GLOB') add('like');
      if (t === 'NULL' && !(prev === 'NOT' && parts[i - 2] !== 'IS' && found.has('create'))) add('null');
      if (['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'TOTAL', 'GROUP_CONCAT'].includes(t) && next === '(') add('agg');
      if (t === 'GROUP' && next === 'BY') add('group');
      if (t === 'HAVING') add('having');
      if (t === 'JOIN') { add('join'); if (['LEFT', 'RIGHT', 'FULL', 'OUTER'].includes(prev)) add('outer'); }
      if (t === 'CASE') add('case');
      if (['COALESCE', 'IFNULL'].includes(t) && next === '(') add('coalesce');
      if (t === '||' || (['UPPER', 'LOWER', 'LENGTH', 'SUBSTR', 'SUBSTRING', 'TRIM', 'LTRIM', 'RTRIM', 'REPLACE', 'INSTR', 'PRINTF'].includes(t) && next === '(')) add('text');
      if (t === 'ROUND' && next === '(') add('rounding');
      if (['CAST', 'NULLIF'].includes(t) && next === '(') add('safe-math');
      if (['DATE', 'TIME', 'STRFTIME', 'JULIANDAY', 'DATETIME', 'UNIXEPOCH'].includes(t) && next === '(') add('date');
      if (t === 'EXISTS' && next === '(') add('exists');
      if (t === 'WITH') add('cte');
      if (t === 'OVER' && next === '(') add('window');
      if (['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE'].includes(t) && next === '(') add('rank');
      if (t === 'PARTITION' && next === 'BY') add('partition');
      if (['LAG', 'LEAD'].includes(t) && next === '(') add('lag');
      if (t === 'INSERT' || t === 'REPLACE' && next === 'INTO') add('insert');
      if (t === 'UPDATE') { add('update'); dataset(next); if (isIdentifier(next)) frame.query.aliases.add(identifier(next)); }
      if (t === 'DELETE') add('delete');
      if (t === 'TABLE' && ['CREATE', 'TEMP', 'TEMPORARY'].includes(prev)) { add('create'); dataset(next); }
      if (t === 'VIEW' && ['CREATE', 'TEMP', 'TEMPORARY'].includes(prev)) { add('view'); dataset(next); }
      if (t === 'INDEX' && ['CREATE', 'UNIQUE'].includes(prev)) add('index');
      if ((t === 'PRIMARY' && next === 'KEY') || (t === 'NOT' && next === 'NULL' && prev !== 'IS') || t === 'UNIQUE' || t === 'CHECK' || t === 'REFERENCES') add('constraints');
      if (['UNION', 'EXCEPT', 'INTERSECT'].includes(t)) add('union');
      if (['BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE'].includes(t)) add('transaction');

      if (t === 'FROM' || t === 'JOIN' || t === 'INTO') {
        if (next === '(' && t !== 'INTO') add('derived');
        if (isIdentifier(next)) {
          const relation = identifier(next), scope = frame.query;
          if (t === 'JOIN' && scope.names.has(relation)) add('self');
          scope.names.add(relation);
          scope.aliases.add(relation);
          dataset(next);
          const explicit = parts[i + 2] === 'AS', alias = parts[i + (explicit ? 3 : 2)];
          if (t !== 'INTO' && isIdentifier(alias) && !columnBoundary.has(alias)) {
            scope.aliases.add(identifier(alias));
            add('relation-alias');
            if (explicit) i += 2;
          }
        }
      }
      if (t === 'ON' && found.has('index')) dataset(next);
      if (t === 'AS' && next !== '(' && !frame.cast && parts[i - 2] !== 'VIEW') add('alias');
      // SQLite accepts a result name without AS. Look only at the end of
      // a projected expression, outside function calls and table clauses.
      if (frame.projection && isIdentifier(t) && !columnBoundary.has(t) &&
          (!next || next === ',' || next === ';' || next === ')' || columnBoundary.has(next)) &&
          (prev === ')' || isIdentifier(prev) && !columnBoundary.has(prev) && !['DISTINCT', 'ALL', 'WHEN', 'THEN', 'ELSE'].includes(prev) ||
            /^[0-9']/.test(prev || ''))) add('alias');
    }
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i + 1] !== '.' || !isIdentifier(parts[i]) || !locations[i]) continue;
      const name = identifier(parts[i]), current = locations[i];
      if (current.aliases.has(name)) continue;
      for (let parent = current.parent; parent; parent = parent.parent) {
        if (parent.aliases.has(name)) { add('correlated'); break; }
      }
    }
    const cteNames = new Set(parts.flatMap((t, i) => (parts[i - 1] === 'WITH' || parts[i - 1] === ',') &&
      parts[i + 1] === 'AS' && parts[i + 2] === '(' ? [identifier(t).toLowerCase()] : []));
    for (const name of cteNames) tables.delete(name);
    return { concepts: CONCEPTS.filter(c => found.has(c.id)).map(c => c.id), datasets: [...tables].sort() };
  }

  const conceptsFor = sql => inspect(sql).concepts;


  // Bounty identity survives a new question. A requested family never falls
  // across to another family if its eligible pool happens to be empty.
  const bountyFamily = {
    b101: 'sort', b102: 'limit', b103: 'distinct', b104: 'arithmetic',
    b201: 'boolean', b202: 'filter', b203: 'null', b204: 'like', b205: 'between',
    b301: 'group-count', b302: 'group-measure', b303: 'having', b304: 'agg',
    b401: 'order-join', b402: 'vendor-join', b403: 'revenue-join', b404: 'missing-join',
    b501: 'case', b502: 'month', b503: 'date', b504: 'side-by-side',
    b601: 'scalar', b602: 'in-subquery', b603: 'exists', b604: 'cte',
    b701: 'rank', b702: 'running', b703: 'partition-rank', b704: 'lag',
    b801: 'update', b802: 'delete', b803: 'insert', b804: 'union'
  };
  const catalog = [];
  function questions(r, family, specialist, rows) {
    for (const [variant, ask, ret, sql, order, options] of rows) {
      catalog.push({ id: `practice.${r}.${variant}`, r, kind: 'read',
        title: specialists(r)[specialist]?.title || 'Reading the records',
        specialist: r ? `${r}.${specialist}` : 'intro',
        family, variant, ask, ret, sql, order, ...options });
    }
  }
  function contracts(family, specialist, ids) {
    for (const id of ids.split(' ')) {
      const task = source.CONTRACTS.find(t => t.id === id);
      catalog.push({ ...task, specialist: `${task.r}.${specialist}`, family });
    }
  }

  questions(0, 'select', 'intro', [
    ['column-text', 'Show the name of every vendor.', 'name', 'SELECT name FROM vendors'],
    ['column-number', 'Show the stock quantity for every item, including quantities that occur more than once.', 'stock_qty', 'SELECT stock_qty FROM items'],
    ['two-fields', 'Show each customer’s name followed by their city.', 'name, city', 'SELECT name, city FROM customers'],
    ['two-reordered', 'Show the hire date followed by the name for every employee.', 'hire_date, name', 'SELECT hire_date, name FROM employees'],
    ['three-fields', 'Show the order number, date and status for every order, in that column order.', 'order_id, order_date, status', 'SELECT order_id, order_date, status FROM orders'],
    ['three-reordered', 'Show the realm, rating and name of every vendor in that column order.', 'realm, rating, name', 'SELECT realm, rating, name FROM vendors'],
    ['whole-table', 'Show every row and column of the employees table in its original column order.', 'all columns', 'SELECT * FROM employees'],
    ['four-reordered', 'Show each item’s category, name, stock quantity and price in that column order.', 'category, name, stock_qty, unit_price', 'SELECT category, name, stock_qty, unit_price FROM items']
  ]);
  questions(1, 'sort', 0, [
    ['sort-text-only', 'Show just the vendor names from A to Z.', 'name', 'SELECT name FROM vendors ORDER BY name', [0]],
    ['sort-text-reverse', 'Show each customer’s city and name, with names from Z to A.', 'city, name', 'SELECT city, name FROM customers ORDER BY name DESC', [1]],
    ['sort-number-up', 'Show the item name and price with the cheapest first. Items with equal prices can come in either order.', 'name, unit_price', 'SELECT name, unit_price FROM items ORDER BY unit_price ASC', [1]],
    ['sort-number-down', 'Show each employee’s salary followed by name, with salaries highest first.', 'salary, name', 'SELECT salary, name FROM employees ORDER BY salary DESC', [0]],
    ['sort-date', 'Show the order date, status and order number, with the newest dates first. Orders on the same date can appear in any order.', 'order_date, status, order_id', 'SELECT order_date, status, order_id FROM orders ORDER BY order_date DESC', [0]],
    ['sort-mixed-keys', 'Show each vendor’s realm, rating and name. Sort realms from A to Z and, within a realm, put higher ratings first.', 'realm, rating, name', 'SELECT realm, rating, name FROM vendors ORDER BY realm ASC, rating DESC', [0, 1]],
    ['sort-two-text-keys', 'Show each customer’s city and name. Sort cities from Z to A and names from A to Z within each city.', 'city, name', 'SELECT city, name FROM customers ORDER BY city DESC, name', [0, 1]],
    ['sort-three-keys', 'Show category, price, name and quantity for each item. Sort categories from A to Z, prices from high to low within each category, then names from A to Z when both match.', 'category, unit_price, name, stock_qty', 'SELECT category, unit_price, name, stock_qty FROM items ORDER BY category, unit_price DESC, name', [0, 1, 2]]
  ]);
  questions(1, 'limit', 1, [
    ['limit-name-prefix', 'Show just the first four customer names in alphabetical order.', 'name', 'SELECT name FROM customers ORDER BY name LIMIT 4', [0]],
    ['limit-first-date', 'Show the name and hire date of the earliest hire.', 'name, hire_date', 'SELECT name, hire_date FROM employees ORDER BY hire_date LIMIT 1', [1]],
    ['limit-short-delivery', 'Show the three shortest delivery times with the vendor name first. Sort shortest first, breaking ties by name from A to Z.', 'name, lead_time_days', 'SELECT name, lead_time_days FROM vendors ORDER BY lead_time_days, name LIMIT 3', [1, 0]],
    ['limit-high-price', 'Show the prices and names of the five most expensive items, with prices highest first and names from Z to A for ties.', 'unit_price, name', 'SELECT unit_price, name FROM items ORDER BY unit_price DESC, name DESC LIMIT 5', [0, 1]],
    ['limit-low-stock', 'Show the name, category and quantity of the six items with least stock. Sort by quantity from low to high, then name from A to Z.', 'name, category, stock_qty', 'SELECT name, category, stock_qty FROM items ORDER BY stock_qty, name LIMIT 6', [2, 0]],
    ['limit-recent-orders', 'Show the dates, order numbers and statuses of the five newest orders. For the same date, put the larger order number first.', 'order_date, order_id, status', 'SELECT order_date, order_id, status FROM orders ORDER BY order_date DESC, order_id DESC LIMIT 5', [0, 1]],
    ['limit-category-list', 'Show the first five item names and categories after sorting categories from A to Z and names from Z to A within each category.', 'name, category', 'SELECT name, category FROM items ORDER BY category, name DESC LIMIT 5', [1, 0]],
    ['limit-delivery-three-keys', 'Show the four vendors with the highest ratings. Break ties first by the shortest delivery time, then by name from A to Z. Return their names, ratings and delivery times in that column order.', 'name, rating, lead_time_days', 'SELECT name, rating, lead_time_days FROM vendors ORDER BY rating DESC, lead_time_days, name LIMIT 4', [1, 2, 0]]
  ]);
  questions(1, 'distinct', 2, [
    ['unique-one', 'Show which city names occur in the customer table, with each city once. Any row order is fine.', 'city', 'SELECT DISTINCT city FROM customers'],
    ['unique-one-alpha', 'Show the vendor realms from A to Z. Include each realm once.', 'realm', 'SELECT DISTINCT realm FROM vendors ORDER BY realm', [0]],
    ['unique-one-numeric', 'Show each vendor rating once, highest rating first.', 'rating', 'SELECT DISTINCT rating FROM vendors ORDER BY rating DESC', [0]],
    ['unique-pair', 'Show each different customer tier and city combination, in that column order. Any row order is fine.', 'tier, city', 'SELECT DISTINCT tier, city FROM customers'],
    ['unique-pair-mixed-sort', 'Show each combination of purchase-order status and vendor number once. Sort status from A to Z and vendor numbers from high to low within a status.', 'status, vendor_id', 'SELECT DISTINCT status, vendor_id FROM purchase_orders ORDER BY status, vendor_id DESC', [0, 1]],
    ['unique-triple', 'Show each different combination of region, city and tier from the customer table, in that column order.', 'region, city, tier', 'SELECT DISTINCT region, city, tier FROM customers'],
    ['unique-top-values', 'Show the three highest different vendor ratings, highest first. Repeated ratings should take up only one row.', 'rating', 'SELECT DISTINCT rating FROM vendors ORDER BY rating DESC LIMIT 3', [0]],
    ['unique-pair-prefix', 'Show the five earliest different date and status combinations from orders. For the same date, order the statuses from A to Z. Return the date followed by status.', 'order_date, status', 'SELECT DISTINCT order_date, status FROM orders ORDER BY order_date, status LIMIT 5', [0, 1]]
  ]);
  questions(1, 'arithmetic', null, [
    ['calc-margin', 'Show each item’s name and its price minus its cost. Name that result margin.', 'name, margin', 'SELECT name, unit_price - unit_cost AS margin FROM items'],
    ['calc-stock', 'Show each item’s name, then quantity times cost as stock_value. Sort largest stock value first. Equal values may appear in either order.', 'name, stock_value', 'SELECT name, stock_qty * unit_cost AS stock_value FROM items ORDER BY stock_value DESC', [1]],
    ['calc-pair', 'Show employee name, monthly salary and salary times 12 as annual_pay, in that order. Sort from lowest annual pay to highest.', 'name, salary, annual_pay', 'SELECT name, salary, salary * 12 AS annual_pay FROM employees ORDER BY annual_pay ASC', [2]],
    ['calc-remaining', 'Show the four invoices with the greatest amount still due, sorted from largest to smallest balance. Break ties by smaller invoice number. Return invoice number and amount minus amount_paid as balance.', 'invoice_id, balance', 'SELECT invoice_id, amount - amount_paid AS balance FROM invoices ORDER BY balance DESC, invoice_id LIMIT 4', [1, 0]],
    ['calc-reverse', 'Show each employee’s annual pay plus a 100 gold bonus as annual_with_bonus, followed by their name. Put the highest amount first.', 'annual_with_bonus, name', 'SELECT salary * 12 + 100 AS annual_with_bonus, name FROM employees ORDER BY annual_with_bonus DESC', [0]],
    ['calc-two-values', 'Show each item’s name, price minus cost as margin, and quantity times cost as stock_value. Leave the rows in any order.', 'name, margin, stock_value', 'SELECT name, unit_price - unit_cost AS margin, stock_qty * unit_cost AS stock_value FROM items']
  ]);

  contracts('filter', 0, 'c201 c202');
  contracts('boolean', 0, 'c203 c209');
  questions(2, 'boolean', 0, [
    ['or-vendor', 'Show the names and ratings of vendors with a rating of 5 or a lead time of at most 14 days.', 'name, rating', 'SELECT name, rating FROM vendors WHERE rating = 5 OR lead_time_days <= 14'],
    ['not-delayed', 'Show the vendor names and delivery times for days other than 14, keeping only vendors rated at least 4.', 'name, lead_time_days', 'SELECT name, lead_time_days FROM vendors WHERE NOT (lead_time_days = 14) AND rating >= 4'],
    ['low-stock-paired', 'List items whose stock count is positive and below their reorder point. Return their names and stock counts with the lowest counts first.', 'name, stock_qty', 'SELECT name, stock_qty FROM items WHERE stock_qty > 0 AND stock_qty < reorder_point ORDER BY stock_qty', [1]]
  ]);
  contracts('in', 1, 'c204');
  contracts('between', 1, 'c205 c210');
  questions(2, 'in', 1, [
    ['outside-list', 'Show the status and order number of every order that is neither Cancelled nor Open.', 'status, order_id', "SELECT status, order_id FROM orders WHERE status NOT IN ('Cancelled', 'Open')"]
  ]);
  questions(2, 'between', 1, [
    ['outside-range', 'Show the name and rating of vendors with ratings below 3 or above 4.', 'name, rating', 'SELECT name, rating FROM vendors WHERE rating NOT BETWEEN 3 AND 4'],
    ['range-and-kind', 'Show the names and prices of Tools priced from 3 through 30 gold, including the endpoints. Sort by name from A to Z.', 'name, unit_price', "SELECT name, unit_price FROM items WHERE category = 'Tools' AND unit_price BETWEEN 3 AND 30 ORDER BY name", [0]]
  ]);
  contracts('like', 2, 'c206');
  contracts('null', 2, 'c207 c208');
  questions(2, 'like', 2, [
    ['like-prefix', 'Show just the names of customers whose names start with The followed by a space.', 'name', "SELECT name FROM customers WHERE name LIKE 'The %'"],
    ['like-suffix', 'Show names and realms for vendors whose names end in Mills or Looms.', 'name, realm', "SELECT name, realm FROM vendors WHERE name LIKE '%Mills' OR name LIKE '%Looms'"]
  ]);
  questions(2, 'null', 2, [
    ['known-delivery', 'Show the purchase-order number and received date for deliveries with a recorded arrival date.', 'po_id, received_date', 'SELECT po_id, received_date FROM purchase_orders WHERE received_date IS NOT NULL'],
    ['not-assigned-pattern', 'Show names and cities for customers with no assigned sales factor whose names have a space in them.', 'name, city', "SELECT name, city FROM customers WHERE rep_id IS NULL AND name LIKE '% %'"]
  ]);

  contracts('agg', 0, 'c301 c302 c303 c309');
  questions(3, 'agg', 0, [
    ['filtered-extremes', 'Return the earliest and latest bill dates for invoices that have been paid in full.', 'oldest, newest', 'SELECT MIN(invoice_date), MAX(invoice_date) FROM invoices WHERE paid_date IS NOT NULL']
  ]);
  contracts('group-count', 1, 'c304 c306');
  contracts('group-measure', 1, 'c305');
  questions(3, 'group-measure', 1, [
    ['pair-groups', 'For each customer city and tier combination that occurs in the table, show the city, tier and lowest credit limit in that combination.', 'city, tier, lowest', 'SELECT city, tier, MIN(credit_limit) FROM customers GROUP BY city, tier'],
    ['knowns-by-tier', 'For each tier, show the tier, its total customer count and its count of customers with known sales factors.', 'tier, customers, with_rep', 'SELECT tier, COUNT(*), COUNT(rep_id) FROM customers GROUP BY tier'],
    ['sum-and-order', 'Show each vendor number in the item table and the total units of stock it supplies, largest total first. Equal totals may come in either order.', 'vendor_id, units', 'SELECT vendor_id, SUM(stock_qty) FROM items GROUP BY vendor_id ORDER BY SUM(stock_qty) DESC', [1]]
  ]);
  contracts('having', 2, 'c307 c308');
  questions(3, 'having', 2, [
    ['having-range', 'Show the category and highest price in categories with a most expensive item costing at least 40 gold.', 'category, highest', 'SELECT category, MAX(unit_price) FROM items GROUP BY category HAVING MAX(unit_price) >= 40'],
    ['having-count-gap', 'Show each tier with at least one customer missing a sales factor. Give tier, all customer count, and count with a factor.', 'tier, customers, with_rep', 'SELECT tier, COUNT(*), COUNT(rep_id) FROM customers GROUP BY tier HAVING COUNT(*) > COUNT(rep_id)'],
    ['having-total', 'Show item numbers and total quantities from order_lines. Include only items whose total quantity is greater than 50.', 'item_id, units', 'SELECT item_id, SUM(qty) FROM order_lines GROUP BY item_id HAVING SUM(qty) > 50']
  ]);


  contracts('order-join', 0, 'c401 c404');
  contracts('vendor-join', 0, 'c402 c403');
  contracts('revenue-join', 0, 'c405 c406');
  questions(4, 'order-join', 0, [
    ['join-purchase-id', 'Show purchase order number, vendor name and order date on each Cancelled purchase order.', 'po_id, vendor, order_date', "SELECT p.po_id, v.name, p.order_date FROM purchase_orders p JOIN vendors v ON p.vendor_id = v.vendor_id WHERE p.status = 'Cancelled'"]
  ]);
  contracts('missing-join', 1, 'c407 c408 c409 c411');
  questions(4, 'missing-join', 1, [
    ['join-optional-manager', 'Show every customer name, then the name and role of the assigned sales factor. Leave both factor columns NULL for unassigned customers.', 'customer, factor, role', 'SELECT c.name, e.name, e.role FROM customers c LEFT JOIN employees e ON c.rep_id = e.employee_id'],
    ['join-purchase-match', 'Show the name and purchase-order number for each vendor and its Open purchase orders. Keep a vendor with no Open purchase order as a row with a NULL order number.', 'vendor, po_id', "SELECT v.name, p.po_id FROM vendors v LEFT JOIN purchase_orders p ON p.vendor_id = v.vendor_id AND p.status = 'Open'"]
  ]);
  contracts('self', 2, 'c410');
  questions(4, 'self', 2, [
    ['self-peer', 'List pairs of different vendors in the same realm. Give both names and their shared realm. Put the lower vendor number first in each pair so it appears once.', 'first vendor, second vendor, realm', 'SELECT v.name, peer.name, v.realm FROM vendors v JOIN vendors peer ON peer.realm = v.realm AND v.vendor_id < peer.vendor_id'],
    ['self-tie', 'Find pairs of orders placed by the same customer on the same date. Return the lower order number, higher order number and shared date. List each pair once.', 'first order, second order, order_date', 'SELECT o.order_id, peer.order_id, o.order_date FROM orders o JOIN orders peer ON peer.customer_id = o.customer_id AND peer.order_date = o.order_date AND o.order_id < peer.order_id'],
    ['self-aggregate', 'Show each manager’s name and the number of employees directly reporting to that manager. Include managers with at least one report.', 'manager, reports', 'SELECT m.name, COUNT(*) FROM employees m JOIN employees e ON m.employee_id = e.manager_id GROUP BY m.employee_id, m.name'],
    ['self-chain', 'Show each employee who reports to someone who also has a manager. Return the employee name, direct manager name and that manager’s manager, in that order.', 'employee, manager, senior manager', 'SELECT e.name, m.name, lead.name FROM employees e JOIN employees m ON m.employee_id = e.manager_id JOIN employees lead ON lead.employee_id = m.manager_id']
  ]);

  contracts('case', 0, 'c501');
  contracts('coalesce', 0, 'c502');
  questions(5, 'case', 0, [
    ['status-label', 'Show each order number and a tag. Use Sent for Shipped, Waiting for Open and Void for Cancelled.', 'order_id, tag', "SELECT order_id, CASE status WHEN 'Shipped' THEN 'Sent' WHEN 'Open' THEN 'Waiting' ELSE 'Void' END AS tag FROM orders"]
  ]);
  questions(5, 'coalesce', 0, [
    ['fallback-date', 'Show each purchase order number and the received date. Where the received date is missing, show the expected date instead.', 'po_id, delivery_date', 'SELECT po_id, COALESCE(received_date, expected_date) AS delivery_date FROM purchase_orders'],
    ['fallback-three', 'Show the invoice number and the first available date in this sequence. Use paid_date first, then due_date, then invoice_date.', 'invoice_id, recorded_date', 'SELECT invoice_id, COALESCE(paid_date, due_date, invoice_date) FROM invoices']
  ]);
  contracts('text-math', 1, 'c503 c504 c510')
  contracts('side-by-side', 0, 'c507')
  contracts('side-by-side', 1, 'c509');
  questions(5, 'text-math', 1, [
    ['label-length', 'Show each vendor’s name in lowercase and the number of characters in the original name, including spaces.', 'name, length', 'SELECT LOWER(name), LENGTH(name) FROM vendors'],
    ['safe-quotient', 'Show the item name and price divided by stock quantity. Return NULL for items with no units in stock, and round the result to two decimal places.', 'name, per_unit', 'SELECT name, ROUND(unit_price / NULLIF(stock_qty, 0), 2) FROM items'],
    ['safe-percent', 'Show each invoice number and its paid percentage. Use 100 times amount_paid divided by amount, show NULL for a zero amount and round to one decimal place.', 'invoice_id, percent_paid', 'SELECT invoice_id, ROUND(100.0 * amount_paid / NULLIF(amount, 0), 1) FROM invoices'],
    ['abbr-and-percent', 'Find invoices with a known payment date. Show each invoice number, the first seven characters of the payment date, and its paid share to two decimal places. Return NULL for a zero amount.', 'invoice_id, paid_month, share', 'SELECT invoice_id, SUBSTR(paid_date, 1, 7), ROUND(amount_paid / NULLIF(amount, 0), 2) FROM invoices WHERE paid_date IS NOT NULL']
  ]);
  contracts('month', 2, 'c505');
  contracts('date', 2, 'c506 c508');
  questions(5, 'month', 2, [
    ['day-part', 'Show each purchase order number and the day of its expected delivery as two digits, such as 05.', 'po_id, expected_day', "SELECT po_id, strftime('%d', expected_date) FROM purchase_orders"]
  ]);
  questions(5, 'date', 2, [
    ['date-add-week', 'Show each invoice number and the date seven days after the due date, written as YYYY-MM-DD.', 'invoice_id, reminder_date', "SELECT invoice_id, date(due_date, '+7 days') FROM invoices"],
    ['date-arrival-gap', 'Show purchase order number and the number of days from order to arrival, using only orders with a received date. Put shorter waits first, with equal waits in any order.', 'po_id, days', 'SELECT po_id, julianday(received_date) - julianday(order_date) AS days FROM purchase_orders WHERE received_date IS NOT NULL ORDER BY days', [1]]
  ]);

  contracts('scalar', 0, 'c601');
  contracts('in-subquery', 0, 'c602');
  questions(6, 'scalar', 0, [
    ['scalar-plus-column', 'Show each employee’s name and how far their salary is above the lowest salary in the whole staff table. Name the difference above_lowest.', 'name, above_lowest', 'SELECT name, salary - (SELECT MIN(salary) FROM employees) AS above_lowest FROM employees'],
    ['scalar-latest', 'Show the number and order date of every purchase order on the newest recorded purchase-order date. Include ties.', 'po_id, order_date', 'SELECT po_id, order_date FROM purchase_orders WHERE order_date = (SELECT MAX(order_date) FROM purchase_orders)']
  ]);
  questions(6, 'in-subquery', 0, [
    ['sub-in-unshipped', 'Show vendors whose vendor number appears on at least one Open purchase order. Return name and realm once per vendor.', 'name, realm', "SELECT name, realm FROM vendors WHERE vendor_id IN (SELECT vendor_id FROM purchase_orders WHERE status = 'Open')"],
    ['sub-not-in', 'Show customer names and cities for accounts whose numbers do not appear in the orders table. Every order has a recorded customer number.', 'name, city', 'SELECT name, city FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders)']
  ]);
  contracts('exists', 1, 'c603 c604 c608');
  questions(6, 'exists', 1, [
    ['exists-two-checks', 'Show the names of vendors that have items in the stock table and have at least one Cancelled purchase order. List each vendor once.', 'name', "SELECT v.name FROM vendors v WHERE EXISTS (SELECT 1 FROM items i WHERE i.vendor_id = v.vendor_id) AND EXISTS (SELECT 1 FROM purchase_orders p WHERE p.vendor_id = v.vendor_id AND p.status = 'Cancelled')"],
    ['correlated-line-count', 'Show each purchase order number and its line count. Give zero for any purchase order with no lines.', 'po_id, lines', 'SELECT p.po_id, (SELECT COUNT(*) FROM po_lines l WHERE l.po_id = p.po_id) AS lines FROM purchase_orders p']
  ]);
  contracts('cte', 2, 'c605 c606 c607 c609 c610');
  questions(6, 'cte', 2, [
    ['derived-filter', 'Show the vendor number and count of purchase orders for vendors with at least five purchase orders. First count by vendor in a subquery in FROM, then filter those counts.', 'vendor_id, n', 'SELECT vendor_id, n FROM (SELECT vendor_id, COUNT(*) AS n FROM purchase_orders GROUP BY vendor_id) AS counts WHERE n >= 5'],
    ['derived-max-and-count', 'Find the largest city customer count and the number of distinct cities with customer accounts. Count each city’s customers first using a subquery in FROM.', 'max_customers, cities', 'SELECT MAX(n), COUNT(*) FROM (SELECT city, COUNT(*) AS n FROM customers GROUP BY city) AS counts']
  ]);

  contracts('rank', 0, 'c701');
  questions(7, 'rank', 0, [
    ['rank-number-all', 'Number the employees in hire-date order from earliest to latest, using smaller employee numbers first if dates tie. Return hire date, name and sequence number in that column order. Sort by the sequence number.', 'hire_date, name, sequence', 'SELECT hire_date, name, ROW_NUMBER() OVER (ORDER BY hire_date, employee_id) AS sequence FROM employees ORDER BY sequence', [2], { must: ['window'] }],
    ['rank-vendor-dense', 'Show each vendor’s name, rating and rating rank, with the highest rating first. Give tied ratings the same rank and continue without gaps. Tied vendors can appear in any order.', 'name, rating, rating_rank', 'SELECT name, rating, DENSE_RANK() OVER (ORDER BY rating DESC) AS rating_rank FROM vendors ORDER BY rating_rank', [2], { must: ['window'] }],
    ['rank-vendor-pair', 'Show each vendor’s name and rating, then its rating rank with gaps and its rating rank without gaps. The highest rating ranks first, and equal ratings tie.', 'name, rating, rank_with_gaps, rank_without_gaps', 'SELECT name, rating, RANK() OVER (ORDER BY rating DESC), DENSE_RANK() OVER (ORDER BY rating DESC) FROM vendors', null, { must: ['window'] }],
    ['rank-two-measures', 'Show each item name and two no-gap ranks. Rank the highest unit price first for the first rank, and rank the highest stock quantity first for the second. Tied values share the same rank.', 'name, price_rank, stock_rank', 'SELECT name, DENSE_RANK() OVER (ORDER BY unit_price DESC), DENSE_RANK() OVER (ORDER BY stock_qty DESC) FROM items', null, { must: ['window'] }]
  ]);
  contracts('partition-rank', 1, 'c702 c703 c707');
  contracts('running', 1, 'c704 c706 c709');
  questions(7, 'running', 1, [
    ['partition-running', 'Show order number, status and the running count in that status. Start at one within each status and process orders by increasing order number. List the results by order number.', 'order_id, status, running_count', 'SELECT order_id, status, COUNT(*) OVER (PARTITION BY status ORDER BY order_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM orders ORDER BY order_id', [0], { must: ['window'] }],
    ['partition-moving', 'Show vendor number, realm and the average rating over that vendor and the preceding vendor in the same realm, ordered by vendor number. Use just the first vendor at the start of each realm.', 'vendor_id, realm, moving_average', 'SELECT vendor_id, realm, AVG(rating) OVER (PARTITION BY realm ORDER BY vendor_id ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) FROM vendors', null, { must: ['window'] }]
  ]);
  contracts('lag', 2, 'c705');
  questions(7, 'lag', 2, [
    ['lag-date', 'Show employee number, hire date and previous employee hire date when ordered by hire date, with lower employee numbers first on ties. Leave the first previous date NULL.', 'employee_id, hire_date, previous_hire', 'SELECT employee_id, hire_date, LAG(hire_date) OVER (ORDER BY hire_date, employee_id) FROM employees', null, { must: ['window'] }],
    ['lead-rating', 'Show each vendor number, rating and the next vendor’s rating in increasing vendor number order. Leave the last next rating NULL.', 'vendor_id, rating, next_rating', 'SELECT vendor_id, rating, LEAD(rating) OVER (ORDER BY vendor_id) FROM vendors', null, { must: ['window'] }],
    ['lag-reset', 'Show customer number, region and the change in credit limit from the previous customer in the same region, in increasing customer number order. Use NULL for the first customer in each region.', 'customer_id, region, credit_change', 'SELECT customer_id, region, credit_limit - LAG(credit_limit) OVER (PARTITION BY region ORDER BY customer_id) FROM customers', null, { must: ['window'] }],
    ['lag-lead-together', 'Show each vendor number, the previous vendor’s rating and the next vendor’s rating in increasing vendor number order. Use NULL when a neighbor is missing.', 'vendor_id, previous_rating, next_rating', 'SELECT vendor_id, LAG(rating) OVER (ORDER BY vendor_id), LEAD(rating) OVER (ORDER BY vendor_id) FROM vendors', null, { must: ['window'] }]
  ]);

  contracts('insert', 0, 'c801 c806');
  contracts('update', 0, 'c802 c803 c808');
  contracts('delete', 0, 'c804');
  questions(8, 'insert', 0, [
    ['insert-multirow', "In the practice copy, add vendors 9 and 10. Use Quay Ropes, Coastlands, 8 days and rating 4 for 9. Use Highroad Tools, Northmarch, 12 days and rating 5 for 10.", 'vendor_id, name, realm, lead_time_days, rating', "INSERT INTO vendors (vendor_id, name, realm, lead_time_days, rating) VALUES (9, 'Quay Ropes', 'Coastlands', 8, 4), (10, 'Highroad Tools', 'Northmarch', 12, 5)", null, { kind: 'dml', check: 'SELECT * FROM vendors ORDER BY vendor_id' }]
  ]);
  questions(8, 'delete', 0, [
    ['delete-vendor', 'In the practice copy, remove vendor number 8.', 'vendor_id', 'DELETE FROM vendors WHERE vendor_id = 8', null, { kind: 'dml', check: 'SELECT vendor_id FROM vendors ORDER BY vendor_id' }],
    ['delete-unreceived', "In the practice copy, remove purchase orders with status Cancelled and no received date.", 'po_id', "DELETE FROM purchase_orders WHERE status = 'Cancelled' AND received_date IS NULL", null, { kind: 'dml', check: 'SELECT po_id FROM purchase_orders ORDER BY po_id' }]
  ]);
  contracts('create', 1, 'c805');
  contracts('view', 1, 'c809');
  contracts('index', 1, 'c810');
  questions(8, 'create', 1, [
    ['schema-vendor-view', 'In the practice copy, save a view called fast_vendors with the vendor name and lead_time_days for vendors that deliver within 14 days.', 'name, lead_time_days', 'CREATE VIEW fast_vendors AS SELECT name, lead_time_days FROM vendors WHERE lead_time_days <= 14', null, { kind: 'dml', family: 'view', check: 'SELECT name, lead_time_days FROM fast_vendors ORDER BY name' }],
    ['schema-compound-index', 'In the practice copy, create an index called idx_items_supplier on items. Index vendor_id first and category second.', 'seqno, name', 'CREATE INDEX idx_items_supplier ON items (vendor_id, category)', null, { kind: 'dml', family: 'index', check: "SELECT seqno, name FROM pragma_index_info('idx_items_supplier') ORDER BY seqno" }],
    ['schema-two-rules', 'Create dock_labels in the practice copy with an INTEGER primary key label_id, a required TEXT code that cannot be repeated, and a TEXT note that can be missing.', 'name, type, notnull, pk, unique_code', 'CREATE TABLE dock_labels (label_id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, note TEXT)', null,
      { kind: 'dml', check: `SELECT name, type, "notnull", pk, (SELECT COUNT(*) FROM pragma_index_list('dock_labels') l WHERE l."unique" = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name)) = 1 AND EXISTS (SELECT 1 FROM pragma_index_info(l.name) i WHERE i.name = t.name)) AS unique_code FROM pragma_table_info('dock_labels') t ORDER BY cid` }]
  ]);
  contracts('union', 2, 'c807');
  questions(8, 'union', 2, [
    ['union-remove-dups', 'Show customer regions and vendor realms in one column, with every value appearing just once. Sort from A to Z.', 'place', 'SELECT region FROM customers UNION SELECT realm FROM vendors ORDER BY 1', [0], { must: ['union'] }],
    ['union-keep-dups', 'Put all sales order and purchase order statuses into one column. Keep one result row per order, even when several statuses are the same.', 'status', 'SELECT status FROM orders UNION ALL SELECT status FROM purchase_orders', null, { must: ['union'] }],
    ['union-three-sources', "Show employee names, vendor names and customer names in one list, each followed by a label. Use 'Staff', 'Vendor' and 'Customer'. Keep separate entries when names happen to match.", 'name, kind', "SELECT name, 'Staff' AS kind FROM employees UNION ALL SELECT name, 'Vendor' FROM vendors UNION ALL SELECT name, 'Customer' FROM customers", null, { must: ['union'] }]
  ]);
  questions(8, 'transaction', 2, [
    ['commit-and-cancel', 'In the practice copy, try changing vendor 7 to rating 1, then cancel that change. In a second transaction, set vendor 8 to rating 5 and keep that change.', 'vendor_id, rating', 'BEGIN; UPDATE vendors SET rating = 1 WHERE vendor_id = 7; ROLLBACK; BEGIN; UPDATE vendors SET rating = 5 WHERE vendor_id = 8; COMMIT;', null,
      { kind: 'dml', check: 'SELECT vendor_id, rating FROM vendors ORDER BY vendor_id' }],
    ['commit-write-pair', 'In the practice copy, keep two changes together. Set item 1 to quantity 40 and item 2 to quantity 50.', 'item_id, stock_qty', 'BEGIN; UPDATE items SET stock_qty = 40 WHERE item_id = 1; UPDATE items SET stock_qty = 50 WHERE item_id = 2; COMMIT;', null,
      { kind: 'dml', check: 'SELECT item_id, stock_qty FROM items ORDER BY item_id' }],
    ['commit-two-tables', 'In the practice copy, keep two changes in a single transaction. Move customer 1 to credit_limit 2000 and change vendor 1 to a 10-day lead time.', 'account_credit, vendor_lead_time', 'BEGIN; UPDATE customers SET credit_limit = 2000 WHERE customer_id = 1; UPDATE vendors SET lead_time_days = 10 WHERE vendor_id = 1; COMMIT;', null,
      { kind: 'dml', check: 'SELECT credit_limit, lead_time_days FROM customers JOIN vendors ON vendor_id = customer_id WHERE customer_id = 1' }]
  ]);



  questions(2, 'in', 1, [
    ['list-with-cutoff', 'Show the names and delivery times of Coastlands or Northmarch vendors that deliver within 20 days. Order fastest delivery first.', 'name, lead_time_days', "SELECT name, lead_time_days FROM vendors WHERE realm IN ('Coastlands', 'Northmarch') AND lead_time_days <= 20 ORDER BY lead_time_days", [1]]
  ]);
  questions(5, 'month', 2, [
    ['month-invoice-value', 'Show the month and total amount of invoices issued in each recorded month. Use YYYY-MM and show earlier months first.', 'month, total', "SELECT strftime('%Y-%m', invoice_date) AS month, SUM(amount) FROM invoices GROUP BY month ORDER BY month", [0]]
  ]);
  questions(5, 'side-by-side', 1, [
    ['vendor-label-weeks', 'Show one label per vendor with its name, a slash surrounded by spaces, and its realm in capitals. Beside the label show lead_time_days converted to weeks and rounded to one decimal place.', 'label, weeks', "SELECT name || ' / ' || UPPER(realm), ROUND(lead_time_days / 7.0, 1) FROM vendors"]
  ]);
  questions(8, 'create', 1, [
    ['schema-composite-key', 'Create a dock_manifest table in the practice copy. Use INTEGER voyage_id and crate_no together as the primary key, with voyage_id first. Add a required TEXT label column.', 'name, type, notnull, pk', 'CREATE TABLE dock_manifest (voyage_id INTEGER, crate_no INTEGER, label TEXT NOT NULL, PRIMARY KEY (voyage_id, crate_no))', null,
      { kind: 'dml', check: "SELECT name, type, \"notnull\", pk FROM pragma_table_info('dock_manifest') ORDER BY cid" }],
    ['schema-count-view', 'In the practice copy, create a view named stock_by_vendor. Show each vendor’s name and the number of items it supplies. Name the output columns supplier and items, and keep vendors that supply zero items.', 'supplier, items', 'CREATE VIEW stock_by_vendor AS SELECT v.name AS supplier, COUNT(i.item_id) AS items FROM vendors v LEFT JOIN items i ON i.vendor_id = v.vendor_id GROUP BY v.vendor_id, v.name', null,
      { kind: 'dml', family: 'view', check: 'SELECT supplier, items FROM stock_by_vendor ORDER BY supplier' }],
    ['schema-unique-index', 'In the practice copy, create a unique index named uq_employee_name on the name column of employees.', 'name, enforced', 'CREATE UNIQUE INDEX uq_employee_name ON employees (name)', null,
      { kind: 'dml', family: 'index', check: "SELECT i.name, l.\"unique\" AS enforced FROM pragma_index_list('employees') l JOIN pragma_index_info(l.name) i WHERE l.name = 'uq_employee_name'" }]
  ]);


  // Small regional pools need fresh questions after early errors or walkthroughs.
  questions(2, 'in', 1, [
    ['list-with-exclusion', 'Show names, cities and tiers for Gold and Silver customers outside the North region.', 'name, city, tier', "SELECT name, city, tier FROM customers WHERE tier IN ('Gold', 'Silver') AND region <> 'North'"],
    ['list-two-fields', 'Show employee names and roles for Sales Factors or Buyers who report to employee 2 or 8.', 'name, role', "SELECT name, role FROM employees WHERE role IN ('Sales Factor', 'Buyer') AND manager_id IN (2, 8)"],
    ['list-either-match', 'Show vendor names and realms for vendors in Ashlands or Northmarch, or with a rating of 5.', 'name, realm', "SELECT name, realm FROM vendors WHERE realm IN ('Ashlands', 'Northmarch') OR rating = 5"]
  ]);
  questions(2, 'between', 1, [
    ['two-ranges', 'Show vendor name, rating and lead time for vendors rated from 3 through 5 that deliver in 14 through 35 days. Include the endpoints.', 'name, rating, lead_time_days', 'SELECT name, rating, lead_time_days FROM vendors WHERE rating BETWEEN 3 AND 5 AND lead_time_days BETWEEN 14 AND 35'],
    ['either-range', 'Show employee name and salary for salaries in either the 2,000–3,000 range or the 6,000–10,000 range. Include the endpoints.', 'name, salary', 'SELECT name, salary FROM employees WHERE salary BETWEEN 2000 AND 3000 OR salary BETWEEN 6000 AND 10000']
  ]);
  questions(2, 'null', 2, [
    ['blanks-before-date', 'Show invoice numbers for invoices dated before June 1, 2026, with no payment date.', 'invoice_id', "SELECT invoice_id FROM invoices WHERE paid_date IS NULL AND invoice_date < '2026-06-01'"],
    ['top-level-employees', 'Show the name and role of each employee with no manager recorded.', 'name, role', 'SELECT name, role FROM employees WHERE manager_id IS NULL']
  ]);
  questions(5, 'coalesce', 0, [
    ['fallback-span', 'Show each purchase-order number and the number of days from order to delivery. If delivery has no date, use the expected date instead.', 'po_id, days', 'SELECT po_id, julianday(COALESCE(received_date, expected_date)) - julianday(order_date) FROM purchase_orders'],
    ['fallback-labeled', 'Show each employee’s name and their manager number as text. If there is no manager, display Independent in that column.', 'name, manager', "SELECT name, COALESCE(CAST(manager_id AS TEXT), 'Independent') FROM employees"],
    ['fallback-total', 'Give one number on one row. Add the customer IDs of any account in the tier Platinum, and show zero if there are none.', 'id_sum', "SELECT COALESCE(SUM(customer_id), 0) FROM customers WHERE tier = 'Platinum'"]
  ]);
  questions(5, 'text-math', 1, [
    ['label-avg-delivery', 'Show a label for each vendor realm made from its first three letters in uppercase. Beside it show the average delivery time for that realm in weeks, rounded to one decimal place.', 'label, avg_weeks', 'SELECT UPPER(SUBSTR(realm, 1, 3)), ROUND(AVG(lead_time_days) / 7.0, 1) FROM vendors GROUP BY realm'],
    ['label-paid-share', 'Show each invoice number, its due month as the first seven characters of due_date, and its paid share rounded to one decimal place. Make zero-amount bills return a NULL share.', 'invoice_id, due_month, share', 'SELECT invoice_id, SUBSTR(due_date, 1, 7), ROUND(amount_paid / NULLIF(amount, 0), 1) FROM invoices'],
    ['safe-stock-proportion', 'Show item names and stock_qty divided by reorder_point to two decimal places. Keep fractional results and use NULL at a zero reorder point.', 'name, proportion', 'SELECT name, ROUND(CAST(stock_qty AS REAL) / NULLIF(reorder_point, 0), 2) FROM items']
  ]);
  questions(6, 'exists', 1, [
    ['no-received-orders', 'Show names of vendors who had no purchase orders received in June 2026. Check the purchase orders for each vendor.', 'name', "SELECT v.name FROM vendors v WHERE NOT EXISTS (SELECT 1 FROM purchase_orders p WHERE p.vendor_id = v.vendor_id AND p.received_date BETWEEN '2026-06-01' AND '2026-06-30')"],
    ['has-unbilled-orders', 'Show employee names for sales factors who handled a Shipped order with no invoice. Keep each employee once.', 'name', "SELECT e.name FROM employees e WHERE EXISTS (SELECT 1 FROM orders o LEFT JOIN invoices i ON i.order_id = o.order_id WHERE o.rep_id = e.employee_id AND o.status = 'Shipped' AND i.invoice_id IS NULL)"],
    ['has-colleague', 'Show employee names for staff who share a manager with another employee. Keep each employee once.', 'name', 'SELECT e.name FROM employees e WHERE EXISTS (SELECT 1 FROM employees other WHERE other.manager_id = e.manager_id AND other.employee_id <> e.employee_id)']
  ]);
  questions(6, 'cte', 2, [
    ['derived-subtotal', 'From the order lines, calculate total quantities per order in a subquery in FROM. Show the order number and quantity for the three largest totals, largest first. Break ties by smaller order number.', 'order_id, quantity', 'SELECT order_id, quantity FROM (SELECT order_id, SUM(qty) AS quantity FROM order_lines GROUP BY order_id) totals ORDER BY quantity DESC, order_id LIMIT 3', [1, 0]],
    ['derived-ledger-join', 'Use a subquery in FROM to count items by vendor. Show vendors that supply at least four items, with vendor name then item count.', 'name, item_count', 'SELECT vendors.name, totals.item_count FROM vendors JOIN (SELECT vendor_id, COUNT(*) AS item_count FROM items GROUP BY vendor_id) AS totals ON vendors.vendor_id = totals.vendor_id WHERE totals.item_count >= 4'],
    ['derived-margin-total', 'Use a subquery in FROM to calculate each item’s price minus cost. Give the sum and average of positive margins, in that column order.', 'total_margin, avg_margin', 'SELECT SUM(margin), AVG(margin) FROM (SELECT unit_price - unit_cost AS margin FROM items) margins WHERE margin > 0'],
    ['cte-two-sources', 'Use a named WITH step for each table to count orders and invoices by customer number. Show customer number, order count, and invoice count for customers who appear in both steps.', 'customer_id, orders, invoices', 'WITH sales AS (SELECT customer_id, COUNT(*) AS n FROM orders GROUP BY customer_id), bills AS (SELECT customer_id, COUNT(*) AS n FROM invoices GROUP BY customer_id) SELECT sales.customer_id, sales.n, bills.n FROM sales JOIN bills ON sales.customer_id = bills.customer_id'],
    ['cte-max-groups', 'For each item category, find its largest stock quantity. Use those category results in a named WITH step to show just the largest and smallest of those quantities.', 'largest, smallest', 'WITH category_stock AS (SELECT category, MAX(stock_qty) AS highest FROM items GROUP BY category) SELECT MAX(highest), MIN(highest) FROM category_stock']
  ]);
  questions(7, 'running', 1, [
    ['running-following', 'Show vendor number and total ratings from that vendor through two following vendors in increasing vendor number order. At the end, use the remaining vendors.', 'vendor_id, rating_total', 'SELECT vendor_id, SUM(rating) OVER (ORDER BY vendor_id ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING) FROM vendors', null, { must: ['window'] }],
    ['running-over-two', 'Show employee number and the minimum salary in that row and the previous employee row by increasing employee number. The first row uses just its own salary.', 'employee_id, min_salary', 'SELECT employee_id, MIN(salary) OVER (ORDER BY employee_id ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) FROM employees', null, { must: ['window'] }],
    ['running-surrounding', 'Show item number and the mean quantity from that item and up to one item before and after it by item number within its category.', 'item_id, avg_qty', 'SELECT item_id, AVG(stock_qty) OVER (PARTITION BY category ORDER BY item_id ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) FROM items', null, { must: ['window'] }]
  ]);
  questions(8, 'insert', 0, [
    ['insert-from-vendors', 'In the practice copy, fill the existing quick_replies table with each vendor ID rated 5 and its name. Use vendor_id first and vendor_name second.', 'vendor_id, vendor_name', 'INSERT INTO quick_replies (vendor_id, vendor_name) SELECT vendor_id, name FROM vendors WHERE rating = 5', null,
      { kind: 'dml', setup: 'CREATE TABLE quick_replies (vendor_id INTEGER PRIMARY KEY, vendor_name TEXT)', check: 'SELECT vendor_id, vendor_name FROM quick_replies ORDER BY vendor_id' }],
    ['insert-with-default', 'In the practice copy, add berth number 3 with the label Net Mending to the dock_berths table. Let the existing default set available to 1.', 'berth_id, label, available', "INSERT INTO dock_berths (berth_id, label) VALUES (3, 'Net Mending')", null,
      { kind: 'dml', setup: "CREATE TABLE dock_berths (berth_id INTEGER PRIMARY KEY, label TEXT, available INTEGER DEFAULT 1); INSERT INTO dock_berths VALUES (1, 'Loadout', 0)", check: 'SELECT berth_id, label, available FROM dock_berths ORDER BY berth_id' }],
    ['insert-from-counts', 'In the practice copy, fill the existing daily_bills table with each recorded invoice date and the number of invoices issued on that date.', 'bill_day, bills', 'INSERT INTO daily_bills (bill_day, bills) SELECT invoice_date, COUNT(*) FROM invoices GROUP BY invoice_date', null,
      { kind: 'dml', setup: 'CREATE TABLE daily_bills (bill_day TEXT PRIMARY KEY, bills INTEGER)', check: 'SELECT bill_day, bills FROM daily_bills ORDER BY bill_day' }]
  ]);
  questions(8, 'delete', 0, [
    ['delete-threshold', 'In the practice copy, remove all items with less than five units in stock.', 'item_id, stock_qty', 'DELETE FROM items WHERE stock_qty < 5', null,
      { kind: 'dml', check: 'SELECT item_id, stock_qty FROM items ORDER BY item_id' }],
    ['delete-either-group', 'In the practice copy, remove every customer in the Bronze tier or with no sales factor assigned.', 'customer_id, tier, rep_id', "DELETE FROM customers WHERE tier = 'Bronze' OR rep_id IS NULL", null,
      { kind: 'dml', check: 'SELECT customer_id, tier, rep_id FROM customers ORDER BY customer_id' }],
    ['delete-unlinked', 'In the practice copy, remove the items that never appear on an order line.', 'item_id', 'DELETE FROM items WHERE NOT EXISTS (SELECT 1 FROM order_lines l WHERE l.item_id = items.item_id)', null,
      { kind: 'dml', check: 'SELECT item_id FROM items ORDER BY item_id' }]
  ]);
  questions(8, 'create', 1, [
    ['schema-two-required', 'Create loom_notes in the practice copy. Add an INTEGER primary key note_id and two required TEXT columns subject and body.', 'name, type, notnull, pk', 'CREATE TABLE loom_notes (note_id INTEGER PRIMARY KEY, subject TEXT NOT NULL, body TEXT NOT NULL)', null,
      { kind: 'dml', check: "SELECT name, type, \"notnull\", pk FROM pragma_table_info('loom_notes') ORDER BY cid" }],
    ['schema-text-key', 'Create dock_tags in the practice copy. Use tag as a required TEXT primary key and crates as a required INTEGER column.', 'name, type, notnull, pk', 'CREATE TABLE dock_tags (tag TEXT NOT NULL PRIMARY KEY, crates INTEGER NOT NULL)', null,
      { kind: 'dml', check: "SELECT name, type, \"notnull\", pk FROM pragma_table_info('dock_tags') ORDER BY cid" }],
    ['schema-default', 'Create arrival_notes in the practice copy. Add an INTEGER primary key note_id and a required INTEGER priority column that defaults to 1.', 'name, type, notnull, pk, default_value', 'CREATE TABLE arrival_notes (note_id INTEGER PRIMARY KEY, priority INTEGER NOT NULL DEFAULT 1)', null,
      { kind: 'dml', check: "SELECT name, type, \"notnull\", pk, dflt_value FROM pragma_table_info('arrival_notes') ORDER BY cid" }],
    ['schema-customer-view', 'In the practice copy, save a view named customer_factors that gives customer name and assigned employee name. Keep customers with no employee and name the columns customer and factor.', 'customer, factor', 'CREATE VIEW customer_factors AS SELECT c.name AS customer, e.name AS factor FROM customers c LEFT JOIN employees e ON c.rep_id = e.employee_id', null,
      { kind: 'dml', family: 'view', check: 'SELECT customer, factor FROM customer_factors ORDER BY customer' }],
    ['schema-purchase-view', 'In the practice copy, save a view named purchase_aging that gives each purchase-order number and days from order to expected date. Name the calculation days_expected.', 'po_id, days_expected', 'CREATE VIEW purchase_aging AS SELECT po_id, julianday(expected_date) - julianday(order_date) AS days_expected FROM purchase_orders', null,
      { kind: 'dml', family: 'view', check: 'SELECT po_id, days_expected FROM purchase_aging ORDER BY po_id' }],
    ['schema-ranked-stock', 'In the practice copy, save a view named stock_rank that shows item name, category and quantity rank within each category. Highest quantity ranks first and ties share a rank with gaps. Name that column quantity_rank.', 'name, category, quantity_rank', 'CREATE VIEW stock_rank AS SELECT name, category, RANK() OVER (PARTITION BY category ORDER BY stock_qty DESC) AS quantity_rank FROM items', null,
      { kind: 'dml', family: 'view', check: 'SELECT name, category, quantity_rank FROM stock_rank ORDER BY name' }],
    ['schema-date-index', 'In the practice copy, create an index named ix_invoice_date on invoice_date in invoices, with newest dates first.', 'name, descending', 'CREATE INDEX ix_invoice_date ON invoices (invoice_date DESC)', null,
      { kind: 'dml', family: 'index', check: "SELECT name, \"desc\" FROM pragma_index_xinfo('ix_invoice_date') WHERE \"key\" = 1 ORDER BY seqno" }],
    ['schema-lookup-by-delivery', 'In the practice copy, create an index named ix_delivery on the expected_date in purchase_orders. Then include received_date as its second indexed column.', 'seqno, name', 'CREATE INDEX ix_delivery ON purchase_orders (expected_date, received_date)', null,
      { kind: 'dml', family: 'index', check: "SELECT seqno, name FROM pragma_index_info('ix_delivery') ORDER BY seqno" }],
    ['schema-priority-index', 'In the practice copy, create an index named ix_customer_route on customers. Put region first from A to Z, then put larger credit limits first.', 'name, descending', 'CREATE INDEX ix_customer_route ON customers (region ASC, credit_limit DESC)', null,
      { kind: 'dml', family: 'index', check: "SELECT name, \"desc\" FROM pragma_index_xinfo('ix_customer_route') WHERE \"key\" = 1 ORDER BY seqno" }]
  ]);
  questions(8, 'union', 2, [
    ['union-date-sets', 'Combine order_date from orders with expected_date from purchase_orders. Show every date that occurs in either table once, earliest first.', 'date', 'SELECT order_date FROM orders UNION SELECT expected_date FROM purchase_orders ORDER BY 1', [0], { must: ['union'] }],
    ['union-two-counts', 'Make a two-row list with the label Customer and the count of customer rows, then the label Vendor and the count of vendor rows. Column order is label followed by count. Any row order is fine.', 'label, count', "SELECT 'Customer', COUNT(*) FROM customers UNION ALL SELECT 'Vendor', COUNT(*) FROM vendors", null, { must: ['union'] }]
  ]);
  questions(8, 'transaction', 2, [
    ['commit-and-insert', 'In the practice copy, make two changes in one transaction. Add a vendor called North Road Ropes with ID 9, realm Northmarch, lead time 20 days and rating 4. Then change vendor 8 to a 12-day lead time.', 'vendor_id, name, realm, lead_time_days, rating', "BEGIN; INSERT INTO vendors VALUES (9, 'North Road Ropes', 'Northmarch', 20, 4); UPDATE vendors SET lead_time_days = 12 WHERE vendor_id = 8; COMMIT;", null,
      { kind: 'dml', check: 'SELECT * FROM vendors ORDER BY vendor_id' }],
    ['commit-remove-and-update', "In the practice copy, keep two changes together. Remove item 48 and change item 1's stock quantity to 55.", 'item_id, stock_qty', 'BEGIN; DELETE FROM items WHERE item_id = 48; UPDATE items SET stock_qty = 55 WHERE item_id = 1; COMMIT;', null,
      { kind: 'dml', check: 'SELECT item_id, stock_qty FROM items ORDER BY item_id' }],
    ['commit-after-review', 'In the practice copy, try setting customer 1 to a credit limit of 100, then cancel that change. In a new transaction, set customer 2 to a credit limit of 3,500 and keep it.', 'customer_id, credit_limit', 'BEGIN; UPDATE customers SET credit_limit = 100 WHERE customer_id = 1; ROLLBACK; BEGIN; UPDATE customers SET credit_limit = 3500 WHERE customer_id = 2; COMMIT;', null,
      { kind: 'dml', check: 'SELECT customer_id, credit_limit FROM customers ORDER BY customer_id' }]
  ]);


  questions(2, 'like', 2, [
    ['like-character-gap', 'Show item names that begin with any one letter followed by ron and a space, such as Iron Helm.', 'name', "SELECT name FROM items WHERE name LIKE '_ron %'"],
    ['like-two-spaces', 'Show vendor names that contain at least two spaces, from A to Z.', 'name', "SELECT name FROM vendors WHERE name LIKE '% % %' ORDER BY name", [0]]
  ]);
  questions(3, 'having', 2, [
    ['having-comparison', 'Show each invoice customer number and the total paid where the total paid is greater than half of the total invoiced for that customer.', 'customer_id, paid', 'SELECT customer_id, SUM(amount_paid) FROM invoices GROUP BY customer_id HAVING SUM(amount_paid) > SUM(amount) / 2']
  ]);
  questions(4, 'self', 2, [
    ['self-matching-district', 'Show pairs of customers in the same city and tier. Return the city, tier and both names, with the lower customer number’s name first. Keep each pair once.', 'city, tier, first customer, second customer', 'SELECT a.city, a.tier, a.name, b.name FROM customers a JOIN customers b ON a.city = b.city AND a.tier = b.tier AND a.customer_id < b.customer_id']
  ]);
  questions(7, 'lag', 2, [
    ['lag-offset-default', 'Show vendor number, rating and the rating two rows earlier in increasing vendor number order. Show 0 when there is no earlier rating two rows back.', 'vendor_id, rating, earlier_rating', 'SELECT vendor_id, rating, LAG(rating, 2, 0) OVER (ORDER BY vendor_id) FROM vendors', null, { must: ['window'] }]
  ]);

  // Compact persisted identities carry no user SQL. Keep literals in the
  // fingerprint because changing a cutoff or label produces a different task.
  function hash(s, start = 2166136261) {
    let h = start >>> 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  const hex = n => n.toString(16).padStart(8, '0');
  function fingerprint(task) {
    const code = tokens(task.sql);
    while (code.at(-1) === ';') code.pop();
    const key = JSON.stringify([code, task.check ? tokens(task.check) : null, task.setup ? tokens(task.setup) : null, task.order || [], task.must || []]);
    return hex(hash(key)) + hex(hash(key, 2994388085));
  }
  // Legacy bounties change parameter values without changing the exercise's
  // shape. Preserve their operations, clause order and output layout.
  const structureTokens = new Set([
    'SELECT', 'FROM', 'AS', 'WHERE', 'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT',
    'DISTINCT', 'GROUP', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'OUTER', 'ON',
    'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'NULL', 'IS', 'COUNT', 'SUM',
    'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'COALESCE',
    'ROUND', 'NULLIF', 'CAST', 'LOWER', 'UPPER', 'LENGTH', 'SUBSTR', 'DATE',
    'STRFTIME', 'JULIANDAY', 'WITH', 'EXISTS', 'OVER', 'PARTITION', 'ROWS',
    'RANK', 'ROW_NUMBER', 'DENSE_RANK', 'LAG', 'LEAD', 'INSERT', 'INTO', 'VALUES',
    'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'VIEW', 'INDEX', 'UNION',
    'ALL', 'BEGIN', 'COMMIT', 'ROLLBACK', 'PRIMARY', 'KEY', 'UNIQUE', 'CHECK'
  ]);
  function structuralId(sql) {
    const parts = tokens(sql).filter(t => t !== ';');
    return 'sql-' + hex(hash(parts.map(t => structureTokens.has(t) || /^[(),.*+\-/%<>=!|]+$/.test(t) ? t :
      isIdentifier(t) ? 'column' : 'value').join(' ')));
  }
  function annotate(task) {
    if (!task || typeof task.sql !== 'string') return null;
    const { concepts, datasets } = inspect(task.sql);
    const family = task.family || bountyFamily[task.tpl || task.id] || (task.kind === 'dml' ?
      [...concepts].reverse().find(c => byId.get(c).circle === 8) : concepts.at(-1)) || 'select';
    return { kind: 'read', ...task, concepts, datasets, family, variant: task.variant || structuralId(task.sql), fingerprint: fingerprint(task) };
  }

  const RECENT_COUNT = 12, ATTEMPTS = 4, MAX_REV = 1000000000;
  const fresh = () => ({ v: 1, rev: 0, introduced: {}, evidence: {}, ready: {}, recent: [] });
  const validHash = token => typeof token === 'string' && /^[a-f0-9]{16}$/.test(token);
  const validLabel = token => typeof token === 'string' && /^[a-z0-9_.|:-]{1,180}$/i.test(token);
  function normalize(value) {
    const state = fresh();
    if (value?.v !== 1) return state;
    if (Number.isSafeInteger(value.rev)) state.rev = Math.max(0, Math.min(MAX_REV, value.rev));
    for (const { id } of CONCEPTS) {
      if (value.introduced?.[id] === true) state.introduced[id] = true;
      if (value.ready?.[id] === true) state.ready[id] = true;
      const evidence = value.evidence?.[id];
      if (!evidence) continue;
      const attempts = [];
      if (Array.isArray(evidence.attempts)) for (const row of evidence.attempts.slice(-ATTEMPTS)) {
        if (!validHash(row?.key) || !validLabel(row.data) || !validLabel(row.variant) || typeof row.ok !== 'boolean' ||
            attempts.some(prev => prev.key === row.key)) continue;
        attempts.push({ key: row.key, data: row.data, variant: row.variant, ok: row.ok });
      }
      if (attempts.length) state.evidence[id] = { attempts };
    }
    if (Array.isArray(value.recent)) {
      state.recent = value.recent.slice(-RECENT_COUNT).filter(row => validHash(row?.key) &&
        validLabel(row.family) && validLabel(row.variant) && validLabel(row.data))
        .map(({ key, family, variant, data }) => ({ key, family, variant, data }));
    }
    return state;
  }
  const ready = (state, id) => byId.has(id) && state?.ready?.[id] === true;
  const missing = (state, ids) => [...new Set(ids || [])].filter(id => byId.has(id) && state?.introduced?.[id] !== true);
  const bump = state => { state.rev = Math.min(MAX_REV, (state.rev || 0) + 1); };
  function introduce(state, ids) {
    const added = missing(state, ids);
    for (const id of added) state.introduced[id] = true;
    if (added.length) bump(state);
    return added;
  }
  const dataKey = datasets => datasets.join('|') || 'no-table';
  function record(state, task, { ok, assisted = false, first = true, sql } = {}) {
    const question = annotate(task);
    if (!state || !question) return [];
    const { fingerprint: key, family, variant, concepts, datasets } = question;
    const data = dataKey(datasets);
    if (!validLabel(family) || !validLabel(variant) || !validLabel(data)) return [];
    const last = state.recent.at(-1);
    const changed = last?.key !== key;
    if (changed) {
      state.recent.push({ key, family, variant, data });
      if (state.recent.length > RECENT_COUNT) state.recent.shift();
    }
    const earned = [];
    if (changed && first && !assisted && typeof ok === 'boolean') {
      const used = ok && typeof sql === 'string' ? conceptsFor(sql) : concepts;
      for (const id of concepts) {
        if (ready(state, id) || !used.includes(id)) continue;
        const evidence = state.evidence[id] ||= { attempts: [] };
        // Distinctness applies to the scored window. A fresh presentation can
        // earn evidence once the old attempt has rolled out of that window.
        if (evidence.attempts.some(attempt => attempt.key === key)) continue;
        evidence.attempts.push({ key, data, variant, ok });
        if (evidence.attempts.length > ATTEMPTS) evidence.attempts.shift();
        const successes = evidence.attempts.filter(a => a.ok);
        if (successes.length >= 3 && new Set(successes.map(a => a.data)).size >= 2 &&
            new Set(successes.map(a => a.variant)).size >= 2) {
          state.ready[id] = true;
          earned.push(id);
        }
      }
    }
    if (changed) bump(state);
    return earned;
  }

  function protectViewCheck(task) {
    const view = /^CREATE VIEW ([a-z_]+) AS /i.exec(task.sql)?.[1];
    if (!view || !task.check) return task;
    const check = task.check.replace(/ ORDER BY /i,
      " WHERE EXISTS (SELECT 1 FROM sqlite_schema WHERE type = 'view' AND name = '" + view + "') ORDER BY ");
    return { ...task, check };
  }
  const authored = catalog.map(task => annotate(protectViewCheck(task)));
  function pool(circle, specialistId = null) {
    if (circle === 0 || specialistId === 'intro') return authored.filter(t => t.r === 0);
    return authored.filter(t => (!specialistId || t.specialist === specialistId) && (t.r === circle || (!specialistId && circle === 1 && t.r === 0)));
  }
  function next(state, { circle, specialist = null, seed = 1, family = null, concept = null, introducedOnly = false } = {}) {
    const tasks = pool(circle, specialist).filter(t => (!family || t.family === family) && (!concept || t.concepts.includes(concept)) && (!introducedOnly || !missing(state, t.concepts).length));
    if (!tasks.length) return null;
    const history = state?.recent || [];
    let available = tasks.filter(t => !history.some(x => x.key === t.fingerprint));
    if (!available.length) {
      // Once every candidate is in the history, relax the oldest exclusion first.
      const leastRecent = Math.min(...tasks.map(t => history.findLastIndex(x => x.key === t.fingerprint)));
      available = tasks.filter(t => history.findLastIndex(x => x.key === t.fingerprint) === leastRecent);
    }
    const novelty = t => history.reduce((penalty, entry) => penalty + (entry.family === t.family ? 1 : 0) +
      (entry.variant === t.variant ? 4 : 0) + (entry.data === dataKey(t.datasets) ? 2 : 0), 0);
    const ranked = available.map(task => ({ task, score: novelty(task), tie: hash(`${task.fingerprint}:${seed}`) }));
    ranked.sort((a, b) => a.score - b.score || a.tie - b.tie);
    return ranked[0].task;
  }

  return { CONCEPTS, specialists, regionConcepts, fresh, normalize, introduce, conceptsFor, annotate, record, ready, missing, pool, next };
})();
if (typeof module !== 'undefined') module.exports = Learning;
