// Наполняет ЛОКАЛЬНУЮ тестовую базу правдоподобными данными для проверки экранов админки.
// Запуск: node scripts/dev-seed-local.mjs  (DATABASE_URL из .env.local)
// Работает только с базой на localhost / 127.0.0.1 — на рабочую базу не запустится.
import fs from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  (fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const url = new URL(process.env.DATABASE_URL || env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
  console.error(`Отказ: база ${url.hostname} не локальная. Скрипт наполняет только тестовую базу.`);
  process.exit(1);
}

const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
const q = (sql, params = []) => db.query(sql, params);
const id = (p, n) => `demo-${p}-${n}`;
const daysAgo = (d) => new Date(Date.now() - d * 86400_000).toISOString();
const som = (v) => Math.round(v * 100);
const RATE = 87.45;

const already = await q("SELECT 1 FROM crm_customers WHERE id=$1", [id("c", 1)]);
if (already.rowCount) {
  console.log("Демо-данные уже есть. Чтобы пересоздать, удалите папку тестовой базы.");
  await db.end();
  process.exit(0);
}

await q("BEGIN");
// сотрудники
const owner = (await q("SELECT id FROM staff WHERE role='owner' ORDER BY created_at LIMIT 1")).rows[0]?.id ?? null;
const staff = [
  [id("s", 1), "nurlan@atadan.test", "Нурлан Асанов", "manager"],
  [id("s", 2), "aibek@atadan.test", "Айбек Токтосунов", "manager"],
  [id("s", 3), "gulnara@atadan.test", "Гульнара Мамбетова", "accountant"],
  [id("s", 4), "aigerim@atadan.test", "Айгерим Садыкова", "marketer"],
];
for (const [sid, email, name, role] of staff) await q("INSERT INTO staff(id,email,display_name,role) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING", [sid, email, name, role]);

// клиенты
const clients = [
  ["Токтогулов Асан", "+996555123456", "Чуйская"], ["КФХ «Нур-Береке»", "+996700222333", "Иссык-Кульская"], ["Мамытов Бакыт", "+996777456789", "Иссык-Кульская"],
  ["ОсОО «Агро-Талас»", "+996312555777", "Таласская"], ["Жээнбеков Улан", "+996550998877", "Ошская"], ["Абдыкалыков Нурбек", "+996709112233", "Чуйская"],
  ["Сатыбалдиев Канат", "+996555667788", "Джалал-Абадская"], ["Асанов Талант", "+996772334455", "Нарынская"], ["КФХ «Ак-Суу»", "+996705443322", "Чуйская"],
];
for (const [i, [name, phone, region]] of clients.entries()) {
  await q("INSERT INTO crm_customers(id,name,phone,region,source,normalized_phone,assigned_to) VALUES($1,$2,$3,$4,'website',$5,$6)", [id("c", i + 1), name, phone, region, phone.replace(/\D/g, ""), staff[i % 2][0]]);
}

// поставщик, заказ, поставки
await q("INSERT INTO suppliers_v2(id,name) VALUES($1,'Changfa Group (Чанчжоу)')", [id("sup", 1)]);
await q("INSERT INTO purchase_orders_v2(id,supplier_id,order_number,status,currency,total_minor,ordered_at,expected_at) VALUES($1,$2,'ЗК-0021','ordered','USD',$3,$4,$5)", [id("po", 1), id("sup", 1), som(200000), daysAgo(60).slice(0, 10), daysAgo(-10).slice(0, 10)]);
await q("INSERT INTO shipments_v2(id,purchase_order_id,tracking_number,status,route,transport,eta) VALUES($1,$2,'ПСТ-0012','customs','Урумчи → Торугарт','Фура',$3)", [id("sh", 1), id("po", 1), daysAgo(4).slice(0, 10)]);
await q("INSERT INTO shipments_v2(id,purchase_order_id,tracking_number,status,route,transport,eta) VALUES($1,$2,'ПСТ-0013','transit','Чанчжоу → Урумчи','Ж/д',$3)", [id("sh", 2), id("po", 1), daysAgo(-17).slice(0, 10)]);

// техника (USD-цены переведены в сомы по курсу)
const models = [
  ["cfj2004-g4", "CFJ2004(G4)", 29500, 25550], ["cfg1204-b", "CFG1204-B", 17900, 15120], ["cfe904-h", "CFE904-H", 13900, 11860],
  ["cfd504-m", "CFD504-M", 7600, 6340], ["cfk2404-g4", "CFK2404(G4)", 34500, 30100], ["cfd604-z", "CFD604-Z", 9800, 8200], ["cfg1404-g4", "CFG1404(G4)", 22400, 19100],
];
let unitN = 0;
const unit = async (m, status, ageDays, shipment = null) => {
  unitN += 1;
  const [slug, model, price, cost] = models[m];
  const vin = `LCF${slug.replace(/\W/g, "").toUpperCase().slice(0, 7)}N0${String(32000 + unitN * 37).padStart(5, "0")}`;
  await q(
    "INSERT INTO inventory_units_v2(id,vin,tractor_slug,model,status,shipment_id,purchase_cost_minor,landed_cost_minor,list_price_minor,location,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    [id("u", unitN), vin, slug, model, status, shipment, som(cost * 0.93 * RATE), som(cost * RATE), som(price * RATE), status === "stock" ? "Склад Бишкек" : "", daysAgo(ageDays)],
  );
  return id("u", unitN);
};
for (const [m, age] of [[1, 21], [1, 40], [2, 48], [3, 118], [3, 95], [5, 12], [6, 30], [0, 8]]) await unit(m, "stock", age);
for (let i = 0; i < 6; i++) await unit(i % 2 ? 4 : 1, "customs", 20, id("sh", 1));
for (let i = 0; i < 3; i++) await unit(0, "transit", 10, id("sh", 2));

// продажи за полгода
const sales = [
  [0, 0, 0, 3, false, 0.2], [1, 1, 1, 33, true, 1], [2, 2, 0, 34, true, 0.38], [3, 4, 1, 36, false, 0.1], [4, 5, 0, 37, false, 0.5],
  [5, 6, 1, 70, true, 1], [6, 1, 0, 75, true, 1], [7, 3, 1, 100, true, 0.62], [8, 0, 0, 104, true, 1], [0, 2, 1, 130, true, 1],
  [3, 6, 0, 160, true, 1], [1, 4, 1, 4, false, 0], [2, 1, 0, 12, true, 1],
];
let saleN = 0;
for (const [c, m, mgr, ago, delivered, paidShare] of sales) {
  saleN += 1;
  const [slug, model, price, cost] = models[m];
  const u = await unit(m, delivered ? "delivered" : "sold", ago + 30);
  const deal = id("d", saleN), contract = id("k", saleN), sale = id("sale", saleN), cust = id("c", c + 1);
  const amount = som(price * RATE), costMinor = som(cost * RATE);
  await q("INSERT INTO crm_deals(id,customer_id,title,tractor_slug,stage,amount_minor,cost_minor,assigned_to,inventory_unit_id,won_at,created_at) VALUES($1,$2,$3,$4,'won',$5,$6,$7,$8,$9,$9)", [deal, cust, `${model} · ${clients[c][0]}`, slug, amount, costMinor, staff[mgr][0], u, daysAgo(ago)]);
  await q("INSERT INTO contracts_v2(id,contract_number,customer_id,deal_id,inventory_unit_id,amount_minor,status,signed_at) VALUES($1,$2,$3,$4,$5,$6,'signed',$7)", [contract, `${100 + saleN}/26`, cust, deal, u, amount, daysAgo(ago)]);
  await q("INSERT INTO sales_v2(id,deal_id,customer_id,inventory_unit_id,contract_id,sale_amount_minor,cost_minor,sold_at,delivered_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)", [sale, deal, cust, u, contract, amount, costMinor, daysAgo(ago), delivered ? daysAgo(Math.max(0, ago - 2)) : null]);
  await q("INSERT INTO receivables_v2(id,customer_id,deal_id,contract_id,principal_minor,due_at,status) VALUES($1,$2,$3,$4,$5,$6,$7)", [id("r", saleN), cust, deal, contract, amount, daysAgo(ago - 30), paidShare >= 1 ? "paid" : "open"]);
  if (paidShare > 0) {
    const pay = id("p", saleN), acc = (await q("SELECT id FROM financial_accounts ORDER BY name LIMIT 1")).rows[0].id;
    await q("INSERT INTO payments_v2(id,customer_id,deal_id,contract_id,account_id,amount_minor,method,status,paid_at) VALUES($1,$2,$3,$4,$5,$6,'bank_transfer','posted',$7)", [pay, cust, deal, contract, acc, Math.round(amount * paidShare), daysAgo(ago)]);
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,payment_id,occurred_at,description) VALUES($1,$2,'in',$3,'Оплата продажи',$4,$5,$6)", [id("t", saleN), acc, Math.round(amount * paidShare), pay, daysAgo(ago), `Продажа ${sale}`]);
  }
}

