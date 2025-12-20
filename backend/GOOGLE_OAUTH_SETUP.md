# Настройка Google OAuth

## Проблема
При попытке войти через Google появляется ошибка:
```
OAuth client was not found.
Ошибка 401: invalid_client
```

Это означает, что Google OAuth не настроен или credentials неверные.

## Решение

### Вариант 1: Настроить Google OAuth (для продакшена)

#### Шаг 1: Создайте проект в Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Создайте новый проект или выберите существующий
3. Включите **Google+ API**:
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Google+ API" и включите его

#### Шаг 2: Создайте OAuth 2.0 credentials

1. Перейдите в "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "OAuth client ID"
3. Выберите "Web application"
4. Настройте:
   - **Name**: RetroImprover (или любое имя)
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (для разработки)
     - `https://yourdomain.com` (для продакшена)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback` (для разработки)
     - `https://yourdomain.com/api/auth/google/callback` (для продакшена)
5. Нажмите "Create"
6. Скопируйте **Client ID** и **Client Secret**

#### Шаг 3: Обновите .env файл

Откройте `backend/.env` и укажите:

```env
GOOGLE_CLIENT_ID=ваш-client-id-здесь
GOOGLE_CLIENT_SECRET=ваш-client-secret-здесь
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

#### Шаг 4: Перезапустите сервер

```bash
# Остановите сервер (Ctrl+C) и запустите снова
npm run dev
```

### Вариант 2: Временно отключить Google OAuth (для разработки)

Если вы не хотите настраивать Google OAuth сейчас, можно временно скрыть кнопку входа через Google в фронтенде или просто не использовать её.

Кнопка Google OAuth уже не будет работать, если в `.env` не указаны правильные credentials.

## Проверка настроек

После настройки проверьте:

1. В `.env` указаны `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`
2. Callback URL в Google Console совпадает с `GOOGLE_CALLBACK_URL` в `.env`
3. Сервер перезапущен после изменения `.env`

## Важные моменты

- **Для разработки** используйте `http://localhost:3000`
- **Для продакшена** нужно будет добавить ваш домен в Google Console
- **Client Secret** - это секретная информация, не публикуйте её в Git
- Убедитесь, что `.env` в `.gitignore` (он уже там)

## Альтернатива: Использовать только email/password

Пока Google OAuth не настроен, можно использовать стандартную регистрацию и вход через email/password - это работает без дополнительной настройки.

