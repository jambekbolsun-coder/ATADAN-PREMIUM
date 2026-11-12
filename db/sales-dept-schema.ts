/**
 * Отдел продаж (docs/admin-redesign/03-architecture.md, §2–§4, §11).
 *
 * Продажа — самостоятельный документ: клиент, позиции (машины по VIN, техника под заказ,
 * запчасти, услуги), валюта договора (USD/KGS), способ оплаты, график и платежи.
 * CRM-сделки больше не нужны для продажи.
 *
 * Миграция только добавляет таблицы и колонки, ничего не удаляет. Старые продажи
 * (sales_v2 + payments_v2) переносятся сюда при каждом запуске, только недостающее (блок синхронизации ниже), со ссылкой на исходную сделку.
 * Деньги в minor units (центы/тыйыны). Курс fx_rate - сколько сомов за 1 единицу валюты.
 */
export const SALES_DEPT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sale_orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES crm_customers(id),
  lead_id TEXT REFERENCES leads(id),
  manager_id TEXT REFERENCES staff(id),
  status TEXT NOT NULL DEFAULT 'booked' CHECK(status IN ('booked','delivered','closed','cancelled')),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency IN ('USD','KGS')),
  fx_rate NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK(fx_rate>0),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('full','prepay','installment','bank_leasing','state_leasing')),
  bank_name TEXT NOT NULL DEFAULT '',
  bank_decision TEXT NOT NULL DEFAULT 'none' CHECK(bank_decision IN ('none','pending','approved','rejected')),
  bank_note TEXT NOT NULL DEFAULT '',
  dossier_json TEXT NOT NULL DEFAULT '{}',
  total_minor BIGINT NOT NULL CHECK(total_minor>0),
  list_total_minor BIGINT NOT NULL DEFAULT 0 CHECK(list_total_minor>=0),
  cost_kgs_minor BIGINT NOT NULL DEFAULT 0 CHECK(cost_kgs_minor>=0),
  below_cost_reason TEXT NOT NULL DEFAULT '',
  reserve_until DATE,
  debt_allowed_by TEXT REFERENCES staff(id),
  debt_allowed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  legacy_deal_id TEXT,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_order_number ON sale_orders(number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_order_legacy_deal ON sale_orders(legacy_deal_id) WHERE legacy_deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sale_orders_sold ON sale_orders(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_orders_customer ON sale_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_manager ON sale_orders(manager_id, status);

CREATE TABLE IF NOT EXISTS sale_order_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sale_orders(id),
  kind TEXT NOT NULL CHECK(kind IN ('unit','model_order','part','service')),
  inventory_unit_id TEXT REFERENCES inventory_units_v2(id),
  tractor_slug TEXT,
  title TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1 CHECK(qty>0 AND qty<=1000),
  price_minor BIGINT NOT NULL CHECK(price_minor>=0),
  list_price_minor BIGINT NOT NULL DEFAULT 0 CHECK(list_price_minor>=0),
  cost_kgs_minor BIGINT NOT NULL DEFAULT 0 CHECK(cost_kgs_minor>=0),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(kind<>'unit' OR (inventory_unit_id IS NOT NULL AND qty=1))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_item_active_unit ON sale_order_items(inventory_unit_id) WHERE inventory_unit_id IS NOT NULL AND active=1;
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_order_items(sale_id);

CREATE TABLE IF NOT EXISTS sale_payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sale_orders(id),
  direction TEXT NOT NULL DEFAULT 'in' CHECK(direction IN ('in','out')),
  payer TEXT NOT NULL DEFAULT 'client' CHECK(payer IN ('client','bank')),
  account_id TEXT NOT NULL REFERENCES financial_accounts(id),
  currency TEXT NOT NULL CHECK(currency IN ('USD','KGS')),
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0),
  fx_rate NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK(fx_rate>0),
  amount_sale_minor BIGINT NOT NULL CHECK(amount_sale_minor>0),
  amount_kgs_minor BIGINT NOT NULL CHECK(amount_kgs_minor>0),
  paid_at TIMESTAMPTZ NOT NULL,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('posted','void')),
  void_reason TEXT NOT NULL DEFAULT '',
  transaction_id TEXT,
  void_transaction_id TEXT,
  legacy_payment_id TEXT,
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_payment_legacy ON sale_payments(legacy_payment_id) WHERE legacy_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id, status);

