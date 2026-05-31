'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { appendAuditEvent } = require('../services/audit');
const { buildCraneTransportPlan } = require('../services/crane-transport-planning');
const {
  buildJobScheduleFields,
  normalizeTimeZone
} = require('../services/timezone');

const DEMO_DATASET_VERSION = '2026-05-liftiq-demo-v1';
const DEMO_MARKER = 'DEMO_DATASET_2026_05';
const DEMO_WORKER_MARKER = 'DEMO_WORKER';
const DEMO_JOB_MARKER = 'DEMO_JOB';
const DEFAULT_TIMEZONE = 'Australia/Brisbane';

const DEMO_COMPANY = {
  name: 'LIFTIQ Demo / Internal',
  display_name: 'LIFTIQ Demo / Internal',
  slug: 'liftiq-demo-internal',
  pilot_type: 'internal',
  access_status: 'active',
  timezone: DEFAULT_TIMEZONE,
  notes: `${DEMO_MARKER}: Screen-recording and founding-partner demonstration tenant only. Synthetic data only.`
};

const SMOKE_MARKERS = [
  'smoke',
  'smoke test',
  'sample smoke',
  'test smoke',
  'disposable',
  'demo smoke',
  'temporary smoke',
  'verification job',
  'playwright',
  'automated test',
  'live smoke'
];

const WORKERS = [
  {
    name: 'Tom Mercer',
    email: 'tom.mercer@demo.liftiq.local',
    role: 'crane_operator',
    employment_type: 'permanent',
    crane_classes: ['Franna', '25T', '55T'],
    usual_depot: 'Brisbane Metro Depot',
    contact_number: '0499 000 001',
    status: 'available',
    availability_note: 'Demo worker. Available for clean SmartRank examples.',
    notes: 'Franna and short-notice mobile crane demo profile.',
    credentials: [
      ['white_card', 'White Card', null],
      ['high_risk_licence_crane', 'HRWL-C2', '2028-06-30'],
      ['high_risk_licence_crane', 'HRWL-C6', '2028-06-30'],
      ['high_risk_licence_dogging', 'HRWL-DG', '2028-06-30']
    ],
    preferences: [
      ['franna', 5, 'manual'],
      ['low_complexity', 5, 'imported'],
      ['short_notice', 4, 'learned', 3, 1, 0.8],
      ['machinery_move', 4, 'manual']
    ],
    fatigue: []
  },
  {
    name: 'Riley Hayes',
    email: 'riley.hayes@demo.liftiq.local',
    role: 'crane_operator',
    employment_type: 'permanent',
    crane_classes: ['100T', '150T', 'Mobile Crane'],
    usual_depot: 'Pinkenba Heavy Lift Yard',
    contact_number: '0499 000 002',
    status: 'available',
    availability_note: 'Demo worker. Strong counterweight and all-terrain profile.',
    notes: 'All-terrain crane demo profile for GMK5150L scenarios.',
    credentials: [
      ['white_card', 'White Card', null],
      ['high_risk_licence_crane', 'HRWL-C6', '2028-07-31'],
      ['high_risk_licence_crane', 'HRWL-CN', '2028-07-31'],
      ['high_risk_licence_dogging', 'HRWL-DG', '2028-07-31'],
      ['high_risk_licence_rigging', 'HRWL-RB', '2028-07-31']
    ],
    preferences: [
      ['mobile_crane', 5, 'manual'],
      ['counterweight', 5, 'learned', 4, 0, 0.95],
      ['critical_lift', 4, 'manual'],
      ['semi_trailer', 4, 'imported']
    ],
    fatigue: []
  },
  {
    name: 'Sam Fletcher',
    email: 'sam.fletcher@demo.liftiq.local',
    role: 'dogman',
    employment_type: 'permanent',
    crane_classes: [],
    usual_depot: 'Brisbane Metro Depot',
    contact_number: '0499 000 003',
    status: 'available',
    availability_note: 'Demo worker. Dogging and precast preference example.',
    notes: 'Dogman profile for precast, container, and plant lift demos.',
    credentials: [
      ['white_card', 'White Card', null],
      ['high_risk_licence_dogging', 'HRWL-DG', '2028-08-31'],
      ['other', 'EWP', '2028-08-31']
    ],
    preferences: [
      ['dogman', 5, 'manual'],
      ['precast_panel', 4, 'imported'],
      ['restricted_access', 4, 'learned', 2, 0, 0.6],
      ['mobile_crane', 4, 'manual']
    ],
    fatigue: []
  },
  {
    name: 'Blake Warren',
    email: 'blake.warren@demo.liftiq.local',
    role: 'rigger',
    employment_type: 'casual',
    crane_classes: [],
    usual_depot: 'Hemmant Shutdown Yard',
    contact_number: '0499 000 004',
    status: 'available',
    availability_note: 'Demo worker. Rigging profile with heavy weekly load for FatigueGuard block examples.',
    notes: 'Rigger profile for shutdown and night-shift clips.',
    credentials: [
      ['white_card', 'White Card', null],
      ['high_risk_licence_rigging', 'HRWL-RB', '2028-09-30'],
      ['high_risk_licence_rigging', 'HRWL-RA', '2028-09-30'],
      ['other', 'EWP', '2028-09-30']
    ],
    preferences: [
      ['rigger', 5, 'manual'],
      ['shutdown', 5, 'learned', 5, 0, 1],
      ['night_shift', 4, 'imported'],
      ['critical_lift', 3, 'manual']
    ],
    fatigue: [
      ['2026-05-18T20:00:00.000Z', '2026-05-19T08:00:00.000Z', 12, 'night', 1],
      ['2026-05-19T20:00:00.000Z', '2026-05-20T08:00:00.000Z', 12, 'night', 0],
      ['2026-05-20T20:00:00.000Z', '2026-05-21T08:00:00.000Z', 12, 'night', 0],
      ['2026-05-21T20:00:00.000Z', '2026-05-22T08:00:00.000Z', 12, 'night', 0]
    ]
  },
  {
    name: 'Connor Vale',
    email: 'connor.vale@demo.liftiq.local',
    role: 'supervisor',
    employment_type: 'permanent',
    crane_classes: ['100T', '150T'],
    usual_depot: 'Pinkenba Heavy Lift Yard',
    contact_number: '0499 000 005',
    status: 'allocated',
    availability_note: 'Demo worker. Already allocated, useful for availability warning examples.',
    notes: 'Lift supervisor profile for critical and restricted-access demos.',
    credentials: [
      ['white_card', 'White Card', null],
      ['other', 'Site Supervisor', '2028-10-31'],
      ['high_risk_licence_dogging', 'HRWL-DG', '2028-10-31']
    ],
    preferences: [
      ['supervisor', 5, 'manual'],
      ['critical_lift', 5, 'learned', 4, 1, 0.9],
      ['restricted_access', 4, 'manual'],
      ['counterweight', 4, 'imported']
    ],
    fatigue: []
  },
  {
    name: 'Nathan Brooks',
    email: 'nathan.brooks@demo.liftiq.local',
    role: 'crane_operator',
    employment_type: 'contractor',
    crane_classes: ['25T', 'City Crane'],
    usual_depot: 'Brisbane City Depot',
    contact_number: '0499 000 006',
    status: 'unavailable',
    availability_note: 'Demo worker. Unavailable to demonstrate SmartRank hard block.',
    notes: 'City crane profile with intentionally unavailable status for demos.',
    credentials: [
      ['white_card', 'White Card', null],
      ['high_risk_licence_crane', 'HRWL-C2', '2028-11-30']
    ],
    preferences: [
      ['restricted_access', 5, 'manual'],
      ['city_crane', 5, 'imported'],
      ['short_notice', 2, 'manual']
    ],
    fatigue: []
  },
  {
    name: 'Isaac Nolan',
    email: 'isaac.nolan@demo.liftiq.local',
    role: 'rigger',
    employment_type: 'casual',
    crane_classes: [],
    usual_depot: 'Logan Industrial Depot',
    contact_number: '0499 000 007',
    status: 'available',
    availability_note: 'Demo worker. Missing dogging credential and short rest examples.',
    notes: 'Rigger profile designed to show CredentialGate and FatigueGuard blocks.',
    credentials: [
      ['white_card', 'White Card', null],
      ['high_risk_licence_rigging', 'HRWL-RB', '2028-12-31']
    ],
    preferences: [
      ['rigger', 4, 'manual'],
      ['machinery_move', 5, 'imported'],
      ['night_shift', 3, 'manual']
    ],
    fatigue: [
      ['2026-05-17T14:00:00.000Z', '2026-05-17T23:30:00.000Z', 9.5, 'day', 0]
    ]
  },
  {
    name: 'Jordan Ellis',
    email: 'jordan.ellis@demo.liftiq.local',
    role: 'crane_operator',
    employment_type: 'permanent',
    crane_classes: ['55T', '100T', 'Mobile Crane'],
    usual_depot: 'Eagle Farm Depot',
    contact_number: '0499 000 008',
    status: 'available',
    availability_note: 'Demo worker. High weekly hours for FatigueGuard warning examples.',
    notes: 'Mobile crane operator with high weekly hours but not over the hard block threshold.',
    credentials: [
      ['white_card', 'White Card', null],
      ['high_risk_licence_crane', 'HRWL-C6', '2028-12-31'],
      ['high_risk_licence_dogging', 'HRWL-DG', '2026-05-30']
    ],
    preferences: [
      ['mobile_crane', 4, 'manual'],
      ['long_travel', 3, 'manual'],
      ['shutdown', 4, 'learned', 2, 0, 0.65]
    ],
    fatigue: [
      ['2026-05-18T20:00:00.000Z', '2026-05-19T07:00:00.000Z', 11, 'night', 0],
      ['2026-05-19T20:00:00.000Z', '2026-05-20T07:00:00.000Z', 11, 'night', 0],
      ['2026-05-20T20:00:00.000Z', '2026-05-21T07:00:00.000Z', 11, 'night', 0],
      ['2026-05-21T20:00:00.000Z', '2026-05-22T08:00:00.000Z', 12, 'night', 1]
    ]
  },
  {
    name: 'Aaron Miles',
    email: 'aaron.miles@demo.liftiq.local',
    role: 'traffic_controller',
    employment_type: 'labour_hire',
    crane_classes: [],
    usual_depot: 'Brisbane Transport Yard',
    contact_number: '0499 000 009',
    status: 'available',
    availability_note: 'Demo worker. Traffic and support transport profile.',
    notes: 'Transport driver and access support profile represented with existing traffic_controller role.',
    credentials: [
      ['white_card', 'White Card', null],
      ['other', 'Forklift', '2028-12-31'],
      ['drivers_licence', 'Heavy Vehicle Licence', '2028-12-31']
    ],
    preferences: [
      ['semi_trailer', 5, 'manual'],
      ['low_loader', 4, 'imported'],
      ['restricted_access', 4, 'manual'],
      ['long_travel', 4, 'learned', 2, 0, 0.65]
    ],
    fatigue: []
  },
  {
    name: 'Daniel Fraser',
    email: 'daniel.fraser@demo.liftiq.local',
    role: 'allocator',
    employment_type: 'permanent',
    crane_classes: [],
    usual_depot: 'Brisbane Dispatch Office',
    contact_number: '0499 000 010',
    status: 'available',
    availability_note: 'Demo allocator profile for schedule and audit walkthroughs.',
    notes: 'Allocator and demo scheduling lead.',
    credentials: [
      ['white_card', 'White Card', null],
      ['other', 'Internal Allocator Induction', '2028-12-31']
    ],
    preferences: [
      ['supervisor', 4, 'manual'],
      ['schedule_conflict_review', 5, 'manual'],
      ['short_notice', 4, 'imported']
    ],
    fatigue: []
  }
];

