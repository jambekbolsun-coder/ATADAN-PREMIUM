import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";
const production = process.env.ATADAN_PUBLISH_EXAMPLES === "1";
const base = production
  ? "https://atadan-changfa.vercel.app"
  : "http://localhost:3022";
const samples = [
  [
    "Масляный фильтр",
    "oil-filter",
    "oil-filter-garage",
    "Фильтрация масла",
    "Подбор фильтра для обслуживания двигателя. Для заказа сообщите VIN и маркировку установленного фильтра.",
  ],
  [
    "Воздушный фильтр",
    "air-filter",
    "air-filter-field",
    "Воздушная система",
    "Подбор сменного элемента воздушного фильтра. Менеджер уточнит размеры корпуса и комплектацию трактора.",
  ],
  [
    "Топливный фильтр",
    "fuel-filter",
    "fuel-filter-road",
    "Топливная система",
    "Подбор фильтра для дизельной топливной системы. Пришлите фото установленного узла и его маркировку.",
  ],
  [
    "Приводной ремень",
    "drive-belt",
    "drive-belt-garage",
    "Привод двигателя",
    "Подбор приводного ремня по профилю, длине и маркировке. Точный вариант подтвердит сервисный специалист.",
  ],
];
let pool, hash, token;
try {
  if (production) {
    const env = Object.fromEntries(
      fs
        .readFileSync("../atadan-production.env", "utf8")
        .split(/\r?\n/)
        .filter((l) => /^[A-Z_]+=/.test(l))
        .map((l) => {
          const i = l.indexOf("=");
          return [
            l.slice(0, i),
            l[i + 1] === '"' ? JSON.parse(l.slice(i + 1)) : l.slice(i + 1),
          ];
        }),
    );
    const url = new URL(env.DATABASE_URL || env.POSTGRES_URL);
    if (url.searchParams.get("options")?.includes("atadan_test_"))
      throw Error("Unexpected test database");
    const ssl = url.searchParams.get("sslmode");
    url.searchParams.delete("sslmode");
    pool = new pg.Pool({
      connectionString: url.toString(),
      ssl: ssl ? { rejectUnauthorized: true } : undefined,
      max: 1,
    });
    const { rows } = await pool.query(
      "SELECT id FROM staff WHERE role='owner' AND active=1 ORDER BY created_at LIMIT 1",
    );
    if (!rows[0]) throw Error("No active owner");
    token = crypto.randomBytes(32).toString("hex");
    hash = crypto.createHash("sha256").update(token).digest("hex");
    await pool.query(
      "INSERT INTO staff_sessions(token_hash,staff_id,expires_at,id) VALUES($1,$2,$3,$4)",
      [
        hash,
        rows[0].id,
        Math.floor(Date.now() / 1000) + 600,
        crypto.randomUUID(),
      ],
    );
  } else {
    token = JSON.parse(fs.readFileSync("../atadan-test-context.json", "utf8"))
      .actors[0].token;
  }
  const headers = {
    Cookie: `atadan_staff=${token}`,
    Origin: base,
    "Content-Type": "application/json",
  };
  const list = await fetch(base + "/api/admin/records?kind=parts", { headers });
  if (!list.ok) throw Error("Cannot read parts");
  const body = await list.json();
  const records = body.records || body.items || [];
  for (const [
    index,
    [title, image, context, category, subtitle],
  ] of samples.entries()) {
    const sku = `ATADAN-DEMO-${String(index + 1).padStart(3, "0")}`;
    if (
      records.some(
        (row) => (row.data || JSON.parse(row.data_json || "{}")).sku === sku,
      )
    ) {
      console.log("EXISTS", sku);
      continue;
    }
    const response = await fetch(base + "/api/admin/records", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "create",
        kind: "parts",
        title,
        subtitle,
        category,
        status: "published",
        sortOrder: index + 1,
        data: {
          sku,
          compatibleModels:
            "Changfa CFH1804-M · совместимость уточняется по VIN и артикулу",
          image: `/images/parts/${image}.png`,
          gallery: `/images/parts/${context}.png`,
          imageNote:
            "Пример ассортимента. Изображения созданы для иллюстрации; внешний вид и точный артикул уточняются при подборе.",
        },
      }),
    });
    if (response.status !== 201) throw Error(await response.text());
    console.log("CREATED", sku, title);
  }
} finally {
  if (pool) {
    if (hash)
      await pool.query("DELETE FROM staff_sessions WHERE token_hash=$1", [
        hash,
      ]);
    await pool.end();
  }
}
