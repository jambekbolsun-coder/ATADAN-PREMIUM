import type { MetadataRoute } from "next";
import { getCatalog } from "./lib/catalog";
import { getNewsPosts } from "./lib/news";
import { getPublishedRecords } from "./lib/public-records";
import { locales, localizedPath } from "./lib/i18n-routing";
import { languageAlternates, SITE_URL } from "./lib/seo";

export const dynamic="force-dynamic";

const staticPages=[
  ["/",1,"daily"],
  ["/catalog",0.9,"daily"],
  ["/finance",0.8,"weekly"],
  ["/service",0.8,"weekly"],
  ["/news",0.8,"daily"],
  ["/about",0.6,"monthly"],
  ["/contacts",0.7,"monthly"],
  ["/privacy",0.3,"yearly"],
  ["/terms",0.3,"yearly"],
  ["/cookies",0.3,"yearly"],
] as const;

function absolute(path:string){return new URL(path,SITE_URL).toString()}

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const [tractors,posts,servicePages]=await Promise.all([getCatalog(),getNewsPosts(),getPublishedRecords("service_pages")]);
  const pages:Array<{path:string;priority:number;changeFrequency:MetadataRoute.Sitemap[number]["changeFrequency"];lastModified?:string}>=[
    ...staticPages.map(([path,priority,changeFrequency])=>({path,priority,changeFrequency})),
    ...tractors.map(item=>({path:`/catalog/${item.slug}`,priority:0.8,changeFrequency:"weekly" as const})),
    ...posts.filter(item=>item.status==="published").map(item=>({path:`/news/${item.slug}`,priority:0.7,changeFrequency:"monthly" as const,lastModified:item.publishedAt})),
    ...servicePages.map(item=>({path:`/service/${item.data.slug||item.id}`,priority:0.6,changeFrequency:"monthly" as const,lastModified:item.updated_at})),
  ];
  return pages.flatMap(page=>locales.map(locale=>({
    url:absolute(localizedPath(page.path,locale)),
    alternates:{languages:Object.fromEntries(Object.entries(languageAlternates(page.path)).map(([key,value])=>[key,absolute(value)]))},
    changeFrequency:page.changeFrequency,
    priority:page.priority,
    ...(page.lastModified?{lastModified:page.lastModified}:{}),
  })));
}
