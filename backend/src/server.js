'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app  = require('./app');
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`LIFTIQ backend running on http://localhost:${port}`);
  console.log(`  Health: http://localhost:${port}/api/health`);
});
