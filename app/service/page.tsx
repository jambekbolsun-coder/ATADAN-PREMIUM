import { Link } from "../components/SiteLink";
import {
  ArrowUpRight,
  ClipboardCheck,
  Cog,
  Headphones,
  Phone,
  Wrench,
} from "lucide-react";
import { Trans } from "../components/I18n";
import { PageHero } from "../components/PageHero";
import { LeadModalButton } from "../components/LeadModalButton";
import { getPublishedRecords } from "../lib/public-records";
import Image from "next/image";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";

export async function generateMetadata(){return pageMetadata("service","/service",await getRequestLocale())}
export default async function ServicePage() {
  const materials = await getPublishedRecords("service_pages");
  return (
    <main>
      <PageHero
        image="/images/banners/service.webp"
        kickerId="service.kicker"
        titleId="service.title"
        subtitleId="service.subtitle"
      />
      <section className="section-shell service-grid">
        <article>
          <Wrench />
          <span>01</span>
          <h2>
            <Trans id="service.maintenance" />
          </h2>
          <p>
            <Trans id="service.maintenanceText" />
          </p>
        </article>
        <article>
          <ClipboardCheck />
          <span>02</span>
          <h2>
            <Trans id="service.diagnostics" />
          </h2>
          <p>
            <Trans id="service.diagnosticsText" />
          </p>
        </article>
        <article>
          <Headphones />
          <span>03</span>
          <h2>
            <Trans id="service.support" />
          </h2>
          <p>
            <Trans id="service.supportText" />
          </p>
        </article>
      </section>
      {materials.length ? (
        <section className="section-shell public-service-materials">
          <header>
            <span>Полезные материалы</span>
            <h2>Сервис Changfa подробно</h2>
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
                <span>{item.category || "Сервис"}</span>
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
                <b>
                  Подробнее <ArrowUpRight />
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
