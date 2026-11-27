/* Mixed advanced Ledger exercises for techniques that exceed the eight regional Circles. */
const AdvancedSQL = (() => {
  function task(r, id, details) {
    return Object.freeze({ id: `advanced-${r}-${id}`, kind: 'read', r, variant: `advanced-${r}-${id}`, ...details });
  }

  const pools = {
    9: Object.freeze([
      task(9, 'open-order-ledger', {
        ask: 'Use a named WITH step to count the open orders for each customer. Join the counts to customers and show the IDs, names and open order counts of the six customers with the most. Put the highest count first and use the lower customer ID to break a tie.',
        sql: `WITH order_counts AS (
  SELECT customer_id, COUNT(*) AS open_orders
  FROM orders WHERE status = 'Open' GROUP BY customer_id
)
SELECT c.customer_id, c.name, o.open_orders
FROM order_counts o JOIN customers c ON c.customer_id = o.customer_id
ORDER BY o.open_orders DESC, c.customer_id LIMIT 6`,
        ret: 'customer_id, name, open_orders', tables: ['orders', 'customers'], order: [2, 0],
        must: ['cte', 'groupby', 'join'], kw: ['WITH', 'COUNT', 'GROUP BY', 'JOIN', 'ORDER BY', 'LIMIT'],
        tip: 'Count the order rows before joining. The WITH step needs to return the customer ID as well as the count.'
      }),
      task(9, 'stock-leaders', {
        ask: 'Number the items within each category by stock quantity, largest first. Break ties with the lower item ID. Use the row numbers to show only the first two items per category, with category, item ID, name, stock quantity and row number. Sort by category and then by row number.',
        sql: `SELECT category, item_id, name, stock_qty, stock_position
FROM (
  SELECT category, item_id, name, stock_qty,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY stock_qty DESC, item_id) AS stock_position
  FROM items
)
WHERE stock_position <= 2 ORDER BY category, stock_position`,
        ret: 'category, item_id, name, stock_qty, stock_position', tables: ['items'], order: [0, 4],
        must: ['window'], kw: ['ROW_NUMBER', 'OVER', 'PARTITION BY', 'ORDER BY', 'WHERE'],
        tip: 'Compute ROW_NUMBER() in an inner query. The outer query can then filter on the row number.'
      }),
      task(9, 'regional-unpaid-bills', {
        ask: 'Use a named WITH step to total each customer’s unpaid invoice balance, counting only invoices with amount above amount_paid. Join to customers and total those balances for each pair of region and customer tier. Show the region, tier and unpaid balance, largest balance first, then sort ties by region and tier A to Z.',
        sql: `WITH unpaid AS (
  SELECT customer_id, SUM(amount - amount_paid) AS balance
  FROM invoices WHERE amount > amount_paid GROUP BY customer_id
)
SELECT c.region, c.tier, ROUND(SUM(u.balance), 2) AS unpaid_balance
FROM unpaid u JOIN customers c ON c.customer_id = u.customer_id
GROUP BY c.region, c.tier ORDER BY unpaid_balance DESC, c.region, c.tier`,
        ret: 'region, tier, unpaid_balance rounded to 2 places', tables: ['invoices', 'customers'], order: [2, 0, 1],
        must: ['cte', 'groupby', 'join'], kw: ['WITH', 'SUM', 'GROUP BY', 'JOIN', 'ROUND', 'ORDER BY'],
        tip: 'The WITH step should give one row per customer. Join that result to the customers table to get the region and tier, then sum again.'
      }),
      task(9, 'vendor-price-check', {
        ask: 'Use a subquery to find items priced above the average unit price for their own vendor. Join to vendors and show the vendor name, item name and unit price. Put the ten highest prices first and use the lower item ID to break a tie.',
        sql: `SELECT v.name AS vendor_name, i.name AS item_name, i.unit_price
FROM items i JOIN vendors v ON v.vendor_id = i.vendor_id
WHERE i.unit_price > (
  SELECT AVG(other.unit_price) FROM items other WHERE other.vendor_id = i.vendor_id
)
ORDER BY i.unit_price DESC, i.item_id LIMIT 10`,
        ret: 'vendor_name, item_name, unit_price', tables: ['items', 'vendors'], order: [0, 1, 2],
        must: ['subquery', 'join'], kw: ['SELECT', 'JOIN', 'WHERE', 'AVG', 'ORDER BY', 'LIMIT'],
        tip: 'Give the two uses of items different aliases. The subquery should match its vendor ID to the outer item’s vendor ID.'
      })
    ]),
    10: Object.freeze([
      task(10, 'regional-shippers', {
        ask: 'Count shipped orders per customer, then rank customers in each region by their counts. Equal counts share a rank and leave no gaps after a tie. Show the region, customer ID, name, shipped order count and rank for customers in the first or second rank. Sort by region, rank and customer ID.',
        sql: `WITH counts AS (
  SELECT customer_id, COUNT(*) AS shipped_orders
  FROM orders WHERE status = 'Shipped' GROUP BY customer_id
), ranks AS (
  SELECT c.region, c.customer_id, c.name, n.shipped_orders,
    DENSE_RANK() OVER (PARTITION BY c.region ORDER BY n.shipped_orders DESC) AS region_rank
  FROM counts n JOIN customers c ON c.customer_id = n.customer_id
)
SELECT region, customer_id, name, shipped_orders, region_rank
FROM ranks WHERE region_rank <= 2 ORDER BY region, region_rank, customer_id`,
        ret: 'region, customer_id, name, shipped_orders, region_rank', tables: ['orders', 'customers'], order: [0, 4, 1],
        must: ['groupby', 'join', 'window'], kw: ['WITH', 'GROUP BY', 'JOIN', 'DENSE_RANK', 'OVER', 'PARTITION BY'],
        tip: 'Count first, then rank those counts within each region. Use DENSE_RANK() without the ID inside its ORDER BY, so tied counts stay tied.'
      }),
      task(10, 'monthly-sales-change', {
        ask: 'For each month with shipped orders, total the value of their lines as qty times unit_price times (1 minus discount). Show the month, its total and the difference from the previous month in the result. Round both reported amounts to two places. Leave the first difference empty and sort from the earliest month to the latest.',
        sql: `WITH months AS (
  SELECT SUBSTR(o.order_date, 1, 7) AS month,
    SUM(l.qty * l.unit_price * (1 - l.discount)) AS sales
  FROM orders o JOIN order_lines l ON l.order_id = o.order_id
  WHERE o.status = 'Shipped' GROUP BY SUBSTR(o.order_date, 1, 7)
)
SELECT month, ROUND(sales, 2) AS sales,
  ROUND(sales - LAG(sales) OVER (ORDER BY month), 2) AS change
FROM months ORDER BY month`,
        ret: 'month (YYYY-MM), sales, change', tables: ['orders', 'order_lines'], order: [0],
        must: ['groupby', 'join', 'window'], kw: ['WITH', 'SUBSTR', 'SUM', 'LAG', 'OVER', 'ROUND'],
        tip: 'Make one row per month before comparing. LAG(sales) can read the previous total and returns NULL for the first month.'
      }),
      task(10, 'vendor-stock-share', {
        ask: 'Total the stock value (stock_qty times unit_cost) of active items for each vendor. Show the vendor ID, name, stock value and percentage of total active stock value, rounded to two places. Show the eight vendors with the highest value, with the lower vendor ID first for ties. The percentage should use all vendors with active items.',
        sql: `WITH vendor_stock AS (
  SELECT vendor_id, SUM(stock_qty * unit_cost) AS stock_value
  FROM items WHERE discontinued = 0 GROUP BY vendor_id
)
SELECT v.vendor_id, v.name, ROUND(s.stock_value, 2) AS stock_value,
  ROUND(100.0 * s.stock_value / SUM(s.stock_value) OVER (), 2) AS stock_percent
FROM vendor_stock s JOIN vendors v ON s.vendor_id = v.vendor_id
ORDER BY s.stock_value DESC, v.vendor_id LIMIT 8`,
        ret: 'vendor_id, name, stock_value, stock_percent', tables: ['items', 'vendors'], order: [2, 0],
        must: ['groupby', 'join', 'window'], kw: ['WITH', 'SUM', 'GROUP BY', 'JOIN', 'OVER', 'ROUND'],
        tip: 'SUM(stock_value) OVER () can put the grand total beside every vendor’s total. Apply the top-eight limit after calculating the shares.'
      }),
      task(10, 'repeated-late-payments', {
        ask: 'For each customer’s paid invoices, use payment date and then invoice ID to find the preceding paid invoice. Show the customer name, invoice ID, payment date and preceding invoice ID whenever both invoices were paid after their own due dates. Show the eight most recent payments first, with the higher invoice ID first on a tie.',
        sql: `WITH payments AS (
  SELECT customer_id, invoice_id, paid_date, due_date,
    LAG(invoice_id) OVER (PARTITION BY customer_id ORDER BY paid_date, invoice_id) AS previous_id,
    LAG(paid_date > due_date) OVER (PARTITION BY customer_id ORDER BY paid_date, invoice_id) AS previous_late
  FROM invoices WHERE paid_date IS NOT NULL
)
SELECT c.name, p.invoice_id, p.paid_date, p.previous_id
FROM payments p JOIN customers c ON c.customer_id = p.customer_id
WHERE p.paid_date > p.due_date AND p.previous_late = 1
ORDER BY p.paid_date DESC, p.invoice_id DESC LIMIT 8`,
        ret: 'name, invoice_id, paid_date, previous_id', tables: ['invoices', 'customers'], order: [2, 1],
        must: ['cte', 'join', 'window'], kw: ['WITH', 'LAG', 'OVER', 'PARTITION BY', 'ORDER BY'],
        tip: 'Keep all paid invoices when calculating LAG. Filter late pairs afterwards, or you could skip an on-time payment between them.'
      })
    ])
  };

  // The pool is stable across a resumed prompt, even if its seed is a string ID.
  const empty = Object.freeze([]);
  const tasks = circle => circle === 9 || circle === 10 ? pools[circle] : empty;
  function next(circle, seed = 0) {
    const pool = tasks(circle);
    if (!pool.length) return null;
    let hash = 2166136261;
    for (const char of String(seed)) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
    return pool[(hash >>> 0) % pool.length];
  }

  return { tasks, next };
})();
if (typeof module !== 'undefined') module.exports = AdvancedSQL;
