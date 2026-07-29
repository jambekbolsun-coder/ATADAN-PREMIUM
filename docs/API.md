# API

Базовый URL в разработке: `http://localhost:8000/api`.

## GET /health

Проверка работы сервера.

## GET /tractors

Параметры:

- `min_power`
- `max_power`
- `series`

## GET /tractors/{slug}

Возвращает одну модель или 404.

## POST /leads

```json
{
  "name": "Имя",
  "phone": "+996...",
  "message": "Интересует CFF1204",
  "source": "catalog",
  "language": "ru"
}
```

## POST /service-requests

Принимает модель, серийный номер, местоположение и описание неисправности.
