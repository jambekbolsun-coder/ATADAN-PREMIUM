# ATADAN Changfa — SEO audit
Inspection date: 2026-09-29
Site: https://atadan-changfa.vercel.app/

## What I found

### Strong foundation
- The site has a clear crawlable hierarchy: home → catalog → individual tractor pages.
- The live catalog exposes 41 tractor models, each with its own URL.
- Individual model pages contain an H1, horsepower, farm area, drivetrain, price guidance, specifications, leasing information, images, and links to related models.
- The site also has useful commercial pages: service, finance/leasing, about, contacts.
- There is a content section with 12 useful articles around tractor selection, horsepower, service, attachments, winter operation, leasing, and ownership.
- Internal links between articles and tractor models are already present, which is useful for discovery and topic relevance.

## Main SEO issues / opportunities

### 1. Discovery and indexing
The package includes a sitemap with 60 URLs:
- 7 core pages
- 41 tractor model pages
- 12 useful article pages

The robots.txt allows public crawling, blocks /admin from routine crawling, and points crawlers to sitemap.xml.

### 2. Repeated model copy
Many tractor pages use the same introductory pattern:
"[MODEL]: полноприводный трактор Changfa мощностью [HP] л.с. для стабильной работы..."
and repeat the same comfort/benefit blocks.

Technical specifications help make the pages different, but important model pages should also get genuinely unique text:
- what jobs this exact model is best for;
- what farm size it fits;
- likely implements;
- how it differs from the nearest Changfa model;
- who should choose it;
- model-specific engine/transmission/cabin advantages where verified.

### 3. Titles can target stronger commercial intent
Current model-title pattern is clean, e.g.:
"Changfa CFB504-X: 50 л.с. | ATADAN"

A stronger search-oriented template to test:
"Changfa CFB504-X 50 л.с. — цена в Кыргызстане | ATADAN"

Do this in the application code, not in sitemap.xml.

### 4. Do NOT add meta keywords
Google Search does not use <meta name="keywords"> for indexing or ranking.
Use search phrases naturally in:
- <title>
- H1
- short intro
- model comparison sections
- image alt text
- internal-link anchor text
- meta description

### 5. Priority keyword groups
Commercial:
- трактор Changfa Кыргызстан
- купить трактор Changfa
- трактор Changfa Бишкек
- тракторы Changfa цена
- трактор в лизинг Кыргызстан
- сельхозтехника Changfa Кыргызстан
- трактор 50 л.с. Кыргызстан
- трактор 70 л.с. Кыргызстан
- трактор 90 л.с. Кыргызстан
- трактор 100 л.с. Кыргызстан
- трактор 120 л.с. Кыргызстан
- трактор 140 л.с. Кыргызстан
- трактор 160 л.с. Кыргызстан
- трактор 180 л.с. Кыргызстан
- трактор 200 л.с. Кыргызстан
- трактор 220 л.с. Кыргызстан
- трактор 240 л.с. Кыргызстан

Informational:
- какой трактор выбрать по гектарам
- какая мощность трактора нужна для пахоты
- трактор 90 или 120 л.с.
- навесное оборудование для трактора
- обслуживание трактора Changfa
- запчасти Changfa Кыргызстан
- лизинг трактора Кыргызстан

Brand/model:
- ATADAN Changfa
- Changfa CFB504-X
- Changfa CFE904-H
- Changfa CFE1004
- Changfa CFG1204
- Changfa CFG1404
- Changfa CFG1600
- Changfa CFH1804
- Changfa CFJ2004
- Changfa CFK2404
(and exact names of all models in the catalog)

### 6. Structured data should be verified in the application code
The live text crawl does not reliably expose every element inside <head>, so do not assume structured data is absent only from this audit.

Verify it with Google's Rich Results Test / URL Inspection. If missing, add and validate:
- Product structured data on each model page
- LocalBusiness / Organization on company/contact pages
- Article structured data on news articles
- BreadcrumbList on model and article pages

This belongs in the application itself; putting JSON-LD in a random file under public would not make it apply to pages.

### 7. Language SEO
The interface exposes Russian, Kyrgyz and English. If translations are important for Google, the best long-term structure is separate crawlable URLs for each language plus hreflang, for example:
- /ru/catalog/...
- /ky/catalog/...
- /en/catalog/...
Do not create these URLs unless the application actually serves them.

### 8. Custom domain
The Vercel subdomain can be indexed. A branded .kg domain is still preferable for business identity, trust, links, sharing, and long-term ownership. Moving domains should be planned carefully with redirects and Search Console updates.

## Files generated

public/
├── robots.txt
└── sitemap.xml

The sitemap intentionally does NOT contain:
- /admin
- privacy/terms/cookie pages
- filters/search states
- fake keyword pages
- <priority> or <changefreq>
- fabricated <lastmod> dates

This keeps the sitemap focused on canonical pages that should attract search traffic.

## After upload
1. Put/replace the `public` folder in the project.
2. Deploy to Vercel.
3. Open:
   - https://atadan-changfa.vercel.app/robots.txt
   - https://atadan-changfa.vercel.app/sitemap.xml
4. In Google Search Console → Sitemaps, submit:
   sitemap.xml
5. Use URL Inspection for the home page, /catalog, and a few important model pages.
6. Request indexing for those priority URLs.
7. Monitor Page indexing and Performance reports over the following days/weeks.
