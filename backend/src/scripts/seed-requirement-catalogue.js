'use strict';

const { getDb } = require('../db');
const {
  CATALOGUE_ITEMS,
  seedRequirementCatalogue
} = require('../services/job-requirement-catalogue');

const db = getDb();
seedRequirementCatalogue(db);

const row = db.prepare(`
  SELECT COUNT(*) AS count
  FROM requirement_catalogue_items
  WHERE is_active = 1
`).get();

console.log(`Requirement catalogue seeded: ${row.count} active item(s).`);
console.log(`Static source item definitions: ${CATALOGUE_ITEMS.length}.`);
