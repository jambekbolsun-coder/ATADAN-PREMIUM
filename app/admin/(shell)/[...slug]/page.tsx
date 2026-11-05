/**
 * Старые адреса прежней админки (/admin/company/…, /admin/control/…, /admin/marketing/<раздел>) из уведомлений
 * и закладок ведут в соответствующий раздел новой админки. Неизвестный адрес - 404.
 */
import { notFound, redirect } from "next/navigation";
import { requireStaff } from "../../_lib/session";

const OLD_TO_NEW: Record<string, string> = {
  "company/sales": "/admin/work/sales", "company/deals": "/admin/work/leads", "company/client-base": "/admin/work/clients",
  "company/inventory-units": "/admin/work/stock", "company/payments": "/admin/work/cash", "company/financial-accounts": "/admin/work/cash",
  "company/debts": "/admin/work/debts", "company/expenses": "/admin/work/expenses", "company/payroll": "/admin/work/payroll",
  "company/shipments": "/admin/work/logistics", "company/purchases": "/admin/work/logistics?tab=orders", "company/suppliers": "/admin/work/logistics?tab=suppliers",
  "company/service-cases": "/admin/work/service", "company/team": "/admin/settings/team", "company/audit": "/admin/settings/audit",
  "control/control-models": "/admin/work/margin", "control/control-plan": "/admin/work/reports",
  "marketing/site-leads": "/admin/work/leads", "marketing/site-settings": "/admin/marketing/pages", "marketing/public-service": "/admin/marketing/pages?tab=service",
  "marketing/faq": "/admin/marketing/pages?tab=faq", "marketing/leasing-models": "/admin/marketing/leasing?tab=models", "marketing/site-analytics": "/admin/marketing/analytics",
};

export default async function OldAddress({ params }: PageProps<"/admin/[...slug]">) {
  const { slug } = await params;
  const key = slug.slice(0, 2).join("/");
  await requireStaff(`/admin/${slug.join("/")}`);
  if (OLD_TO_NEW[key]) redirect(OLD_TO_NEW[key]);
  if (slug[0] === "company" || slug[0] === "control") redirect("/admin/work");
  notFound();
}
