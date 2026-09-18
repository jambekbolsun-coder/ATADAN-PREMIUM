export const ADMIN_V2_SCHEMA_SQL = String.raw`
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_sessions_id ON staff_sessions(id) WHERE id IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_events (
  id TEXT PRIMARY KEY,
  staff_id TEXT REFERENCES staff(id),
  identifier TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_events_staff_created ON auth_events(staff_id, created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  expires_at BIGINT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS normalized_phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES crm_customers(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_channel TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_conversation_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_leads_phone_created ON leads(normalized_phone, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_external_conversation ON leads(external_channel, external_conversation_id) WHERE external_channel IS NOT NULL AND external_conversation_id IS NOT NULL;

ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS normalized_phone TEXT;
ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS external_ids_json TEXT NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_normalized_phone ON crm_customers(normalized_phone) WHERE normalized_phone IS NOT NULL AND normalized_phone <> '' AND archived=0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_record_business_slug ON admin_records(kind, lower((data_json::jsonb ->> 'slug'))) WHERE archived=0 AND kind IN ('categories','service_pages','news') AND COALESCE(data_json::jsonb ->> 'slug','')<>'';
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_record_business_sku ON admin_records(kind, upper((data_json::jsonb ->> 'sku'))) WHERE archived=0 AND kind IN ('parts','attachments','stock_parts','stock_attachments') AND COALESCE(data_json::jsonb ->> 'sku','')<>'';

CREATE TABLE IF NOT EXISTS suppliers_v2 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  updated_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_name ON suppliers_v2(lower(name)) WHERE archived=0;

CREATE TABLE IF NOT EXISTS purchase_orders_v2 (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers_v2(id),
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'KGS',
  total_minor BIGINT NOT NULL DEFAULT 0 CHECK(total_minor>=0),
  ordered_at DATE,
  expected_at DATE,
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  updated_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_order_number ON purchase_orders_v2(order_number) WHERE archived=0;

CREATE TABLE IF NOT EXISTS shipments_v2 (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders_v2(id),
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  route TEXT NOT NULL DEFAULT '',
  transport TEXT NOT NULL DEFAULT '',
  eta DATE,
  arrived_at TIMESTAMPTZ,
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  updated_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipment_tracking ON shipments_v2(tracking_number) WHERE tracking_number IS NOT NULL AND tracking_number<>'' AND archived=0;

CREATE TABLE IF NOT EXISTS inventory_units_v2 (
  id TEXT PRIMARY KEY,
  vin TEXT NOT NULL,
  tractor_slug TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK(status IN ('ordered','production','transit','customs','stock','reserved','sold','delivered')),
  purchase_order_id TEXT REFERENCES purchase_orders_v2(id),
  shipment_id TEXT REFERENCES shipments_v2(id),
  purchase_cost_minor BIGINT NOT NULL DEFAULT 0 CHECK(purchase_cost_minor>=0),
  landed_cost_minor BIGINT NOT NULL DEFAULT 0 CHECK(landed_cost_minor>=0),
  list_price_minor BIGINT NOT NULL DEFAULT 0 CHECK(list_price_minor>=0),
  location TEXT NOT NULL DEFAULT '',
  responsible_id TEXT REFERENCES staff(id),
  reserved_deal_id TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  updated_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_vin ON inventory_units_v2(upper(vin));
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_units_v2(status, archived);

ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS inventory_unit_id TEXT REFERENCES inventory_units_v2(id);
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS probability INTEGER CHECK(probability IS NULL OR (probability>=0 AND probability<=100));
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS next_step_at TIMESTAMPTZ;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS loss_reason_code TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_units_v2 DROP CONSTRAINT IF EXISTS inventory_units_v2_reserved_deal_id_fkey;
ALTER TABLE inventory_units_v2 ADD CONSTRAINT inventory_units_v2_reserved_deal_id_fkey FOREIGN KEY (reserved_deal_id) REFERENCES crm_deals(id) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_vin_reservation ON inventory_units_v2(reserved_deal_id) WHERE reserved_deal_id IS NOT NULL AND status='reserved' AND archived=0;

CREATE TABLE IF NOT EXISTS inventory_lifecycle_events (
  id TEXT PRIMARY KEY,
  inventory_unit_id TEXT NOT NULL REFERENCES inventory_units_v2(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_id TEXT REFERENCES staff(id),
  responsible_id TEXT REFERENCES staff(id),
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_inventory_events_unit ON inventory_lifecycle_events(inventory_unit_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS deal_stage_events (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES crm_deals(id),
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  reason_code TEXT NOT NULL DEFAULT '',
  reason_detail TEXT NOT NULL DEFAULT '',
  actor_id TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deal_stage_events_deal ON deal_stage_events(deal_id, created_at DESC);

ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS automation_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_automation_key ON crm_tasks(automation_key) WHERE automation_key IS NOT NULL AND archived=0;

CREATE TABLE IF NOT EXISTS meetings_v2 (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  deal_id TEXT NOT NULL REFERENCES crm_deals(id),
  responsible_id TEXT NOT NULL REFERENCES staff(id),
  starts_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  location TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proposals_v2 (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  deal_id TEXT NOT NULL REFERENCES crm_deals(id),
  tractor_slug TEXT NOT NULL,
  inventory_unit_id TEXT REFERENCES inventory_units_v2(id),
  base_price_minor BIGINT NOT NULL CHECK(base_price_minor>=0),
  discount_minor BIGINT NOT NULL DEFAULT 0 CHECK(discount_minor>=0),
  options_minor BIGINT NOT NULL DEFAULT 0 CHECK(options_minor>=0),
  final_price_minor BIGINT NOT NULL CHECK(final_price_minor>=0),
  terms_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  valid_until DATE,
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts_v2 (
  id TEXT PRIMARY KEY,
  contract_number TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  deal_id TEXT NOT NULL REFERENCES crm_deals(id),
  proposal_id TEXT REFERENCES proposals_v2(id),
  inventory_unit_id TEXT NOT NULL REFERENCES inventory_units_v2(id),
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0),
  status TEXT NOT NULL DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_number ON contracts_v2(contract_number) WHERE archived=0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_deal ON contracts_v2(deal_id) WHERE archived=0;

CREATE TABLE IF NOT EXISTS financial_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('cash','bank','clearing')),
  currency TEXT NOT NULL DEFAULT 'KGS',
  opening_balance_minor BIGINT NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_account_name ON financial_accounts(lower(name)) WHERE active=1;

CREATE TABLE IF NOT EXISTS account_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES financial_accounts(id),
  direction TEXT NOT NULL CHECK(direction IN ('in','out')),
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0),
  category TEXT NOT NULL,
  payment_id TEXT,
  expense_record_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reversed_by TEXT REFERENCES account_transactions(id),
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_date ON account_transactions(account_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS payments_v2 (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  deal_id TEXT NOT NULL REFERENCES crm_deals(id),
  contract_id TEXT REFERENCES contracts_v2(id),
  account_id TEXT NOT NULL REFERENCES financial_accounts(id),
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0),
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('pending','posted','void')),
  paid_at TIMESTAMPTZ NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_deal ON payments_v2(deal_id, paid_at DESC);

CREATE TABLE IF NOT EXISTS receivables_v2 (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  deal_id TEXT NOT NULL REFERENCES crm_deals(id),
  contract_id TEXT REFERENCES contracts_v2(id),
  principal_minor BIGINT NOT NULL CHECK(principal_minor>=0),
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','paid','overdue','written_off')),
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_receivable_deal ON receivables_v2(deal_id) WHERE archived=0 AND status<>'written_off';

CREATE TABLE IF NOT EXISTS sales_v2 (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES crm_deals(id),
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  inventory_unit_id TEXT NOT NULL REFERENCES inventory_units_v2(id),
  contract_id TEXT NOT NULL REFERENCES contracts_v2(id),
  sale_amount_minor BIGINT NOT NULL CHECK(sale_amount_minor>0),
  cost_minor BIGINT NOT NULL DEFAULT 0 CHECK(cost_minor>=0),
  sold_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_deal ON sales_v2(deal_id) WHERE archived=0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_inventory ON sales_v2(inventory_unit_id) WHERE archived=0;

CREATE TABLE IF NOT EXISTS documents_v2 (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES crm_customers(id),
  deal_id TEXT REFERENCES crm_deals(id),
  contract_id TEXT REFERENCES contracts_v2(id),
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  checklist_key TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_cases_v2 (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  sale_id TEXT NOT NULL REFERENCES sales_v2(id),
  inventory_unit_id TEXT NOT NULL REFERENCES inventory_units_v2(id),
  responsible_id TEXT REFERENCES staff(id),
  status TEXT NOT NULL DEFAULT 'new',
  issue TEXT NOT NULL,
  resolution TEXT NOT NULL DEFAULT '',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ,
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notifications_v2 (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES staff(id),
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  entity_type TEXT,
  entity_id TEXT,
  target_url TEXT,
  read_at TIMESTAMPTZ,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications_v2(recipient_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS conversations_v2 (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('direct','group')),
  title TEXT NOT NULL DEFAULT '',
  linked_entity_type TEXT,
  linked_entity_id TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS conversation_members_v2 (
  conversation_id TEXT NOT NULL REFERENCES conversations_v2(id),
  staff_id TEXT NOT NULL REFERENCES staff(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMPTZ,
  PRIMARY KEY(conversation_id, staff_id)
);
CREATE TABLE IF NOT EXISTS messages_v2 (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations_v2(id),
  sender_id TEXT NOT NULL REFERENCES staff(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMPTZ,
  archived INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages_v2(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON crm_customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_customer ON crm_deals(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON crm_deals(assigned_to, stage);
CREATE INDEX IF NOT EXISTS idx_deals_inventory ON crm_deals(inventory_unit_id) WHERE inventory_unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_customer ON crm_tasks(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deal ON crm_tasks(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_due ON crm_tasks(assigned_to, done, due_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders_v2(supplier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_purchase_order ON shipments_v2(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_order ON inventory_units_v2(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_shipment ON inventory_units_v2(shipment_id) WHERE shipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_responsible ON inventory_units_v2(responsible_id) WHERE responsible_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_customer ON meetings_v2(customer_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_deal ON meetings_v2(deal_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_customer ON proposals_v2(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_deal ON proposals_v2(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts_v2(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_inventory ON contracts_v2(inventory_unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments_v2(customer_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments_v2(contract_id, paid_at DESC) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments_v2(account_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_receivables_customer ON receivables_v2(customer_id, due_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales_v2(customer_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_contract ON sales_v2(contract_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents_v2(customer_id, created_at DESC) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_deal ON documents_v2(deal_id, created_at DESC) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_customer ON service_cases_v2(customer_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_sale ON service_cases_v2(sale_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_staff ON conversation_members_v2(staff_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages_v2(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_customer_created ON leads(customer_id, created_at DESC) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source_created ON leads(source, created_at DESC) WHERE archived=0;
CREATE INDEX IF NOT EXISTS idx_notes_deal_created ON crm_notes(deal_id, created_at DESC) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stage_events_deal_created ON deal_stage_events(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_history_unit_created ON inventory_lifecycle_events(inventory_unit_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_date ON account_transactions(account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_receivables_contract ON receivables_v2(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents_v2(contract_id, created_at DESC) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_inventory ON service_cases_v2(inventory_unit_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_responsible ON service_cases_v2(responsible_id, status) WHERE responsible_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_password_reset_staff ON password_reset_tokens(staff_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS backup_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'neon',
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  detail TEXT NOT NULL DEFAULT ''
);

INSERT INTO financial_accounts(id,name,account_type,currency,opening_balance_minor,active)
VALUES ('account-atadan-cash','Основная касса','cash','KGS',0,1)
ON CONFLICT(id) DO NOTHING;

INSERT INTO schema_migrations(id) VALUES ('admin-v2-normalized-core') ON CONFLICT(id) DO NOTHING;
`;
