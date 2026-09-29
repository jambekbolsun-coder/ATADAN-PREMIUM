import { headers } from "next/headers";
import { localeFrom } from "./i18n-routing";

export async function getRequestLocale(){
  return localeFrom((await headers()).get("x-atadan-locale"));
}
