import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../../print.css";
import { requireStaff } from "../../../_lib/session";
import { amountInWords, DOCS, saleDocument, type DocKind } from "../../../_lib/documents";
import { METHOD } from "../../../_lib/sales";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Документ · ATADAN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (minor: number) => (minor / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }) : "«___» __________ 20__ г.");
const Blank = ({ w = 220 }: { w?: number }) => <span className="doc-blank" style={{ minWidth: w }} />;

export default async function SaleDocumentPage({ params, searchParams }: PageProps<"/admin/print/sale/[id]">) {
  const actor = await requireStaff("/admin/work/sales");
  const { id } = await params;
  const sp = await searchParams;
  const kind: DocKind = sp.doc === "invoice" || sp.doc === "act" ? sp.doc : "contract";
  const d = await saleDocument(actor, id);
  if (!d) notFound();
  const { sale: s, company: c, policy, penalty, schedule, units, customer } = d;
  const items = d.items.filter((i) => i.active);
  const cur = s.currency === "USD" ? "USD" : "KGS";
  const sign = cur === "USD" ? "долл. США" : "сом";
  const seller = c.legalName || "ОсОО «АТАДАН»";
  const missing = [!c.legalName && "название компании", !c.inn && "ИНН", !c.account && "расчётный счёт", !c.director && "директор"].filter(Boolean);
  const unitRows = items.filter((i) => i.inventory_unit_id).map((i) => units.get(i.inventory_unit_id as string)).filter(Boolean);

  const requisites = (
    <div className="doc-sign">
      <div>
        <b>Продавец</b><br />{seller}<br />
        {c.address ? <>{c.address}<br /></> : null}
        ИНН {c.inn || <Blank w={120} />}{c.okpo ? `, ОКПО ${c.okpo}` : ""}<br />
        {c.bankName ? <>{c.bankName}, БИК {c.bik}<br /></> : null}
        р/с {cur === "USD" ? c.accountUsd || c.account || <Blank w={160} /> : c.account || <Blank w={160} />}<br />
        {c.phone ? <>Тел.: {c.phone}<br /></> : null}
        <br />Директор <span className="doc-line" /> {c.director}<br /><span className="doc-small">М.П.</span>
      </div>
      <div>
        <b>Покупатель</b><br />{customer?.name ?? s.customer}<br />
        Тел.: {customer?.phone ?? s.phone}<br />
        {customer?.region ? <>{customer.region}<br /></> : null}
        Паспорт / ИНН: <Blank /><br />
        Адрес: <Blank /><br />
        <br /><span className="doc-line" /> подпись
      </div>
    </div>
  );

  const withVin = true;
  const itemsTable = (
    <table className="doc-table">
      <thead><tr><th>№</th><th>Наименование</th><th className="r">Кол-во</th><th className="r">Цена, {sign}</th><th className="r">Сумма, {sign}</th></tr></thead>
      <tbody>
        {items.map((i, n) => {
          const u = i.inventory_unit_id ? units.get(i.inventory_unit_id) : null;
          return (
            <tr key={i.id}>
              <td>{n + 1}</td>
              <td>{i.title.split(" · VIN")[0]}{withVin && u ? <div className="doc-small">VIN {u.vin}{u.engine_number ? `, двигатель № ${u.engine_number}` : ""}{u.year ? `, ${u.year} г.в.` : ""}{u.color ? `, цвет ${u.color}` : ""}</div> : null}</td>
              <td className="r">{i.qty}</td>
              <td className="r">{fmt(i.price_minor)}</td>
              <td className="r">{fmt(i.price_minor * i.qty)}</td>
            </tr>
          );
        })}
        <tr><td colSpan={4} className="r"><b>Итого</b></td><td className="r"><b>{fmt(s.total_minor)}</b></td></tr>
      </tbody>
    </table>
  );

  return (
    <div className="doc-root">
      <nav className="doc-bar" aria-label="Документы">
        <Link href={`/admin/work/sales/${s.id}`}>← К продаже</Link>
        {(Object.keys(DOCS) as DocKind[]).map((k) => <Link key={k} href={`/admin/print/sale/${s.id}?doc=${k}`} aria-current={k === kind ? "page" : undefined}>{DOCS[k]}</Link>)}
        <PrintButton />
        <span className="doc-hint">В окне печати выберите «Сохранить как PDF», чтобы получить файл. Пустые линии заполняются от руки.</span>
      </nav>
      {missing.length ? <div className="doc-warn">Не заполнены реквизиты: {missing.join(", ")}. Заполните в Настройки → Реквизиты, кассы и курсы, иначе в документе будут пустые линии.</div> : null}

      {kind === "contract" ? (
        <article className="doc-page">
          <h1>ДОГОВОР КУПЛИ-ПРОДАЖИ № {s.number}</h1>
          <div className="doc-meta"><span>г. Бишкек</span><span>{day(s.sold_at)}</span></div>
          <p>{seller}, в лице директора {c.director || <Blank w={180} />}, действующего на основании Устава, именуемое в дальнейшем «Продавец», с одной стороны, и {customer?.name ?? s.customer}, именуемый(ая) в дальнейшем «Покупатель», с другой стороны, заключили настоящий договор о нижеследующем.</p>
          <h2>1. Предмет договора</h2>
          <p>1.1. Продавец передаёт в собственность Покупателя, а Покупатель принимает и оплачивает следующий товар:</p>
          {itemsTable}
          <p>1.2. Товар новый, ранее не эксплуатировался{unitRows.length ? ", сведения о VIN и номерах агрегатов указаны в таблице" : ""}.</p>
          <h2>2. Цена и порядок оплаты</h2>
          <p>2.1. Общая стоимость товара составляет {fmt(s.total_minor)} {sign} ({amountInWords(s.total_minor, cur)}).</p>
          <p>2.2. Способ оплаты: {METHOD[s.payment_method]?.label ?? s.payment_method}{s.bank_name ? `, через ${s.bank_name}` : ""}.{cur === "USD" ? " Оплата в сомах производится по курсу НБКР на день платежа, если стороны не договорились иначе." : ""}</p>
          {schedule.length ? (
            <>
              <p>2.3. График платежей:</p>
              <table className="doc-table"><thead><tr><th>Срок</th><th>Платёж</th><th className="r">Сумма, {sign}</th></tr></thead>
                <tbody>{schedule.map((r) => <tr key={r.id}><td>{day(r.due_date)}</td><td>{r.payer === "bank" ? "оплата банка" : r.kind === "advance" ? "первый взнос" : r.kind === "installment" ? "очередной платёж" : "оплата"}</td><td className="r">{fmt(r.amount_minor)}</td></tr>)}</tbody></table>
            </>
          ) : null}
          <p>2.4. Обязательство по оплате считается исполненным с момента поступления денег в кассу или на расчётный счёт Продавца. {penalty.ratePerDay ? <> При просрочке платежа более {penalty.graceDays} дн. Покупатель уплачивает пеню {penalty.ratePerDay}% от просроченной суммы за каждый день просрочки, но не более {penalty.maxPercent}% от просроченной суммы.</> : null}</p>
          <h2>3. Передача товара</h2>
          <p>3.1. Товар передаётся Покупателю по акту приёма-передачи на складе Продавца после {s.payment_method === "full" ? "полной оплаты" : "выполнения условий оплаты, указанных в разделе 2"}.</p>
          <p>3.2. Право собственности и риск случайной гибели переходят к Покупателю с момента подписания акта приёма-передачи.</p>
          <h2>4. Гарантия</h2>
          <p>4.1. Гарантийный срок составляет {policy.warrantyMonths} мес.{policy.warrantyHours ? ` или ${policy.warrantyHours} моточасов, в зависимости от того, что наступит раньше,` : ""} с даты передачи товара, при условии соблюдения правил эксплуатации и прохождения технического обслуживания у Продавца или уполномоченного сервиса.</p>
          <p>4.2. Гарантия не распространяется на расходные материалы, повреждения от неправильной эксплуатации, аварий и самостоятельного ремонта.</p>
          {c.contractNote ? <p>4.3. {c.contractNote}</p> : null}
          <h2>5. Прочие условия</h2>
          <p>5.1. Споры решаются путём переговоров, а при недостижении согласия - в судах Кыргызской Республики.</p>
          <p>5.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу, по одному для каждой стороны, и вступает в силу с момента подписания.</p>
          <h2>6. Реквизиты и подписи сторон</h2>
          {requisites}
        </article>
      ) : null}

      {kind === "invoice" ? (
        <article className="doc-page">
          <p className="doc-small">{seller}{c.address ? `, ${c.address}` : ""}<br />ИНН {c.inn || "____________"} · {c.bankName || "банк ____________"}{c.bik ? `, БИК ${c.bik}` : ""} · р/с {cur === "USD" ? c.accountUsd || c.account || "____________" : c.account || "____________"}</p>
          <h1>СЧЁТ НА ОПЛАТУ № {s.number}</h1>
          <div className="doc-meta"><span>Покупатель: {customer?.name ?? s.customer}, тел. {customer?.phone ?? s.phone}</span><span>{day(new Date().toISOString())}</span></div>
          {itemsTable}
          <p>Всего к оплате: <b>{fmt(s.total_minor)} {sign}</b> ({amountInWords(s.total_minor, cur)}).</p>
          {s.paid_minor > 0 ? <p>Уже оплачено: {fmt(s.paid_minor)} {sign}. Остаток к оплате: <b>{fmt(Math.max(0, s.total_minor - s.paid_minor))} {sign}</b> ({amountInWords(Math.max(0, s.total_minor - s.paid_minor), cur)}).</p> : null}
          <p className="doc-small">Счёт действителен до {day(s.reserve_until)}. Машина зарезервирована за покупателем до этой даты.</p>
          <div className="doc-sign"><div>Директор <span className="doc-line" /> {c.director}</div><div>Бухгалтер <span className="doc-line" /></div></div>
        </article>
      ) : null}

      {kind === "act" ? (
        <article className="doc-page">
          <h1>АКТ ПРИЁМА-ПЕРЕДАЧИ</h1>
          <p style={{ textAlign: "center" }}>к договору купли-продажи № {s.number} от {day(s.sold_at)}</p>
          <div className="doc-meta"><span>г. Бишкек</span><span>{day(s.delivered_at)}</span></div>
          <p>{seller} (Продавец) передал, а {customer?.name ?? s.customer} (Покупатель) принял следующий товар:</p>
          {itemsTable}
          {unitRows.length ? (
            <table className="doc-table"><thead><tr><th>VIN</th><th>№ двигателя</th><th>Год</th><th>Паспорт ТС</th><th>Сертификат</th></tr></thead>
              <tbody>{unitRows.map((u) => u && <tr key={u.id}><td>{u.vin}</td><td>{u.engine_number}</td><td>{u.year ?? ""}</td><td>{u.passport_number}</td><td>{u.certificate_number}</td></tr>)}</tbody></table>
          ) : null}
          <p>Вместе с товаром переданы: руководство по эксплуатации, сервисная книжка, комплект ключей, инструмент <Blank w={200} />.</p>
          <p>Покупатель осмотрел товар, проверил комплектность и работоспособность. Претензий к внешнему виду, комплектности и состоянию товара не имеет.</p>
          <p>Гарантийный срок: {policy.warrantyMonths} мес.{policy.warrantyHours ? ` или ${policy.warrantyHours} моточасов` : ""} с даты подписания настоящего акта.</p>
          <div className="doc-sign">
            <div><b>Передал (Продавец)</b><br />{seller}<br /><br /><span className="doc-line" /> {c.director}<br /><span className="doc-small">М.П.</span></div>
            <div><b>Принял (Покупатель)</b><br />{customer?.name ?? s.customer}<br /><br /><span className="doc-line" /> подпись</div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
