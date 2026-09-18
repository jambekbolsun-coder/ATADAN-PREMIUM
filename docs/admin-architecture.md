# ATADAN Admin: architecture decision record

## Decision

The operational core uses normalized PostgreSQL tables and transactional service functions. Existing `admin_records` rows remain as a compatibility/CMS envelope while critical business objects (VINs, deals, contracts, payments, sales, debts, accounts, purchasing and logistics) are stored in typed relational tables.

Every critical write must:

1. authorize the actor on the server;
2. validate all referenced objects;
3. run in one database transaction;
4. use an expected `version` for optimistic concurrency;
5. append an entity audit event;
6. create notifications/tasks only after the business write succeeds.

Money is stored as integer minor units. A deal amount is a commercial value, a payment is a cash movement, a receivable is an outstanding obligation, revenue is recognized by a sale, and cash balance is derived only from posted account transactions.

## Alternatives considered

### 1. Keep all modules in JSON records

Fastest visually, but it cannot reliably enforce foreign keys, unique VINs, one sale per deal, account balances or referential permissions. Rejected for critical data; retained only for CMS and backward-compatible display.

### 2. Event sourcing for every module

Excellent traceability, but it would require rebuilding all reads, migrations and recovery tooling at once. The project and current data volume do not justify that operational risk. Rejected as the primary store; append-only lifecycle and audit events are used where history matters.

### 3. Replace the application with an external CRM/ERP

Would provide mature modules, but breaks the current public-site integration and creates a large migration/vendor dependency. Rejected.

### 4. Incremental normalized core (selected)

Adds strict constraints without deleting legacy rows, lets screens migrate module-by-module, and is safe to deploy through idempotent additive migrations. This is the most reliable path for the current application.

## Invariants

- VIN is normalized to uppercase and globally unique.
- One deal has at most one active sale; one VIN has at most one active sale.
- A payment belongs to a deal, account and customer; posted payments create immutable account movements.
- A sale never implies full payment. Paid and outstanding amounts come from posted payments and receivables.
- A Lost transition always includes a structured reason code and explanation.
- Archived rows remain restorable; hard delete is not a normal user operation.
- Blocking an employee requires reassignment of active work and preserves authorship/history.
- RBAC is enforced in route handlers and data queries, not only in navigation.
- Forecasts and analytics return `insufficientData` instead of invented numbers.

