# RetroImprover Backend - Полная документация проекта

## Обзор проекта

**RetroImprover** - это веб-приложение для восстановления и анимации винтажных фотографий с использованием искусственного интеллекта. Проект состоит из фронтенда (React) и бэкенда (Node.js/Express).

### Основная концепция

Пользователи могут:
1. Загружать старые/поврежденные фотографии
2. Восстанавливать их с помощью AI (Google Gemini) - улучшение цветов, удаление царапин, восстановление деталей
3. Генерировать анимационные промпты для восстановленных фотографий
4. Создавать анимированные видео из статичных фотографий с помощью Google Veo

### Технологический стек бэкенда

- **Runtime:** Node.js
- **Framework:** Express.js 4.x
- **Language:** TypeScript (строгий режим)
- **Database:** PostgreSQL
- **ORM:** Prisma 5.x
- **Authentication:** 
  - JWT (JSON Web Tokens) для стандартной аутентификации
  - Passport.js для OAuth (Google, Facebook, Apple)
- **AI Integration:** 
  - `@google/generative-ai` для работы с Gemini API
  - Gemini 2.5 Flash Image для восстановления фотографий
  - Gemini 2.5 Flash для генерации промптов
  - Veo 3.1 Fast Generate Preview для генерации видео
- **File Handling:** Multer (локальное хранилище для MVP, структура готова для миграции на S3)

---

## Архитектура проекта

### Структура директорий

```
retroimprover-backend/
├── prisma/
│   └── schema.prisma              # Схема базы данных Prisma
├── src/
│   ├── config/                    # Конфигурационные файлы
│   │   ├── database.ts            # Prisma Client инициализация
│   │   ├── passport.ts            # Настройка Passport OAuth стратегий
│   │   └── upload.ts              # Конфигурация Multer для загрузки файлов
│   ├── controllers/               # Бизнес-логика обработки запросов
│   │   ├── authController.ts     # Аутентификация и авторизация
│   │   ├── projectController.ts  # Управление проектами пользователя
│   │   └── aiController.ts       # AI генерация (восстановление, промпты, видео)
│   ├── middleware/                # Express middleware
│   │   ├── auth.ts                # JWT аутентификация middleware
│   │   └── errorHandler.ts       # Централизованная обработка ошибок
│   ├── routes/                    # Определение API маршрутов
│   │   ├── authRoutes.ts         # Маршруты /api/auth/*
│   │   ├── projectRoutes.ts      # Маршруты /api/projects/*
│   │   └── aiRoutes.ts           # Маршруты /api/ai/*
│   ├── utils/                     # Вспомогательные утилиты
│   │   ├── jwt.ts                # Генерация и верификация JWT токенов
│   │   └── gemini.ts             # Интеграция с Google Gemini/Veo API
│   └── index.ts                   # Точка входа приложения, настройка Express
├── .env.example                   # Шаблон переменных окружения
├── package.json                   # Зависимости и npm скрипты
├── tsconfig.json                  # Конфигурация TypeScript
├── README.md                      # Общая документация
├── QUICKSTART.md                  # Инструкция по быстрому старту
└── PROJECT_DOCUMENTATION.md       # Этот файл
```

---

## База данных (Prisma Schema)

