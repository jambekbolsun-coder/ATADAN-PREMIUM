"use client";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  PackageSearch,
} from "lucide-react";
import { useState } from "react";
import type { PublicRecord } from "../lib/public-records";
import { useSiteSettings } from "./SiteSettings";

export function PartCard({ part }: { part: PublicRecord }) {
  const [active, setActive] = useState(0);
  const settings = useSiteSettings();
  const gallery = [
    ...new Set(
      [part.data.image, ...(part.data.gallery || "").split("\n")]
        .map((image) => image?.trim())
        .filter(Boolean),
    ),
  ];
  const current = Math.min(active, Math.max(0, gallery.length - 1));
  const whatsapp = `https://wa.me/${settings.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Здравствуйте! Интересует ${part.title}. Код позиции: ${part.data.sku || part.id}. Помогите проверить совместимость с моим трактором.`)}`;
  return (
    <article className="part-card">
      <div className="part-media">
        {gallery.length ? (
          <Image
            src={gallery[current]}
            alt={`${part.title}, фото ${current + 1}`}
            width={560}
            height={560}
            sizes="(max-width: 760px) 90vw, 30vw"
          />
        ) : (
          <PackageSearch />
        )}
        {gallery.length > 1 ? (
          <div className="part-gallery-controls">
            <button
              type="button"
              aria-label={`Предыдущее фото: ${part.title}`}
              onClick={() =>
                setActive((current + gallery.length - 1) % gallery.length)
              }
            >
              <ChevronLeft />
            </button>
            <span aria-live="polite">
              {current + 1} / {gallery.length}
            </span>
            <button
              type="button"
              aria-label={`Следующее фото: ${part.title}`}
              onClick={() => setActive((current + 1) % gallery.length)}
            >
              <ChevronRight />
            </button>
          </div>
        ) : null}
      </div>
      <div className="part-information">
        <small>{part.category || "Запасная часть"}</small>
        <h3>{part.title}</h3>
        <p>{part.subtitle}</p>
        <dl>
          <div>
            <dt>Код позиции</dt>
            <dd>{part.data.sku || "Уточнить"}</dd>
          </div>
          <div>
            <dt>Подбор по модели</dt>
            <dd>{part.data.compatibleModels || "Уточните у менеджера"}</dd>
          </div>
        </dl>
        {part.data.imageNote ? (
          <p className="part-image-note">{part.data.imageNote}</p>
        ) : null}
        <strong>
          {Number(part.data.price) > 0
            ? `${new Intl.NumberFormat("ru-RU").format(Number(part.data.price))} сом`
            : "Цена по запросу"}
        </strong>
        <a
          className="primary-btn"
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={18} />
          Подобрать запчасть
        </a>
      </div>
    </article>
  );
}
