# Инструкция по настройке RetroImprover

## Что было исправлено

1. ✅ **API URL** - изменен с `localhost:3001` на `localhost:3000` в `services/gemini.ts`
2. ✅ **Социальная авторизация** - исправлен URL в `App.tsx` для редиректа на бэкенд
3. ✅ **Формат ответа API** - бэкенд теперь возвращает правильный формат для `restorePhoto`
4. ✅ **Passport OAuth** - стратегии инициализируются только при наличии переменных окружения

## Быстрый старт

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Отредактируйте .env:
# - DATABASE_URL (строка подключения к PostgreSQL)
# - JWT_SECRET (любой секретный ключ)
# - GOOGLE_GENAI_API_KEY (ваш API ключ)
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend запустится на `http://localhost:3000`

### 2. Frontend

```bash
# В корне проекта (где находится App.tsx)
npm install
npm run dev
```

Frontend запустится на `http://localhost:5173`

## Проверка работы

1. Откройте `http://localhost:3000/` - должен показаться JSON с информацией об API
2. Откройте `http://localhost:5173` - должен открыться фронтенд
3. Попробуйте зарегистрироваться или войти

## Важные моменты

- Backend работает на порту **3000**
- Frontend работает на порту **5173** (Vite по умолчанию)
- CORS настроен для работы между фронтендом и бэкендом
- OAuth стратегии не будут инициализироваться, если переменные окружения не заданы (это нормально для разработки)

## Структура проекта

```
RetroImprover/
├── backend/          # Backend API (Node.js/Express)
│   ├── src/
│   ├── prisma/
│   └── .env         # Настройки бэкенда
├── services/        # API клиент для фронтенда
│   └── gemini.ts    # Все запросы к бэкенду
└── App.tsx          # Главный компонент фронтенда
```

## API Endpoints

Все API запросы идут на `http://localhost:3000/api/...`

- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Профиль (требует токен)
- `GET /api/projects` - Список проектов (требует токен)
- `POST /api/ai/restore` - Восстановление изображения (требует токен)

## Решение проблем

### Backend не запускается
- Проверьте, что PostgreSQL запущен
- Проверьте `DATABASE_URL` в `.env`
- Убедитесь, что порт 3000 свободен

### Frontend не подключается к Backend
- Проверьте, что backend запущен на порту 3000
- Откройте консоль браузера (F12) и проверьте ошибки CORS
- Убедитесь, что `FRONTEND_URL` в `.env` бэкенда указан правильно

### Ошибки аутентификации
- Проверьте, что JWT_SECRET задан в `.env`
- Убедитесь, что токен сохраняется в localStorage фронтенда

