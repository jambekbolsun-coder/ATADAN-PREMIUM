/** Обложки глав инструкций: нарисованные сцены в цветах ATADAN. */
import type { ReactNode } from "react";
import type { ChapterKey } from "../../../_lib/guides";

const SKY: Record<ChapterKey, [string, string]> = {
  start: ["#f7c978", "#fde9c0"], sales: ["#9fd8c2", "#e3f4e8"], stock: ["#b9d6e8", "#e8f2f6"], logistics: ["#8fc3e0", "#dcedf5"],
  money: ["#f3dfa4", "#fbf3da"], docs: ["#d9cbe9", "#f1ebf7"], team: ["#f4c9a8", "#fcebdd"], marketing: ["#f6b98d", "#fde4c8"], control: ["#8fa9c9", "#f0d9b5"],
};

function Land({ id }: { id: ChapterKey }) {
  const [a, b] = SKY[id];
  return (
    <>
      <defs><linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="640" height="240" fill={`url(#sky-${id})`} />
      <path d="M0 150 90 70l60 48 80-78 96 92 70-54 110 76 134-22v108H0z" fill="#7f9a92" />
      <path d="m230 40-30 29 22 8 14-12 16 11 13-10zM90 70 66 91l18 5 12-9 13 8z" fill="#fff" />
      <path d="M0 170c120-28 260-30 360-14s190 12 280-10v94H0z" fill="#3f8f5a" />
      <path d="M0 205c150-30 330-26 640-8v43H0z" fill="#146b3a" />
    </>
  );
}

function Tractor({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="58" y="-2" width="62" height="42" rx="6" fill="#d9e8ef" stroke="#1b2a24" strokeWidth="4" />
      <path d="M0 40h122v34H12C4 74 0 66 0 58z" fill="#c8362b" />
      <rect x="20" y="20" width="8" height="22" fill="#1b2a24" />
      <circle cx="106" cy="82" r="32" fill="#1b2a24" /><circle cx="106" cy="82" r="14" fill="#e5b13f" />
      <circle cx="24" cy="88" r="19" fill="#1b2a24" /><circle cx="24" cy="88" r="8" fill="#e5b13f" />
    </g>
  );
}

const Person = ({ x, y, c = "#146b3a" }: { x: number; y: number; c?: string }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle cx="0" cy="0" r="11" fill="#c98d62" />
    <path d="M-16 14c0-7 7-11 16-11s16 4 16 11v38h-32z" fill={c} /><rect x="-13" y="50" width="11" height="34" fill="#1b2a24" /><rect x="2" y="50" width="11" height="34" fill="#1b2a24" />
  </g>
);

const SCENES: Record<ChapterKey, ReactNode> = {
  start: <><circle cx="520" cy="58" r="30" fill="#fff4cf" /><Tractor x={230} y={96} s={1.05} /></>,
  sales: <><Tractor x={350} y={100} /><Person x={200} y={120} /><Person x={275} y={120} c="#c8362b" /><path d="M214 150h46" stroke="#c98d62" strokeWidth="8" strokeLinecap="round" /></>,
  stock: <><path d="M40 190V92l130-44 130 44v98z" fill="#eef1ec" stroke="#1b2a24" strokeWidth="4" /><rect x="118" y="124" width="104" height="66" fill="#5c6f66" /><Tractor x={320} y={112} s={0.8} /><Tractor x={460} y={112} s={0.8} /></>,
  logistics: <><rect x="130" y="166" width="330" height="16" fill="#1b2a24" /><rect x="460" y="112" width="86" height="70" rx="8" fill="#146b3a" /><rect x="498" y="124" width="36" height="28" fill="#d9e8ef" /><circle cx="186" cy="192" r="19" fill="#1b2a24" /><circle cx="500" cy="192" r="19" fill="#1b2a24" /><Tractor x={200} y={64} s={0.9} /></>,
  money: <><rect x="130" y="120" width="380" height="100" rx="10" fill="#8a5a33" /><rect x="170" y="74" width="150" height="72" rx="6" fill="#3f9b63" stroke="#146b3a" strokeWidth="4" /><circle cx="245" cy="110" r="20" fill="#e1f1e6" /><circle cx="420" cy="118" r="38" fill="#e5b13f" stroke="#a97a18" strokeWidth="5" /><circle cx="470" cy="136" r="26" fill="#f2c95c" stroke="#a97a18" strokeWidth="4" /></>,
  docs: <><rect x="140" y="62" width="360" height="160" rx="10" fill="#e5b13f" /><path d="M140 88h130l22-26h208v160H140z" fill="#f2c95c" /><rect x="190" y="108" width="260" height="92" rx="6" fill="#fff" /><path d="M214 130h212M214 152h212M214 174h130" stroke="#9bb0a4" strokeWidth="7" strokeLinecap="round" /></>,
  team: <><Tractor x={410} y={100} s={0.9} /><Person x={140} y={122} /><Person x={215} y={112} c="#c8362b" /><Person x={290} y={122} c="#2f6fa8" /><Person x={362} y={124} c="#e5b13f" /></>,
  marketing: <><Tractor x={150} y={100} /><rect x="400" y="46" width="110" height="180" rx="16" fill="#13241b" /><rect x="410" y="60" width="90" height="150" rx="6" fill="#e8f2f6" /><Tractor x={424} y={110} s={0.42} /><rect x="420" y="168" width="70" height="26" rx="8" fill="#146b3a" /></>,
  control: <><Tractor x={110} y={150} s={0.42} /><Tractor x={480} y={156} s={0.42} /><Tractor x={310} y={168} s={0.36} /><Person x={320} y={120} c="#1b2a24" /></>,
};

export function GuideCover({ id }: { id: ChapterKey }) {
  return <svg className="ax-guide-cover" viewBox="0 0 640 240" role="img" aria-hidden preserveAspectRatio="xMidYMid slice"><Land id={id} />{SCENES[id]}</svg>;
}
