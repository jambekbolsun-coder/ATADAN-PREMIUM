/**
 * Маркетинг и настройки (docs/admin-redesign/03-architecture.md §5.4, §6, §7).
 *
 *  - parts / part_movements: одна карточка запчасти и для сайта, и для склада; остаток = сумма движений,
 *    хранится в parts.qty и меняется только вместе с движением (в одной транзакции);
 *  - product_price_history: каждая смена цены модели на сайте (кто, когда, было/стало);
 *  - staff.notify_json: какие уведомления получает сотрудник.
 *
 * Цены запчастей в minor units (тыйыны). Цена модели в каталоге сайта остаётся в целых сомах,
 * как в app/types.ts (Tractor.price), чтобы публичный сайт не менялся.
 */
export const MARKETING_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  models_json TEXT NOT NULL DEFAULT '[]',
  unit TEXT NOT NULL DEFAULT 'шт',
  price_minor BIGINT NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  cost_minor BIGINT NOT NULL DEFAULT 0 CHECK (cost_minor >= 0),
  qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  min_qty INTEGER NOT NULL DEFAULT 0 CHECK (min_qty >= 0),
  location TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  show_on_site INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES staff(id),
  updated_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_parts_sku ON parts(lower(sku));
CREATE INDEX IF NOT EXISTS idx_parts_low ON parts(archived, qty, min_qty);

CREATE TABLE IF NOT EXISTS part_movements (
  id TEXT PRIMARY KEY,
  part_id TEXT NOT NULL REFERENCES parts(id),
  kind TEXT NOT NULL CHECK (kind IN ('in','sale','writeoff','count','return')),
  qty_delta INTEGER NOT NULL,
  qty_after INTEGER NOT NULL CHECK (qty_after >= 0),
  unit_cost_minor BIGINT NOT NULL DEFAULT 0,
  sale_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_part_movements_part ON part_movements(part_id, created_at DESC);

CREATE TABLE IF NOT EXISTS product_price_history (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  old_price BIGINT,
  new_price BIGINT,
  old_usd INTEGER,
  new_usd INTEGER,
  note TEXT NOT NULL DEFAULT '',
  changed_by TEXT REFERENCES staff(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_history_slug ON product_price_history(slug, changed_at DESC);

ALTER TABLE staff ADD COLUMN IF NOT EXISTS notify_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE sale_order_items ADD COLUMN IF NOT EXISTS part_id TEXT REFERENCES parts(id);
`;
