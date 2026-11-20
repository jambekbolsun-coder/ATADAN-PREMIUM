import { Link } from "../components/SiteLink";
import { ArrowUpRight, Cog, Phone } from "lucide-react";
import { ServiceBlocks } from "../components/ServiceBlocks";
import { Trans } from "../components/I18n";
import { PageHero } from "../components/PageHero";
import { LeadModalButton } from "../components/LeadModalButton";
import { getPublishedRecords } from "../lib/public-records";
import Image from "next/image";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";
import { copy } from "../data/site-copy";

export async function generateMetadata(){return pageMetadata("service","/service",await getRequestLocale())}
export default async function ServicePage() {
  const [materials, locale] = await Promise.all([getPublishedRecords("service_pages"), getRequestLocale()]);
  const t = (key: string) => copy[locale]?.[key] ?? copy.ru[key] ?? key;
  return (
    <main>
      <PageHero
        image="/images/banners/service.webp"
        kickerId="service.kicker"
        titleId="service.title"
        subtitleId="service.subtitle"
      />
      <ServiceBlocks />
      {materials.length ? (
        <section className="section-shell public-service-materials">
          <header>
            <span>{t("ui.service.materialsLabel")}</span>
            <h2>{t("ui.service.materialsTitle")}</h2>
          </header>
          <div>
            {materials.map((item) => (
              <Link
                href={`/service/${item.data.slug || item.id}`}
                key={item.id}
              >
                {item.data.cover ? (
                  <span className="service-material-image">
                    <Image
                      src={item.data.cover}
                      alt={item.data.imageAlt || item.title}
                      fill
                      sizes="(max-width: 720px) 100vw, 33vw"
                    />
                  </span>
                ) : null}
                <span>{item.category || t("nav.service")}</span>
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
                <b>
                  {t("product.details")} <ArrowUpRight />
                </b>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <section className="service-cta">
        <div>
          <Cog />
          <span>
            <Trans id="service.need" />
          </span>
          <h2>
            <Trans id="service.needTitle" />
          </h2>
        </div>
        <div className="service-actions">
          <LeadModalButton />
          <div>
            <a className="primary-btn" href="tel:+996706131404">
              <Phone size={19} aria-hidden="true" />
              <Trans id="service.call" />
            </a>
            <Link className="outline-btn light" href="/contacts">
              <Trans id="nav.contacts" /> <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
