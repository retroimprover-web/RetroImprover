# Быстрый старт

## Шаг 1: Установка зависимостей

```bash
npm install
```

## Шаг 2: Настройка базы данных

1. Убедитесь, что PostgreSQL запущен
2. Создайте базу данных:
```sql
CREATE DATABASE retroimprover;
```

3. Скопируйте `.env.example` в `.env`:
```bash
cp .env.example .env
```

4. Отредактируйте `.env` и укажите:
   - `DATABASE_URL` - строка подключения к вашей БД
   - `JWT_SECRET` - любой случайный секретный ключ
   - `GOOGLE_GENAI_API_KEY` - ваш API ключ Google Gemini

## Шаг 3: Инициализация базы данных

```bash
# Генерация Prisma клиента
npm run prisma:generate

# Создание таблиц в БД
npm run prisma:migrate
```

## Шаг 4: Запуск сервера

```bash
# Режим разработки
npm run dev
```

Сервер запустится на `http://localhost:3000`

## Тестирование API

### Регистрация пользователя

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Вход в систему

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Сохраните полученный `token` для следующих запросов.

### Получить профиль

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Восстановить изображение

```bash
curl -X POST http://localhost:3000/api/ai/restore \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/your/image.jpg"
```

## Настройка социальной авторизации

Для работы OAuth нужно:

1. **Google:**
   - Создать проект в [Google Cloud Console](https://console.cloud.google.com/)
   - Включить Google+ API
   - Создать OAuth 2.0 credentials
   - Добавить в `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

2. **Facebook:**
   - Создать приложение в [Facebook Developers](https://developers.facebook.com/)
   - Добавить в `.env`: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`

3. **Apple:**
   - Настроить в [Apple Developer Portal](https://developer.apple.com/)
   - Добавить в `.env`: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`

## Структура директорий

После запуска будут созданы:
- `./uploads/` - директория для загруженных файлов
- `./dist/` - скомпилированный JavaScript (после `npm run build`)

## Полезные команды

```bash
# Открыть Prisma Studio (GUI для БД)
npm run prisma:studio

# Создать новую миграцию
npm run prisma:migrate

# Собрать проект
npm run build

# Запустить продакшен версию
npm start
```

## Решение проблем

### Ошибка подключения к БД
- Проверьте, что PostgreSQL запущен
- Проверьте `DATABASE_URL` в `.env`
- Убедитесь, что база данных создана

### Ошибка "Module not found"
- Удалите `node_modules` и `package-lock.json`
- Выполните `npm install` заново

### Ошибка Prisma
- Выполните `npm run prisma:generate`
- Проверьте схему в `prisma/schema.prisma`

