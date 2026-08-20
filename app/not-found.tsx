import Link from "next/link";
export default function NotFound() { return <main className="not-found"><span>404</span><h1>Такой страницы нет</h1><p>Возможно, модель была перемещена или адрес указан с ошибкой.</p><Link className="primary-btn" href="/catalog">Вернуться в каталог</Link></main>; }
