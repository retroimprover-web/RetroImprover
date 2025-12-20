# 🔐 Настройка Google OAuth для RetroImprover

## Текущая ситуация

Ошибка `401: invalid_client` означает, что Google OAuth не настроен правильно. Кнопки OAuth теперь скрыты до правильной настройки.

## 📋 Пошаговая настройка Google OAuth

### Шаг 1: Создать OAuth приложение в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **+ CREATE CREDENTIALS** → **OAuth client ID**

### Шаг 2: Настроить OAuth consent screen

Если еще не настроен:
1. Перейдите в **APIs & Services** → **OAuth consent screen**
2. Выберите **External** (для тестирования) или **Internal** (для G Suite)
3. Заполните обязательные поля:
   - **App name**: RetroImprover
   - **User support email**: ваш email
   - **Developer contact information**: ваш email
4. Сохраните и продолжите

### Шаг 3: Создать OAuth Client ID

1. В **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Выберите **Application type**: **Web application**
3. Укажите **Name**: RetroImprover Web Client
4. **Authorized JavaScript origins**:
   ```
   http://localhost:3000          (для разработки)
   https://your-backend-domain.com (для продакшена)
   ```
5. **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/google/callback          (для разработки)
   https://your-backend-domain.com/api/auth/google/callback (для продакшена)
   ```
6. Нажмите **CREATE**
7. Скопируйте **Client ID** и **Client Secret**

### Шаг 4: Обновить .env файл

В файле `/Users/andrejursov/Documents/Work/RetroImprover/backend/.env`:

```env
# Замените на реальные значения из Google Cloud Console
GOOGLE_CLIENT_ID=ваш-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=ваш-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

**Для продакшена:**
```env
GOOGLE_CALLBACK_URL=https://your-backend-domain.com/api/auth/google/callback
```

### Шаг 5: Перезапустить backend

```bash
cd /Users/andrejursov/Documents/Work/RetroImprover/backend
# Остановите текущий процесс (Ctrl+C)
npm run dev
```

### Шаг 6: Проверить работу

1. Откройте фронтенд `http://localhost:5173`
2. Кнопка Google должна появиться (если OAuth настроен)
3. Нажмите на кнопку Google
4. Должно перенаправить на Google для авторизации

## ⚠️ Важные моменты

### Для разработки (localhost)
- Используйте `http://localhost:3000` в Authorized JavaScript origins
- Используйте `http://localhost:3000/api/auth/google/callback` в Redirect URIs

### Для продакшена (ваш домен)
- Используйте `https://your-backend-domain.com` в Authorized JavaScript origins
- Используйте `https://your-backend-domain.com/api/auth/google/callback` в Redirect URIs
- **Важно**: Google требует HTTPS для продакшена!

### Проверка статуса OAuth

После настройки, backend автоматически определит, что OAuth настроен, и кнопки появятся на фронтенде.

Проверить можно через API:
```bash
curl http://localhost:3000/api/auth/oauth/status
```

Должно вернуть:
```json
{
  "google": true,
  "facebook": false,
  "apple": false
}
```

## 🔧 Решение проблем

### Ошибка "redirect_uri_mismatch"
- Проверьте, что Redirect URI в Google Console точно совпадает с `GOOGLE_CALLBACK_URL` в `.env`
- Убедитесь, что нет лишних пробелов или слэшей

### Ошибка "invalid_client"
- Проверьте, что `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` правильные
- Убедитесь, что OAuth consent screen настроен
- Перезапустите backend после изменения `.env`

### Кнопки OAuth не появляются
- Проверьте, что backend запущен
- Откройте консоль браузера (F12) и проверьте ошибки
- Проверьте endpoint: `http://localhost:3000/api/auth/oauth/status`

## 📝 Для продакшена

После деплоя на ваш домен:

1. Обновите **Authorized JavaScript origins** в Google Console:
   ```
   https://your-backend-domain.com
   ```

2. Обновите **Authorized redirect URIs**:
   ```
   https://your-backend-domain.com/api/auth/google/callback
   ```

3. Обновите `.env` на сервере:
   ```env
   GOOGLE_CALLBACK_URL=https://your-backend-domain.com/api/auth/google/callback
   FRONTEND_URL=https://your-frontend-domain.com
   ```

4. Перезапустите backend

## ✅ Готово!

После настройки OAuth будет работать и в разработке, и в продакшене!

