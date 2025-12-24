import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Replicate from 'replicate';

// API ключи из переменных окружения
const API_KEY = process.env.GOOGLE_GENAI_API_KEY; // Для восстановления изображений
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN; // Для генерации видео

if (!API_KEY) {
  console.error('❌ GOOGLE_GENAI_API_KEY не установлен в переменных окружения!');
  throw new Error('GOOGLE_GENAI_API_KEY не установлен. Установите переменную окружения GOOGLE_GENAI_API_KEY.');
}

if (!REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN не установлен в переменных окружения!');
  console.warn('⚠️ Генерация видео будет недоступна без REPLICATE_API_TOKEN');
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
    const restorePrompt = `Restore and enhance this old photo to modern quality without changing objects and details. Remove scratches, stains, wear marks, and physical damage. Eliminate blur, noise, film grain, and scanning artifacts. Increase sharpness and clarity of details (faces, textures, fine elements). 

Enhance colors and contrast:
- Significantly increase color saturation to make colors vibrant and rich
- Improve contrast and dynamic range for better visual impact
- Enhance color depth and richness while maintaining natural appearance
- Boost color intensity to make the image more vivid and appealing
- Restore shadow depth and highlight brightness

If the photo is black and white, sepia, or has faded colors, restore and normalize color rendition naturally with rich, saturated colors. Restore blurred or unclear areas using image context.

The result should look like a professional high-quality photograph with vibrant, saturated colors and strong contrast.

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
    
    // Промпт для генерации идей (с учетом языка пользователя)
    // Пока всегда на английском для промпта, но подсказки могут быть на русском
    const prompt = `Analyze this photo. Describe 4 simple, positive, and friendly animation ideas to bring this scene to life. Each idea should describe natural, gentle movements like slight smile, blinking, small head movements, or subtle gestures. Do NOT include camera movements (zoom, pan, etc.) or negative actions. Movements should be natural, smooth, and contextually appropriate to the photo. Return only a JSON array of 4 short English phrases.`;
    
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
 * Генерирует видео используя Replicate WAN 2.2 i2v-fast
 * Модель: wan-video/wan-2.2-i2v-fast
 * Задача: Превратить статичное восстановленное фото в 5-секундный ролик
 */
export async function generateVideo(imagePath: string, prompts: string[]): Promise<string> {
  try {
    console.log('🔄 Начало генерации видео через Replicate WAN 2.2...');
    console.log('📋 API Key установлен:', REPLICATE_API_TOKEN ? '✅ Да' : '❌ Нет');
    
    if (!REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN не установлен в переменных окружения');
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN,
    });

    // Читаем изображение и конвертируем в base64 data URI
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const imageDataUri = `data:${mimeType};base64,${base64Image}`;
    
    console.log('📸 Размер изображения:', imageData.length, 'байт');
    console.log('📸 MIME тип:', mimeType);
    
    // Объединяем промпты и добавляем базовый промпт
    const combinedPrompt = prompts.join(', ');
    const fullPrompt = `Animate this photo. Camera is static. Add positive emotions and friendly gestures: slight smile, blinking, small head movements. Movements should be natural and smooth. ${combinedPrompt}`;
    
    console.log('📝 Промпт для видео:', fullPrompt);
    console.log('📝 Количество промптов:', prompts.length);

    // Запускаем генерацию через Replicate
    console.log('🚀 Отправка запроса к Replicate WAN 2.2...');
    
    const output = await replicate.run(
      "wan-video/wan-2.2-i2v-fast",
      {
        input: {
          image: imageDataUri,
          prompt: fullPrompt,
          resolution: "480p", // 480p быстрее и дешевле
          duration: 5, // 5 секунд видео
        }
      }
    );

    console.log('✅ Видео успешно сгенерировано');
    console.log('📋 Raw output type:', typeof output);
    console.log('📋 Raw output:', JSON.stringify(output, null, 2).substring(0, 500));

    // Извлекаем URL из ответа (может быть строка, массив или объект)
    let videoUrl: string;
    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      videoUrl = typeof output[0] === 'string' ? output[0] : String(output[0]);
    } else if (output && typeof output === 'object') {
      // Пытаемся найти URL в объекте
      const outputStr = JSON.stringify(output);
      const urlMatch = outputStr.match(/https?:\/\/[^\s"']+/);
      if (urlMatch) {
        videoUrl = urlMatch[0];
      } else {
        throw new Error('Не удалось найти URL видео в ответе Replicate');
      }
    } else {
      throw new Error(`Неожиданный формат ответа от Replicate: ${typeof output}`);
    }

    console.log('🔗 Video URL:', videoUrl);

    // Скачиваем видео и сохраняем локально
    console.log('📥 Скачивание видео...');
    const videoResponse = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 120000, // 2 минуты на скачивание
    });

    const videoFileName = `video-${Date.now()}.mp4`;
    const videoPath = path.join(path.dirname(imagePath), videoFileName);
    fs.writeFileSync(videoPath, videoResponse.data);

    console.log('✅ Видео сохранено:', videoPath);
    console.log('📊 Размер видео:', videoResponse.data.length, 'байт');
    
    return videoPath;

  } catch (error: any) {
    console.error('❌ Ошибка при генерации видео:', error);
    console.error('Детали ошибки:', error.message);
    
    if (error.response) {
      console.error('📋 HTTP статус:', error.response.status);
      console.error('📋 Ответ API:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw new Error(`Не удалось сгенерировать видео: ${error.message}`);
  }
}

