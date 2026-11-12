/**
 * Этап 6: сервис и гарантия, зарплаты, ежедневные напоминания (docs/admin-redesign/03-architecture.md §2, §8).
 *
 *  - service_tickets: обращение клиента по машине (гарантия, платный ремонт, ТО, PDI) со своей историей;
 *    старые обращения из service_cases_v2 переносятся один раз, с привязкой к новой продаже, если она есть;
 *  - payroll_entries: начисления, удержания и выплаты сотрудникам по месяцам; выплата = расход в кассе;
 *  - cron_runs: какие ежедневные задачи уже выполнены (чтобы повторный вызов ничего не дублировал).
 */
export const OPS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS service_tickets (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES crm_customers(id),
  sale_id TEXT REFERENCES sale_orders(id),
  unit_id TEXT REFERENCES inventory_units_v2(id),
  tractor_slug TEXT,
  kind TEXT NOT NULL DEFAULT 'warranty' CHECK (kind IN ('warranty','paid','maintenance','pdi')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','diagnosis','waiting_parts','in_work','done','closed','rejected')),
  issue TEXT NOT NULL,
  resolution TEXT NOT NULL DEFAULT '',
  engine_hours INTEGER,
  price_minor BIGINT NOT NULL DEFAULT 0,
  assigned_to TEXT REFERENCES staff(id),
  due_at DATE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ,
  legacy_id TEXT UNIQUE,
  created_by TEXT REFERENCES staff(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON service_tickets(status, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_tickets_unit ON service_tickets(unit_id);

CREATE TABLE IF NOT EXISTS service_events (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES service_tickets(id),
  actor_id TEXT REFERENCES staff(id),
  kind TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_service_events_ticket ON service_events(ticket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payroll_entries (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  period TEXT NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  kind TEXT NOT NULL CHECK (kind IN ('salary','bonus','deduction','payout')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  note TEXT NOT NULL DEFAULT '',
  tx_id TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','void')),
  void_reason TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_entries(period, staff_id);

CREATE TABLE IF NOT EXISTS cron_runs (
  job TEXT NOT NULL,
  ran_on DATE NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job, ran_on)
);

-- Перенос старых обращений сервиса (один раз на каждое): продажа ищется через сделку старой CRM.
INSERT INTO service_tickets(id,number,customer_id,sale_id,unit_id,tractor_slug,kind,status,issue,resolution,assigned_to,opened_at,closed_at,legacy_id)
SELECT 'svc-' || c.id,
  'С-' || to_char(c.opened_at,'YYYY') || '-L' || substr(md5(c.id),1,6),
  c.customer_id,
  (SELECT o.id FROM sales_v2 s JOIN sale_orders o ON o.legacy_deal_id=s.deal_id WHERE s.id=c.sale_id LIMIT 1),
  c.inventory_unit_id, c.tractor_slug, 'warranty',
  CASE WHEN c.status IN ('closed','done') THEN 'closed' WHEN c.status='new' THEN 'new' ELSE 'in_work' END,
  c.issue, c.resolution, c.responsible_id, c.opened_at, c.closed_at, c.id
FROM service_cases_v2 c
WHERE c.archived=0 AND NOT EXISTS (SELECT 1 FROM service_tickets t WHERE t.legacy_id=c.id);
ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS passport TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_units_v2 ADD COLUMN IF NOT EXISTS cost_override_minor BIGINT;

ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS carrier TEXT NOT NULL DEFAULT '';
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS driver_name TEXT NOT NULL DEFAULT '';
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS driver_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT '';
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS destination TEXT NOT NULL DEFAULT '';
ALTER TABLE shipments_v2 ADD COLUMN IF NOT EXISTS departure_at TIMESTAMPTZ;

-- Перевозки: любая доставка техники (клиенту, между складами, от таможни), кто, откуда, куда, когда, какие модели.
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'to_client' CHECK (kind IN ('to_client','from_customs','between_warehouses','other')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_transit','delivered','cancelled')),
  sale_id TEXT REFERENCES sale_orders(id),
  customer_id TEXT REFERENCES crm_customers(id),
  client_name TEXT NOT NULL DEFAULT '',
  client_phone TEXT NOT NULL DEFAULT '',
  from_place TEXT NOT NULL DEFAULT '',
  to_place TEXT NOT NULL DEFAULT '',
  planned_at TIMESTAMPTZ NOT NULL,
  departed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  carrier TEXT NOT NULL DEFAULT '',
  driver_name TEXT NOT NULL DEFAULT '',
  driver_phone TEXT NOT NULL DEFAULT '',
  vehicle TEXT NOT NULL DEFAULT '',
  cost_minor BIGINT NOT NULL DEFAULT 0,
  tx_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES staff(id),
  updated_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status, planned_at DESC);
CREATE TABLE IF NOT EXISTS delivery_items (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES deliveries(id),
  tractor_slug TEXT,
  model TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_id TEXT REFERENCES inventory_units_v2(id),
  vin TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON delivery_items(delivery_id);

-- Решение владельца 2026-11-12: Ислам - второй владелец с подписью «Владелец компании», Бекболсун - «Инженер».
-- Выполняется один раз: потом роль и должность меняют в Настройки → Сотрудники.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE id='staff-titles-20261112') THEN
    UPDATE staff SET role='owner', permissions_json='[]', position='Владелец компании'
      WHERE active=1 AND role IN ('director','owner') AND (display_name ILIKE 'Ислам%' OR display_name ILIKE 'Islam%');
    UPDATE staff SET position='Инженер'
      WHERE active=1 AND role='owner' AND (display_name ILIKE 'Бекболсун%' OR display_name ILIKE 'Bekbolsun%');
    INSERT INTO schema_migrations(id) VALUES('staff-titles-20261112');
  END IF;
END $$;

-- Решение владельца 2026-11-12 (2): убрать тестовые кассы «e2e» и расчёт как в Excel.
-- Касса без связанных продаж, оплат заводу, расходов и переводов удаляется вместе со своими проводками;
-- если удалить нельзя (есть связи), она скрывается. Итог пишется в журнал действий. Выполняется один раз.
DO $$
DECLARE a RECORD; gone TEXT := ''; hidden TEXT := ''; who TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE id='e2e-accounts-20261112') THEN
    FOR a IN SELECT id, name FROM financial_accounts WHERE name ILIKE '%e2e%' LOOP
      BEGIN
        IF EXISTS (SELECT 1 FROM sale_payments WHERE account_id=a.id)
          OR EXISTS (SELECT 1 FROM payments_v2 WHERE account_id=a.id)
          OR EXISTS (SELECT 1 FROM supplier_payments WHERE account_id=a.id)
          OR EXISTS (SELECT 1 FROM shipment_costs WHERE account_id=a.id)
          OR EXISTS (SELECT 1 FROM account_transactions WHERE account_id=a.id AND (transfer_id IS NOT NULL OR link_type IS NOT NULL)) THEN
          RAISE EXCEPTION 'linked';
        END IF;
        UPDATE account_transactions SET reversed_by=NULL WHERE account_id=a.id;
        DELETE FROM account_transactions WHERE account_id=a.id;
        DELETE FROM financial_accounts WHERE id=a.id;
        gone := gone || a.name || '; ';
      EXCEPTION WHEN OTHERS THEN
        UPDATE financial_accounts SET active=0 WHERE id=a.id;
        hidden := hidden || a.name || '; ';
      END;
    END LOOP;
    -- расчёт как в Excel убран: план больше не входит в себестоимость
    UPDATE inventory_units_v2 SET landed_cost_minor=landed_cost_minor-planned_cost_minor WHERE planned_cost_minor<>0 AND cost_override_minor IS NULL AND status<>'delivered';
    UPDATE inventory_units_v2 SET planned_cost_minor=0 WHERE planned_cost_minor<>0;
    DELETE FROM purchase_order_plan;
    SELECT id INTO who FROM staff WHERE role='owner' AND active=1 ORDER BY created_at LIMIT 1;
    INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES (gen_random_uuid()::text, COALESCE(who,'system'), 'accounts.e2e_cleanup', 'financial_accounts',
      'Тестовые кассы e2e. Удалены: ' || COALESCE(NULLIF(gone,''),'нет') || ' Скрыты: ' || COALESCE(NULLIF(hidden,''),'нет'));
    INSERT INTO schema_migrations(id) VALUES('e2e-accounts-20261112');
  END IF;
END $$;
`;
