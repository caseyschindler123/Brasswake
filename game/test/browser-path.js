const path = require('node:path');

// Keep downloaded browsers in the ignored workspace on every platform.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(__dirname, '../../work/playwright-browsers');
