import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
