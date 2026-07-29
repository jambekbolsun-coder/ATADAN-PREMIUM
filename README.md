# ATADAN PREMIUM WEBSITE

Большой многостраничный каталог тракторов CHANGFA для компании ATADAN.

## Что внутри

- `frontend/` — React + Vite, React Router, i18next, Framer Motion, React Hook Form, Zustand.
- `backend/` — Python FastAPI, SQLAlchemy, SQLite, Pydantic.
- `docs/` — архитектура, API, контент, изображения, деплой, тестирование и переводы.
- `scripts/` — запуск и проверка проекта для Windows и Linux/macOS.

## Быстрый запуск

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

API: `http://localhost:8000/api/health`  
Swagger: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Сайт: `http://localhost:5173`

Можно также запустить:

- Windows: `scripts/start-dev.bat`
- Linux/macOS: `./scripts/start-dev.sh`

## Сборка

```bash
cd frontend
npm run build
npm run preview
```

## Проверки

```bash
cd frontend
npm run test
npm run test:e2e

cd ../backend
python -m pytest
```

## Важные коммерческие примечания

- Подтверждённая цена в исходных материалах есть только для CHANGFA CFJ220: `6 850 000 KGS с НДС`.
- Для остальных моделей показывается «Цена по запросу».
- Параметры, зависящие от комплектации, должны быть подтверждены менеджером.
- Лизинговый калькулятор даёт ориентировочный, а не банковский расчёт.
- Цветовой конфигуратор демонстрационный и не подтверждает наличие цвета.

Контакты ATADAN: `+996 706 131 404`, Бишкек, ул. Шевченко, 114.
