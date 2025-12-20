# Настройка PostgreSQL для RetroImprover

## ✅ PostgreSQL уже установлен и запущен!

PostgreSQL версии 15 установлен через Homebrew и работает.

## 🔧 Как подключиться к PostgreSQL

### Вариант 1: Добавить PostgreSQL в PATH (рекомендуется)

Добавьте в ваш `~/.zshrc` (или `~/.bash_profile` если используете bash):

```bash
# PostgreSQL
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

Затем выполните:
```bash
source ~/.zshrc
```

Или для bash:
```bash
source ~/.bash_profile
```

### Вариант 2: Использовать полный путь

```bash
/opt/homebrew/opt/postgresql@15/bin/psql postgres
```

Или если установлено в `/usr/local`:
```bash
/usr/local/opt/postgresql@15/bin/psql postgres
```

## 📝 Создание базы данных

### Шаг 1: Подключитесь к PostgreSQL

```bash
# Если добавили в PATH:
psql postgres

# Или с полным путем:
/opt/homebrew/opt/postgresql@15/bin/psql postgres
```

### Шаг 2: Создайте базу данных

В psql выполните:

```sql
CREATE DATABASE retroimprover;
\q
```

### Шаг 3: Проверьте подключение

```bash
psql -d retroimprover
```

Если подключились успешно, выйдите командой `\q`

## ⚙️ Настройка .env файла

Откройте `backend/.env` и укажите правильный `DATABASE_URL`:

```env
DATABASE_URL="postgresql://andrejursov@localhost:5432/retroimprover?schema=public"
```

**Примечание:** 
- Если у PostgreSQL есть пароль, формат: `postgresql://username:password@localhost:5432/retroimprover?schema=public`
- По умолчанию на macOS PostgreSQL часто работает без пароля для локального пользователя

## 🚀 После настройки базы данных

```bash
cd /Users/andrejursov/Documents/Work/RetroImprover/backend
npx prisma migrate dev
npm run dev
```

## 🔍 Полезные команды PostgreSQL

```bash
# Подключиться к базе данных
psql -d retroimprover

# Список всех баз данных
psql -l

# Выйти из psql
\q

# Список таблиц (внутри psql)
\dt

# Описание таблицы (внутри psql)
\d table_name
```

## ❓ Если не работает

1. Проверьте, что PostgreSQL запущен:
   ```bash
   brew services list | grep postgresql
   ```

2. Если не запущен, запустите:
   ```bash
   brew services start postgresql@15
   ```

3. Проверьте версию:
   ```bash
   /opt/homebrew/opt/postgresql@15/bin/psql --version
   ```

