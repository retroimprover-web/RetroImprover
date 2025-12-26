/**
 * Переводы интерфейса
 */

export type Language = 'en' | 'ru';

export const translations = {
  en: {
    // Navigation
    workbench: 'Workbench',
    myProjects: 'My Projects',
    likedGallery: 'Liked Gallery',
    buyStars: 'Buy Stars',
    profile: 'Profile',
    signOut: 'Sign Out',
    newRestoration: 'New Restoration',
    
    // Auth
    signIn: 'Sign In',
    createAccount: 'Create Account',
    email: 'Email',
    password: 'Password',
    orContinueWith: 'Or continue with',
    alreadyHaveAccount: "Already have an account? Sign In",
    dontHaveAccount: "Don't have an account? Register",
    
    // Upload
    restoreMemories: 'Restore\nMemories',
    aiPoweredEnhancement: 'AI-powered vintage photo enhancement',
    tapToUpload: 'Tap to Upload',
    
    // Crop
    cropImage: 'Crop Image',
    
    // Preview
    restore: 'Restore',
    restoreStars: 'Restore (1 Star)',
    
    // Workbench
    original: 'Original',
    result: 'Result',
    editor: 'Editor',
    video: 'Video',
    generateAnimation: 'Generate Animation',
    generateVideo: 'Generate Video',
    generateVideoStars: 'Generate Video (-{count} Stars)',
    readingImageContext: 'Reading image context...',
    generatingInBackground: 'Generating in background...',
    generatingVideo: 'Generating Video...',
    pleaseWait: 'Please wait ~10-15 seconds',
    backToEditor: 'Back to Editor',
    
    // Gallery
    noRestorations: 'No restorations yet.',
    noLikedPhotos: 'No liked photos yet.',
    restoration: 'Restoration',
    
    // Profile
    subscription: 'Subscription',
    stars: 'Stars',
    credits: 'Credits',
    language: 'Language',
    english: 'English',
    russian: 'Russian',
    
    // Plans
    getMoreStars: 'Get More Stars',
    generateHighQuality: 'Generate high-quality videos and restorations.',
    starter: 'Starter',
    tryItOut: 'Try it out',
    creator: 'Creator',
    bestForHobbyists: 'Best for hobbyists',
    pro: 'Pro',
    heavyUsage: 'Heavy usage',
    popular: 'POPULAR',
    
    // Errors
    notEnoughCredits: 'Not enough credits',
    insufficientCredits: 'Insufficient credits. Minimum {count} credit(s) required.',
    insufficientCreditsVideo: 'Insufficient credits. 3 credits required for video generation.',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },
  ru: {
    // Navigation
    workbench: 'Рабочий стол',
    myProjects: 'Мои проекты',
    likedGallery: 'Избранное',
    buyStars: 'Купить звезды',
    profile: 'Профиль',
    signOut: 'Выйти',
    newRestoration: 'Новая реставрация',
    
    // Auth
    signIn: 'Войти',
    createAccount: 'Создать аккаунт',
    email: 'Email',
    password: 'Пароль',
    orContinueWith: 'Или продолжить с',
    alreadyHaveAccount: 'Уже есть аккаунт? Войти',
    dontHaveAccount: 'Нет аккаунта? Зарегистрироваться',
    
    // Upload
    restoreMemories: 'Восстановить\nВоспоминания',
    aiPoweredEnhancement: 'Улучшение старых фото с помощью ИИ',
    tapToUpload: 'Нажмите для загрузки',
    
    // Crop
    cropImage: 'Обрезать изображение',
    
    // Preview
    restore: 'Восстановить',
    restoreStars: 'Восстановить (1 Звезда)',
    
    // Workbench
    original: 'Оригинал',
    result: 'Результат',
    editor: 'Редактор',
    video: 'Видео',
    generateAnimation: 'Создать анимацию',
    generateVideo: 'Создать видео',
    generateVideoStars: 'Создать видео (-{count} Звезд)',
    readingImageContext: 'Анализ изображения...',
    generatingInBackground: 'Генерация в фоне...',
    generatingVideo: 'Создание видео...',
    pleaseWait: 'Пожалуйста, подождите ~10-15 секунд',
    backToEditor: 'Назад к редактору',
    
    // Gallery
    noRestorations: 'Пока нет реставраций.',
    noLikedPhotos: 'Пока нет избранных фото.',
    restoration: 'Реставрация',
    
    // Profile
    subscription: 'Подписка',
    stars: 'Звезды',
    credits: 'Кредиты',
    language: 'Язык',
    english: 'Английский',
    russian: 'Русский',
    
    // Plans
    getMoreStars: 'Получить больше звезд',
    generateHighQuality: 'Создавайте качественные видео и реставрации.',
    starter: 'Стартовый',
    tryItOut: 'Попробовать',
    creator: 'Создатель',
    bestForHobbyists: 'Для любителей',
    pro: 'Профессионал',
    heavyUsage: 'Для активного использования',
    popular: 'ПОПУЛЯРНО',
    
    // Errors
    notEnoughCredits: 'Недостаточно кредитов',
    insufficientCredits: 'Недостаточно кредитов. Требуется минимум {count} кредит(ов).',
    insufficientCreditsVideo: 'Недостаточно кредитов. Требуется 3 кредита для создания видео.',
    
    // Common
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
  },
};

export function t(key: string, lang: Language = 'en', params?: Record<string, string | number>): string {
  const translation = translations[lang][key as keyof typeof translations.en] || translations.en[key as keyof typeof translations.en] || key;
  
  if (params) {
    return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }
  
  return translation;
}

export function detectLanguage(): Language {
  // Определяем язык по браузеру
  const browserLang = navigator.language || (navigator as any).userLanguage;
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Проверяем, русскоязычная ли страна
  const russianCountries = ['ru', 'by', 'kz', 'ua', 'kg', 'tj', 'uz', 'tm', 'md', 'az', 'am', 'ge'];
  
  if (russianCountries.includes(langCode)) {
    return 'ru';
  }
  
  return 'en';
}


