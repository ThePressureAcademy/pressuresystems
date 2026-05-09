'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = require('./app');
const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`LIFTIQ backend running on http://${host}:${port}`);
  console.log(`  Health: http://${host}:${port}/api/health`);
});