const JOBS = [
  {
    reference: 'DEMO-LIQ-001',
    title: 'Brisbane Rooftop Plant Lift',
    client_name: 'Demo Mechanical Services',
    site_name: 'Brisbane Rooftop Plant Lift',
    site_location: 'Demo Commercial Tower, Fortitude Valley QLD',
    contact_name: 'Demo Contact 01',
    contact_phone: '0499 100 001',
    date: '2026-05-18',
    start: '06:00',
    end: '11:00',
    shift_type: 'day',
    estimated_duration_hours: 5,
    crane_class_required: '55T',
    job_description: 'Lift packaged mechanical plant from loading bay to roof plant deck. Synthetic demo brief for job intake, schedule, and SmartRank.',
    task_tags: ['mobile_crane', 'mechanical_plant', 'rooftop_lift', 'dogman', 'low_complexity'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging'],
    site_conditions: ['restricted_access'],
    lift_risk_level: 'complex',
    risk_notes: 'Restricted laneway access. Confirm exclusion zone and building access before dispatch.',
    travel_required: false,
    travel_notes: 'Metro mobilisation. Site access to be checked before arrival.',
    source_note: 'Synthetic job brief import style data. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-002',
    title: 'Gold Coast Precast Panel Install',
    client_name: 'Demo Precast Projects',
    site_name: 'Gold Coast Precast Panel Install',
    site_location: 'Demo Construction Site, Coomera QLD',
    contact_name: 'Demo Contact 02',
    contact_phone: '0499 100 002',
    date: '2026-05-19',
    start: '07:00',
    end: '15:00',
    shift_type: 'day',
    estimated_duration_hours: 8,
    crane_class_required: '100T',
    job_description: 'Install precast panels with dogman and rigging crew. Synthetic construction lift scope.',
    task_tags: ['mobile_crane', 'precast_panel', 'dogman', 'rigger', 'critical_lift'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger', 'supervisor'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['critical_lift_planning'],
    lift_risk_level: 'critical',
    risk_notes: 'Panel handling, exclusion zone, and ground-bearing review required before dispatch.',
    travel_required: true,
    travel_hours_estimated: 1.5,
    travel_notes: 'Travel from Brisbane depot to Gold Coast construction site.',
    source_note: 'Synthetic job brief import style data. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-003',
    title: 'Hemmant Shutdown Pump Changeout',
    client_name: 'Demo Industrial Maintenance',
    site_name: 'Hemmant Shutdown Pump Changeout',
    site_location: 'Demo Processing Facility, Hemmant QLD',
    contact_name: 'Demo Contact 03',
    contact_phone: '0499 100 003',
    date: '2026-05-20',
    start: '06:00',
    end: '16:00',
    shift_type: 'day',
    estimated_duration_hours: 10,
    crane_class_required: '100T',
    job_description: 'Shutdown lift to remove pump skid and place replacement unit through restricted maintenance bay.',
    task_tags: ['shutdown', 'mobile_crane', 'rigger', 'dogman', 'restricted_access'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger', 'supervisor'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['restricted_access', 'early_arrival_required'],
    lift_risk_level: 'complex',
    risk_notes: 'Shutdown window. Confirm bay access, plant isolation, and rigging sequence before dispatch.',
    travel_required: false,
    travel_notes: 'Early arrival for site induction and permit-to-work interface. Review required only.',
    source_note: 'Synthetic shutdown job brief. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-004',
    title: 'Eagle Farm Container Repositioning',
    client_name: 'Demo Logistics Yard',
    site_name: 'Eagle Farm Container Repositioning',
    site_location: 'Demo Freight Yard, Eagle Farm QLD',
    contact_name: 'Demo Contact 04',
    contact_phone: '0499 100 004',
    date: '2026-05-21',
    start: '08:00',
    end: '12:00',
    shift_type: 'day',
    estimated_duration_hours: 4,
    crane_class_required: 'Franna',
    job_description: 'Reposition empty and light-loaded site containers within yard using pick-and-carry crane.',
    task_tags: ['franna', 'container_move', 'low_complexity', 'short_notice'],
    crew_roles_required: ['crane_operator', 'dogman'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging'],
    site_conditions: [],
    lift_risk_level: 'routine',
    risk_notes: 'Yard traffic interface. Confirm spotter and exclusion area.',
    travel_required: false,
    travel_notes: 'Metro yard move.',
    source_note: 'Synthetic simple SmartRank job. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-005',
    title: 'Ipswich Transformer Placement',
    client_name: 'Demo Electrical Infrastructure',
    site_name: 'Ipswich Transformer Placement',
    site_location: 'Demo Substation Pad, Ipswich QLD',
    contact_name: 'Demo Contact 05',
    contact_phone: '0499 100 005',
    date: '2026-05-22',
    start: '06:30',
    end: '14:30',
    shift_type: 'day',
    estimated_duration_hours: 8,
    crane_class_required: '100T',
    job_description: 'Place transformer onto prepared pad with rigging crew and supervisor.',
    task_tags: ['mobile_crane', 'transformer', 'critical_lift', 'rigger'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger', 'supervisor'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['critical_lift_planning'],
    lift_risk_level: 'critical',
    risk_notes: 'Critical lift review and exclusion zone setup required before dispatch.',
    travel_required: true,
    travel_hours_estimated: 1.25,
    travel_notes: 'Metro-west travel.',
    source_note: 'Synthetic job brief import style data. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-006',
    title: 'Lytton Pipe Rack Lift',
    client_name: 'Demo Civil Infrastructure',
    site_name: 'Lytton Pipe Rack Lift',
    site_location: 'Demo Civil Works Zone, Lytton QLD',
    contact_name: 'Demo Contact 06',
    contact_phone: '0499 100 006',
    date: '2026-05-25',
    start: '06:00',
    end: '13:00',
    shift_type: 'day',
    estimated_duration_hours: 7,
    crane_class_required: '150T',
    job_description: 'Lift pipe rack modules near constrained access road. Synthetic civil infrastructure scope.',
    task_tags: ['mobile_crane', 'critical_lift', 'restricted_access', 'counterweight'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger', 'supervisor'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['restricted_access', 'critical_lift_planning'],
    lift_risk_level: 'critical',
    risk_notes: 'Bridge approach and access-road constraint. Road access review required before dispatch.',
    travel_required: true,
    travel_hours_estimated: 1,
    travel_notes: 'Restricted access. Low loader access to be confirmed before arrival.',
    source_note: 'Synthetic crane and transport review job. DEMO_DATASET_2026_05.',
    planning: {
      model: 'GMK5150L-1',
      state: '30.9t reduced heavy-roadable state',
      required_capacity_tonnes: 150,
      lift_weight_tonnes: 18,
      radius_m: 22,
      height_m: 14,
      counterweight_required_tonnes: 44.5,
      site_access_notes: 'Restricted bridge approach. Low loader and semi trailer access require road access review before dispatch.',
      setup_notes: 'GMK5150L-1 selected with 30.9t reduced heavy-roadable state. Full 44.5t package required on site. NHVR / state notice or permit check may be required.',
      source_confidence: 'high',
      estimated_transport_loads: 1
    }
  },
  {
    reference: 'DEMO-LIQ-007',
    title: 'Sunshine Coast Machinery Relocation',
    client_name: 'Demo Food Processing',
    site_name: 'Sunshine Coast Machinery Relocation',
    site_location: 'Demo Factory, Caloundra QLD',
    contact_name: 'Demo Contact 07',
    contact_phone: '0499 100 007',
    date: '2026-05-26',
    start: '07:00',
    end: '13:00',
    shift_type: 'day',
    estimated_duration_hours: 6,
    crane_class_required: 'Franna',
    job_description: 'Relocate processing machinery from transport to factory floor using Franna support, skates, and riggers.',
    task_tags: ['franna', 'machinery_move', 'rigger', 'long_travel'],
    crew_roles_required: ['crane_operator', 'rigger'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_rigging'],
    site_conditions: ['restricted_access'],
    lift_risk_level: 'complex',
    risk_notes: 'Tight factory doorway and internal travel path. Confirm floor and access path before dispatch.',
    travel_required: true,
    travel_hours_estimated: 2,
    travel_notes: 'Long travel from Brisbane. Allow mobilisation window.',
    source_note: 'Synthetic machinery relocation scope. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-008',
    title: 'Brisbane CBD Restricted Access Lift',
    client_name: 'Demo Building Services',
    site_name: 'Brisbane CBD Restricted Access Lift',
    site_location: 'Demo CBD Lane, Brisbane QLD',
    contact_name: 'Demo Contact 08',
    contact_phone: '0499 100 008',
    date: '2026-05-27',
    start: '05:30',
    end: '10:30',
    shift_type: 'day',
    estimated_duration_hours: 5,
    crane_class_required: 'City Crane',
    job_description: 'Restricted-access city crane job to lift compact plant through CBD loading lane.',
    task_tags: ['restricted_access', 'city_crane', 'mobile_crane', 'dogman'],
    crew_roles_required: ['crane_operator', 'dogman', 'traffic_controller'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging'],
    site_conditions: ['restricted_access', 'early_arrival_required'],
    lift_risk_level: 'complex',
    risk_notes: 'Restricted access and traffic interface. Confirm access window before dispatch.',
    travel_required: false,
    travel_notes: 'CBD access timing required. Review before dispatch.',
    source_note: 'Synthetic restricted-access scope. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-009',
    title: 'Night Shift Shutdown Rigging Support',
    client_name: 'Demo Shutdown Contractor',
    site_name: 'Night Shift Shutdown Rigging Support',
    site_location: 'Demo Industrial Facility, Murarrie QLD',
    contact_name: 'Demo Contact 09',
    contact_phone: '0499 100 009',
    date: '2026-05-28',
    start: '20:00',
    end: '23:30',
    shift_type: 'night',
    estimated_duration_hours: 3.5,
    crane_class_required: '55T',
    job_description: 'Night-shift shutdown rigging support for equipment swap under compressed outage window.',
    task_tags: ['shutdown', 'night_shift', 'rigger', 'mobile_crane'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['early_arrival_required'],
    lift_risk_level: 'complex',
    risk_notes: 'Night shift and outage window. Fatigue review before allocation.',
    travel_required: false,
    travel_notes: 'Night shift mobilisation.',
    source_note: 'Synthetic FatigueGuard demo scope. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-010',
    title: 'Tower Crane Support Allocation',
    client_name: 'Demo High Rise Builder',
    site_name: 'Tower Crane Support Allocation',
    site_location: 'Demo High Rise Site, South Brisbane QLD',
    contact_name: 'Demo Contact 10',
    contact_phone: '0499 100 010',
    date: '2026-06-01',
    start: '06:30',
    end: '14:30',
    shift_type: 'day',
    estimated_duration_hours: 8,
    crane_class_required: 'Tower Crane',
    job_description: 'Dogman and rigger support for tower crane materials handling on multi-level build.',
    task_tags: ['tower_crane', 'dogman', 'rigger', 'restricted_access'],
    crew_roles_required: ['dogman', 'rigger', 'supervisor'],
    required_credentials: ['white_card', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['restricted_access'],
    lift_risk_level: 'complex',
    risk_notes: 'Tower crane support only. Confirm crew visibility and access before dispatch.',
    travel_required: false,
    travel_notes: 'Metro tower crane support.',
    source_note: 'Synthetic tower crane crew allocation job. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-011',
    title: 'Pinkenba Counterweight Transport Lift',
    client_name: 'Demo Heavy Lift Client',
    site_name: 'Pinkenba Counterweight Transport Lift',
    site_location: 'Demo Trade Coast Hardstand, Pinkenba QLD',
    contact_name: 'Demo Contact 11',
    contact_phone: '0499 100 011',
    date: '2026-06-02',
    start: '06:00',
    end: '13:00',
    shift_type: 'day',
    estimated_duration_hours: 7,
    crane_class_required: '150T',
    job_description: 'Grove GMK5150L 150T crane required as a 100T setup. Use 24T counterweight travel state, but full 44.5T counterweight required on site.',
    task_tags: ['mobile_crane', 'gmk5150l', 'counterweight', 'semi_trailer', 'critical_lift'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger', 'supervisor', 'traffic_controller'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['restricted_access', 'critical_lift_planning'],
    lift_risk_level: 'critical',
    risk_notes: 'Counterweight transport likely required. Review route and site access before dispatch.',
    travel_required: true,
    travel_hours_estimated: 1,
    travel_notes: 'Counterweight requires one semi trailer. Restricted access on site. NHVR / state road access review required.',
    source_note: 'Synthetic counterweight demo based on sourced GMK5150L planning pattern. DEMO_DATASET_2026_05.',
    planning: {
      model: 'GMK5150L',
      state: '24.0t at 16.5t/axle',
      required_capacity_tonnes: 100,
      lift_weight_tonnes: 12,
      radius_m: 20,
      height_m: 18,
      counterweight_required_tonnes: 44.5,
      site_access_notes: 'Restricted access. Counterweight support transport by semi trailer. Road access review required.',
      setup_notes: 'Grove GMK5150L selected with 24.0t travel state. Full 44.5t counterweight package required on site. Confirm route, vehicle combination, axle masses, and dimensions before dispatch.',
      source_confidence: 'high',
      estimated_transport_loads: 1
    }
  },
  {
    reference: 'DEMO-LIQ-012',
    title: 'Redbank Equipment Unload',
    client_name: 'Demo Warehouse Operations',
    site_name: 'Redbank Equipment Unload',
    site_location: 'Demo Warehouse Yard, Redbank QLD',
    contact_name: 'Demo Contact 12',
    contact_phone: '0499 100 012',
    date: '2026-06-04',
    start: '08:00',
    end: '12:00',
    shift_type: 'day',
    estimated_duration_hours: 4,
    crane_class_required: 'Franna',
    job_description: 'Low-complexity unload and place packaged equipment at warehouse dock.',
    task_tags: ['franna', 'low_complexity', 'machinery_move'],
    crew_roles_required: ['crane_operator', 'dogman'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging'],
    site_conditions: [],
    lift_risk_level: 'routine',
    risk_notes: 'Simple yard unload. Confirm load weight before dispatch.',
    travel_required: false,
    travel_notes: 'Metro job.',
    source_note: 'Synthetic clean SmartRank job. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-013',
    title: 'Toowoomba Regional Lift',
    client_name: 'Demo Regional Fabrication',
    site_name: 'Toowoomba Regional Lift',
    site_location: 'Demo Regional Workshop, Toowoomba QLD',
    contact_name: 'Demo Contact 13',
    contact_phone: '0499 100 013',
    date: '2026-06-08',
    start: '07:00',
    end: '15:00',
    shift_type: 'day',
    estimated_duration_hours: 8,
    crane_class_required: '100T',
    job_description: 'Regional lift for fabricated skid module with mobilisation and demobilisation window.',
    task_tags: ['mobile_crane', 'long_travel', 'machinery_move', 'rigger'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['early_arrival_required'],
    lift_risk_level: 'complex',
    risk_notes: 'Regional travel. Confirm access road and laydown area.',
    travel_required: true,
    travel_hours_estimated: 3,
    travel_notes: 'Long travel. Mobilisation and demobilisation window required.',
    source_note: 'Synthetic long-travel regional scope. DEMO_DATASET_2026_05.',
    planning: {
      model: 'GMK5150L',
      state: '10.2t at 12t/axle',
      required_capacity_tonnes: 100,
      lift_weight_tonnes: 10,
      radius_m: 18,
      height_m: 10,
      counterweight_required_tonnes: 24,
      site_access_notes: 'Regional road travel and site approach require transport review before dispatch.',
      setup_notes: 'Reduced travel state selected; counterweight support load may be required depending final lift setup.',
      source_confidence: 'medium',
      estimated_transport_loads: 1
    }
  },
  {
    reference: 'DEMO-LIQ-014',
    title: 'Port Access Mobile Crane Job',
    client_name: 'Demo Port Services',
    site_name: 'Port Access Mobile Crane Job',
    site_location: 'Demo Wharf Interface, Fisherman Islands QLD',
    contact_name: 'Demo Contact 14',
    contact_phone: '0499 100 014',
    date: '2026-06-10',
    start: '05:30',
    end: '13:30',
    shift_type: 'day',
    estimated_duration_hours: 8,
    crane_class_required: '150T',
    job_description: 'Mobile crane lift near wharf interface with restricted access and support transport review.',
    task_tags: ['mobile_crane', 'restricted_access', 'counterweight', 'semi_trailer'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger', 'traffic_controller'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['restricted_access', 'early_arrival_required'],
    lift_risk_level: 'critical',
    risk_notes: 'Port access, wharf interface, and escort review. No approval is implied by this demo data.',
    travel_required: true,
    travel_hours_estimated: 1,
    travel_notes: 'Semi trailer and low loader access to be checked. NHVR / state notice or permit check may be required.',
    source_note: 'Synthetic port access transport review scope. DEMO_DATASET_2026_05.',
    planning: {
      model: 'GMK5150L-1',
      state: '30.9t reduced heavy-roadable state',
      required_capacity_tonnes: 150,
      lift_weight_tonnes: 16,
      radius_m: 24,
      height_m: 12,
      counterweight_required_tonnes: 44.5,
      site_access_notes: 'Port restricted access. Low loader, escort, and semi trailer access review before dispatch.',
      setup_notes: 'GMK5150L-1 uses its own 30.9t reduced heavy-roadable travel state. Confirm route, vehicle combination, axle masses, and dimensions before dispatch.',
      source_confidence: 'high',
      estimated_transport_loads: 1
    }
  },
  {
    reference: 'DEMO-LIQ-015',
    title: 'Logan Warehouse Mezzanine Install',
    client_name: 'Demo Warehouse Fitout',
    site_name: 'Logan Warehouse Mezzanine Install',
    site_location: 'Demo Industrial Unit, Loganholme QLD',
    contact_name: 'Demo Contact 15',
    contact_phone: '0499 100 015',
    date: '2026-06-12',
    start: '07:00',
    end: '14:00',
    shift_type: 'day',
    estimated_duration_hours: 7,
    crane_class_required: '25T',
    job_description: 'Lift mezzanine steel and small machinery into warehouse fitout area.',
    task_tags: ['franna', 'machinery_move', 'rigger', 'restricted_access'],
    crew_roles_required: ['crane_operator', 'dogman', 'rigger'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging'],
    site_conditions: ['restricted_access'],
    lift_risk_level: 'complex',
    risk_notes: 'Internal access route and overhead clearance to be checked.',
    travel_required: false,
    travel_notes: 'Metro warehouse fitout.',
    source_note: 'Synthetic warehouse machinery install scope. DEMO_DATASET_2026_05.',
    planning: null
  },
  {
    reference: 'DEMO-LIQ-016',
    title: 'Schedule Conflict Test Lift',
    client_name: 'Demo Conflict Scenario',
    site_name: 'Schedule Conflict Test Lift',
    site_location: 'Demo Yard, Eagle Farm QLD',
    contact_name: 'Demo Contact 16',
    contact_phone: '0499 100 016',
    date: '2026-05-18',
    start: '08:00',
    end: '12:00',
    shift_type: 'day',
    estimated_duration_hours: 4,
    crane_class_required: '55T',
    job_description: 'Overlapping lift window designed to demonstrate schedule conflict detection if the same worker is selected.',
    task_tags: ['mobile_crane', 'schedule_conflict_test', 'dogman'],
    crew_roles_required: ['crane_operator', 'dogman'],
    required_credentials: ['white_card', 'high_risk_licence_crane', 'high_risk_licence_dogging'],
    site_conditions: [],
    lift_risk_level: 'routine',
    risk_notes: 'Conflict demo only. Synthetic job.',
    travel_required: false,
    travel_notes: 'Metro schedule conflict example.',
    source_note: 'Synthetic schedule conflict test job. DEMO_DATASET_2026_05.',
    planning: null
  }
];

const DATASET_ALLOCATIONS = [
  {
    key: 'allocation-rooftop-tom',
    job_reference: 'DEMO-LIQ-001',
    worker_email: 'tom.mercer@demo.liftiq.local',
    smartrank_position: 1,
    smartrank_score: 92,
    override_reason: null
  },
  {
    key: 'allocation-shutdown-blake',
    job_reference: 'DEMO-LIQ-003',
    worker_email: 'blake.warren@demo.liftiq.local',
    smartrank_position: 2,
    smartrank_score: 79,
    override_reason: 'Demo override: shutdown rigging preference selected after supervisor review.'
  },
  {
    key: 'allocation-counterweight-riley',
    job_reference: 'DEMO-LIQ-011',
    worker_email: 'riley.hayes@demo.liftiq.local',
    smartrank_position: 1,
    smartrank_score: 94,
    override_reason: null
  }
];

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function maskEmail(email) {
  const text = String(email || '').trim();
  const [local, domain] = text.split('@');
  if (!local || !domain) return text ? '[masked-email]' : null;
  return `${local.slice(0, 2)}***@${domain}`;
}

function nowIso() {
  return new Date().toISOString();
}

function json(value) {
  return JSON.stringify(value || []);
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function upsertDemoTenant(db, { dryRun = false } = {}) {
  const slug = normalizeSlug(DEMO_COMPANY.slug);
  const existing = db.prepare(`SELECT * FROM companies WHERE slug = ?`).get(slug);
  if (dryRun) {
    return {
      id: existing?.id || '[dry-run-demo-company-id]',
      slug,
      action: existing ? 'would_update' : 'would_create'
    };
  }

  const id = existing?.id || randomUUID();
  const startsAt = existing?.pilot_starts_at || nowIso();
  if (existing) {
    db.prepare(`
      UPDATE companies
      SET name = ?,
          display_name = ?,
          timezone = ?,
          access_status = ?,
          pilot_type = ?,
          pilot_starts_at = COALESCE(pilot_starts_at, ?),
          pilot_expires_at = NULL,
          notes = ?
      WHERE id = ?
    `).run(
      DEMO_COMPANY.name,
      DEMO_COMPANY.display_name,
      DEMO_COMPANY.timezone,
      DEMO_COMPANY.access_status,
      DEMO_COMPANY.pilot_type,
      startsAt,
      DEMO_COMPANY.notes,
      existing.id
    );
    return { id: existing.id, slug, action: 'updated' };
  }

  db.prepare(`
    INSERT INTO companies (
      id, name, slug, display_name, timezone, locations, operating_regions,
      status, pilot_start_date, access_status, pilot_type, pilot_starts_at,
      pilot_expires_at, notes
    )
    VALUES (?, ?, ?, ?, ?, '[]', '[]', 'pilot', ?, ?, ?, ?, NULL, ?)
  `).run(
    id,
    DEMO_COMPANY.name,
    slug,
    DEMO_COMPANY.display_name,
    DEMO_COMPANY.timezone,
    startsAt.slice(0, 10),
    DEMO_COMPANY.access_status,
    DEMO_COMPANY.pilot_type,
    startsAt,
    DEMO_COMPANY.notes
  );

  return { id, slug, action: 'created' };
}

function upsertDemoAdmin(db, companyId, env = process.env, { dryRun = false } = {}) {
  const email = String(env.LIFTIQ_DEMO_EMAIL || '').trim().toLowerCase();
  const password = env.LIFTIQ_DEMO_PASSWORD;
  if (!email || !password) {
    return {
      action: 'skipped_missing_secret',
      email_masked: email ? maskEmail(email) : null,
      must_change_password: false
    };
  }

  const existing = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
  if (existing && existing.company_id !== companyId) {
    throw new Error('LIFTIQ_DEMO_EMAIL already belongs to a different company.');
  }

  if (dryRun) {
    return {
      action: existing ? 'would_update' : 'would_create',
      email_masked: maskEmail(email),
      must_change_password: true
    };
  }

  const hash = bcrypt.hashSync(password, 10);
  if (existing) {
    db.prepare(`
      UPDATE users
      SET name = 'Demo Admin',
          password_hash = ?,
          role = 'admin',
          status = 'active',
          must_change_password = 1
      WHERE id = ?
    `).run(hash, existing.id);
    return {
      action: 'updated',
      id: existing.id,
      email_masked: maskEmail(email),
      must_change_password: true
    };
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO users (
      id, company_id, name, email, password_hash, role, status, must_change_password
    )
    VALUES (?, ?, 'Demo Admin', ?, ?, 'admin', 'active', 1)
  `).run(id, companyId, email, hash);

  return {
    action: 'created',
    id,
    email_masked: maskEmail(email),
    must_change_password: true
  };
}

function jobSearchText(job) {
  return [
    job.reference,
    job.client_name,
    job.site_name,
    job.site_location,
    job.job_description,
    job.task_tags,
    job.risk_notes,
    job.travel_notes,
    job.source_note,
    job.notes
  ].filter(Boolean).join(' ').toLowerCase();
}

function isSmokeJob(job) {
  const text = jobSearchText(job);
  if (text.includes(DEMO_MARKER.toLowerCase())) return false;
  return SMOKE_MARKERS.some((marker) => text.includes(marker));
}

function cleanupSmokeJobs(db, companyId, userId, { dryRun = false } = {}) {
  const candidates = db.prepare(`
    SELECT *
    FROM jobs
    WHERE company_id = ?
  `).all(companyId).filter(isSmokeJob);

  const removed = [];
  const archived = [];
  const now = nowIso();

  for (const job of candidates) {
    const auditCount = db.prepare(`SELECT COUNT(*) AS n FROM audit_events WHERE job_id = ?`).get(job.id).n;
    const allocationCount = db.prepare(`SELECT COUNT(*) AS n FROM allocations WHERE job_id = ?`).get(job.id).n;
    const canHardDelete = auditCount === 0 && allocationCount === 0;
    const label = job.reference || job.site_name || job.client_name || job.id;

    if (dryRun) {
      (canHardDelete ? removed : archived).push({ id: job.id, label, action: canHardDelete ? 'would_delete' : 'would_cancel' });
      continue;
    }

    if (canHardDelete) {
      db.prepare(`DELETE FROM transport_requirements WHERE job_id = ?`).run(job.id);
      db.prepare(`DELETE FROM job_crane_requirements WHERE job_id = ?`).run(job.id);
      db.prepare(`UPDATE job_imports SET created_job_id = NULL, status = 'cancelled', updated_at = ? WHERE created_job_id = ?`).run(now, job.id);
      db.prepare(`DELETE FROM jobs WHERE id = ? AND company_id = ?`).run(job.id, companyId);
      removed.push({ id: job.id, label, action: 'deleted' });
    } else {
      db.prepare(`
        UPDATE jobs
        SET status = 'cancelled',
            schedule_status = 'cancelled',
            notes = trim(COALESCE(notes, '') || char(10) || ?),
            updated_at = ?
        WHERE id = ? AND company_id = ?
      `).run(`${DEMO_MARKER}: archived old smoke/test/demo recording job.`, now, job.id, companyId);
      archived.push({ id: job.id, label, action: 'cancelled' });
    }
  }

  if (!dryRun && candidates.length > 0 && userId) {
    appendAuditIfMissing(db, {
      companyId,
      eventType: 'job_status_changed',
      userId,
      demoKey: `${DEMO_DATASET_VERSION}:smoke-cleanup`,
      payload: {
        demo_key: `${DEMO_DATASET_VERSION}:smoke-cleanup`,
        action: 'demo_smoke_jobs_removed',
        removed_job_count: removed.length,
        archived_job_count: archived.length,
        removed_job_ids: removed.map((item) => item.id),
        archived_job_ids: archived.map((item) => item.id),
        reason: 'demo dataset cleanup'
      }
    });
  }

  return { scanned: candidates.length, removed, archived };
}

function ensureDemoUserId(db, companyId, adminResult, dryRun) {
  if (adminResult.id) return adminResult.id;
  const existing = db.prepare(`SELECT id FROM users WHERE company_id = ? ORDER BY created_at LIMIT 1`).get(companyId);
  if (existing) return existing.id;
  if (dryRun) return '[dry-run-user-id]';

  const id = randomUUID();
  db.prepare(`
    INSERT INTO users (id, company_id, name, email, password_hash, role, status, must_change_password)
    VALUES (?, ?, 'Demo Data Seeder', ?, ?, 'admin', 'active', 1)
  `).run(
    id,
    companyId,
    `demo.seeder.${companyId.slice(0, 8)}@demo.liftiq.local`,
    bcrypt.hashSync(randomUUID(), 10)
  );
  return id;
}

function credentialStatus(expiryDate) {
  if (!expiryDate) return 'valid';
  const today = new Date().toISOString().slice(0, 10);
  if (expiryDate < today) return 'expired';
  const warn = new Date();
  warn.setDate(warn.getDate() + 30);
  return expiryDate <= warn.toISOString().slice(0, 10) ? 'expiring_soon' : 'valid';
}

function upsertWorker(db, companyId, userId, worker, { dryRun = false } = {}) {
  const existing = db.prepare(`SELECT * FROM workers WHERE company_id = ? AND email = ?`).get(companyId, worker.email);
  if (dryRun) {
    return { id: existing?.id || `[dry-run-worker:${worker.email}]`, action: existing ? 'would_update' : 'would_create' };
  }

  const id = existing?.id || randomUUID();
  const now = nowIso();
  const notes = `${DEMO_WORKER_MARKER} | ${DEMO_MARKER} | ${worker.notes}`;
  if (existing) {
    db.prepare(`
      UPDATE workers
      SET name = ?,
          role = ?,
          employment_type = ?,
          crane_classes = ?,
          usual_depot = ?,
          contact_number = ?,
          status = ?,
          archived_at = NULL,
          archived_by_user_id = NULL,
          archive_reason = NULL,
          availability_note = ?,
          notes = ?,
          updated_at = ?
      WHERE id = ? AND company_id = ?
    `).run(
      worker.name,
      worker.role,
      worker.employment_type,
      json(worker.crane_classes),
      worker.usual_depot,
      worker.contact_number,
      worker.status,
      worker.availability_note,
      notes,
      now,
      existing.id,
      companyId
    );
  } else {
    db.prepare(`
      INSERT INTO workers (
        id, company_id, name, email, role, employment_type, crane_classes,
        usual_depot, contact_number, status, availability_note, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      companyId,
      worker.name,
      worker.email,
      worker.role,
      worker.employment_type,
      json(worker.crane_classes),
      worker.usual_depot,
      worker.contact_number,
      worker.status,
      worker.availability_note,
      notes,
      now,
      now
    );
  }

  db.prepare(`DELETE FROM credentials WHERE worker_id = ? AND company_id = ?`).run(id, companyId);
  db.prepare(`DELETE FROM worker_task_preferences WHERE worker_id = ? AND company_id = ?`).run(id, companyId);
  db.prepare(`DELETE FROM fatigue_records WHERE worker_id = ? AND company_id = ?`).run(id, companyId);

  for (const [type, identifier, expiryDate] of worker.credentials) {
    db.prepare(`
      INSERT INTO credentials (
        id, worker_id, company_id, type, identifier, issuing_body, issue_date,
        expiry_date, verified, status, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'Demo issuer', '2024-01-01', ?, 1, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      id,
      companyId,
      type,
      identifier,
      expiryDate,
      credentialStatus(expiryDate),
      `${DEMO_MARKER}: synthetic credential for screen-recording demo.`,
      now,
      now
    );
  }

  for (const preference of worker.preferences) {
    const [taskTag, rating, source, approvals = 0, overrides = 0, confidence = source === 'learned' ? 0.6 : 1] = preference;
    db.prepare(`
      INSERT INTO worker_task_preferences (
        id, company_id, worker_id, task_tag, rating, source, notes,
        approval_count, override_selection_count, confidence, last_selected_at,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      companyId,
      id,
      taskTag,
      rating,
      source,
      `${DEMO_MARKER}: synthetic ${source} task preference.`,
      approvals,
      overrides,
      confidence,
      source === 'learned' ? '2026-05-01T00:00:00.000Z' : null,
      now,
      now
    );
  }

  for (const [shiftStart, shiftEnd, hours, shiftType, selfDeclared] of worker.fatigue) {
    db.prepare(`
      INSERT INTO fatigue_records (
        id, worker_id, company_id, shift_start, shift_end, shift_length_hours,
        shift_type, travel_hours, self_declared_fatigue, notes, recorded_by_user_id,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      id,
      companyId,
      shiftStart,
      shiftEnd,
      hours,
      shiftType,
      selfDeclared ? 1 : 0,
      `${DEMO_MARKER}: synthetic fatigue record for ranking demo.`,
      userId,
      now
    );
  }

  appendAuditIfMissing(db, {
    companyId,
    eventType: 'worker_imported',
    userId,
    workerId: id,
    demoKey: `${DEMO_DATASET_VERSION}:worker:${worker.email}`,
    payload: {
      demo_key: `${DEMO_DATASET_VERSION}:worker:${worker.email}`,
      import_mode: 'demo_dataset_seed',
      email: worker.email,
      credential_count: worker.credentials.length,
      preference_count: worker.preferences.length
    }
  });

  return { id, action: existing ? 'updated' : 'created' };
}

function findCraneModel(db, modelName) {
  return db.prepare(`SELECT * FROM crane_models WHERE model = ?`).get(modelName);
}

function findTravelState(db, craneModelId, label) {
  return db.prepare(`
    SELECT *
    FROM crane_model_travel_states
    WHERE crane_model_id = ? AND state_label = ?
  `).get(craneModelId, label);
}

function buildJobPayload(job, companyTimeZone) {
  const schedule = buildJobScheduleFields({
    date: job.date,
    shift_start_time: job.start,
    scheduled_end_time: job.end,
    job_timezone: job.timezone || DEFAULT_TIMEZONE,
    company_timezone: companyTimeZone || DEFAULT_TIMEZONE,
    schedule_status: 'planned'
  });
  return {
    ...job,
    ...schedule,
    notes: [
      `${DEMO_JOB_MARKER} | ${DEMO_MARKER} | Synthetic job for screen-recording only.`,
      `Job description: ${job.job_description}`,
      `Risk notes: ${job.risk_notes}`,
      `Travel notes: ${job.travel_notes}`,
      `Contact: ${job.contact_name} / ${job.contact_phone}`
    ].join('\n\n')
  };
}

function upsertJob(db, companyId, userId, job, { dryRun = false } = {}) {
  const existing = db.prepare(`SELECT * FROM jobs WHERE company_id = ? AND reference = ?`).get(companyId, job.reference);
  if (dryRun) {
    return { id: existing?.id || `[dry-run-job:${job.reference}]`, action: existing ? 'would_update' : 'would_create' };
  }

  const id = existing?.id || randomUUID();
  const now = nowIso();
  const company = db.prepare(`SELECT timezone FROM companies WHERE id = ?`).get(companyId);
  const payload = buildJobPayload(job, company?.timezone || DEFAULT_TIMEZONE);

  if (existing) {
    db.prepare(`
      UPDATE jobs
      SET client_name = ?,
          site_name = ?,
          site_location = ?,
          contact_name = ?,
          contact_phone = ?,
          date = ?,
          shift_start_time = ?,
          shift_type = ?,
          estimated_duration_hours = ?,
          crane_class_required = ?,
          job_description = ?,
          task_tags = ?,
          crew_roles_required = ?,
          required_credentials = ?,
          site_conditions = ?,
          lift_risk_level = ?,
          scheduled_start_at_utc = ?,
          scheduled_end_at_utc = ?,
          job_timezone = ?,
          scheduled_start_local = ?,
          scheduled_end_local = ?,
          schedule_status = 'planned',
          risk_notes = ?,
          travel_required = ?,
          travel_hours_estimated = ?,
          travel_notes = ?,
          source_note = ?,
          notes = ?,
          status = 'open',
          updated_at = ?
      WHERE id = ? AND company_id = ?
    `).run(
      payload.client_name,
      payload.site_name,
      payload.site_location,
      payload.contact_name,
      payload.contact_phone,
      payload.date,
      payload.shift_start_time,
      payload.shift_type,
      payload.estimated_duration_hours,
      payload.crane_class_required,
      payload.job_description,
      json(payload.task_tags),
      json(payload.crew_roles_required),
      json(payload.required_credentials),
      json(payload.site_conditions),
      payload.lift_risk_level,
      payload.scheduled_start_at_utc,
      payload.scheduled_end_at_utc,
      payload.job_timezone,
      payload.scheduled_start_local,
      payload.scheduled_end_local,
      payload.risk_notes,
      payload.travel_required ? 1 : 0,
      payload.travel_hours_estimated || 0,
      payload.travel_notes,
      payload.source_note,
      payload.notes,
      now,
      id,
      companyId
    );
  } else {
    db.prepare(`
      INSERT INTO jobs (
        id, company_id, reference, client_name, site_name, site_location,
        contact_name, contact_phone, date, shift_start_time, shift_type,
        estimated_duration_hours, crane_class_required, job_description, task_tags,
        crew_roles_required, required_credentials, site_conditions, lift_risk_level,
        scheduled_start_at_utc, scheduled_end_at_utc, job_timezone, scheduled_start_local,
        scheduled_end_local, schedule_status, risk_notes, travel_required,
        travel_hours_estimated, travel_notes, source_note, notes, status,
        created_by_user_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `).run(
      id,
      companyId,
      payload.reference,
      payload.client_name,
      payload.site_name,
      payload.site_location,
      payload.contact_name,
      payload.contact_phone,
      payload.date,
      payload.shift_start_time,
      payload.shift_type,
      payload.estimated_duration_hours,
      payload.crane_class_required,
      payload.job_description,
      json(payload.task_tags),
      json(payload.crew_roles_required),
      json(payload.required_credentials),
      json(payload.site_conditions),
      payload.lift_risk_level,
      payload.scheduled_start_at_utc,
      payload.scheduled_end_at_utc,
      payload.job_timezone,
      payload.scheduled_start_local,
      payload.scheduled_end_local,
      payload.risk_notes,
      payload.travel_required ? 1 : 0,
      payload.travel_hours_estimated || 0,
      payload.travel_notes,
      payload.source_note,
      payload.notes,
      userId,
      now,
      now
    );
  }

  appendAuditIfMissing(db, {
    companyId,
    eventType: 'job_created',
    userId,
    jobId: id,
    demoKey: `${DEMO_DATASET_VERSION}:job:${job.reference}`,
    payload: {
      demo_key: `${DEMO_DATASET_VERSION}:job:${job.reference}`,
      client_name: job.client_name,
      site_name: job.site_name,
      date: job.date,
      shift_type: job.shift_type,
      source: 'demo_dataset_seed',
      schedule_status: 'planned',
      job_timezone: payload.job_timezone,
      scheduled_start_at_utc: payload.scheduled_start_at_utc,
      scheduled_end_at_utc: payload.scheduled_end_at_utc,
      scheduled_start_local: payload.scheduled_start_local,
      scheduled_end_local: payload.scheduled_end_local
    }
  });

  upsertJobImport(db, companyId, userId, id, job, payload);
  upsertCranePlanning(db, companyId, userId, id, job);

  return { id, action: existing ? 'updated' : 'created' };
}

function buildBriefText(job) {
  const requirementLines = job.required_credentials.map((credential) => `- ${credential}`).join('\n');
  const roleLines = job.crew_roles_required.map((role) => `- ${role}`).join('\n');
  const tagLines = job.task_tags.map((tag) => `- ${tag}`).join('\n');
  const craneLines = job.planning
    ? [
        `Crane: Grove ${job.planning.model} ${job.crane_class_required} crane.`,
        `Travel state: ${job.planning.state}.`,
        `Counterweight required: ${job.planning.counterweight_required_tonnes}T.`,
        `Transport: ${job.travel_notes}`
      ].join('\n')
    : `Crane: ${job.crane_class_required}.`;

  return [
    `Client: ${job.client_name}`,
    `Site: ${job.site_name}`,
    `Site address: ${job.site_location}`,
    `Contact: ${job.contact_name} ${job.contact_phone}`,
    '',
    'Job:',
    job.job_description,
    '',
    craneLines,
    '',
    'Timing:',
    job.date,
    `Start: ${job.start}`,
    `Finish: ${job.end}`,
    `Timezone: ${job.timezone || DEFAULT_TIMEZONE}`,
    '',
    'Required crew:',
    roleLines,
    '',
    'Requirements:',
    requirementLines,
    '',
    'Task tags:',
    tagLines,
    '',
    `Notes: ${job.risk_notes}`
  ].join('\n');
}

function upsertJobImport(db, companyId, userId, jobId, job, payload) {
  const importId = `demo-import-${job.reference.toLowerCase()}`;
  const now = nowIso();
  const parsedPayload = {
    client_name: job.client_name,
    site_name: job.site_name,
    site_address: job.site_location,
    contact_name: job.contact_name,
    contact_phone: job.contact_phone,
    scheduled_date: job.date,
    start_time: job.start,
    end_time: job.end,
    timezone: payload.job_timezone,
    crane_class: job.crane_class_required,
    required_roles: job.crew_roles_required,
    required_credentials: job.required_credentials,
    task_tags: job.task_tags,
    risk_notes: job.risk_notes,
    travel_notes: job.travel_notes,
    source_note: job.source_note
  };

  const existing = db.prepare(`SELECT id FROM job_imports WHERE id = ?`).get(importId);
  if (existing) {
    db.prepare(`
      UPDATE job_imports
      SET company_id = ?,
          user_id = ?,
          source_type = 'markdown',
          filename = ?,
          original_text = ?,
          parsed_payload_json = ?,
          confidence_json = ?,
          warnings_json = ?,
          created_job_id = ?,
          status = 'job_created',
          updated_at = ?
      WHERE id = ?
    `).run(
      companyId,
      userId,
      `${job.reference}.md`,
      buildBriefText(job),
      JSON.stringify(parsedPayload),
      JSON.stringify({ demo_dataset: 'high' }),
      JSON.stringify(['Synthetic demo brief. Confirm details before dispatch.']),
      jobId,
      now,
      importId
    );
  } else {
    db.prepare(`
      INSERT INTO job_imports (
        id, company_id, user_id, source_type, filename, original_text,
        parsed_payload_json, confidence_json, warnings_json, created_job_id,
        status, created_at, updated_at
      )
      VALUES (?, ?, ?, 'markdown', ?, ?, ?, ?, ?, ?, 'job_created', ?, ?)
    `).run(
      importId,
      companyId,
      userId,
      `${job.reference}.md`,
      buildBriefText(job),
      JSON.stringify(parsedPayload),
      JSON.stringify({ demo_dataset: 'high' }),
      JSON.stringify(['Synthetic demo brief. Confirm details before dispatch.']),
      jobId,
      now,
      now
    );
  }

  appendAuditIfMissing(db, {
    companyId,
    eventType: 'job_brief_import_previewed',
    userId,
    jobId,
    demoKey: `${DEMO_DATASET_VERSION}:job-import-preview:${job.reference}`,
    payload: {
      demo_key: `${DEMO_DATASET_VERSION}:job-import-preview:${job.reference}`,
      import_id: importId,
      source_type: 'markdown',
      filename: `${job.reference}.md`,
      extracted_summary: {
        client_name: job.client_name,
        site_name: job.site_name,
        scheduled_date: job.date,
        timezone: payload.job_timezone,
        required_roles: job.crew_roles_required,
        required_credentials: job.required_credentials,
        task_tags: job.task_tags
      },
      warning_count: 1
    }
  });

  appendAuditIfMissing(db, {
    companyId,
    eventType: 'job_created_from_brief',
    userId,
    jobId,
    demoKey: `${DEMO_DATASET_VERSION}:job-import-created:${job.reference}`,
    payload: {
      demo_key: `${DEMO_DATASET_VERSION}:job-import-created:${job.reference}`,
      import_id: importId,
      job_id: jobId
    }
  });
}

function upsertCranePlanning(db, companyId, userId, jobId, job) {
  db.prepare(`DELETE FROM transport_requirements WHERE job_id = ? AND company_id = ?`).run(jobId, companyId);
  db.prepare(`DELETE FROM job_crane_requirements WHERE job_id = ? AND company_id = ?`).run(jobId, companyId);

  if (!job.planning) return null;

  const model = findCraneModel(db, job.planning.model);
  const travelState = model ? findTravelState(db, model.id, job.planning.state) : null;
  const plan = buildCraneTransportPlan(db, {
    crane_model_id: model?.id || null,
    crane_travel_state_id: travelState?.id || null,
    crane_class: job.crane_class_required,
    required_capacity_tonnes: job.planning.required_capacity_tonnes,
    lift_weight_tonnes: job.planning.lift_weight_tonnes,
    radius_m: job.planning.radius_m,
    height_m: job.planning.height_m,
    counterweight_required_tonnes: job.planning.counterweight_required_tonnes,
    site_access_notes: job.planning.site_access_notes,
    setup_notes: job.planning.setup_notes,
    source_confidence: job.planning.source_confidence,
    estimated_transport_loads: job.planning.estimated_transport_loads,
    transport_notes: `${job.travel_notes} ${job.source_note}`
  });
  const now = nowIso();
  const result = db.prepare(`
    INSERT INTO job_crane_requirements (
      company_id, job_id, crane_model_id, crane_travel_state_id, crane_class,
      required_capacity_tonnes, lift_weight_tonnes, radius_m, height_m,
      counterweight_required_tonnes, counterweight_carried_on_crane_tonnes,
      counterweight_to_transport_tonnes, requires_counterweight_transport,
      support_truck_required, estimated_transport_loads, transport_review_required,
      route_review_required, osom_review_required, nhvr_review_required,
      permit_review_required, manual_review_required, review_reason,
      site_access_notes, setup_notes, source_confidence, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    companyId,
    jobId,
    plan.crane_model_id,
    plan.crane_travel_state_id,
    plan.crane_class,
    plan.required_capacity_tonnes,
    plan.lift_weight_tonnes,
    plan.radius_m,
    plan.height_m,
    plan.counterweight_required_tonnes,
    plan.counterweight_carried_on_crane_tonnes,
    plan.counterweight_to_transport_tonnes,
    plan.requires_counterweight_transport ? 1 : 0,
    plan.support_truck_required ? 1 : 0,
    plan.estimated_transport_loads,
    plan.transport_review_required ? 1 : 0,
    plan.route_review_required ? 1 : 0,
    plan.osom_review_required ? 1 : 0,
    plan.nhvr_review_required ? 1 : 0,
    plan.permit_review_required ? 1 : 0,
    plan.manual_review_required ? 1 : 0,
    plan.review_reason,
    plan.site_access_notes,
    plan.setup_notes,
    plan.source_confidence,
    now,
    now
  );

  const requirementId = result.lastInsertRowid;
  if (
    plan.requires_counterweight_transport
    || plan.transport_review_required
    || plan.route_review_required
    || plan.nhvr_review_required
    || plan.permit_review_required
  ) {
    const transportResult = db.prepare(`
      INSERT INTO transport_requirements (
        company_id, job_id, job_crane_requirement_id, transport_type,
        load_description, estimated_tonnes, vehicle_type, driver_required,
        rigger_required, pilot_or_escort_review, nhvr_review_required,
        route_review_required, permit_review_required, notes, created_at
      )
      VALUES (?, ?, ?, 'counterweight_support', ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?)
    `).run(
      companyId,
      jobId,
      requirementId,
      plan.counterweight_to_transport_tonnes > 0 ? 'Counterweight package support load' : 'Counterweight support transport review',
      plan.counterweight_to_transport_tonnes,
      plan.vehicle_type || 'support truck',
      (plan.osom_review_required || plan.route_review_required) ? 1 : 0,
      plan.nhvr_review_required ? 1 : 0,
      plan.route_review_required ? 1 : 0,
      plan.permit_review_required ? 1 : 0,
      [plan.review_reason, ...(plan.messages || [])].filter(Boolean).join(' '),
      now
    );

    appendAuditIfMissing(db, {
      companyId,
      eventType: 'transport_requirement_created',
      userId,
      jobId,
      demoKey: `${DEMO_DATASET_VERSION}:transport:${job.reference}`,
      payload: {
        demo_key: `${DEMO_DATASET_VERSION}:transport:${job.reference}`,
        job_id: jobId,
        job_crane_requirement_id: requirementId,
        transport_requirement_id: transportResult.lastInsertRowid,
        transport_type: 'counterweight_support',
        vehicle_type: plan.vehicle_type || 'support truck',
        estimated_tonnes: plan.counterweight_to_transport_tonnes,
        driver_required: true,
        rigger_required: true,
        nhvr_review_required: plan.nhvr_review_required,
        route_review_required: plan.route_review_required,
        permit_review_required: plan.permit_review_required,
        review_reason: plan.review_reason
      }
    });
  }

  appendAuditIfMissing(db, {
    companyId,
    eventType: 'job_counterweight_transport_assessed',
    userId,
    jobId,
    demoKey: `${DEMO_DATASET_VERSION}:crane:${job.reference}`,
    payload: {
      demo_key: `${DEMO_DATASET_VERSION}:crane:${job.reference}`,
      job_id: jobId,
      crane_model_id: plan.crane_model_id,
      crane_travel_state_id: plan.crane_travel_state_id,
      counterweight_required_tonnes: plan.counterweight_required_tonnes,
      counterweight_carried_on_crane_tonnes: plan.counterweight_carried_on_crane_tonnes,
      counterweight_to_transport_tonnes: plan.counterweight_to_transport_tonnes,
      requires_counterweight_transport: plan.requires_counterweight_transport,
      support_truck_required: plan.support_truck_required,
      transport_review_required: plan.transport_review_required,
      nhvr_review_required: plan.nhvr_review_required,
      permit_review_required: plan.permit_review_required,
      manual_review_required: plan.manual_review_required,
      source_confidence: plan.source_confidence,
      review_reason: plan.review_reason
    }
  });

  return plan;
}

function appendAuditIfMissing(db, {
  companyId,
  eventType,
  userId,
  workerId = null,
  jobId = null,
  allocationId = null,
  demoKey,
  payload
}) {
  if (!demoKey) {
    return appendAuditEvent(db, { companyId, eventType, userId, workerId, jobId, allocationId, payload });
  }
  const existing = db.prepare(`
    SELECT id
    FROM audit_events
    WHERE company_id = ?
      AND event_type = ?
      AND payload LIKE ?
    LIMIT 1
  `).get(companyId, eventType, `%${demoKey}%`);
  if (existing) return existing.id;
  return appendAuditEvent(db, { companyId, eventType, userId, workerId, jobId, allocationId, payload });
}

function upsertAllocationsAndMetricEvents(db, companyId, userId, workerIdsByEmail, jobIdsByReference, { dryRun = false } = {}) {
  if (dryRun) return { allocations: DATASET_ALLOCATIONS.length, audit_events: 'would_seed_metric_activity' };

  const now = nowIso();
  let allocationsCreated = 0;
  for (const item of DATASET_ALLOCATIONS) {
    const jobId = jobIdsByReference[item.job_reference];
    const workerId = workerIdsByEmail[item.worker_email];
    if (!jobId || !workerId) continue;
    const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`).get(jobId, companyId);
    const existing = db.prepare(`
      SELECT id
      FROM allocations
      WHERE company_id = ? AND job_id = ? AND worker_id = ? AND override_reason IS ?
    `).get(companyId, jobId, workerId, item.override_reason);
    const snapshot = {
      demo_dataset: DEMO_DATASET_VERSION,
      score: item.smartrank_score,
      explanation: 'Synthetic allocation snapshot for screen-recording metrics.'
    };
    let allocationId = existing?.id;
    if (existing) {
      db.prepare(`
        UPDATE allocations
        SET smartrank_position = ?,
            smartrank_score = ?,
            smartrank_snapshot = ?,
            active_warnings = ?,
            active_blocks_on_others = ?,
            override_reason = ?,
            allocation_start_at_utc = ?,
            allocation_end_at_utc = ?,
            allocation_timezone = ?,
            allocation_status = 'confirmed',
            status = 'confirmed',
            updated_at = ?
        WHERE id = ?
      `).run(
        item.smartrank_position,
        item.smartrank_score,
        JSON.stringify(snapshot),
        JSON.stringify(item.override_reason ? [{ type: 'override_review', detail: item.override_reason }] : []),
        JSON.stringify([]),
        item.override_reason,
        job.scheduled_start_at_utc,
        job.scheduled_end_at_utc,
        job.job_timezone,
        now,
        existing.id
      );
    } else {
      allocationId = randomUUID();
      db.prepare(`
        INSERT INTO allocations (
          id, job_id, worker_id, company_id, allocated_by_user_id,
          smartrank_position, smartrank_score, smartrank_snapshot,
          active_warnings, active_blocks_on_others, override_reason,
          allocation_start_at_utc, allocation_end_at_utc, allocation_timezone,
          allocation_status, status, allocated_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'confirmed', ?, ?)
      `).run(
        allocationId,
        jobId,
        workerId,
        companyId,
        userId,
        item.smartrank_position,
        item.smartrank_score,
        JSON.stringify(snapshot),
        JSON.stringify(item.override_reason ? [{ type: 'override_review', detail: item.override_reason }] : []),
        JSON.stringify([]),
        item.override_reason,
        job.scheduled_start_at_utc,
        job.scheduled_end_at_utc,
        job.job_timezone,
        now,
        now
      );
      allocationsCreated += 1;
    }

    appendAuditIfMissing(db, {
      companyId,
      eventType: 'allocation_confirmed',
      userId,
      workerId,
      jobId,
      allocationId,
      demoKey: `${DEMO_DATASET_VERSION}:allocation:${item.key}`,
      payload: {
        demo_key: `${DEMO_DATASET_VERSION}:allocation:${item.key}`,
        selected_rank: item.smartrank_position,
        selected_score: item.smartrank_score,
        override_reason: item.override_reason
      }
    });
    if (item.override_reason) {
      appendAuditIfMissing(db, {
        companyId,
        eventType: 'warning_acknowledged',
        userId,
        workerId,
        jobId,
        allocationId,
        demoKey: `${DEMO_DATASET_VERSION}:warning:${item.key}`,
        payload: {
          demo_key: `${DEMO_DATASET_VERSION}:warning:${item.key}`,
          reason: item.override_reason
        }
      });
      appendAuditIfMissing(db, {
        companyId,
        eventType: 'non_top_ranked_selected',
        userId,
        workerId,
        jobId,
        allocationId,
        demoKey: `${DEMO_DATASET_VERSION}:non-top:${item.key}`,
        payload: {
          demo_key: `${DEMO_DATASET_VERSION}:non-top:${item.key}`,
          selected_rank: item.smartrank_position,
          reason: item.override_reason
        }
      });
    }
  }

  const smartRankJobId = jobIdsByReference['DEMO-LIQ-011'];
  appendAuditIfMissing(db, {
    companyId,
    eventType: 'smartrank_generated',
    userId,
    jobId: smartRankJobId,
    demoKey: `${DEMO_DATASET_VERSION}:smartrank-summary`,
    payload: {
      demo_key: `${DEMO_DATASET_VERSION}:smartrank-summary`,
      ranked_count: 6,
      blocked_count: 4,
      warning_count: 3,
      note: 'Synthetic metric event for recording dashboard and audit views.'
    }
  });

  const eventSeeds = [
    ['credential_block_applied', 'credential-block', 'DEMO-LIQ-005', 'isaac.nolan@demo.liftiq.local', { credential_type: 'high_risk_licence_dogging' }],
    ['fatigue_warning_triggered', 'fatigue-warning', 'DEMO-LIQ-009', 'jordan.ellis@demo.liftiq.local', { warning: 'weekly_hours_warning' }],
    ['fatigue_block_applied', 'fatigue-block', 'DEMO-LIQ-009', 'blake.warren@demo.liftiq.local', { block: 'weekly_hours_exceeded' }],
    ['availability_block_applied', 'availability-block', 'DEMO-LIQ-008', 'nathan.brooks@demo.liftiq.local', { block: 'Marked as unavailable' }],
    ['preference_signal_created', 'preference-created', null, 'riley.hayes@demo.liftiq.local', { task_tag: 'counterweight', source: 'learned' }],
    ['preference_signal_updated', 'preference-updated', null, 'tom.mercer@demo.liftiq.local', { task_tag: 'short_notice', source: 'learned' }],
    ['learned_preference_applied', 'learned-applied', 'DEMO-LIQ-011', 'riley.hayes@demo.liftiq.local', { task_tag: 'counterweight' }]
  ];

  for (const [eventType, key, jobReference, workerEmail, extraPayload] of eventSeeds) {
    appendAuditIfMissing(db, {
      companyId,
      eventType,
      userId,
      workerId: workerIdsByEmail[workerEmail] || null,
      jobId: jobReference ? jobIdsByReference[jobReference] : null,
      demoKey: `${DEMO_DATASET_VERSION}:${key}`,
      payload: {
        demo_key: `${DEMO_DATASET_VERSION}:${key}`,
        ...extraPayload
      }
    });
  }

  return { allocations_created: allocationsCreated, audit_events: 'seeded_or_existing' };
}

function currentDatasetCounts(db, companyId) {
  return {
    workers: db.prepare(`
      SELECT COUNT(*) AS n
      FROM workers
      WHERE company_id = ? AND notes LIKE ?
    `).get(companyId, `%${DEMO_WORKER_MARKER}%`).n,
    jobs: db.prepare(`
      SELECT COUNT(*) AS n
      FROM jobs
      WHERE company_id = ? AND notes LIKE ? AND status != 'cancelled'
    `).get(companyId, `%${DEMO_JOB_MARKER}%`).n,
    crane_jobs: db.prepare(`
      SELECT COUNT(*) AS n
      FROM job_crane_requirements
      WHERE company_id = ?
    `).get(companyId).n,
    transport_requirements: db.prepare(`
      SELECT COUNT(*) AS n
      FROM transport_requirements
      WHERE company_id = ?
    `).get(companyId).n,
    audit_events: db.prepare(`
      SELECT COUNT(*) AS n
      FROM audit_events
      WHERE company_id = ?
    `).get(companyId).n
  };
}

function seedDemoDataset(db = getDb(), options = {}) {
  const dryRun = Boolean(options.dryRun);
  const env = options.env || process.env;
  const tenant = upsertDemoTenant(db, { dryRun });
  const admin = upsertDemoAdmin(db, tenant.id, env, { dryRun });
  const userId = ensureDemoUserId(db, tenant.id, admin, dryRun);
  const cleanup = cleanupSmokeJobs(db, tenant.id, userId, { dryRun });

  const workerResults = [];
  const workerIdsByEmail = {};
  for (const worker of WORKERS) {
    const result = upsertWorker(db, tenant.id, userId, worker, { dryRun });
    workerResults.push({ email: worker.email, name: worker.name, ...result });
    workerIdsByEmail[worker.email] = result.id;
  }

  if (!dryRun && userId) {
    appendAuditIfMissing(db, {
      companyId: tenant.id,
      eventType: 'worker_import_completed',
      userId,
      demoKey: `${DEMO_DATASET_VERSION}:worker-import-completed`,
      payload: {
        demo_key: `${DEMO_DATASET_VERSION}:worker-import-completed`,
        import_mode: 'demo_dataset_seed',
        imported_count: WORKERS.length,
        dataset_version: DEMO_DATASET_VERSION
      }
    });
  }

  const jobResults = [];
  const jobIdsByReference = {};
  for (const job of JOBS) {
    const result = upsertJob(db, tenant.id, userId, job, { dryRun });
    jobResults.push({ reference: job.reference, title: job.title, ...result });
    jobIdsByReference[job.reference] = result.id;
  }

  const allocationSummary = upsertAllocationsAndMetricEvents(
    db,
    tenant.id,
    userId,
    workerIdsByEmail,
    jobIdsByReference,
    { dryRun }
  );

  return {
    dataset_version: DEMO_DATASET_VERSION,
    dry_run: dryRun,
    tenant: {
      slug: tenant.slug,
      action: tenant.action,
      display_name: DEMO_COMPANY.display_name,
      timezone: DEMO_COMPANY.timezone
    },
    admin,
    cleanup,
    workers: {
      expected: WORKERS.length,
      results: workerResults
    },
    jobs: {
      expected: JOBS.length,
      date_range: {
        start: JOBS.map((job) => job.date).sort()[0],
        end: JOBS.map((job) => job.date).sort().at(-1)
      },
      results: jobResults
    },
    allocations: allocationSummary,
    counts: dryRun ? null : currentDatasetCounts(db, tenant.id)
  };
}

function runCli() {
  const dryRun = process.argv.includes('--dry-run');
  try {
    const db = getDb();
    let summary;
    if (dryRun) {
      summary = seedDemoDataset(db, { dryRun: true });
    } else {
      db.transaction(() => {
        summary = seedDemoDataset(db, { dryRun: false });
      })();
    }
    console.log(JSON.stringify(summary, null, 2));
    if (summary.admin.action === 'skipped_missing_secret') {
      console.warn('LIFTIQ_DEMO_EMAIL or LIFTIQ_DEMO_PASSWORD missing. Demo admin was not created or updated.');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  DEMO_COMPANY,
  DEMO_DATASET_VERSION,
  DEMO_MARKER,
  JOBS,
  SMOKE_MARKERS,
  WORKERS,
  cleanupSmokeJobs,
  seedDemoDataset,
  upsertDemoAdmin,
  upsertDemoTenant
};