### Модель User

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String?   // null для OAuth пользователей
  credits      Int       @default(5)  // Начальный баланс кредитов
  createdAt    DateTime  @default(now())
  projects     Project[] // Связь один-ко-многим с проектами
}
```

**Особенности:**
- `passwordHash` может быть `null` для пользователей, зарегистрированных через OAuth
- Каждый новый пользователь получает 5 кредитов при регистрации
- Email уникален и используется как логин

### Модель Project

```prisma
model Project {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  originalImage String   // Путь к оригинальному загруженному изображению
  restoredImage String?  // Путь к восстановленному изображению (nullable)
  video         String?  // Путь к сгенерированному видео (nullable)
  prompts       Json?    // Массив из 4 промптов для анимации (JSON)
  isLiked       Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([userId])  // Индекс для быстрого поиска проектов пользователя
}
```

**Особенности:**
- Каскадное удаление: при удалении пользователя удаляются все его проекты
- `prompts` хранится как JSON массив строк
- Все пути к файлам хранятся как строки (локальные пути, готово для миграции на S3 URLs)

---

## Система аутентификации

### JWT Аутентификация (Стандартная)

**Регистрация (`POST /api/auth/register`):**
1. Принимает `email` и `password`
2. Проверяет уникальность email
3. Хеширует пароль с помощью bcrypt (10 раундов)
4. Создает пользователя с 5 кредитами
5. Генерирует JWT токен (срок действия: 7 дней)
6. Возвращает токен и данные пользователя

**Вход (`POST /api/auth/login`):**
1. Принимает `email` и `password`
2. Находит пользователя по email
3. Проверяет пароль через bcrypt.compare
4. Генерирует JWT токен
5. Возвращает токен и данные пользователя

**Профиль (`GET /api/auth/me`):**
- Требует JWT токен в заголовке `Authorization: Bearer <token>`
- Возвращает данные текущего пользователя (id, email, credits, createdAt)

### OAuth Аутентификация (Социальная)

Реализовано через Passport.js с тремя стратегиями:

**Google OAuth:**
- Маршрут: `GET /api/auth/google`
- Callback: `GET /api/auth/google/callback`
- Использует `passport-google-oauth20`
- Требует: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`

**Facebook OAuth:**
- Маршрут: `GET /api/auth/facebook`
- Callback: `GET /api/auth/facebook/callback`
- Использует `passport-facebook`
- Требует: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL`

**Apple OAuth:**
- Маршрут: `GET /api/auth/apple`
- Callback: `GET /api/auth/apple/callback`
- Использует `passport-apple`
- Требует: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_CALLBACK_URL`

**Процесс OAuth:**
1. Пользователь кликает на кнопку социальной сети на фронтенде
2. Фронтенд перенаправляет на `/api/auth/{provider}`
3. Passport перенаправляет на провайдера (Google/Facebook/Apple)
4. Пользователь авторизуется у провайдера
5. Провайдер перенаправляет на `/api/auth/{provider}/callback`
6. Passport обрабатывает callback, создает/находит пользователя в БД
7. Генерируется JWT токен
8. Пользователь перенаправляется на фронтенд: `{FRONTEND_URL}/auth/callback?token={jwt_token}`

**Особенности OAuth:**
- Если пользователь с таким email уже существует, он просто получает токен (не создается дубликат)
- OAuth пользователи имеют `passwordHash = null`
- Все OAuth пользователи также получают 5 кредитов при первом входе

---

## API Endpoints

### Базовый URL
Все API endpoints начинаются с `/api`

### Аутентификация (`/api/auth`)

#### `POST /api/auth/register`
Регистрация нового пользователя.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "credits": 5
  }
}
```

**Ошибки:**
- `400` - Email уже существует или отсутствуют обязательные поля
- `500` - Внутренняя ошибка сервера

#### `POST /api/auth/login`
Вход в систему.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "credits": 5
  }
}
```

**Ошибки:**
- `400` - Отсутствуют обязательные поля
- `401` - Неверный email или пароль
- `500` - Внутренняя ошибка сервера

#### `GET /api/auth/me`
Получить профиль текущего пользователя.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "credits": 5,
  "createdAt": "2024-12-14T10:00:00.000Z"
}
```

**Ошибки:**
- `401` - Токен не предоставлен или недействителен
- `404` - Пользователь не найден

#### `GET /api/auth/google`
Инициация OAuth авторизации через Google. Перенаправляет на Google.

#### `GET /api/auth/google/callback`
Callback для Google OAuth. Перенаправляет на фронтенд с токеном.

#### `GET /api/auth/facebook`
Инициация OAuth авторизации через Facebook.

#### `GET /api/auth/facebook/callback`
Callback для Facebook OAuth.

#### `GET /api/auth/apple`
Инициация OAuth авторизации через Apple.

#### `GET /api/auth/apple/callback`
Callback для Apple OAuth.

---

### Проекты (`/api/projects`)

**Все маршруты требуют JWT аутентификации.**

#### `GET /api/projects`
Получить список всех проектов текущего пользователя.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `liked` (optional, boolean) - Фильтр по лайкнутым проектам. Пример: `?liked=true`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "originalImage": "/path/to/original.jpg",
    "originalUrl": "/uploads/original.jpg",
    "restoredImage": "/path/to/restored.jpg",
    "restoredUrl": "/uploads/restored.jpg",
    "video": "/path/to/video.mp4",
    "videoUrl": "/uploads/video.mp4",
    "prompts": ["prompt1", "prompt2", "prompt3", "prompt4"],
    "isLiked": false,
    "createdAt": "2024-12-14T10:00:00.000Z"
  }
]
```

