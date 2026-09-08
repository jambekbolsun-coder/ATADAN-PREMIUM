import type { Locale } from "../types";
export type SiteSettings = {
  phone: string; address: string; instagram: string;
  annualRate: number | null; downPercent: number; fee: number; method: "annuity" | "differentiated";
  translations: Partial<Record<Locale,Record<string,string>>>;
  media: Record<string,string>;
};
export const defaultSettings: SiteSettings = {phone:"+996 706 131 404",address:"Бишкек, ул. Шевченко, 114",instagram:"https://www.instagram.com/atadan_kg",annualRate:null,downPercent:30,fee:0,method:"annuity",translations:{},media:{}};
