# Деплой

## Вариант 1: отдельный frontend и API

1. Соберите React: `npm run build`.
2. Разместите `frontend/dist` на Vercel, Netlify, Cloudflare Pages или Nginx.
3. Разместите FastAPI на VPS/Render/Railway/Fly.io.
4. Укажите `VITE_API_URL=https://api.example.com/api` перед сборкой.
5. Установите `CORS_ORIGINS` на домен сайта.

## Вариант 2: один VPS

- Nginx раздаёт `frontend/dist`.
- `/api` проксируется на Uvicorn/Gunicorn.
- Для SPA настройте fallback на `index.html`.

## Production

- PostgreSQL вместо SQLite;
- HTTPS;
- резервные копии базы;
- rate limiting и антиспам;
- отправка заявок в CRM/Telegram/почту;
- политика хранения персональных данных;
- мониторинг ошибок.