**Особенности:**
- Проекты отсортированы по дате создания (новые первыми)
- `originalUrl`, `restoredUrl`, `videoUrl` - это публичные URL для доступа к файлам через Express static middleware

#### `POST /api/projects/:id/like`
Переключить статус лайка проекта (лайкнуть/убрать лайк).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "isLiked": true,
  ...
}
```

**Ошибки:**
- `401` - Неавторизован
- `404` - Проект не найден или не принадлежит пользователю

#### `DELETE /api/projects/:id`
Удалить проект и все связанные файлы.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Проект успешно удален"
}
```

**Особенности:**
- Удаляет файлы с диска (originalImage, restoredImage, video)
- Удаляет запись из БД
- Ошибки при удалении файлов логируются, но не прерывают процесс

---

### AI Генерация (`/api/ai`)

**Все маршруты требуют JWT аутентификации.**

#### `POST /api/ai/restore`
Восстановить загруженное изображение с помощью AI.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request:**
- `file` (file) - Изображение для восстановления (jpeg, jpg, png, gif, webp)
- Максимальный размер: 10MB (настраивается через `MAX_FILE_SIZE`)

**Логика:**
1. Проверяет наличие файла
2. Проверяет баланс кредитов пользователя (требуется минимум 1 кредит)
3. Сохраняет оригинальное изображение через Multer
4. Вызывает Google Gemini API для восстановления
5. Сохраняет восстановленное изображение
6. Создает запись Project в БД
7. Вычитает 1 кредит из баланса пользователя

**Response (200):**
```json
{
  "projectId": "uuid",
  "originalUrl": "/uploads/original-1234567890.jpg",
  "restoredUrl": "/uploads/restored-1234567890.jpg",
  "creditsLeft": 4
}
```

**Ошибки:**
- `400` - Файл не загружен, недостаточно кредитов, неверный формат файла
- `401` - Неавторизован
- `404` - Пользователь не найден
- `500` - Ошибка при восстановлении изображения

**Примечание:** 
Текущая реализация использует Gemini API, но может потребовать доработки, так как Gemini может не возвращать изображение напрямую. В MVP используется базовая интеграция.

#### `POST /api/ai/prompts`
Сгенерировать 4 промпта для анимации восстановленного изображения.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "projectId": "uuid"
}
```

**Логика:**
1. Находит проект по ID (проверяет принадлежность пользователю)
2. Проверяет наличие восстановленного изображения
3. Вызывает Gemini API для генерации 4 промптов
4. Обновляет поле `prompts` в Project

**Response (200):**
```json
{
  "prompts": [
    "Cinematic slow zoom on the subject's face",
    "Gentle pan across the vintage scene",
    "Subtle camera movement revealing details",
    "Smooth tracking shot following the action"
  ]
}
```

**Ошибки:**
- `400` - projectId отсутствует, изображение не восстановлено
- `401` - Неавторизован
- `404` - Проект не найден
- `500` - Ошибка при генерации промптов

**Промпт для Gemini:**
```
You are a creative AI assistant. Analyze this restored vintage photo and generate 4 different, creative animation prompts that would bring this photo to life. Each prompt should describe a cinematic, smooth motion that fits the scene. Return only a JSON array of 4 strings, no additional text.
```

#### `POST /api/ai/video`
Сгенерировать анимированное видео из восстановленного изображения.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "projectId": "uuid",
  "selectedPrompts": ["prompt1", "prompt2"]
}
```

