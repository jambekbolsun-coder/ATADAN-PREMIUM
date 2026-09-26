import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { applyInventoryAvailability } from "../app/lib/inventory-availability.ts";
import { localizedPath } from "../app/lib/i18n-routing.ts";
import { localizeTechnicalValue } from "../app/lib/tractor-localization.ts";

test("only active warehouse VIN counts can mark a tractor in stock",()=>{
  const base={id:1,slug:"cf-test",model:"CF-TEST",hp:50,category:"Универсальные",farmArea:"до 30 га",price:null,inStock:true,image:"/test.png",description:"test",comfort:"test",specs:{}};
  assert.deepEqual(applyInventoryAvailability([base],[]).map(item=>[item.inStock,item.availableUnits]),[[false,0]]);
  assert.deepEqual(applyInventoryAvailability([base],[{tractor_slug:"cf-test",available_units:2}]).map(item=>[item.inStock,item.availableUnits]),[[true,2]]);
});

test("technical localisation translates descriptions but preserves codes",()=>{
  const value="CF3C50Z-T403 · In-line, water-cooled, four-stroke, direct injection · Dry type";
  assert.match(localizeTechnicalValue(value,"ru"),/рядный.*жидкостным.*четырёхтактный.*непосредственный впрыск.*сухого типа/);
  assert.match(localizeTechnicalValue(value,"ky"),/катарлуу.*суу менен.*төрт тактылуу.*түз бүркүү.*кургак түрү/);
  assert.match(localizeTechnicalValue(value,"en"),/In-line.*water-cooled/);
  for(const locale of ["ru","ky","en"])assert.match(localizeTechnicalValue(value,locale),/CF3C50Z-T403/);
});

test("public locale URLs are stable and admin/API URLs stay unmodified",()=>{
  assert.equal(localizedPath("/catalog/cf-test#leasing","ky"),"/catalog/cf-test?lang=ky#leasing");
  assert.equal(localizedPath("/catalog?search=CF","en"),"/catalog?search=CF&lang=en");
  assert.equal(localizedPath("/catalog?lang=en","ru"),"/catalog");
  assert.equal(localizedPath("/admin","ky"),"/admin");
  assert.equal(localizedPath("/api/catalog","en"),"/api/catalog");
});

test("public catalogue contains no parts surface or demo publisher",async()=>{
  const [catalog,page]=await Promise.all([
    readFile(new URL("../app/components/CatalogExplorer.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/catalog/page.tsx",import.meta.url),"utf8"),
  ]);
  assert.doesNotMatch(catalog,/PartCard|parts-public-grid|catalog-kind-tabs|Запчасти/);
  assert.doesNotMatch(page,/getPublishedRecords\("parts"\)/);
  await assert.rejects(readFile(new URL("../scripts/publish-sample-parts.mjs",import.meta.url),"utf8"));
});

test("SEO routes remain public while PWA installation is restricted to the admin owner",async()=>{
  const [robots,sitemap,adminManifest,adminLayout]=await Promise.all([
    readFile(new URL("../app/robots.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/sitemap.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/admin/manifest.webmanifest/route.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/admin/layout.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(robots,/disallow:\["\/admin","\/admin\/","\/api","\/api\/"\]/);
  assert.match(sitemap,/getCatalog\(\).*getNewsPosts\(\).*service_pages/s);
  await assert.rejects(readFile(new URL("../app/manifest.ts",import.meta.url),"utf8"));
  await assert.rejects(readFile(new URL("../public/sw.js",import.meta.url),"utf8"));
  assert.match(adminManifest,/start_url:"\/admin\/"/);
  assert.match(adminManifest,/requireActor\(request\)/);
  assert.match(adminManifest,/actor\.role!=="owner"/);
  assert.match(adminManifest,/private, no-store/);
  assert.match(adminLayout,/index:false,follow:false/);
});
