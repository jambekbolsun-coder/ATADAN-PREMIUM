"use client";

import { bannerMediaKey } from "../lib/site-settings-types";
import { useSiteSettings } from "./SiteSettings";

type Props = {
  image: string;
  alt?: string;
  mobileFallback?: string;
  tabletFallback?: string;
  priority?: boolean;
  className?: string;
};

export function ResponsiveHeroMedia({ image, alt = "", mobileFallback, tabletFallback, priority = false, className = "" }: Props) {
  const { media } = useSiteSettings();
  const desktop = media[image] || image;
  const tablet = media[bannerMediaKey(image, "tablet")] || tabletFallback || desktop;
  const mobile = media[bannerMediaKey(image, "mobile")] || mobileFallback || tablet;
  return <picture className={`responsive-hero-media ${className}`.trim()}>
    <source media="(max-width: 620px)" srcSet={mobile} />
    <source media="(max-width: 1060px)" srcSet={tablet} />
    <img src={desktop} alt={alt} width="1920" height="1080" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} />
  </picture>;
}