**Логика:**
1. Находит проект по ID
2. Проверяет наличие восстановленного изображения
3. Проверяет баланс кредитов (требуется минимум 3 кредита)
4. Объединяет выбранные промпты
5. Вызывает Veo API для генерации видео
6. Сохраняет видео (URL или путь к файлу)
7. Обновляет поле `video` в Project
8. Вычитает 3 кредита из баланса пользователя

**Response (200):**
```json
{
  "videoUrl": "/uploads/video-1234567890.mp4",
  "creditsLeft": 1
}
```

**Ошибки:**
- `400` - projectId или selectedPrompts отсутствуют, недостаточно кредитов
- `401` - Неавторизован
- `404` - Проект не найден
- `500` - Ошибка при генерации видео

**Промпт для Veo:**
```
Cinematic shot, {selectedPrompts}, high quality, smooth motion, professional cinematography, 4K
```

**Примечание:**
Veo API может иметь другую структуру. Текущая реализация использует базовую интеграцию и может потребовать доработки в зависимости от актуального API Google Veo.

---

## Система кредитов

### Начальный баланс
- Каждый новый пользователь получает **5 кредитов** при регистрации (через email/password или OAuth)

### Стоимость операций
- **Восстановление изображения:** 1 кредит
- **Генерация видео:** 3 кредита
- **Генерация промптов:** бесплатно (0 кредитов)

### Логика списания
- Кредиты списываются **после** успешного выполнения операции
- Если операция не удалась, кредиты не списываются
- Баланс не может быть отрицательным (проверка перед операцией)

### Хранение
- Кредиты хранятся в поле `credits` модели `User`
- Обновление через Prisma: `credits: { decrement: N }`

---

## Интеграция с Google Gemini/Veo

### Файл: `src/utils/gemini.ts`

### Функция `restoreImage(imagePath: string): Promise<string>`

**Модель:** `gemini-2.5-flash-image`

**Процесс:**
1. Читает изображение с диска
2. Конвертирует в base64
3. Отправляет в Gemini с системным промптом для восстановления
4. Возвращает результат (может быть текстом или путем к файлу)

**Системный промпт:**
```
Act as a high-end photo restoration AI. Restore this image to look like a modern iPhone 15 Pro photo. Enhance colors, remove scratches, fix fading, improve sharpness, and make it look professionally restored while maintaining the original character and authenticity.
```

**Текущие ограничения:**
- Gemini может возвращать текст вместо изображения
- В MVP используется базовая реализация, может потребоваться другой API для обработки изображений

### Функция `generateAnimationPrompts(restoredImagePath: string): Promise<string[]>`

**Модель:** `gemini-2.5-flash`

**Процесс:**
1. Читает восстановленное изображение
2. Отправляет в Gemini с промптом для генерации 4 анимационных промптов
3. Парсит JSON ответ (массив из 4 строк)
4. Возвращает массив промптов

**Системный промпт:**
```
You are a creative AI assistant. Analyze this restored vintage photo and generate 4 different, creative animation prompts that would bring this photo to life. Each prompt should describe a cinematic, smooth motion that fits the scene. Return only a JSON array of 4 strings, no additional text.
```

**Обработка ответа:**
- Пытается распарсить JSON
- Если не JSON, извлекает промпты из текста (первые 4 строки)

### Функция `generateVideo(imagePath: string, prompts: string[]): Promise<string>`

**Модель:** `veo-3.1-fast-generate-preview`

**Процесс:**
1. Читает восстановленное изображение
2. Объединяет промпты в один текст
3. Формирует полный промпт: `Cinematic shot, {prompts}, high quality, smooth motion, professional cinematography, 4K`
4. Отправляет в Veo API
5. Возвращает URL или путь к видео

**Текущие ограничения:**
- Veo API может иметь другую структуру
- Требуется проверка актуальной документации Google Veo
- В MVP используется базовая реализация

---

## Загрузка файлов (Multer)

### Конфигурация (`src/config/upload.ts`)

**Хранилище:** Локальная файловая система (директория `./uploads`)

**Настройки:**
- Директория загрузок: `UPLOAD_DIR` из `.env` (по умолчанию `./uploads`)
- Максимальный размер файла: `MAX_FILE_SIZE` из `.env` (по умолчанию 10MB)
- Разрешенные форматы: jpeg, jpg, png, gif, webp

