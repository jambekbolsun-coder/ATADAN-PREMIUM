"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ViewportVideoProps = {
  src: string;
  poster: string;
  label: string;
  className?: string;
  priority?: boolean;
};

export function ViewportVideo({ src, poster, label, className = "", priority = false }: ViewportVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (motionPreference.matches || document.hidden || !visibleRef.current) {
        video.pause();
        return;
      }
      void video.play().catch(() => undefined);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.12;
      syncPlayback();
    }, { rootMargin: "12% 0px 12%", threshold: [0, 0.12, 0.55] });

    observer.observe(video);
    document.addEventListener("visibilitychange", syncPlayback);
    motionPreference.addEventListener("change", syncPlayback);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      motionPreference.removeEventListener("change", syncPlayback);
      video.pause();
    };
  }, [src]);

  if (failed) {
    return <span className={`viewport-video-fallback ${className}`} role="img" aria-label={label}><Image src={poster} alt="" fill sizes="100vw" priority={priority} /></span>;
  }

  return (
    <video
      ref={videoRef}
      className={`viewport-video ${className}`}
      src={src}
      poster={poster}
      muted
      loop
      autoPlay
      playsInline
      preload={priority ? "auto" : "metadata"}
      disablePictureInPicture
      controlsList="nodownload nofullscreen noremoteplayback"
      aria-label={label}
      onError={() => setFailed(true)}
    />
  );
}
