/**
 * Склад, логистика и деньги (docs/admin-redesign/03-architecture.md §2, §3.1, §3.3, §5.2, §5.3).
 *
 * Цепочка: заказ заводу (позиции модель × кол-во × цена в валюте заказа) → оплаты заводу с курсом →
 * поставка (машины по VIN из упаковочного листа) → этапы пути → расходы поставки → приём на склад.
 * Себестоимость машины = закупочная цена × курс + доля расходов поставки (способ распределения
 * выбирается в каждой поставке: по закупочной цене / поровну / вручную).
 *
 * Миграция только добавляет таблицы и колонки. Деньги в minor units; fx_rate - сомов за 1 единицу валюты.
 */
export const STOCK_MONEY_SCHEMA_SQL = `
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS engine_number TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS gtd_number TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS certificate_number TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS passport_number TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS pdi_done_at TIMESTAMPTZ;
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS pdi_by TEXT REFERENCES staff(id);
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS damage_note TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS written_off_at TIMESTAMPTZ;
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS write_off_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS purchase_order_line_id TEXT;
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS allocated_cost_minor BIGINT NOT NULL DEFAULT 0;
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS manual_cost_minor BIGINT;
-- Дата прихода для срока на складе: для уже лежащих машин берём первое событие «на склад» или дату создания.
UPDATE inventory_units_v2 u SET received_at = COALESCE(
    (SELECT MIN(e.occurred_at) FROM inventory_lifecycle_events e WHERE e.inventory_unit_id=u.id AND e.to_status='stock'),
    u.created_at)
  WHERE u.received_at IS NULL AND u.status IN ('stock','reserved','sold','delivered');

ALTER TABLE purchase_orders_v2 ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(14,4) NOT NULL DEFAULT 1;
ALTER TABLE purchase_orders_v2 ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders_v2(id),
  tractor_slug TEXT NOT NULL,
  model TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK(qty>0 AND qty<=500),
  unit_price_minor BIGINT NOT NULL CHECK(unit_price_minor>0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_po_lines_po ON purchase_order_lines(purchase_order_id);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders_v2(id),
  account_id TEXT NOT NULL REFERENCES financial_accounts(id),
  currency TEXT NOT NULL CHECK(currency IN ('USD','KGS','CNY')),
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0),
  fx_rate NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK(fx_rate>0),
  amount_kgs_minor BIGINT NOT NULL CHECK(amount_kgs_minor>0),
  amount_po_minor BIGINT NOT NULL CHECK(amount_po_minor>0),
  paid_at TIMESTAMPTZ NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('posted','void')),
  void_reason TEXT NOT NULL DEFAULT '',
  transaction_id TEXT,
  void_transaction_id TEXT,
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_po ON supplier_payments(purchase_order_id, status);

ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS allocation_method TEXT NOT NULL DEFAULT 'value';
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS customs_at TIMESTAMPTZ;
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS shipment_costs (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments_v2(id),
  category TEXT NOT NULL CHECK(category IN ('freight','duty','vat','broker','certification','unloading','storage','other')),
  currency TEXT NOT NULL CHECK(currency IN ('USD','KGS','CNY')),
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0),
  fx_rate NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK(fx_rate>0),
  amount_kgs_minor BIGINT NOT NULL CHECK(amount_kgs_minor>0),
  account_id TEXT REFERENCES financial_accounts(id),
  transaction_id TEXT,
  void_transaction_id TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('posted','void')),
  void_reason TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shipment_costs_shipment ON shipment_costs(shipment_id, status);

-- Касса: расходы с категорией и привязкой, переводы между счетами
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS link_type TEXT;
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS link_id TEXT;
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS transfer_id TEXT;
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS counterparty TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_account_transactions_occurred ON account_transactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account ON account_transactions(account_id, occurred_at DESC);

INSERT INTO schema_migrations(id) VALUES('stock-money-20261106') ON CONFLICT(id) DO NOTHING;
`;
