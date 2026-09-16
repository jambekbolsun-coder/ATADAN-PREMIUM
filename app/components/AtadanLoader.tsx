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
      <div className="atadan-loader-inner">
        <span className="atadan-loader-wordmark" aria-hidden="true">ATADAN</span>
        <strong>{label}</strong>
        <span className="atadan-loader-track" aria-hidden="true"><i /></span>
        <small>{detail}</small>
      </div>
    </div>
  );
}
