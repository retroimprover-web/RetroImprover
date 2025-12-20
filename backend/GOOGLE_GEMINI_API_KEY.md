# Получение Google Gemini API ключа

## Проблема
Ошибка: `API key not valid. Please pass a valid API key.`

Это означает, что в `.env` файле указан невалидный или placeholder API ключ для Google Gemini.

## Решение: Получить Google Gemini API ключ

### Шаг 1: Перейдите в Google AI Studio

1. Откройте https://aistudio.google.com/
2. Войдите в свой Google аккаунт

### Шаг 2: Получите API ключ

1. Нажмите на иконку настроек (⚙️) в левом верхнем углу
2. Или перейдите по прямой ссылке: https://aistudio.google.com/app/apikey
3. Нажмите **"Create API Key"**
4. Выберите проект (или создайте новый)
5. Скопируйте созданный API ключ

**Важно:** API ключ показывается только один раз! Сохраните его сразу.

### Шаг 3: Обновите .env файл

Откройте `backend/.env` и замените:

```env
GOOGLE_GENAI_API_KEY=ваш-реальный-api-ключ-здесь
```

**Пример:**
```env
GOOGLE_GENAI_API_KEY=AIzaSyAbc123def456ghi789jkl012mno345pqr678
```

### Шаг 4: Перезапустите сервер

```bash
# Остановите сервер (Ctrl+C)
cd /Users/andrejursov/Documents/Work/RetroImprover/backend
npm run dev
```

## Альтернативный способ: Через Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Выберите ваш проект
3. Перейдите в **"APIs & Services"** > **"Credentials"**
4. Нажмите **"+ CREATE CREDENTIALS"** > **"API Key"**
5. Скопируйте ключ
6. (Опционально) Ограничьте ключ для безопасности:
   - Нажмите на созданный ключ
   - В "API restrictions" выберите "Restrict key"
   - Выберите "Generative Language API"

## Проверка API ключа

После настройки проверьте:

```bash
cd /Users/andrejursov/Documents/Work/RetroImprover/backend
node -e "require('dotenv').config(); console.log('API Key:', process.env.GOOGLE_GENAI_API_KEY ? '✅ Установлен' : '❌ Не установлен')"
```

## Важные моменты

1. **API ключ бесплатный** для разработки (есть лимиты)
2. **Не публикуйте** API ключ в Git (он уже в `.gitignore`)
3. **Для продакшена** рекомендуется ограничить ключ по IP или домену
4. После изменения `.env` **обязательно перезапустите сервер**

## Лимиты бесплатного тарифа

- Google Gemini API имеет бесплатный tier с лимитами
- Проверьте актуальные лимиты на https://ai.google.dev/pricing

## Если API ключ не работает

1. Убедитесь, что скопировали ключ полностью (без пробелов)
2. Проверьте, что ключ активен в Google AI Studio
3. Убедитесь, что Generative Language API включен в проекте
4. Перезапустите сервер после изменения `.env`

