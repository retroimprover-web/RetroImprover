import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Используем API ключ из переменной окружения или предоставленный ключ
const API_KEY = process.env.GOOGLE_GENAI_API_KEY || 'AIzaSyC_Ct97exunarnCVEjuiMTJgnhis9N_X0c';
const genAI = new GoogleGenerativeAI(API_KEY);

// Промпт для восстановления фотографий
const RESTORE_SYSTEM_PROMPT = `You are a professional photo restoration AI. Analyze this vintage or damaged photo and provide detailed restoration instructions. The image needs to be enhanced to look like a modern high-quality photo. Focus on:
1. Removing scratches, dust, and damage
2. Restoring faded colors
3. Improving sharpness and clarity
4. Enhancing contrast and brightness
5. Fixing any discoloration
6. Maintaining the original character and authenticity

Return a detailed description of what needs to be restored.`;

// Промпт для генерации анимационных промптов
const ANIMATION_PROMPTS_SYSTEM_PROMPT = `You are a creative AI assistant. Analyze this restored vintage photo and generate 4 different, creative animation prompts that would bring this photo to life. Each prompt should describe a cinematic, smooth motion that fits the scene. Return only a JSON array of 4 strings, no additional text.`;

// Промпт для видео
const VIDEO_PROMPT_PREFIX = `Cinematic shot, `;
const VIDEO_PROMPT_SUFFIX = `, high quality, smooth motion, professional cinematography, 4K`;

/**
 * Восстанавливает изображение используя Google Gemini 2.5 Flash Image
 * Модель: gemini-2.5-flash-image (Image-to-Image)
 * Задача: Убрать шум, добавить детали, исправить цветопередачу старого снимка
 */
export async function restoreImage(imagePath: string): Promise<string> {
  try {
    console.log('🔄 Начало восстановления изображения через Gemini 2.5 Flash Image...');
    
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    // Используем Gemini 2.5 Flash Image для восстановления
    // Если модель недоступна, пробуем альтернативные варианты
    let model;
    try {
      model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-image',
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
        }
      });
    } catch (modelError: any) {
      console.warn('Модель gemini-2.5-flash-image недоступна, пробуем gemini-1.5-flash...');
      model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
        }
      });
    }
    
    // Системная инструкция для восстановления
    const restorePrompt = `Act as a professional photo restorer. Remove noise, fix colors, and enhance details. Output ONLY the restored image.`;
    
    // Подготовка картинки
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    // Вызов модели
    const result = await model.generateContent([
      { text: restorePrompt },
      imagePart,
    ]);

    const response = await result.response;
    
    // Поиск картинки в ответе
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (parts && parts.length > 0) {
      // Ищем изображение в ответе
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          // Нашли изображение в ответе!
          const restoredImageBase64 = part.inlineData.data;
          
          // Сохраняем восстановленное изображение
          const ext = path.extname(imagePath);
          const restoredFileName = `restored-${Date.now()}${ext}`;
          const restoredImagePath = path.join(path.dirname(imagePath), restoredFileName);
          
          const restoredImageBuffer = Buffer.from(restoredImageBase64, 'base64');
          fs.writeFileSync(restoredImagePath, restoredImageBuffer);
          
          console.log('✅ Восстановленное изображение успешно сгенерировано и сохранено:', restoredImagePath);
          return restoredImagePath;
        }
      }
    }
    
    // Если изображение не найдено в ответе, пробуем извлечь из текста
    const text = response.text();
    console.log('⚠️ Изображение не найдено в parts, проверяем текст ответа...');
    
    // Пытаемся найти base64 изображение в тексте
    const base64Match = text.match(/data:image\/(jpeg|png|jpg);base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      const restoredImageBase64 = base64Match[2];
      console.log('✅ Найдено base64 изображение в тексте ответа');
      
      const ext = path.extname(imagePath);
      const restoredFileName = `restored-${Date.now()}${ext}`;
      const restoredImagePath = path.join(path.dirname(imagePath), restoredFileName);
      
      const restoredImageBuffer = Buffer.from(restoredImageBase64, 'base64');
      fs.writeFileSync(restoredImagePath, restoredImageBuffer);
      
      console.log('✅ Восстановленное изображение успешно сохранено:', restoredImagePath);
      return restoredImagePath;
    }
    
    // Если изображение не найдено, выбрасываем ошибку
    console.error('❌ Модель не вернула восстановленное изображение');
    console.error('Ответ модели:', text.substring(0, 500));
    throw new Error('Модель не вернула восстановленное изображение. Попробуйте другую модель или проверьте API ключ.');
    
  } catch (error: any) {
    console.error('❌ Ошибка при восстановлении изображения:', error);
    console.error('Детали ошибки:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Не удалось восстановить изображение: ${error.message}`);
  }
}

/**
 * Генерирует промпты для анимации используя Gemini 3 Flash Preview
 * Модель: gemini-3-flash-preview
 * Задача: «Посмотреть» на восстановленное фото и придумать 4 варианта того, как это фото могло бы ожить
 */
