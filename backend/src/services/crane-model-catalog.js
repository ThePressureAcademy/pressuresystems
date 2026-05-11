'use strict';

const CRANE_MODEL_SEEDS = [
  {
    manufacturer: 'Grove',
    model: 'GMK5150L',
    nominal_capacity_tonnes: 150,
    max_counterweight_tonnes: 44.5,
    transport_length_m: null,
    transport_width_m: 2.75,
    transport_height_m: null,
    gross_vehicle_weight_tonnes: 60.0,
    axle_configuration: '10x6x10 standard; 10x8x10 optional',
    source_url: 'https://www.manitowoc.com/sites/default/files/media/divers/file/2020-01/GMK5150L-Product-Guide-Metric.pdf',
    source_capture_date: '2026-05-11',
    source_confidence: 'high',
    notes: 'Research pack confirms 44.5 t total counterweight. The 24.0 t travel state is the best-supported reduced counterweight planning state for this exact model. Keep the 30.9 t state review-gated until its exact road-row basis is independently confirmed for this variant.',
    travel_states: [
      {
        state_label: '0t counterweight',
        carried_counterweight_tonnes: 0,
        axle_basis: null,
        roadability_basis: 'Official product page notes 0 t counterweight feature.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: 2.75,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 1,
        source_url: 'https://www.manitowoc.com/de/grove/krane/gmk5150l',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Feature-backed state only. Confirm route, axle masses, and travel basis before dispatch.'
      },
      {
        state_label: '10.2t at 12t/axle',
        carried_counterweight_tonnes: 10.2,
        axle_basis: '12 t/axle',
        roadability_basis: 'Official brochure transport row.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: 2.75,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 0,
        source_url: 'https://www.manitowoc.com/sites/default/files/media/divers/file/2020-01/GMK5150L-Product-Guide-Metric.pdf',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Roadable state supported directly by the manufacturer brochure.'
      },
      {
        state_label: '24.0t at 16.5t/axle',
        carried_counterweight_tonnes: 24.0,
        axle_basis: '16.5 t/axle',
        roadability_basis: 'Official brochure transport row.',
        gross_vehicle_weight_tonnes: 82.5,
        transport_width_m: 2.75,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 0,
        source_url: 'https://www.manitowoc.com/sites/default/files/media/divers/file/2020-01/GMK5150L-Product-Guide-Metric.pdf',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'This exact-model state supports the 24.0 t versus 44.5 t planning example.'
      },
      {
        state_label: '30.9t within 2.75m vehicle width',
        carried_counterweight_tonnes: 30.9,
        axle_basis: null,
        roadability_basis: 'Official brochure states 30.9 t within 2.75 m vehicle width.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: 2.75,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 1,
        source_url: 'https://www.manitowoc.com/sites/default/files/media/divers/file/2020-01/GMK5150L-Product-Guide-Metric.pdf',
        source_capture_date: '2026-05-11',
        source_confidence: 'medium',
        notes: 'Keep review-gated. This pass did not independently confirm the same explicit road-row linkage that exists on GMK5150L-1.'
      },
      {
        state_label: 'full 44.5t counterweight',
        carried_counterweight_tonnes: 44.5,
        axle_basis: null,
        roadability_basis: 'Full site counterweight state.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: null,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 1,
        source_url: 'https://www.manitowoc.com/sites/default/files/media/divers/file/2020-01/GMK5150L-Product-Guide-Metric.pdf',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Full counterweight is supported by the manufacturer. Additional counterweight transport may be required if the selected travel state carries less than the required package.'
      }
    ]
  },
  {
    manufacturer: 'Grove',
    model: 'GMK5150L-1',
    nominal_capacity_tonnes: 150,
    max_counterweight_tonnes: 44.5,
    transport_length_m: 14.5,
    transport_width_m: 2.75,
    transport_height_m: null,
    gross_vehicle_weight_tonnes: 60.0,
    axle_configuration: '10x6x10 standard; 10x8x10 optional',
    source_url: 'https://www.manitowoc.com/grove/all-terrain-cranes/gmk5150l-1',
    source_capture_date: '2026-05-11',
    source_confidence: 'high',
    notes: 'Research pack confirms that this variant should not inherit the GMK5150L 24.0 t default assumption. The best-supported reduced heavy-roadable state is 30.9 t for this exact model.',
    travel_states: [
      {
        state_label: '10.2t at 12t/axle',
        carried_counterweight_tonnes: 10.2,
        axle_basis: '12 t/axle',
        roadability_basis: 'Official product page and brochure.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: 2.75,
        transport_height_m: null,
        transport_length_m: 14.5,
        review_required: 0,
        source_url: 'https://www.manitowoc.com/grove/all-terrain-cranes/gmk5150l-1',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Roadable state supported directly by the manufacturer.'
      },
      {
        state_label: '24.0t heavy-roadable package',
        carried_counterweight_tonnes: 24.0,
        axle_basis: null,
        roadability_basis: 'Official brochure heavy-roadable package table.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: 2.75,
        transport_height_m: null,
        transport_length_m: 14.5,
        review_required: 1,
        source_url: 'https://www.manitowoc.com/media/15995/download',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'This state exists for the variant, but it is not the best-supported default reduced travel-state assumption.'
      },
      {
        state_label: '28.6t at 16.5t/axle (10x6)',
        carried_counterweight_tonnes: 28.6,
        axle_basis: '16.5 t/axle',
        roadability_basis: 'Official brochure transport row for 10x6.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: 2.75,
        transport_height_m: null,
        transport_length_m: 14.5,
        review_required: 0,
        source_url: 'https://www.manitowoc.com/media/15995/download',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Useful exact-model travel state where tyre and axle configuration matter.'
      },
      {
        state_label: '30.9t reduced heavy-roadable state',
        carried_counterweight_tonnes: 30.9,
        axle_basis: '16.5 t/axle',
        roadability_basis: 'Official product page and brochure state 30.9 t within 16.5 t/axle and within vehicle width.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: 2.75,
        transport_height_m: null,
        transport_length_m: 14.5,
        review_required: 0,
        source_url: 'https://www.manitowoc.com/grove/all-terrain-cranes/gmk5150l-1',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Best-supported reduced heavy-roadable state for this exact model.'
      },
      {
        state_label: 'full 44.5t counterweight',
        carried_counterweight_tonnes: 44.5,
        axle_basis: null,
        roadability_basis: 'Full site counterweight state.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: null,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 1,
        source_url: 'https://www.manitowoc.com/grove/all-terrain-cranes/gmk5150l-1',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Use for on-site required counterweight planning only. Confirm transport state before dispatch.'
      }
    ]
  },
  {
    manufacturer: 'Tadano',
    model: 'AC 4.110-1',
    nominal_capacity_tonnes: 110,
    max_counterweight_tonnes: 30.4,
    transport_length_m: 13.12,
    transport_width_m: 2.75,
    transport_height_m: 3.97,
    gross_vehicle_weight_tonnes: null,
    axle_configuration: '8x6x8 or 8x8x8 depending setup',
    source_url: 'https://group.tadano.com/europe/en/lifting-equipment/all-terrain-cranes/ac-4-110-1/',
    source_capture_date: '2026-05-11',
    source_confidence: 'high',
    notes: 'Useful comparison model because the official page exposes both compact dimensions and counterweight states cleanly.',
    travel_states: [
      {
        state_label: '24.0t at 2.75m vehicle width',
        carried_counterweight_tonnes: 24.0,
        axle_basis: null,
        roadability_basis: 'Official page states the crane remains 2.75 m wide with 24 t counterweight.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: 2.75,
        transport_height_m: 3.97,
        transport_length_m: 13.12,
        review_required: 0,
        source_url: 'https://group.tadano.com/europe/en/lifting-equipment/all-terrain-cranes/ac-4-110-1/',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Official compact travel state.'
      },
      {
        state_label: 'full 30.4t counterweight',
        carried_counterweight_tonnes: 30.4,
        axle_basis: null,
        roadability_basis: 'Full site counterweight state.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: null,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 1,
        source_url: 'https://group.tadano.com/europe/en/lifting-equipment/all-terrain-cranes/ac-4-110-1/',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Official page states 3.8 m tailswing with full 30.4 t counterweight. Confirm route and travel basis before dispatch.'
      }
    ]
  },
  {
    manufacturer: 'Liebherr',
    model: 'LTM 1150-5.3',
    nominal_capacity_tonnes: 150,
    max_counterweight_tonnes: 45.0,
    transport_length_m: 12.45,
    transport_width_m: 2.85,
    transport_height_m: null,
    gross_vehicle_weight_tonnes: null,
    axle_configuration: '10x6x10 standard; 10x8x10 optional',
    source_url: 'https://www.liebherr.com/en-kr/mobile-and-crawler-cranes/mobile-cranes/ltm-mobile-cranes/ltm-1150-5-3-5478385',
    source_capture_date: '2026-05-11',
    source_confidence: 'medium',
    notes: 'Official page confirms 9 t of ballast on public roads with 12 t axle load. Transport length and width came from an Australian fleet page in the research pack and remain secondary.',
    travel_states: [
      {
        state_label: '9.0t at 12t axle load',
        carried_counterweight_tonnes: 9.0,
        axle_basis: '12 t axle load',
        roadability_basis: 'Official product page ballast claim.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: null,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 0,
        source_url: 'https://www.liebherr.com/en-kr/mobile-and-crawler-cranes/mobile-cranes/ltm-mobile-cranes/ltm-1150-5-3-5478385',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Official public-road ballast claim.'
      },
      {
        state_label: 'full 45.0t counterweight',
        carried_counterweight_tonnes: 45.0,
        axle_basis: null,
        roadability_basis: 'Full site counterweight state.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: null,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 1,
        source_url: 'https://www.liebherr.com/en-kr/mobile-and-crawler-cranes/mobile-cranes/ltm-mobile-cranes/ltm-1150-5-3-5478385',
        source_capture_date: '2026-05-11',
        source_confidence: 'high',
        notes: 'Use for on-site planning only. Confirm travel basis before dispatch.'
      }
    ]
  },
  {
    manufacturer: 'Liebherr',
    model: 'LTM 1160-5.2',
    nominal_capacity_tonnes: 180,
    max_counterweight_tonnes: 54.0,
    transport_length_m: null,
    transport_width_m: null,
    transport_height_m: null,
    gross_vehicle_weight_tonnes: null,
    axle_configuration: '10x6x10 standard; 10x8x10 optional',
    source_url: 'https://www.liebherr.com/en-us/mobile-and-crawler-cranes/mobile-cranes/ltm-mobile-cranes/ltm-1160-5-2-4407350',
    source_capture_date: '2026-05-11',
    source_confidence: 'medium',
    notes: 'Official page confirms 54.0 t total ballast, but this research pass did not extract a direct official roadable ballast quantity suitable for stronger automation.',
    travel_states: [
      {
        state_label: 'full 54.0t counterweight',
        carried_counterweight_tonnes: 54.0,
        axle_basis: null,
        roadability_basis: 'Full site counterweight state only.',
        gross_vehicle_weight_tonnes: null,
        transport_width_m: null,
        transport_height_m: null,
        transport_length_m: null,
        review_required: 1,
        source_url: 'https://www.liebherr.com/en-us/mobile-and-crawler-cranes/mobile-cranes/ltm-mobile-cranes/ltm-1160-5-2-4407350',
        source_capture_date: '2026-05-11',
        source_confidence: 'medium',
        notes: 'Keep review-gated until an official roadable ballast state is confirmed.'
      }
    ]
  }
];

