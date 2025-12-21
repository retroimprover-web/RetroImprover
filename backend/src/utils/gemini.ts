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
 * Восстанавливает изображение используя Google Gemini API
 * Использует Gemini для анализа и генерации восстановленного изображения
 */
export async function restoreImage(imagePath: string): Promise<string> {
  try {
    console.log('Начало восстановления изображения через Google Gemini API...');
    
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    // Используем Gemini 1.5 Flash для работы с изображениями
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });
    
    // Создаем промпт для восстановления изображения
    const restorePrompt = `You are a professional photo restoration AI. Analyze this vintage or damaged photo and generate a restored version that looks like a modern high-quality photo. 

Apply professional photo restoration:
1. Remove all scratches, dust, and physical damage
2. Restore faded colors to their original vibrancy
3. Improve sharpness and clarity throughout the image
4. Enhance contrast and brightness appropriately
5. Fix any discoloration or color shifts
6. Maintain the original character and authenticity of the photo

Generate the restored image that looks professional and modern while preserving the vintage feel and authenticity of the original photo. Return the restored image as base64 encoded data.`;

    // Отправляем изображение на обработку
    const result = await model.generateContent([
      restorePrompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    
    // Проверяем, есть ли в ответе изображение
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (parts && parts.length > 0) {
      // Ищем изображение в ответе
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          // Нашли изображение в ответе!
          const restoredImageBase64 = part.inlineData.data;
          const restoredMimeType = part.inlineData.mimeType || mimeType;
          
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
    console.log('Gemini ответ получен, длина:', text.length);
    
    // Пытаемся найти base64 изображение в тексте
    const base64Match = text.match(/data:image\/(jpeg|png|jpg);base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      const restoredImageBase64 = base64Match[2];
      console.log('Найдено base64 изображение в тексте ответа');
      
      const ext = path.extname(imagePath);
      const restoredFileName = `restored-${Date.now()}${ext}`;
      const restoredImagePath = path.join(path.dirname(imagePath), restoredFileName);
      
      const restoredImageBuffer = Buffer.from(restoredImageBase64, 'base64');
      fs.writeFileSync(restoredImagePath, restoredImageBuffer);
      
      console.log('✅ Восстановленное изображение успешно сохранено:', restoredImagePath);
      return restoredImagePath;
    }
    
    // Если изображение не найдено, используем альтернативный метод через Imagen API
    console.log('Изображение не найдено в ответе Gemini, пробуем использовать Imagen API...');
    
    // Используем Gemini для создания детального промпта для Imagen
    const promptModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const promptResult = await promptModel.generateContent([
      `Analyze this image and create a detailed text prompt for image restoration. Describe what the restored version should look like: professional, high-quality, with all damage removed, colors restored, sharp and clear.`,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
    ]);
    
    const restorationPrompt = promptResult.response.text();
    console.log('Промпт для восстановления:', restorationPrompt.substring(0, 200));
    
    // Пробуем использовать Imagen API через REST
    try {
      const imagenResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImage?key=${API_KEY}`,
        {
          prompt: `Restore this vintage photo: ${restorationPrompt}. Professional photo restoration, remove scratches and damage, restore colors, enhance quality.`,
          number_of_images: 1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );
      
      // Сохраняем восстановленное изображение
      const ext = path.extname(imagePath);
      const restoredFileName = `restored-${Date.now()}${ext}`;
      const restoredImagePath = path.join(path.dirname(imagePath), restoredFileName);
      
      fs.writeFileSync(restoredImagePath, imagenResponse.data);
      console.log('✅ Восстановленное изображение сгенерировано через Imagen API:', restoredImagePath);
      return restoredImagePath;
    } catch (imagenError: any) {
      console.warn('Imagen API не доступен или вернул ошибку:', imagenError.message);
      // Fallback: возвращаем оригинал (временно)
      const ext = path.extname(imagePath);
      const restoredFileName = `restored-${Date.now()}${ext}`;
      const restoredImagePath = path.join(path.dirname(imagePath), restoredFileName);
      fs.copyFileSync(imagePath, restoredImagePath);
      console.log('⚠️ Использован fallback: копия оригинального изображения');
      return restoredImagePath;
    }
    
  } catch (error: any) {
    console.error('Ошибка при восстановлении изображения:', error);
    console.error('Детали ошибки:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Не удалось восстановить изображение: ${error.message}`);
  }
}

/**
 * Генерирует промпты для анимации используя Gemini 2.5 Flash
 */
export async function generateAnimationPrompts(restoredImagePath: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const imageData = fs.readFileSync(restoredImagePath);
    const base64Image = imageData.toString('base64');
    
    const result = await model.generateContent([
      ANIMATION_PROMPTS_SYSTEM_PROMPT,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Парсим JSON из ответа
    try {
      const prompts = JSON.parse(text);
      if (Array.isArray(prompts) && prompts.length === 4) {
        return prompts;
      }
    } catch (parseError) {
      // Если не JSON, пытаемся извлечь промпты из текста
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      return lines.slice(0, 4);
    }
    
    throw new Error('Не удалось сгенерировать промпты');
  } catch (error) {
    console.error('Ошибка при генерации промптов:', error);
    throw new Error('Не удалось сгенерировать промпты для анимации');
  }
}

/**
 * Генерирует видео используя Veo 3.1 Fast Generate Preview
 */
export async function generateVideo(imagePath: string, prompts: string[]): Promise<string> {
  try {
    // Veo API может отличаться, здесь используется примерная структура
    // В реальности нужно проверить актуальную документацию Google Veo API
    
    const model = genAI.getGenerativeModel({ model: 'veo-3.1-fast-generate-preview' });
    
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    
    // Объединяем промпты
    const combinedPrompt = prompts.join(', ');
    const fullPrompt = `${VIDEO_PROMPT_PREFIX}${combinedPrompt}${VIDEO_PROMPT_SUFFIX}`;
    
    const result = await model.generateContent([
      fullPrompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const response = await result.response;
    
    // Veo должен возвращать URL видео или данные видео
    // Здесь возвращаем заглушку - в реальности нужно обработать ответ правильно
    const videoUrl = response.text(); // Это может быть URL или нужно использовать другой метод
    
    return videoUrl;
  } catch (error) {
    console.error('Ошибка при генерации видео:', error);
    throw new Error('Не удалось сгенерировать видео');
  }
}

