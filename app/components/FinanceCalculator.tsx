"use client";
import Image from "next/image";
import { Calculator, PhoneCall, ChevronDown } from "lucide-react";
import { useId,useState } from "react";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";
import { calculateLease,salePrice } from "../lib/leasing";
import type { Tractor } from "../types";
const labels={
ru:{choose:"Выберите трактор",price:"Стоимость, сом",rate:"Годовая ставка, %",fee:"Разовая комиссия, сом",method:"График платежей",annuity:"Равные платежи",differentiated:"Убывающие платежи",total:"Общая сумма с взносом",interest:"Начисленные проценты",balance:"Сумма финансирования",schedule:"График платежей",month:"Месяц",principal:"Основной долг",payment:"Платёж",rest:"Остаток",unknown:"Ставка ещё не согласована. Введите ставку из предложения партнёра. Расчёт при 0% показывает только возврат основного долга.",noPrice:"Цена этой модели — по запросу. Укажите стоимость из предложения менеджера.",down:"Первый взнос",last:"Последний платёж"},
ky:{choose:"Трактор тандаңыз",price:"Баасы, сом",rate:"Жылдык чен, %",fee:"Бир жолку комиссия, сом",method:"Төлөм графиги",annuity:"Бирдей төлөмдөр",differentiated:"Азайган төлөмдөр",total:"Алгачкы төлөм менен жалпы сумма",interest:"Эсептелген пайыз",balance:"Каржылоо суммасы",schedule:"Төлөмдөрдүн графиги",month:"Ай",principal:"Негизги карыз",payment:"Төлөм",rest:"Калдык",unknown:"Чен азырынча макулдашыла элек. Өнөктөштүн сунушундагы ченди киргизиңиз. 0% негизги карызды гана көрсөтөт.",noPrice:"Баасы суроо-талап боюнча. Менеджердин сунушундагы бааны киргизиңиз.",down:"Алгачкы төлөм",last:"Акыркы төлөм"},
en:{choose:"Choose a tractor",price:"Price, KGS",rate:"Annual rate, %",fee:"One-time fee, KGS",method:"Payment schedule",annuity:"Equal payments",differentiated:"Declining payments",total:"Total including down payment",interest:"Total interest",balance:"Amount financed",schedule:"Payment schedule",month:"Month",principal:"Principal",payment:"Payment",rest:"Balance",unknown:"The rate is not confirmed. Enter the rate in your partner's offer. At 0%, the calculation includes principal only.",noPrice:"This model is priced on request. Enter the price quoted by your manager.",down:"Down payment",last:"Final payment"}
};
export function FinanceCalculator({tractors=[],tractor}:{tractors?:Tractor[];tractor?:Tractor}){
 const {t,locale}=useI18n(),settings=useSiteSettings(),l=labels[locale],id=useId();
 const [slug,setSlug]=useState(tractor?.slug??tractors[0]?.slug??"");
 const selected=tractor??tractors.find(p=>p.slug===slug);
 const [price,setPrice]=useState(String(salePrice(selected?.price??null,selected?.discountPercent??0)??""));
 const [down,setDown]=useState(settings.downPercent),[months,setMonths]=useState(36),[rate,setRate]=useState(settings.annualRate??0),[fee,setFee]=useState(settings.fee),[method,setMethod]=useState(settings.method);
 const [open,setOpen]=useState(false);
 let result:ReturnType<typeof calculateLease>|null=null,error="";
 try{if(price)result=calculateLease({price:Number(price),downPercent:down,months,annualRate:rate,fee,method});}catch(e){error=e instanceof Error?e.message:"";}
 const money=(minor:number)=>new Intl.NumberFormat(locale==="en"?"en-US":"ru-RU",{maximumFractionDigits:2,minimumFractionDigits:2}).format(minor/100);
 return <section className="lease-workspace" id={tractor?"leasing":undefined} aria-labelledby={id}>
 <header className="lease-heading"><span className="section-label"><Calculator size={18}/>{t("product.installment")}</span><h2 id={id}>{tractor?`Changfa ${tractor.model}`:t("finance.calcLabel")}</h2></header>
 <div className="lease-layout"><div className="lease-controls">
 {!tractor&&tractors.length?<label><span>{l.choose}</span><select value={slug} onChange={e=>{setSlug(e.target.value);const p=tractors.find(p=>p.slug===e.target.value);setPrice(String(salePrice(p?.price??null,p?.discountPercent??0)??""));}}>{tractors.map(p=><option value={p.slug} key={p.slug}>Changfa {p.model} · {p.hp} {t("common.hp")}</option>)}</select></label>:null}
 {selected?<div className="lease-selected"><Image src={selected.image} alt={selected.model} width={160} height={120}/><div><strong>Changfa {selected.model}</strong><span>{selected.hp} {t("common.hp")} · {selected.inStock?t("product.inStock"):t("product.onOrder")}</span></div></div>:null}
 {!selected?.price?<p className="lease-help">{l.noPrice}</p>:null}
 <div className="lease-input-grid"><label><span>{l.price}</span><input type="number" min="0.01" max="1000000000" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="—"/></label>
 <label><span>{l.rate}</span><input type="number" min="0" max="100" step="0.01" value={rate} onChange={e=>setRate(Number(e.target.value))}/></label>
 <label><span>{l.fee}</span><input type="number" min="0" step="0.01" value={fee} onChange={e=>setFee(Number(e.target.value))}/></label>
 <label><span>{l.method}</span><select value={method} onChange={e=>setMethod(e.target.value as typeof method)}><option value="annuity">{l.annuity}</option><option value="differentiated">{l.differentiated}</option></select></label></div>
 <label className="lease-range"><span>{l.down}<strong>{down}%</strong></span><input type="range" min="0" max="100" step="1" value={down} onChange={e=>setDown(Number(e.target.value))}/></label>
 <label className="lease-range"><span>{t("finance.term")}<strong>{months} {t("common.month")}</strong></span><input type="range" min="1" max="84" step="1" value={months} onChange={e=>setMonths(Number(e.target.value))}/><span className="lease-presets">{[12,24,36,60,84].map(n=><button type="button" className={months===n?"active":""} aria-pressed={months===n} onClick={()=>setMonths(n)} key={n}>{n}</button>)}</span></label>
 {settings.annualRate===null?<p className="lease-help">{l.unknown}</p>:null}{error?<p className="form-error" role="alert">{error}</p>:null}
 </div><aside className="lease-summary" aria-live="polite"><span>{t("finance.payment")}</span><strong>{result?money(result.monthly):"—"}<small>сом / {t("common.month")}</small></strong>
 <dl>{[[l.down,result?.down],[l.balance,result?.financed],[l.interest,result?.interest],[l.last,result?.schedule.at(-1)?.payment],[l.total,result?.total]].map(([name,value])=><div key={String(name)}><dt>{name}</dt><dd>{typeof value==="number"?money(value):"—"}</dd></div>)}</dl>
 <p>{t("finance.calcNote")}</p><a className="primary-btn" href={`tel:${settings.phone.replace(/[^+\d]/g,"")}`}><PhoneCall size={18}/>{t("finance.calcCta")}</a>
 </aside></div>
 {result?<div className="lease-schedule"><button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{l.schedule}<ChevronDown size={18}/></button>{open?<div className="table-scroll" role="region" aria-label={l.schedule}><table><thead><tr>{[l.month,l.principal,l.interest,l.payment,l.rest].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{result.schedule.map(row=><tr key={row.month}><td>{row.month}</td><td>{money(row.principal)}</td><td>{money(row.interest)}</td><td>{money(row.payment)}</td><td>{money(row.balance)}</td></tr>)}</tbody></table></div>:null}</div>:null}
 </section>;
}
