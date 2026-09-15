export const POSTGRES_SCHEMA_SQL = String.raw`
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager',
  password_hash TEXT,
  salt TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'field',
  avatar TEXT,
  phone TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  display_name TEXT NOT NULL DEFAULT 'Администратор ATADAN',
  phone TEXT NOT NULL DEFAULT '+996 706 131 404',
  email TEXT NOT NULL DEFAULT 'admin@atadan.kg',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interest_events (
  id TEXT PRIMARY KEY,
  tractor_slug TEXT,
  path TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  visitor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  tractor_slug TEXT,
  tractor_model TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'website',
  consent_version TEXT NOT NULL DEFAULT 'legacy',
  consent_at TIMESTAMPTZ,
  source_path TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_overrides (
  slug TEXT PRIMARY KEY,
  data_json TEXT NOT NULL DEFAULT '{}',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_posts (
  slug TEXT PRIMARY KEY,
  data_json TEXT NOT NULL DEFAULT '{}',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  assigned_to TEXT REFERENCES staff(id),
  region TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  tractor_slug TEXT,
  power INTEGER,
  purpose TEXT NOT NULL DEFAULT '',
  farm_area TEXT NOT NULL DEFAULT '',
  budget_minor BIGINT NOT NULL DEFAULT 0,
  purchase_method TEXT NOT NULL DEFAULT '',
  purchase_timing TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS crm_deals (
  id TEXT PRIMARY KEY,
  lead_id TEXT UNIQUE REFERENCES leads(id),
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  title TEXT NOT NULL,
  tractor_slug TEXT,
  stage TEXT NOT NULL DEFAULT 'new',
  amount_minor BIGINT NOT NULL DEFAULT 0,
  cost_minor BIGINT,
  assigned_to TEXT REFERENCES staff(id),
  loss_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_notes (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES crm_deals(id),
  author_id TEXT NOT NULL REFERENCES staff(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id TEXT PRIMARY KEY,
  deal_id TEXT REFERENCES crm_deals(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal',
  customer_id TEXT REFERENCES crm_customers(id),
  assigned_to TEXT NOT NULL REFERENCES staff(id),
  due_at TIMESTAMPTZ NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_requests (
  id TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_costs (
  slug TEXT PRIMARY KEY,
  cost_minor BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS request_limits (
  id TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS staff_invites (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES staff(id),
  role TEXT NOT NULL DEFAULT 'manager',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  expires_at BIGINT NOT NULL,
  used_at TIMESTAMPTZ,
  revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  expires_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  category TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}',
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  updated_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deals_assigned_stage ON crm_deals(assigned_to, stage);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_due ON crm_tasks(assigned_to, due_at);
CREATE INDEX IF NOT EXISTS idx_sessions_staff ON staff_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_admin_records_kind_status ON admin_records(kind, status, archived);
CREATE INDEX IF NOT EXISTS idx_admin_records_kind_sort ON admin_records(kind, sort_order, updated_at);
CREATE INDEX IF NOT EXISTS idx_interest_events_created ON interest_events(created_at);

INSERT INTO staff (id,email,display_name,role,password_hash,salt,active,theme,phone)
VALUES ('atadan-owner-bekbolsun','bekbolsunjamshutov@gmail.com','Bekbolsun Jamshutov','owner','5713aa9e9e7ff711cfec912ab5e4d6495ab3a812c2b5aa3d7c1ae96246c17770','f95b209ea79f26e7dd831e98f2db5f7454b8cb5e555e2340',1,'field','')
ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name,role=EXCLUDED.role,password_hash=EXCLUDED.password_hash,salt=EXCLUDED.salt,active=1;

INSERT INTO staff (id,email,display_name,role,password_hash,salt,active,theme,phone)
VALUES ('atadan-director-islam','i131404@gmail.com','Ислам Мирбек уулу','director','e2f3e188847379f671659e312eefbb3d6081d2ce8e379ccd9d702cd80eec4e1a','fa10ebfcf18bfeab4a90771daf6d9d341799cdccaf923a3d',1,'field','+996 706 131 404')
ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name,role=EXCLUDED.role,password_hash=EXCLUDED.password_hash,salt=EXCLUDED.salt,active=1;
`;
