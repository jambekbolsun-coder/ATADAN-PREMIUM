export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="leading-none" aria-label="ATADAN CHANGFA">
      <div className={`text-[22px] font-black tracking-[-0.04em] ${inverse ? 'text-white' : 'text-[#101510]'}`}>ATADAN</div>
      <div className="mt-1 text-[9px] font-extrabold tracking-[0.42em] text-atadan-500">CHANGFA</div>
    </div>
  )
}
