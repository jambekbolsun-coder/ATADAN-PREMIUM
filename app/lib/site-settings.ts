import { ensureDb,getRawDb } from "../../db";
import { defaultSettings, type SiteSettings } from "./site-settings-types";
export async function getSiteSettings() {
  try {await ensureDb();const row=await getRawDb().prepare("SELECT value,version FROM site_settings WHERE key='public'").first<{value:string;version:number}>();
    return {settings:row?{...defaultSettings,...JSON.parse(row.value)} as SiteSettings:defaultSettings,version:row?.version??0};
  }catch{return {settings:defaultSettings,version:0};}
}
