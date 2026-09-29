import { NextRequest, NextResponse } from "next/server";
import { localeFrom } from "./app/lib/i18n-routing";

export function proxy(request:NextRequest){
  const locale=localeFrom(request.nextUrl.searchParams.get("lang")??request.cookies.get("atadan-locale")?.value);
  const requestHeaders=new Headers(request.headers);
  requestHeaders.set("x-atadan-locale",locale);
  return NextResponse.next({request:{headers:requestHeaders}});
}

export const config={
  matcher:["/((?!api|admin|_next/static|_next/image|icons|images|videos|uploads|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};