export async function generateAnimationPrompts(restoredImagePath: string): Promise<string[]> {
  try {
    console.log('🔄 Генерация промптов для анимации через Gemini 3 Flash Preview...');
    
    const imageData = fs.readFileSync(restoredImagePath);
    const base64Image = imageData.toString('base64');
    const mimeType = restoredImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    // Используем Gemini 3 Flash Preview
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    } catch (modelError: any) {
      console.warn('Модель gemini-3-flash-preview недоступна, пробуем gemini-2.5-flash...');
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
    
    // Промпт для генерации идей
    const prompt = `Analyze this photo. Describe 4 cinematic camera movements or subtle character animations to bring this scene to life. Return only a JSON array of 4 short English phrases.`;
    
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    console.log('Ответ модели для промптов:', text.substring(0, 300));
    
    // Парсим JSON из ответа
    try {
      // Пытаемся найти JSON в тексте
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        const prompts = JSON.parse(jsonMatch[0]);
        if (Array.isArray(prompts) && prompts.length >= 4) {
          console.log('✅ Успешно сгенерировано', prompts.length, 'промптов');
          return prompts.slice(0, 4);
        }
      }
      
      // Если не нашли JSON, пытаемся распарсить весь текст
      const prompts = JSON.parse(text);
      if (Array.isArray(prompts) && prompts.length >= 4) {
        console.log('✅ Успешно сгенерировано', prompts.length, 'промптов');
        return prompts.slice(0, 4);
      }
    } catch (parseError) {
      console.warn('Не удалось распарсить JSON, извлекаем промпты из текста...');
      // Если не JSON, пытаемся извлечь промпты из текста
      const lines = text
        .split('\n')
        .filter(line => line.trim().length > 0 && !line.match(/^[\[\],\s]*$/))
        .map(line => line.replace(/^[\d.\-\s]*/, '').replace(/[\[\]",]/g, '').trim())
        .filter(line => line.length > 10);
      
      if (lines.length >= 4) {
        console.log('✅ Извлечено', lines.length, 'промптов из текста');
        return lines.slice(0, 4);
      }
    }
    
    throw new Error('Не удалось сгенерировать 4 промпта');
  } catch (error: any) {
    console.error('❌ Ошибка при генерации промптов:', error);
    throw new Error(`Не удалось сгенерировать промпты для анимации: ${error.message}`);
  }
}

/**
 * Генерирует видео используя Veo 3.1 Fast Generate Preview
 * Модель: veo-3.1-fast-generate-preview
 * Задача: Превратить статичное восстановленное фото в 5-секундный ролик
 * 
 * Использует асинхронный подход с поллингом, так как генерация видео занимает 1-2 минуты
 */
export async function generateVideo(imagePath: string, prompts: string[]): Promise<string> {
  try {
    console.log('🔄 Начало генерации видео через Veo 3.1 Fast Generate Preview...');
    
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    // Объединяем промпты
    const combinedPrompt = prompts.join(', ');
    const fullPrompt = `Cinematic animation: ${combinedPrompt}. High quality, 4k, realistic, smooth motion.`;
    
    console.log('Промпт для видео:', fullPrompt);
    
    // Пробуем использовать Veo API через REST, так как SDK может не поддерживать видео напрямую
    try {
      // Запуск операции генерации видео (асинхронно)
      const operationResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:generateVideo?key=${API_KEY}`,
        {
          prompt: fullPrompt,
          image: {
            imageBytes: base64Image,
            mimeType: mimeType,
          },
          config: {
            aspectRatio: '3:4',
            resolution: '720p',
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      let operation = operationResponse.data;
      console.log('Операция запущена, operation name:', operation.name);
      
      // Поллинг: проверяем статус каждые 10 секунд
      const maxAttempts = 30; // Максимум 5 минут (30 * 10 секунд)
      let attempts = 0;
      
      while (!operation.done && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Ждем 10 секунд
        
        // Проверяем статус операции
        const statusResponse = await axios.get(
          `https://generativelanguage.googleapis.com/v1beta/${operation.name}?key=${API_KEY}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        operation = statusResponse.data;
        attempts++;
        console.log(`Проверка статуса (попытка ${attempts}/${maxAttempts}):`, operation.done ? 'готово' : 'в процессе...');
      }
      
      if (!operation.done) {
        throw new Error('Превышено время ожидания генерации видео');
      }
      
      // Получаем ссылку на видео
      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) {
        throw new Error('Видео не найдено в ответе операции');
      }
      
      console.log('✅ Видео успешно сгенерировано, URI:', videoUri);
      
      // Скачиваем видео и сохраняем локально
      const videoResponse = await axios.get(videoUri, {
        responseType: 'arraybuffer',
      });
      
      const videoFileName = `video-${Date.now()}.mp4`;
      const videoPath = path.join(path.dirname(imagePath), videoFileName);
      fs.writeFileSync(videoPath, videoResponse.data);
      
      console.log('✅ Видео сохранено:', videoPath);
      return videoPath;
      
    } catch (restError: any) {
      console.warn('REST API для Veo не сработал, пробуем через SDK...', restError.message);
      
      // Fallback: пробуем через SDK (может не работать для видео)
      try {
        const model = genAI.getGenerativeModel({ model: 'veo-3.1-fast-generate-preview' });
        
        const result = await model.generateContent([
          { text: fullPrompt },
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
        ]);

        const response = await result.response;
        const text = response.text();
        
        // Пытаемся найти URL видео в ответе
        const urlMatch = text.match(/https?:\/\/[^\s]+\.mp4/);
        if (urlMatch) {
          const videoUrl = urlMatch[0];
          
          // Скачиваем видео
          const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
          });
          
          const videoFileName = `video-${Date.now()}.mp4`;
          const videoPath = path.join(path.dirname(imagePath), videoFileName);
          fs.writeFileSync(videoPath, videoResponse.data);
          
          console.log('✅ Видео сохранено через SDK:', videoPath);
          return videoPath;
        }
        
        throw new Error('URL видео не найден в ответе');
      } catch (sdkError: any) {
        console.error('❌ Ошибка при генерации видео через SDK:', sdkError);
        throw new Error(`Не удалось сгенерировать видео: ${sdkError.message}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка при генерации видео:', error);
    console.error('Детали ошибки:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Не удалось сгенерировать видео: ${error.message}`);
  }
}

