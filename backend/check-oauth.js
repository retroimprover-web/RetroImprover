// Скрипт для проверки настроек OAuth
require('dotenv').config();

console.log('\n=== Проверка Google OAuth настроек ===\n');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackUrl = process.env.GOOGLE_CALLBACK_URL;

console.log('Client ID:', clientId && !clientId.includes('your-google') ? '✅ Настроен' : '❌ Не настроен');
console.log('Client Secret:', clientSecret && !clientSecret.includes('your-google') ? '✅ Настроен' : '❌ Не настроен');
console.log('Callback URL:', callbackUrl || '❌ Не установлен');

if (clientId && clientSecret && !clientId.includes('your-google') && !clientSecret.includes('your-google')) {
  console.log('\n✅ Google OAuth настроен правильно!');
  console.log('Теперь можно включить кнопки в App.tsx и перезапустить сервер.\n');
} else {
  console.log('\n⚠️  Google OAuth не настроен.');
  console.log('Следуйте инструкции в GOOGLE_OAUTH_STEP_BY_STEP.md\n');
}

