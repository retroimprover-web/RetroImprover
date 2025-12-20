# Быстрое решение проблемы "tsx: command not found"

## Проблема
При запуске `npm run dev` появляется ошибка:
```
sh: tsx: command not found
```

## Решение
Это означает, что зависимости не установлены. Выполните:

```bash
cd /Users/andrejursov/Documents/Work/RetroImprover/backend
npm install
```

## После установки зависимостей

### 1. Создайте .env файл (если его нет):

```bash
cp .env.example .env
```

### 2. Отредактируйте .env и укажите:
- `DATABASE_URL` - строка подключения к PostgreSQL
- `JWT_SECRET` - любой секретный ключ (например: `my-secret-key-123`)
- `GOOGLE_GENAI_API_KEY` - ваш API ключ Google Gemini

### 3. Инициализируйте базу данных:

```bash
# Генерация Prisma клиента
npx prisma generate

# Создание таблиц в БД (если БД уже создана)
npx prisma migrate dev
```

### 4. Запустите сервер:

```bash
npm run dev
```

Сервер должен запуститься на `http://localhost:3000`

## Если база данных еще не создана:

1. Убедитесь, что PostgreSQL запущен
2. Создайте базу данных:
   ```sql
   CREATE DATABASE retroimprover;
   ```
3. Укажите правильный `DATABASE_URL` в `.env`:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/retroimprover?schema=public"
   ```
4. Выполните миграции:
   ```bash
   npx prisma migrate dev
   ```