function normalizeConfidence(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['high', 'medium', 'low'].includes(normalized) ? normalized : null;
}

function serializeCraneModel(row) {
  if (!row) return null;
  return {
    ...row,
    source_confidence: normalizeConfidence(row.source_confidence)
  };
}

function serializeTravelState(row) {
  if (!row) return null;
  return {
    ...row,
    review_required: Boolean(row.review_required),
    source_confidence: normalizeConfidence(row.source_confidence)
  };
}

function upsertCraneModel(db, seed) {
  const now = new Date().toISOString();
  const existing = db.prepare(`
    SELECT id
    FROM crane_models
    WHERE manufacturer = ? AND model = ?
  `).get(seed.manufacturer, seed.model);

  if (existing) {
    db.prepare(`
      UPDATE crane_models
      SET nominal_capacity_tonnes = ?,
          max_counterweight_tonnes = ?,
          transport_length_m = ?,
          transport_width_m = ?,
          transport_height_m = ?,
          gross_vehicle_weight_tonnes = ?,
          axle_configuration = ?,
          source_url = ?,
          source_capture_date = ?,
          source_confidence = ?,
          notes = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      seed.nominal_capacity_tonnes,
      seed.max_counterweight_tonnes,
      seed.transport_length_m,
      seed.transport_width_m,
      seed.transport_height_m,
      seed.gross_vehicle_weight_tonnes,
      seed.axle_configuration,
      seed.source_url,
      seed.source_capture_date,
      seed.source_confidence,
      seed.notes,
      now,
      existing.id
    );
    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO crane_models (
      manufacturer, model, nominal_capacity_tonnes, max_counterweight_tonnes,
      transport_length_m, transport_width_m, transport_height_m, gross_vehicle_weight_tonnes,
      axle_configuration, source_url, source_capture_date, source_confidence,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    seed.manufacturer,
    seed.model,
    seed.nominal_capacity_tonnes,
    seed.max_counterweight_tonnes,
    seed.transport_length_m,
    seed.transport_width_m,
    seed.transport_height_m,
    seed.gross_vehicle_weight_tonnes,
    seed.axle_configuration,
    seed.source_url,
    seed.source_capture_date,
    seed.source_confidence,
    seed.notes,
    now,
    now
  );

  return result.lastInsertRowid;
}

function upsertTravelState(db, craneModelId, seed) {
  const now = new Date().toISOString();
  const existing = db.prepare(`
    SELECT id
    FROM crane_model_travel_states
    WHERE crane_model_id = ? AND state_label = ?
  `).get(craneModelId, seed.state_label);

  if (existing) {
    db.prepare(`
      UPDATE crane_model_travel_states
      SET carried_counterweight_tonnes = ?,
          axle_basis = ?,
          roadability_basis = ?,
          gross_vehicle_weight_tonnes = ?,
          transport_width_m = ?,
          transport_height_m = ?,
          transport_length_m = ?,
          review_required = ?,
          source_url = ?,
          source_capture_date = ?,
          source_confidence = ?,
          notes = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      seed.carried_counterweight_tonnes,
      seed.axle_basis,
      seed.roadability_basis,
      seed.gross_vehicle_weight_tonnes,
      seed.transport_width_m,
      seed.transport_height_m,
      seed.transport_length_m,
      seed.review_required ? 1 : 0,
      seed.source_url,
      seed.source_capture_date,
      seed.source_confidence,
      seed.notes,
      now,
      existing.id
    );
    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO crane_model_travel_states (
      crane_model_id, state_label, carried_counterweight_tonnes, axle_basis,
      roadability_basis, gross_vehicle_weight_tonnes, transport_width_m,
      transport_height_m, transport_length_m, review_required, source_url,
      source_capture_date, source_confidence, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    craneModelId,
    seed.state_label,
    seed.carried_counterweight_tonnes,
    seed.axle_basis,
    seed.roadability_basis,
    seed.gross_vehicle_weight_tonnes,
    seed.transport_width_m,
    seed.transport_height_m,
    seed.transport_length_m,
    seed.review_required ? 1 : 0,
    seed.source_url,
    seed.source_capture_date,
    seed.source_confidence,
    seed.notes,
    now,
    now
  );

  return result.lastInsertRowid;
}

function seedCraneModelCatalog(db) {
  db.transaction(() => {
    for (const seed of CRANE_MODEL_SEEDS) {
      const craneModelId = upsertCraneModel(db, seed);
      for (const state of seed.travel_states || []) {
        upsertTravelState(db, craneModelId, state);
      }
    }
  })();
}

function listCraneModels(db) {
  return db.prepare(`
    SELECT
      cm.*,
      COUNT(ts.id) AS travel_state_count
    FROM crane_models cm
    LEFT JOIN crane_model_travel_states ts ON ts.crane_model_id = cm.id
    GROUP BY cm.id
    ORDER BY cm.manufacturer ASC, cm.model ASC
  `).all().map(serializeCraneModel);
}

function listCraneTravelStates(db, craneModelId) {
  return db.prepare(`
    SELECT *
    FROM crane_model_travel_states
    WHERE crane_model_id = ?
    ORDER BY
      CASE WHEN carried_counterweight_tonnes IS NULL THEN 1 ELSE 0 END,
      carried_counterweight_tonnes ASC,
      id ASC
  `).all(craneModelId).map(serializeTravelState);
}

function getCraneModelById(db, id) {
  return serializeCraneModel(db.prepare(`
    SELECT *
    FROM crane_models
    WHERE id = ?
  `).get(id));
}

function getCraneTravelStateById(db, id) {
  return serializeTravelState(db.prepare(`
    SELECT *
    FROM crane_model_travel_states
    WHERE id = ?
  `).get(id));
}

function findTravelStateByCarriedCounterweight(db, craneModelId, tonnes) {
  if (tonnes == null || tonnes === '') return null;
  return serializeTravelState(db.prepare(`
    SELECT *
    FROM crane_model_travel_states
    WHERE crane_model_id = ?
      AND carried_counterweight_tonnes IS NOT NULL
      AND ABS(carried_counterweight_tonnes - ?) < 0.001
    ORDER BY review_required ASC, id ASC
    LIMIT 1
  `).get(craneModelId, tonnes));
}

module.exports = {
  CRANE_MODEL_SEEDS,
  findTravelStateByCarriedCounterweight,
  getCraneModelById,
  getCraneTravelStateById,
  listCraneModels,
  listCraneTravelStates,
  normalizeConfidence,
  seedCraneModelCatalog
};