**Именование файлов:**
- Формат: `{timestamp}-{random}.{extension}`
- Пример: `1702567890-123456789.jpg`

**Статические файлы:**
- Express static middleware обслуживает файлы из `./uploads` по пути `/uploads/*`
- URL пример: `http://localhost:3000/uploads/1702567890-123456789.jpg`

**Миграция на S3:**
- Структура кода позволяет легко заменить Multer на S3 загрузку
- Нужно будет изменить `upload.ts` и логику сохранения в контроллерах
- В БД можно хранить S3 URLs вместо локальных путей

---

## Middleware

### `authenticate` (`src/middleware/auth.ts`)

**Назначение:** Проверка JWT токена для защищенных маршрутов.

**Процесс:**
1. Извлекает токен из заголовка `Authorization: Bearer <token>`
2. Верифицирует токен через `verifyToken()`
3. Добавляет `user` объект в `req` (содержит `userId` и `email`)
4. Вызывает `next()` или возвращает 401

**Использование:**
```typescript
router.use(authenticate); // Для всех маршрутов
// или
router.get('/protected', authenticate, handler); // Для конкретного маршрута
```

### `errorHandler` (`src/middleware/errorHandler.ts`)

**Назначение:** Централизованная обработка всех ошибок.

**Логика:**
- Логирует ошибку в консоль
- Возвращает соответствующий HTTP статус код
- В режиме разработки возвращает детальное сообщение об ошибке
- В продакшене возвращает общее сообщение "Внутренняя ошибка сервера"

**Обрабатываемые ошибки:**
- `ValidationError` → 400
- `UnauthorizedError` → 401
- Остальные → 500

---

## Главный файл (`src/index.ts`)

### Настройка Express

1. **CORS:**
   - Разрешает запросы с фронтенда (настраивается через `FRONTEND_URL`)
   - Поддерживает credentials

2. **Body Parsing:**
   - `express.json()` для JSON
   - `express.urlencoded()` для form-data

3. **Passport:**
   - Инициализация Passport для OAuth

4. **Static Files:**
   - Обслуживание загруженных файлов через `/uploads`

5. **Routes:**
   - `/api/auth` → authRoutes
   - `/api/projects` → projectRoutes
   - `/api/ai` → aiRoutes

6. **Error Handling:**
   - Централизованный errorHandler
   - 404 handler для несуществующих маршрутов

7. **Health Check:**
   - `GET /health` возвращает статус сервера

---

## Переменные окружения

Все переменные определяются в `.env` файле:

### Обязательные

- `DATABASE_URL` - Строка подключения к PostgreSQL
- `JWT_SECRET` - Секретный ключ для подписи JWT токенов
- `GOOGLE_GENAI_API_KEY` - API ключ для Google Gemini/Veo

### Опциональные (с значениями по умолчанию)

