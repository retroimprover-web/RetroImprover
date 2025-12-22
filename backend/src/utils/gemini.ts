import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Используем API ключ из переменной окружения
const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

if (!API_KEY) {
  console.error('❌ GOOGLE_GENAI_API_KEY не установлен в переменных окружения!');
  throw new Error('GOOGLE_GENAI_API_KEY не установлен. Установите переменную окружения GOOGLE_GENAI_API_KEY.');
}

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
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
      }
    });
    
    // Системная инструкция для восстановления
    const restorePrompt = `Act as a professional photo restorer. Restore this vintage or damaged photo to look like a modern high-quality photo. 

Remove all defects:
- Remove noise, grain, and artifacts
- Remove blur and restore sharpness
- Remove scratches, dust, and physical damage
- Remove stains and discoloration
- Remove fading and restore color vibrancy

Enhance quality:
- Improve sharpness and clarity throughout the image
- Enhance contrast and brightness appropriately
- Fix any color shifts and restore natural colors
- Maintain the original character and authenticity

Output ONLY the restored image without any text or description.`;
    
    // Подготовка картинки
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    // Вызов модели
    console.log('📤 Отправка запроса к gemini-2.5-flash-image...');
    const result = await model.generateContent([
      { text: restorePrompt },
      imagePart,
    ]);

    const response = await result.response;
    console.log('✅ Получен ответ от модели');
    
    // Поиск картинки в ответе
    const parts = response.candidates?.[0]?.content?.parts;
    console.log('Количество parts в ответе:', parts?.length || 0);
    
    if (parts && parts.length > 0) {
      // Ищем изображение в ответе
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        console.log(`Part ${i} type:`, part.inlineData ? 'inlineData' : 'text');
        
        if (part.inlineData && part.inlineData.data) {
          // Нашли изображение в ответе!
          const restoredImageBase64 = part.inlineData.data;
          console.log('✅ Найдено изображение в ответе, размер base64:', restoredImageBase64.length);
          
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
    console.log('Длина текста ответа:', text.length);
    console.log('Первые 500 символов:', text.substring(0, 500));
    
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
    console.error('Полный ответ модели:', JSON.stringify(response, null, 2));
    throw new Error('Модель gemini-2.5-flash-image не вернула восстановленное изображение. Проверьте API ключ и доступность модели.');
    
  } catch (error: any) {
    console.error('❌ Ошибка при восстановлении изображения:', error);
    console.error('Детали ошибки:', error.message);
    if (error.response) {
      console.error('Ответ API:', JSON.stringify(error.response.data, null, 2));
    }
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
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
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
    console.log('📋 API Key установлен:', API_KEY ? '✅ Да (первые 10 символов: ' + API_KEY.substring(0, 10) + '...)' : '❌ Нет');
    
    if (!API_KEY) {
      throw new Error('GOOGLE_GENAI_API_KEY не установлен в переменных окружения');
    }
    
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    console.log('📸 Размер изображения:', imageData.length, 'байт');
    console.log('📸 MIME тип:', mimeType);
    
    // Объединяем промпты
    const combinedPrompt = prompts.join(', ');
    const fullPrompt = `Cinematic animation: ${combinedPrompt}. High quality, 4k, realistic, smooth motion.`;
    
    console.log('📝 Промпт для видео:', fullPrompt);
    console.log('📝 Количество промптов:', prompts.length);
    
    // Пробуем использовать Veo API через REST
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:generateVideo?key=${API_KEY}`;
      console.log('🌐 Отправка запроса к:', apiUrl.replace(API_KEY, 'API_KEY_HIDDEN'));
      
      const requestBody = {
        prompt: fullPrompt,
        image: {
          imageBytes: base64Image,
          mimeType: mimeType,
        },
        config: {
          aspectRatio: '3:4',
          resolution: '720p',
        }
      };
      
      console.log('📤 Тело запроса (без imageBytes):', {
        prompt: requestBody.prompt,
        image: { mimeType: requestBody.image.mimeType, imageBytesLength: requestBody.image.imageBytes.length },
        config: requestBody.config
      });
      
      // Запуск операции генерации видео (асинхронно)
      const operationResponse = await axios.post(
        apiUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 секунд таймаут для начального запроса
        }
      );
      
      let operation = operationResponse.data;
      console.log('✅ Операция запущена');
      console.log('📋 Operation name:', operation.name);
      console.log('📋 Operation done:', operation.done);
      console.log('📋 Operation response:', JSON.stringify(operation, null, 2).substring(0, 500));
      
      // Если операция уже завершена (синхронный ответ)
      if (operation.done) {
        console.log('✅ Операция завершена синхронно');
      } else {
        // Поллинг: проверяем статус каждые 10 секунд
        const maxAttempts = 30; // Максимум 5 минут (30 * 10 секунд)
        let attempts = 0;
        
        console.log('⏳ Начинаем поллинг статуса операции...');
        
        while (!operation.done && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Ждем 10 секунд
          
          // Проверяем статус операции
          const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${operation.name}?key=${API_KEY}`;
          console.log(`🔄 Проверка статуса (попытка ${attempts + 1}/${maxAttempts})...`);
          
          const statusResponse = await axios.get(
            statusUrl,
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 30000, // 30 секунд таймаут
            }
          );
          
          operation = statusResponse.data;
          attempts++;
          console.log(`📊 Статус операции (попытка ${attempts}/${maxAttempts}):`, {
            done: operation.done,
            error: operation.error ? JSON.stringify(operation.error) : null,
            response: operation.response ? 'present' : 'missing'
          });
          
          if (operation.error) {
            console.error('❌ Ошибка в операции:', JSON.stringify(operation.error, null, 2));
            throw new Error(`Ошибка генерации видео: ${JSON.stringify(operation.error)}`);
          }
        }
      }
      
      if (!operation.done) {
        throw new Error('Превышено время ожидания генерации видео (5 минут)');
      }
      
      console.log('✅ Операция завершена, извлекаем результат...');
      console.log('📋 Полный ответ операции:', JSON.stringify(operation, null, 2).substring(0, 1000));
      
      // Получаем ссылку на видео
      const response = operation.response;
      if (!response) {
        console.error('❌ Нет поля response в операции');
        throw new Error('Ответ операции не содержит поле response');
      }
      
      const generatedVideos = response.generatedVideos;
      if (!generatedVideos || !Array.isArray(generatedVideos) || generatedVideos.length === 0) {
        console.error('❌ Нет generatedVideos в ответе');
        console.error('📋 Структура response:', JSON.stringify(response, null, 2));
        throw new Error('Видео не найдено в ответе операции. Проверьте доступность модели Veo для вашего API ключа.');
      }
      
      const video = generatedVideos[0]?.video;
      if (!video) {
        console.error('❌ Нет video в generatedVideos[0]');
        throw new Error('Структура ответа неверна: нет поля video');
      }
      
      const videoUri = video.uri;
      if (!videoUri) {
        console.error('❌ Нет uri в video');
        throw new Error('Ссылка на видео не найдена в ответе');
      }
      
      console.log('✅ Видео успешно сгенерировано');
      console.log('🔗 Video URI:', videoUri);
      
      // Скачиваем видео и сохраняем локально
      console.log('📥 Скачивание видео...');
      const videoResponse = await axios.get(videoUri, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 минуты на скачивание
      });
      
      const videoFileName = `video-${Date.now()}.mp4`;
      const videoPath = path.join(path.dirname(imagePath), videoFileName);
      fs.writeFileSync(videoPath, videoResponse.data);
      
      console.log('✅ Видео сохранено:', videoPath);
      console.log('📊 Размер видео:', videoResponse.data.length, 'байт');
      return videoPath;
      
    } catch (restError: any) {
      console.error('❌ Ошибка при генерации видео через REST API');
      console.error('📋 Сообщение ошибки:', restError.message);
      
      if (restError.response) {
        console.error('📋 HTTP статус:', restError.response.status);
        console.error('📋 HTTP статус текст:', restError.response.statusText);
        console.error('📋 Ответ API:', JSON.stringify(restError.response.data, null, 2));
        
        // Специфичные ошибки
        if (restError.response.status === 400) {
          throw new Error(`Неверный запрос: ${JSON.stringify(restError.response.data)}`);
        }
        if (restError.response.status === 401) {
          throw new Error('API ключ недействителен или отсутствует. Проверьте GOOGLE_GENAI_API_KEY в переменных окружения Railway.');
        }
        if (restError.response.status === 403) {
          throw new Error('Доступ запрещен. Проверьте, что API ключ имеет доступ к Veo API и не был скомпрометирован.');
        }
        if (restError.response.status === 404) {
          throw new Error('Модель veo-3.1-fast-generate-preview недоступна. Проверьте доступность модели для вашего API ключа в Google AI Studio.');
        }
        if (restError.response.status === 429) {
          throw new Error('Превышен лимит запросов. Попробуйте позже.');
        }
        if (restError.response.status >= 500) {
          throw new Error(`Ошибка сервера Google API: ${restError.response.status}. Попробуйте позже.`);
        }
      }
      
      if (restError.request) {
        console.error('📋 Запрос был отправлен, но ответа не получено');
        console.error('📋 URL запроса:', restError.config?.url?.replace(API_KEY, 'API_KEY_HIDDEN'));
      }
      
      if (restError.code === 'ECONNABORTED') {
        throw new Error('Превышено время ожидания запроса. Попробуйте позже.');
      }
      
      throw new Error(`Не удалось сгенерировать видео: ${restError.message}`);
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

