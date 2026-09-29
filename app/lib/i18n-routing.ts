import type { Locale } from "../types";

export const locales:Locale[]=["ru","ky","en"];

export function localeFrom(value:string|null|undefined):Locale{
  return value==="ky"||value==="en"?value:"ru";
}

export function localizedPath(path:string,locale:Locale){
  if(!path.startsWith("/")||path.startsWith("//")||path.startsWith("/admin")||path.startsWith("/api"))return path;
  const hashIndex=path.indexOf("#");
  const hash=hashIndex>=0?path.slice(hashIndex):"";
  const beforeHash=hashIndex>=0?path.slice(0,hashIndex):path;
  const queryIndex=beforeHash.indexOf("?");
  const pathname=queryIndex>=0?beforeHash.slice(0,queryIndex):beforeHash;
  const params=new URLSearchParams(queryIndex>=0?beforeHash.slice(queryIndex+1):"");
  if(locale==="ru")params.delete("lang");else params.set("lang",locale);
  const query=params.toString();
  return `${pathname}${query?`?${query}`:""}${hash}`;
}
