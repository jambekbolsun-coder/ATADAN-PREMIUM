import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const productOverrides = sqliteTable("product_overrides", {
  slug: text("slug").primaryKey(),
  dataJson: text("data_json").notNull().default("{}"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  tractorSlug: text("tractor_slug"),
  tractorModel: text("tractor_model"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("new"),
  source: text("source").notNull().default("website"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const interestEvents = sqliteTable("interest_events", {
  id: text("id").primaryKey(),
  tractorSlug: text("tractor_slug"),
  path: text("path").notNull(),
  eventType: text("event_type").notNull().default("page_view"),
  visitorId: text("visitor_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminProfile = sqliteTable("admin_profile", {
  id: integer("id").primaryKey().default(1),
  displayName: text("display_name").notNull().default("Администратор ATADAN"),
  phone: text("phone").notNull().default("+996 706 131 404"),
  email: text("email").notNull().default("admin@atadan.kg"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const newsPosts = sqliteTable("news_posts", {
  slug: text("slug").primaryKey(),
  dataJson: text("data_json").notNull().default("{}"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(), email: text("email").notNull().unique(), displayName: text("display_name").notNull(),
  role: text("role", { enum: ["owner", "manager"] }).notNull().default("manager"),
  passwordHash: text("password_hash"), salt: text("salt"), active: integer("active").notNull().default(1),
  theme: text("theme").notNull().default("field"), avatar: text("avatar"), phone: text("phone").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const staffSessions = sqliteTable("staff_sessions", {
  tokenHash: text("token_hash").primaryKey(), staffId: text("staff_id").notNull().references(() => staff.id),
  expiresAt: integer("expires_at").notNull(),
}, t => [index("idx_sessions_staff").on(t.staffId)]);
export const staffInvites = sqliteTable("staff_invites", {
  tokenHash: text("token_hash").primaryKey(), email: text("email").notNull(), createdBy: text("created_by").notNull().references(() => staff.id),
  expiresAt: integer("expires_at").notNull(), usedAt: text("used_at"), revoked: integer("revoked").notNull().default(0),
});
export const crmCustomers = sqliteTable("crm_customers", {
  id: text("id").primaryKey(), name: text("name").notNull(), phone: text("phone").notNull(), email: text("email").notNull().default(""),
  notes: text("notes").notNull().default(""), assignedTo: text("assigned_to").references(() => staff.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), version: integer("version").notNull().default(1),
});
export const crmDeals = sqliteTable("crm_deals", {
  id: text("id").primaryKey(), leadId: text("lead_id").unique().references(() => leads.id), customerId: text("customer_id").notNull().references(() => crmCustomers.id),
  title: text("title").notNull(), tractorSlug: text("tractor_slug"), stage: text("stage").notNull().default("new"),
  amountMinor: integer("amount_minor").notNull().default(0), costMinor: integer("cost_minor"),
  assignedTo: text("assigned_to").references(() => staff.id), lossReason: text("loss_reason").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  version: integer("version").notNull().default(1), archived: integer("archived").notNull().default(0),
}, t => [index("idx_deals_assigned_stage").on(t.assignedTo, t.stage)]);
export const crmTasks = sqliteTable("crm_tasks", {
  id: text("id").primaryKey(), dealId: text("deal_id").references(() => crmDeals.id), title: text("title").notNull(),
  assignedTo: text("assigned_to").notNull().references(() => staff.id), dueAt: text("due_at").notNull(),
  done: integer("done").notNull().default(0), version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [index("idx_tasks_assigned_due").on(t.assignedTo, t.dueAt)]);
export const crmNotes = sqliteTable("crm_notes", {
  id: text("id").primaryKey(), dealId: text("deal_id").notNull().references(() => crmDeals.id), authorId: text("author_id").notNull().references(() => staff.id),
  body: text("body").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const productCosts = sqliteTable("product_costs", {
  slug: text("slug").primaryKey(), costMinor: integer("cost_minor").notNull().default(0), version: integer("version").notNull().default(1),
});
export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(), value: text("value").notNull(), version: integer("version").notNull().default(1),
});
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(), actorId: text("actor_id").notNull(), action: text("action").notNull(),
  entityId: text("entity_id").notNull(), detail: text("detail").notNull().default(""), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const requestLimits = sqliteTable("request_limits", { id: text("id").primaryKey(), hits: integer("hits").notNull(), expiresAt: integer("expires_at").notNull() });
export const leadRequests = sqliteTable("lead_requests", { id: text("id").primaryKey(), payloadHash: text("payload_hash").notNull(), leadId: text("lead_id").notNull().references(() => leads.id), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`) });
