// This file is now acting as the API Client for your Backend
// Backend runs on localhost:3000 in development, or VITE_API_URL in production
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    credits: number;
  };
}

interface ProjectResponse {
  id: string;
  originalImage: string;
  restoredImage: string;
  video: string | null;
  prompts: string[]; // Stored as JSON string in DB usually, parsed here
  isLiked: boolean;
  createdAt: string;
}

// --- Auth Services ---

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
};

export const registerUser = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
};

export const getProfile = async (token: string) => {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
};

// Проверка доступности OAuth провайдеров
export const getOAuthStatus = async (): Promise<{ google: boolean; facebook: boolean; apple: boolean }> => {
  const res = await fetch(`${API_URL}/auth/oauth/status`);
  if (!res.ok) return { google: false, facebook: false, apple: false };
  return res.json();
};

// --- Project / Gallery Services ---

export const getProjects = async (token: string, likedOnly = false): Promise<ProjectResponse[]> => {
  const res = await fetch(`${API_URL}/projects${likedOnly ? '?liked=true' : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
};

export const toggleLikeProject = async (token: string, projectId: string): Promise<void> => {
  await fetch(`${API_URL}/projects/${projectId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// --- AI Generation Services ---

export const restorePhoto = async (token: string, imageFile: File | Blob): Promise<{ project: ProjectResponse, creditsLeft: number }> => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await fetch(`${API_URL}/ai/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Restoration failed');
  }
  return res.json();
};

export const generatePrompts = async (token: string, projectId: string): Promise<string[]> => {
  const res = await fetch(`${API_URL}/ai/prompts`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ projectId }),
  });

  if (!res.ok) throw new Error('Failed to generate prompts');
  const data = await res.json();
  return data.prompts;
};

export const generateVideo = async (token: string, projectId: string, selectedPrompts: string[]): Promise<{ videoUrl: string, creditsLeft: number }> => {
  const res = await fetch(`${API_URL}/ai/video`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ projectId, selectedPrompts }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Video generation failed');
  }
  return res.json();
};
