# Google OAuth - Быстрая настройка

## 🚀 Быстрые шаги:

1. **Google Cloud Console**: https://console.cloud.google.com/
2. **Создайте проект** (если нет)
3. **Credentials** > **Create Credentials** > **OAuth client ID**
4. **Тип**: Web application
5. **Redirect URI**: `http://localhost:3000/api/auth/google/callback`
6. **Скопируйте** Client ID и Client Secret
7. **Обновите** `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=ваш-client-id
   GOOGLE_CLIENT_SECRET=ваш-client-secret
   ```
8. **В App.tsx** замените `{false &&` на `{true &&`
9. **Перезапустите** сервер

## 📋 Что нужно скопировать из Google Console:

После создания OAuth Client ID вы увидите:
- **Your Client ID**: `123456789-abc...apps.googleusercontent.com`
- **Your Client Secret**: `GOCSPX-abc...`

Скопируйте оба значения в `.env` файл.

## ⚠️ Важно:

- Client Secret показывается **только один раз** - сохраните его сразу!
- Redirect URI должен быть **точно** таким: `http://localhost:3000/api/auth/google/callback`
- После изменения `.env` **перезапустите сервер**

## 🔍 Проверка настроек:

После настройки проверьте:
```bash
# Проверьте, что переменные загружены
cd backend
node -e "require('dotenv').config(); console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Установлен' : '❌ Не установлен')"
```

