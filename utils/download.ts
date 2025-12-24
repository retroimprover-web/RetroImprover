/**
 * Утилита для скачивания файлов на мобильных устройствах (особенно iOS)
 */

/**
 * Скачивает файл на мобильном устройстве
 * Для iOS использует специальный подход через создание временной ссылки
 */
export async function downloadFile(url: string, filename: string, type: 'image' | 'video' = 'image'): Promise<void> {
  try {
    // Проверяем, мобильное ли устройство
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && isIOS) {
      // Для iOS используем специальный подход
      await downloadFileIOS(url, filename, type);
    } else if (isMobile) {
      // Для Android используем стандартный подход
      await downloadFileAndroid(url, filename, type);
    } else {
      // Для десктопа используем стандартный подход
      await downloadFileDesktop(url, filename);
    }
  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
    // Fallback на стандартный метод
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Скачивание для iOS
 */
async function downloadFileIOS(url: string, filename: string, type: 'image' | 'video'): Promise<void> {
  try {
    // Скачиваем файл как blob
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Создаем URL для blob
    const blobUrl = URL.createObjectURL(blob);
    
    // Для iOS нужно открыть в новой вкладке, чтобы пользователь мог сохранить
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.target = '_blank';
    
    // Добавляем атрибуты для iOS
    link.setAttribute('download', filename);
    
    // Для видео на iOS лучше открыть в новой вкладке
    if (type === 'video') {
      window.open(blobUrl, '_blank');
      // Освобождаем URL через некоторое время
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }
    
    // Для изображений пробуем скачать
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Освобождаем URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    
    // На iOS пользователю нужно будет нажать и удерживать, чтобы сохранить
    // Показываем подсказку (опционально)
  } catch (error) {
    console.error('Ошибка при скачивании на iOS:', error);
    // Fallback: открываем в новой вкладке
    window.open(url, '_blank');
  }
}

/**
 * Скачивание для Android
 */
async function downloadFileAndroid(url: string, filename: string, type: 'image' | 'video'): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    console.error('Ошибка при скачивании на Android:', error);
    // Fallback
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Скачивание для десктопа
 */
async function downloadFileDesktop(url: string, filename: string): Promise<void> {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

