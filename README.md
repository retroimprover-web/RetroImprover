# RetroImprover

Веб-приложение для восстановления и анимации винтажных фотографий с использованием искусственного интеллекта.

## Структура проекта

```
RetroImprover/
├── backend/              # Backend API (Node.js/Express/TypeScript)
│   ├── src/             # Исходный код бэкенда
│   ├── prisma/          # Схема базы данных
│   ├── package.json     # Зависимости бэкенда
│   └── README.md        # Документация бэкенда
├── services/            # Общие сервисы (если есть)
├── App.tsx             # Главный компонент фронтенда
├── index.html          # HTML точка входа
├── index.tsx           # React точка входа
├── vite.config.ts      # Конфигурация Vite
└── package.json        # Зависимости фронтенда
```

## Быстрый старт

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Отредактируйте .env и укажите DATABASE_URL, JWT_SECRET, GOOGLE_GENAI_API_KEY
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Подробная документация: [backend/README.md](./backend/README.md)

### Frontend

```bash
npm install
npm run dev
```

## Технологии

**Frontend:**
- React
- TypeScript
- Vite

**Backend:**
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma
- JWT + Passport.js (OAuth)
- Google Gemini API
- Google Veo API

## Документация

- [Backend документация](./backend/README.md)
- [Полная документация проекта](./backend/PROJECT_DOCUMENTATION.md)
- [Быстрый старт бэкенда](./backend/QUICKSTART.md)

