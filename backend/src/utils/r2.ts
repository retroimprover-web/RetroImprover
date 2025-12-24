import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Конфигурация Cloudflare R2
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Например: https://pub-xxx.r2.dev

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.warn('⚠️ Cloudflare R2 credentials не установлены. Файлы будут сохраняться локально.');
}

// Инициализация S3 клиента для R2
const s3Client = R2_ACCOUNT_ID ? new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
}) : null;

/**
 * Загружает файл в Cloudflare R2
 * @param filePath - Локальный путь к файлу
 * @param key - Ключ (путь) в R2 bucket (например: 'images/photo-123.jpg')
 * @returns Public URL файла в R2
 */
export async function uploadToR2(filePath: string, key: string): Promise<string> {
  if (!s3Client || !R2_BUCKET_NAME) {
    throw new Error('Cloudflare R2 не настроен. Проверьте переменные окружения.');
  }

  try {
    const fileContent = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Возвращаем public URL
    const publicUrl = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;

    console.log(`✅ Файл загружен в R2: ${publicUrl}`);
    return publicUrl;
  } catch (error: any) {
    console.error('❌ Ошибка при загрузке в R2:', error);
    throw new Error(`Не удалось загрузить файл в R2: ${error.message}`);
  }
}

/**
 * Удаляет файл из R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!s3Client || !R2_BUCKET_NAME) {
    return; // Если R2 не настроен, просто игнорируем
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`✅ Файл удален из R2: ${key}`);
  } catch (error: any) {
    console.error(`❌ Ошибка при удалении из R2: ${error.message}`);
  }
}

/**
 * Определяет Content-Type по расширению файла
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Генерирует уникальный ключ для файла в R2
 */
export function generateR2Key(filename: string, folder: string = 'uploads'): string {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(filename);
  return `${folder}/${uniqueSuffix}${ext}`;
}

/**
 * Получает локальный путь к файлу из R2 URL или локального пути
 * Если это R2 URL, скачивает файл временно
 * Если это локальный путь, возвращает его
 */
export async function getLocalFilePath(filePathOrUrl: string, tempDir: string = './uploads'): Promise<string> {
  // Проверяем, это URL или локальный путь
  const isUrl = filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://');
  
  if (!isUrl) {
    // Это локальный путь, просто возвращаем его
    if (fs.existsSync(filePathOrUrl)) {
      return filePathOrUrl;
    } else {
      throw new Error(`Локальный файл не найден: ${filePathOrUrl}`);
    }
  }

  // Это R2 URL, нужно скачать файл
  try {
    console.log(`📥 Скачивание файла из R2: ${filePathOrUrl}`);
    
    // Создаем временную директорию, если её нет
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Скачиваем файл через HTTP
    const response = await axios.get(filePathOrUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 секунд
    });

    // Определяем расширение файла из URL или Content-Type
    const urlPath = new URL(filePathOrUrl).pathname;
    const ext = path.extname(urlPath) || (response.headers['content-type']?.includes('image') ? '.jpg' : '.bin');
    const tempFileName = `temp-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // Сохраняем файл
    fs.writeFileSync(tempFilePath, response.data);
    console.log(`✅ Файл скачан во временную директорию: ${tempFilePath}`);

    return tempFilePath;
  } catch (error: any) {
    console.error('❌ Ошибка при скачивании файла из R2:', error);
    throw new Error(`Не удалось скачать файл из R2: ${error.message}`);
  }
}

