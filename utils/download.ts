/**
 * Утилита для стабильного скачивания файлов на всех устройствах
 * Использует серверный эндпоинт для принудительного скачивания
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

/**
 * Скачивает файл через серверный эндпоинт для надежного скачивания на всех устройствах
 * @param url - URL файла для скачивания
 * @param filename - Имя файла для сохранения
 * @param type - Тип файла ('image' или 'video')
 * @param token - JWT токен для авторизации
 */
export async function downloadFile(
  url: string, 
  filename: string, 
  type: 'image' | 'video' = 'image',
  token?: string
): Promise<void> {
  try {
    // Если есть токен, используем серверный эндпоинт (самый надежный способ)
    if (token) {
      const downloadUrl = `${API_URL}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      
      // Скачиваем через fetch с авторизацией
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Не удалось скачать файл через сервер');
      }

      // Получаем blob
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Создаем ссылку для скачивания
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';

      // Добавляем в DOM (важно для iOS)
      document.body.appendChild(link);

      // Триггерим клик
      link.click();

      // Удаляем ссылку и освобождаем память
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);

      return;
    }

    // Fallback: прямое скачивание без сервера (если нет токена)
    await downloadFileDirect(url, filename, type);
    
  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
    
    // Последний fallback: открываем в новой вкладке
    try {
      await downloadFileDirect(url, filename, type);
    } catch (fallbackError) {
      console.error('Fallback скачивание также не удалось:', fallbackError);
      // Открываем в новой вкладке как последний вариант
      window.open(url, '_blank');
    }
  }
}

/**
 * Прямое скачивание файла (fallback метод)
 */
async function downloadFileDirect(url: string, filename: string, type: 'image' | 'video'): Promise<void> {
  // Скачиваем файл через fetch
  const response = await fetch(url, {
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error('Не удалось загрузить файл');
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  // Создаем ссылку для скачивания
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.style.display = 'none';

  // Добавляем в DOM (критично для мобильных устройств)
  document.body.appendChild(link);

  // Триггерим клик
  link.click();

  // Удаляем ссылку и освобождаем память
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 100);
}

