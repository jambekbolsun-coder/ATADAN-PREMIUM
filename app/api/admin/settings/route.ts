import { getRawDb } from "../../../../db";
import { requireActor } from "../../../lib/admin-auth";
import { getSiteSettings } from "../../../lib/site-settings";
import { defaultSettings } from "../../../lib/site-settings-types";
import { copy } from "../../../data/site-copy";
import { auditStatement } from "../../../lib/crm";
import { cleanText,fail,HttpError,jsonBody,safeMedia,sameOrigin } from "../../../lib/security";
import type { Locale } from "../../../types";
export async function GET(request:Request){try{await requireActor(request,true);return Response.json(await getSiteSettings(),{headers:{"Cache-Control":"no-store"}});}catch(e){return fail(e);}}
export async function POST(request:Request){
  try{
    sameOrigin(request);const actor=await requireActor(request,true),body=await jsonBody(request,300000);
    const value=body.settings as typeof defaultSettings;if(!value||typeof value!=="object")throw new HttpError(400,"Некорректные настройки");
    const settings={...defaultSettings,phone:cleanText(value.phone,40,true),address:cleanText(value.address,300,true),instagram:cleanText(value.instagram,300,true),annualRate:value.annualRate,downPercent:value.downPercent,fee:value.fee,method:value.method,translations:{} as typeof defaultSettings.translations,media:{} as Record<string,string>};
    if(!/^\+?[\d\s()-]{8,40}$/.test(settings.phone)||!/^https:\/\/(www\.)?instagram\.com\//.test(settings.instagram))throw new HttpError(400,"Проверьте телефон и ссылку Instagram");
    if((settings.annualRate!==null&&(!Number.isFinite(settings.annualRate)||settings.annualRate<0||settings.annualRate>100))||!Number.isFinite(settings.downPercent)||settings.downPercent<0||settings.downPercent>100||!Number.isFinite(settings.fee)||settings.fee<0||settings.fee>100000000||!["annuity","differentiated"].includes(settings.method))throw new HttpError(400,"Проверьте условия лизинга");
    for(const locale of ["ru","ky","en"] as Locale[]){
      settings.translations[locale]={};for(const [key,text]of Object.entries(value.translations?.[locale]??{})){if(!(key in copy[locale]))throw new HttpError(400,"Неизвестное поле перевода");settings.translations[locale]![key]=cleanText(text,8000);}
    }
    for(const [key,url]of Object.entries(value.media??{})){if(!key.startsWith("/images/")||key.length>300)throw new HttpError(400,"Неизвестное изображение");settings.media[key]=safeMedia(url);}
    const version=Number(body.version),db=getRawDb(),json=JSON.stringify(settings);
    const result=version===0
      ?await db.prepare("INSERT INTO site_settings(key,value,version) VALUES('public',?,1) ON CONFLICT(key) DO NOTHING").bind(json).run()
      :await db.prepare("UPDATE site_settings SET value=?,version=version+1 WHERE key='public' AND version=?").bind(json,version).run();
    if(!result.meta.changes)throw new HttpError(409,"Настройки изменились. Обновите страницу перед сохранением.");
    await auditStatement(actor,"save_settings","public").run();
    return Response.json({ok:true});
  }catch(e){return fail(e);}
}
