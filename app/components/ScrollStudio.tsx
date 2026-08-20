"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export function ScrollStudio({ image, model }: { image: string; model: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (!sectionRef.current || !imageRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const total = sectionRef.current.offsetHeight - innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(total, 1)));
      imageRef.current.style.transform = `perspective(1100px) rotateY(${(progress - .5) * 24}deg) rotateX(${(progress - .5) * -5}deg) translate3d(${(progress - .5) * 70}px, 0, 0) scale(${.92 + progress * .12})`;
      if (videoRef.current?.duration) {
        const nextTime = Math.min(videoRef.current.duration - .05, progress * videoRef.current.duration);
        if (Math.abs(videoRef.current.currentTime - nextTime) > .04) videoRef.current.currentTime = nextTime;
      }
      if (progressRef.current) progressRef.current.style.width = `${progress * 100}%`;
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);
  return (
    <section className="scroll-studio" ref={sectionRef}>
      <div className="studio-sticky">
        <video ref={videoRef} className="studio-video" muted playsInline preload="metadata" aria-hidden="true">
          <source src="/media/changfa-j5-pro.mp4" type="video/mp4" />
        </video>
        <div className="studio-heading"><span>Интерактивный обзор</span><h2>Рассмотрите {model}<br />в движении</h2></div>
        <div className="studio-image" ref={imageRef}><div className="studio-glow" /><Image src={image} alt={`Интерактивный обзор Changfa ${model}`} width={1000} height={740} /></div>
        <div className="scroll-hint"><span>Листайте страницу</span><div><i ref={progressRef} /></div></div>
        <span className="studio-index">360°</span>
      </div>
    </section>
  );
}