CREATE TABLE IF NOT EXISTS sale_schedule (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sale_orders(id),
  kind TEXT NOT NULL CHECK(kind IN ('advance','installment','bank','balance')),
  payer TEXT NOT NULL DEFAULT 'client' CHECK(payer IN ('client','bank')),
  due_date DATE NOT NULL,
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sale_schedule_sale ON sale_schedule(sale_id, due_date);

CREATE TABLE IF NOT EXISTS sale_events (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sale_orders(id),
  type TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  actor_id TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sale_events_sale ON sale_events(sale_id, created_at DESC);

ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS reserved_sale_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sale_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reject_reason TEXT NOT NULL DEFAULT '';

-- Синхронизация со старой CRM. Выполняется при каждом запуске и только добавляет недостающее:
-- пока живой сайт работает на старом коде, новые продажи и платежи оттуда тоже попадают в отдел продаж.
-- 1) Старые продажи (sales_v2) -> продажи отдела продаж, валюта KGS, курс 1. Номера П-ГГГГ-С0001 продолжают последний.
WITH fresh AS (
  SELECT s.*, to_char(s.sold_at,'YYYY') AS yr, row_number() OVER (PARTITION BY to_char(s.sold_at,'YYYY') ORDER BY s.sold_at, s.id) AS rn
  FROM sales_v2 s
  WHERE s.archived=0 AND s.sale_amount_minor>0
    AND NOT EXISTS (SELECT 1 FROM sale_orders o WHERE o.legacy_deal_id=s.deal_id)
), last_num AS (
  SELECT substring(number from 3 for 4) AS yr, MAX(CAST(substring(number from '-С([0-9]+)$') AS INTEGER)) AS m
  FROM sale_orders WHERE number ~ '^П-[0-9]{4}-С[0-9]+$' GROUP BY 1
)
INSERT INTO sale_orders(id,number,customer_id,manager_id,status,currency,fx_rate,payment_method,total_minor,list_total_minor,cost_kgs_minor,delivered_at,legacy_deal_id,sold_at,created_by,created_at,updated_at)
SELECT 'legacy-'||f.id,
  'П-'||f.yr||'-С'||lpad((COALESCE(l.m,0)+f.rn)::text,4,'0'),
  f.customer_id, d.assigned_to, 'booked', 'KGS', 1, 'full', f.sale_amount_minor, f.sale_amount_minor, f.cost_minor, f.delivered_at, f.deal_id, f.sold_at, f.created_by, f.created_at, f.updated_at
FROM fresh f
LEFT JOIN last_num l ON l.yr=f.yr
LEFT JOIN crm_deals d ON d.id=f.deal_id
ON CONFLICT DO NOTHING;

INSERT INTO sale_order_items(id,sale_id,kind,inventory_unit_id,tractor_slug,title,qty,price_minor,list_price_minor,cost_kgs_minor,active)
SELECT 'legacy-item-'||s.id, 'legacy-'||s.id, 'unit', s.inventory_unit_id, i.tractor_slug, i.model||' · VIN '||i.vin, 1, s.sale_amount_minor, s.sale_amount_minor, s.cost_minor, 1
FROM sales_v2 s JOIN inventory_units_v2 i ON i.id=s.inventory_unit_id
WHERE s.archived=0 AND EXISTS (SELECT 1 FROM sale_orders o WHERE o.id='legacy-'||s.id)
  AND NOT EXISTS (SELECT 1 FROM sale_order_items x WHERE x.id='legacy-item-'||s.id)
  AND NOT EXISTS (SELECT 1 FROM sale_order_items x WHERE x.inventory_unit_id=s.inventory_unit_id AND x.active=1);

-- 2) Проведённые платежи старой CRM. Проводка в кассе уже есть: ссылаемся на неё, новую не создаём.
INSERT INTO sale_payments(id,sale_id,direction,payer,account_id,currency,amount_minor,fx_rate,amount_sale_minor,amount_kgs_minor,paid_at,method,reference,status,transaction_id,legacy_payment_id,created_by,created_at)
SELECT 'legacy-'||p.id, o.id, 'in', 'client', p.account_id, 'KGS', p.amount_minor, 1, p.amount_minor, p.amount_minor, p.paid_at, p.method, p.reference, 'posted',
  (SELECT t.id FROM account_transactions t WHERE t.payment_id=p.id AND t.direction='in' ORDER BY t.created_at LIMIT 1), p.id, p.created_by, p.created_at
FROM payments_v2 p JOIN sale_orders o ON o.legacy_deal_id=p.deal_id
WHERE p.status='posted' AND p.archived=0
  AND NOT EXISTS (SELECT 1 FROM sale_payments x WHERE x.legacy_payment_id=p.id);

-- Платёж, сторнированный в старой CRM, сторнирован и здесь.
UPDATE sale_payments x SET status='void', void_reason='Сторнирован в прежней CRM'
FROM payments_v2 p WHERE x.legacy_payment_id=p.id AND x.status='posted' AND (p.status<>'posted' OR p.archived<>0);

-- 3) Выдача из старой CRM и статус продажи по фактической оплате.
UPDATE sale_orders o SET delivered_at=s.delivered_at
FROM sales_v2 s WHERE o.legacy_deal_id=s.deal_id AND o.delivered_at IS NULL AND s.delivered_at IS NOT NULL;
UPDATE sale_orders o SET status = CASE
    WHEN o.delivered_at IS NULL THEN 'booked'
    WHEN COALESCE((SELECT SUM(CASE WHEN p.direction='in' THEN p.amount_sale_minor ELSE -p.amount_sale_minor END) FROM sale_payments p WHERE p.sale_id=o.id AND p.status='posted'),0) >= o.total_minor THEN 'closed'
    ELSE 'delivered' END
WHERE o.legacy_deal_id IS NOT NULL AND o.status<>'cancelled'
  AND o.status <> CASE
    WHEN o.delivered_at IS NULL THEN 'booked'
    WHEN COALESCE((SELECT SUM(CASE WHEN p.direction='in' THEN p.amount_sale_minor ELSE -p.amount_sale_minor END) FROM sale_payments p WHERE p.sale_id=o.id AND p.status='posted'),0) >= o.total_minor THEN 'closed'
    ELSE 'delivered' END;

INSERT INTO sale_events(id,sale_id,type,detail)
SELECT 'legacy-event-'||o.id, o.id, 'migrated', 'Перенесено из прежней CRM-сделки '||o.legacy_deal_id
FROM sale_orders o WHERE o.legacy_deal_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sale_events e WHERE e.id='legacy-event-'||o.id);

INSERT INTO schema_migrations(id) VALUES('sales-dept-20261105') ON CONFLICT(id) DO NOTHING;

-- Быстрые заявки (2026-11-12): встреча из анкеты чат-бота, кто и как добавил, исходный текст
ALTER TABLE leads ADD COLUMN IF NOT EXISTS meeting_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_text TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_leads_quick ON leads(created_via, created_at DESC);
`;
