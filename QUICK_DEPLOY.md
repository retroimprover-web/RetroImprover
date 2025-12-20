# ⚡ Быстрый деплой за 15 минут

## 📋 Чеклист перед деплоем

- [ ] Проект работает локально
- [ ] Git репозиторий создан и залит на GitHub
- [ ] Домен готов (или используем временные URL)

## 🚀 Шаг 1: GitHub (2 минуты)

```bash
cd /Users/andrejursov/Documents/Work/RetroImprover
git init
git add .
git commit -m "Ready for deployment"
# Создайте репозиторий на GitHub, затем:
# git remote add origin https://github.com/yourusername/retroimprover.git
# git push -u origin main
```

## 🚂 Шаг 2: Railway - Backend (5 минут)

1. Зайдите на [railway.app](https://railway.app) → Войти через GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Выберите репозиторий
4. В настройках сервиса:
   - **Root Directory**: `backend`
   - Railway автоматически определит Node.js
5. **+ New** → **Database** → **Add PostgreSQL**
6. В **Variables** добавьте:
   ```
   DATABASE_URL=<скопируйте из PostgreSQL>
   JWT_SECRET=<случайный ключ>
   GOOGLE_GENAI_API_KEY=<ваш ключ>
   FRONTEND_URL=https://your-frontend.vercel.app (временно)
   NODE_ENV=production
   PORT=3000
   ```
7. В **Settings** → **Deploy**:
   - **Deploy Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
8. Скопируйте URL бэкенда (например: `https://xxx.up.railway.app`)

## ⚡ Шаг 3: Vercel - Frontend (3 минуты)

1. Зайдите на [vercel.com](https://vercel.com) → Войти через GitHub
2. **Add New...** → **Project**
3. Выберите репозиторий
4. Настройки:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (корень)
5. **Environment Variables**:
   ```
   VITE_API_URL=https://xxx.up.railway.app (URL из Railway)
   ```
6. **Deploy**
7. Скопируйте URL фронтенда (например: `https://xxx.vercel.app`)

## 🔄 Шаг 4: Обновить переменные (1 минута)

1. В Railway обновите:
   ```
   FRONTEND_URL=https://xxx.vercel.app
   ```
2. Нажмите **Redeploy** в Railway

## 🌐 Шаг 5: Домен (5 минут)

### Frontend (Vercel):
1. **Settings** → **Domains** → Добавить ваш домен
2. Настройте DNS у регистратора:
   - **CNAME**: `www` → `cname.vercel-dns.com`

### Backend (Railway):
1. **Settings** → **Networking** → **Generate Domain** (или кастомный)
2. Если кастомный домен:
   - **CNAME**: `api` → `railway.app`

## ✅ Готово!

Откройте ваш домен и проверьте работу!

## 🔧 Если что-то не работает

1. Проверьте логи в Railway/Vercel
2. Убедитесь, что все переменные окружения заданы
3. Проверьте, что миграции применились (в логах Railway)

## 📝 После деплоя

Не забудьте обновить OAuth настройки в Google Console с новыми URL!