- `PORT` - Порт сервера (по умолчанию 3000)
- `NODE_ENV` - Режим работы (development/production)
- `FRONTEND_URL` - URL фронтенда для CORS (по умолчанию http://localhost:5173)
- `UPLOAD_DIR` - Директория для загрузок (по умолчанию ./uploads)
- `MAX_FILE_SIZE` - Максимальный размер файла в байтах (по умолчанию 10485760 = 10MB)

### OAuth (опционально, если используется социальная авторизация)

**Google:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

**Facebook:**
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_CALLBACK_URL`

**Apple:**
- `APPLE_CLIENT_ID`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`
- `APPLE_CALLBACK_URL`

---

## Текущие ограничения и TODO

### Известные ограничения

1. **Gemini API для восстановления изображений:**
   - Текущая реализация может не работать корректно, так как Gemini может возвращать текст вместо изображения
   - **TODO:** Исследовать правильный API для обработки изображений или использовать другой сервис

2. **Veo API для генерации видео:**
   - Базовая реализация может не соответствовать актуальному API
   - **TODO:** Проверить актуальную документацию Google Veo и обновить интеграцию

3. **Локальное хранилище файлов:**
   - Файлы хранятся локально, что не масштабируется
   - **TODO:** Мигрировать на S3 или другой облачный storage

4. **Валидация входных данных:**
   - Нет валидации с помощью библиотеки (например, `zod` или `joi`)
   - **TODO:** Добавить валидацию для всех входных данных

5. **Rate Limiting:**
   - Нет ограничения частоты запросов
   - **TODO:** Добавить rate limiting для защиты от злоупотреблений

6. **Логирование:**
   - Базовое логирование в консоль
   - **TODO:** Интегрировать структурированное логирование (например, Winston)

7. **Тестирование:**
   - Нет unit/integration тестов
   - **TODO:** Добавить тесты для критических компонентов

8. **Обработка ошибок Gemini:**
   - Базовая обработка ошибок
   - **TODO:** Улучшить обработку специфичных ошибок API

---

## Типичный workflow пользователя

1. **Регистрация/Вход:**
   - Пользователь регистрируется или входит через email/password или OAuth
   - Получает JWT токен и 5 кредитов

2. **Загрузка и восстановление:**
   - Загружает старое изображение через `POST /api/ai/restore`
   - Система восстанавливает изображение (списывается 1 кредит)
   - Получает `projectId`, `originalUrl`, `restoredUrl`

3. **Генерация промптов:**
   - Вызывает `POST /api/ai/prompts` с `projectId`
   - Получает 4 промпта для анимации (бесплатно)

4. **Генерация видео:**
   - Выбирает промпты и вызывает `POST /api/ai/video`
   - Система генерирует видео (списывается 3 кредита)
   - Получает `videoUrl`

5. **Управление проектами:**
   - Просматривает все проекты через `GET /api/projects`
   - Может лайкнуть проект через `POST /api/projects/:id/like`
   - Может удалить проект через `DELETE /api/projects/:id`

---

## Безопасность

### Реализовано

- ✅ Хеширование паролей (bcrypt, 10 раундов)
- ✅ JWT токены с сроком действия (7 дней)
- ✅ Проверка принадлежности ресурсов (пользователь может работать только со своими проектами)
- ✅ Валидация типов файлов (только изображения)
- ✅ Ограничение размера файлов
- ✅ CORS настройка

### Рекомендуется добавить

- ⚠️ Rate limiting
- ⚠️ Валидация входных данных (zod/joi)
- ⚠️ HTTPS в продакшене
- ⚠️ Helmet.js для безопасности заголовков
- ⚠️ Sanitization входных данных
- ⚠️ Логирование подозрительной активности

---

## Команды разработки

```bash
# Установка зависимостей
npm install

# Режим разработки (с hot reload)
npm run dev

# Сборка TypeScript
npm run build

# Запуск продакшен версии
npm start

# Prisma команды
npm run prisma:generate    # Генерация Prisma Client
npm run prisma:migrate     # Создание миграций
npm run prisma:studio      # Открыть Prisma Studio (GUI)
```

---

## Интеграция с фронтендом

### Ожидаемый формат ответов

Все успешные ответы возвращают JSON. Ошибки также в формате JSON:
```json
{
  "error": "Описание ошибки"
}
```

### CORS

Бэкенд настроен на работу с фронтендом через CORS. Убедитесь, что `FRONTEND_URL` в `.env` соответствует URL фронтенда.

### Аутентификация

Фронтенд должен:
1. Сохранять JWT токен после регистрации/входа
2. Отправлять токен в заголовке `Authorization: Bearer <token>` для защищенных запросов
3. Обрабатывать перенаправления от OAuth callbacks (`/auth/callback?token=...`)

### Загрузка файлов

Для `POST /api/ai/restore` фронтенд должен использовать `FormData`:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/ai/restore', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## Заключение

Этот документ описывает полную архитектуру и функциональность бэкенда RetroImprover. Проект находится в стадии MVP и готов к базовому использованию, но требует доработки интеграций с AI API и улучшения безопасности для продакшена.

Для дальнейшей разработки рекомендуется:
1. Протестировать интеграции с Gemini/Veo API
2. Добавить валидацию и rate limiting
3. Мигрировать на облачное хранилище файлов
4. Добавить тесты
5. Настроить CI/CD

