import { Request, Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth';

/**
 * Эндпоинт для скачивания файлов с правильными заголовками
 * Обеспечивает принудительное скачивание на всех устройствах, включая мобильные
 */
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { url, filename } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL обязателен' });
      return;
    }

    // Определяем тип файла по URL или расширению
    const urlLower = url.toLowerCase();
    const isVideo = urlLower.includes('.mp4') || 
                    urlLower.includes('video') || 
                    urlLower.includes('videos/') ||
                    urlLower.includes('video/');
    
    const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
    
    // Определяем имя файла
    let finalFilename = filename as string;
    if (!finalFilename) {
      // Извлекаем имя файла из URL
      const urlParts = url.split('/');
      const urlFilename = urlParts[urlParts.length - 1];
      if (urlFilename && urlFilename.includes('.')) {
        finalFilename = urlFilename;
      } else {
        finalFilename = isVideo ? 'video.mp4' : 'image.jpg';
      }
    }

    // Скачиваем файл с исходного URL (R2 или другой источник)
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 60000, // 60 секунд
      headers: {
        'Accept': contentType,
      },
    });

    // Устанавливаем заголовки для принудительного скачивания
    // Content-Disposition: attachment заставляет браузер скачать файл вместо открытия
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
    
    // Передаем размер файла если доступен
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    // Отправляем файл потоком
    response.data.pipe(res);
    
  } catch (error: any) {
    console.error('❌ Ошибка при скачивании файла:', error);
    
    if (error.response) {
      res.status(error.response.status).json({ 
        error: 'Не удалось скачать файл',
        details: error.message 
      });
    } else {
      res.status(500).json({ error: 'Ошибка при скачивании файла' });
    }
  }
};

