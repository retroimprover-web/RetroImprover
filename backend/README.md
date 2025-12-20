# RetroImprover Backend API

Backend REST API для веб-приложения RetroImprover - восстановление и анимация винтажных фотографий с использованием Google Gemini и Veo.

## Технологический стек

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT (JSON Web Tokens) с bcrypt
- **Social Auth:** Passport.js (Google, Facebook, Apple)
- **AI SDK:** `@google/generative-ai`
- **File Handling:** Multer

## Структура проекта

```
retroimprover-backend/
├── prisma/
│   └── schema.prisma          # Схема базы данных
├── src/
│   ├── config/
│   │   ├── database.ts        # Prisma клиент
│   │   ├── passport.ts        # Настройка Passport для OAuth
│   │   └── upload.ts           # Настройка Multer
│   ├── controllers/
│   │   ├── authController.ts  # Контроллеры аутентификации
│   │   ├── projectController.ts # Контроллеры проектов
│   │   └── aiController.ts    # Контроллеры AI генерации
│   ├── middleware/
│   │   ├── auth.ts            # JWT middleware
│   │   └── errorHandler.ts    # Обработка ошибок
│   ├── routes/
│   │   ├── authRoutes.ts      # Маршруты аутентификации
│   │   ├── projectRoutes.ts   # Маршруты проектов
│   │   └── aiRoutes.ts         # Маршруты AI
│   ├── utils/
│   │   ├── jwt.ts             # JWT утилиты
│   │   └── gemini.ts          # Интеграция с Google Gemini
│   └── index.ts               # Главный файл приложения
├── .env.example               # Пример переменных окружения
├── package.json
└── tsconfig.json
```

## Установка и настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка базы данных

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните переменные окружения, особенно:
- `DATABASE_URL` - строка подключения к PostgreSQL
- `JWT_SECRET` - секретный ключ для JWT
- `GOOGLE_GENAI_API_KEY` - API ключ Google Gemini
- OAuth credentials для социальной авторизации

### 3. Настройка Prisma

```bash
# Генерация Prisma клиента
npm run prisma:generate

# Создание миграций
npm run prisma:migrate

# (Опционально) Открыть Prisma Studio
npm run prisma:studio
```

### 4. Запуск приложения

```bash
# Режим разработки (с hot reload)
npm run dev

# Сборка для продакшена
npm run build

# Запуск продакшен версии
npm start
```

## API Endpoints

### Аутентификация (`/api/auth`)

- `POST /api/auth/register` - Регистрация нового пользователя
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `POST /api/auth/login` - Вход в систему
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/me` - Получить профиль текущего пользователя (требует JWT)

- `GET /api/auth/google` - Авторизация через Google
- `GET /api/auth/google/callback` - Callback для Google OAuth

- `GET /api/auth/facebook` - Авторизация через Facebook
- `GET /api/auth/facebook/callback` - Callback для Facebook OAuth

- `GET /api/auth/apple` - Авторизация через Apple
- `GET /api/auth/apple/callback` - Callback для Apple OAuth

### Проекты (`/api/projects`)

Все маршруты требуют JWT токен в заголовке `Authorization: Bearer <token>`

- `GET /api/projects` - Список всех проектов пользователя
  - Query параметр: `?liked=true` - фильтр по лайкнутым проектам

- `POST /api/projects/:id/like` - Переключить статус лайка проекта

- `DELETE /api/projects/:id` - Удалить проект

### AI Генерация (`/api/ai`)

Все маршруты требуют JWT токен в заголовке `Authorization: Bearer <token>`

- `POST /api/ai/restore` - Восстановить изображение
  - Формат: `multipart/form-data`
  - Поле: `file` (изображение)
  - Стоимость: 1 кредит
  - Возвращает: `{ projectId, originalUrl, restoredUrl, creditsLeft }`

- `POST /api/ai/prompts` - Сгенерировать промпты для анимации
  ```json
  {
    "projectId": "uuid"
  }
  ```
  - Возвращает: `{ prompts: string[] }`

- `POST /api/ai/video` - Сгенерировать видео
  ```json
  {
    "projectId": "uuid",
    "selectedPrompts": ["prompt1", "prompt2"]
  }
  ```
  - Стоимость: 3 кредита
  - Возвращает: `{ videoUrl, creditsLeft }`

## Система кредитов

- Новые пользователи получают 5 кредитов при регистрации
- Восстановление изображения: 1 кредит
- Генерация видео: 3 кредита

## Социальная авторизация

Приложение поддерживает OAuth авторизацию через:
- Google
- Facebook
- Apple

После успешной авторизации пользователь перенаправляется на фронтенд с JWT токеном в query параметре:
```
http://localhost:5173/auth/callback?token=<jwt_token>
```

## Загрузка файлов

Файлы загружаются в локальную директорию `./uploads` (настраивается через `UPLOAD_DIR` в `.env`).

**Примечание:** Для продакшена рекомендуется использовать S3 или другой облачный storage. Структура кода позволяет легко заменить Multer на S3 загрузку.

## Обработка ошибок

Все ошибки обрабатываются централизованно через `errorHandler` middleware. В режиме разработки возвращается детальная информация об ошибке, в продакшене - общее сообщение.

## Безопасность

- Пароли хешируются с помощью bcrypt
- JWT токены имеют срок действия 7 дней
- CORS настроен для работы с фронтендом
- Валидация файлов (только изображения)
- Ограничение размера файлов

## Разработка

### Структура базы данных

**User:**
- `id` (UUID)
- `email` (unique)
- `passwordHash` (nullable для OAuth пользователей)
- `credits` (default: 5)
- `createdAt`

**Project:**
- `id` (UUID)
- `userId` (foreign key)
- `originalImage` (path)
- `restoredImage` (path, nullable)
- `video` (path, nullable)
- `prompts` (JSON, nullable)
- `isLiked` (boolean, default: false)
- `createdAt`

## Примечания

- Google Gemini API может иметь ограничения по обработке изображений. В текущей реализации используется базовая интеграция, которая может потребовать доработки в зависимости от актуального API.
- Veo API для генерации видео может иметь другую структуру - проверьте актуальную документацию Google.
- Для продакшена рекомендуется добавить rate limiting, валидацию входных данных (например, с помощью `zod`), и логирование.

