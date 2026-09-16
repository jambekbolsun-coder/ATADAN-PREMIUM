type AtadanLoaderProps = {
  label?: string;
  detail?: string;
  className?: string;
};

export function AtadanLoader({
  label = "Загрузка…",
  detail = "Подготавливаем страницу ATADAN",
  className = "",
}: AtadanLoaderProps) {
  return (
    <div className={`atadan-loader ${className}`.trim()} role="status" aria-live="polite" aria-busy="true">
      <div className="atadan-loader-mark">
        <span className="atadan-loader-wheel" aria-hidden="true" />
        <span className="atadan-loader-wordmark" aria-hidden="true">ATADAN</span>
        <span className="atadan-loader-accessible">{label}. {detail}</span>
      </div>
    </div>
  );
}
