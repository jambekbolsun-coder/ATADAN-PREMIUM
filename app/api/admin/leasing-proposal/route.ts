import { getRawDb } from "../../../../db";
import { canUseSection, requireActor } from "../../../lib/admin-auth";
import { cleanText, fail, HttpError } from "../../../lib/security";

type LeaseRecord={id:string;title:string;data_json:string};
type LeaseVariant={name?:unknown;downPayment?:unknown;termMonths?:unknown;markupPercent?:unknown;monthlyPayment?:unknown;total?:unknown};

function escapeHtml(value:unknown){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]||char))}
function money(value:unknown){return `${new Intl.NumberFormat("ru-RU").format(Number(value)||0)} сом`}
function variantsOf(value:unknown){try{const parsed=typeof value==="string"?JSON.parse(value):value;return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item==="object").slice(0,8) as LeaseVariant[]:[]}catch{return []}}

export async function GET(request:Request){
  try{
    const actor=await requireActor(request);if(!canUseSection(actor,"leasing-applications"))throw new HttpError(403,"Нет доступа к заявкам на лизинг");
    const id=cleanText(new URL(request.url).searchParams.get("id"),100,true),record=await getRawDb().prepare("SELECT id,title,data_json FROM admin_records WHERE id=? AND kind='leasing_applications' AND archived=0").bind(id).first<LeaseRecord>();
    if(!record)throw new HttpError(404,"Заявка не найдена");
    let data:Record<string,unknown>={};try{data=JSON.parse(record.data_json) as Record<string,unknown>}catch{data={}}
    const variants=variantsOf(data.calculationVariants),rows=variants.length?variants.map((item,index)=>`<tr><td>${escapeHtml(item.name||`Вариант ${index+1}`)}</td><td>${money(item.downPayment)}</td><td>${escapeHtml(item.termMonths)} мес.</td><td>${escapeHtml(item.markupPercent)}%</td><td>${money(item.monthlyPayment)}</td><td>${money(item.total)}</td></tr>`).join(""):`<tr><td>Основной</td><td>${money(data.downPayment)}</td><td>${escapeHtml(data.termMonths)} мес.</td><td>${escapeHtml(data.markupPercent)}%</td><td>${money(data.monthlyPayment)}</td><td>${money(data.total)}</td></tr>`;
    const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>КП ATADAN</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#173326}h1{color:#167447}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{border:1px solid #ccd8d1;padding:10px;text-align:left}.note{background:#eef7f2;padding:16px;border-radius:12px}@media print{body{margin:0}.note{break-inside:avoid}}</style></head><body><h1>ATADAN · Коммерческое предложение</h1><p><b>Клиент:</b> ${escapeHtml(record.title)} · ${escapeHtml(data.phone)}</p><p><b>Техника:</b> ${escapeHtml(data.tractorModel)} · цена ${money(data.price)}</p><p><b>Опции:</b> ${escapeHtml(data.options||"не выбраны")}</p><table><thead><tr><th>Вариант</th><th>Первый взнос</th><th>Срок</th><th>Удорожание</th><th>В месяц</th><th>Итого</th></tr></thead><tbody>${rows}</tbody></table><p class="note">Расчёт является предварительным. Финальные условия, одобрение и договор подтверждаются менеджером.</p><p>Ответственный: ${escapeHtml(data.responsible||"не назначен")}</p></body></html>`;
    return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":`attachment; filename="ATADAN-KP-${record.id.slice(0,8)}.html"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){return fail(error)}
}