// заявки с разных каналов
const sources = ["website", "website", "whatsapp", "instagram", "website", "phone", "whatsapp", "exhibition", "website", "lalafo", "website", "instagram"];
for (const [i, s] of sources.entries()) {
  const minutes = i < 3 ? 25 + i * 10 : 60 * 24 * (i + 1);
  await q("INSERT INTO leads(id,name,phone,tractor_slug,tractor_model,status,source,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [id("l", i + 1), ["Эрмек", "Бактыгуль", "Самат", "Нурлан", "Айжан", "Таалай", "Медер", "Гулзат", "Арстан", "Чынара", "Кубан", "Жылдыз"][i], `+99655500${String(1000 + i)}`, models[i % models.length][0], models[i % models.length][1], i < 3 ? "new" : "contacted", s, new Date(Date.now() - minutes * 60000).toISOString()]);
}
// уведомления владельцу
if (owner) {
  await q("INSERT INTO notifications_v2(id,recipient_id,type,priority,title,body,target_url) VALUES($1,$2,'lead','high','Новая заявка с сайта','Эрмек · CFJ2004(G4)','/admin/work/leads')", [id("n", 1), owner]);
  await q("INSERT INTO notifications_v2(id,recipient_id,type,title,body,target_url) VALUES($1,$2,'shipment','Поставка ПСТ-0012 опаздывает','Срок прибытия прошёл 4 дня назад','/admin/work/logistics')", [id("n", 2), owner]);
}
await q("COMMIT");
console.log(`Готово: ${clients.length} клиентов, ${unitN} машин, ${saleN} продаж, ${sources.length} заявок.`);
await db.end();
