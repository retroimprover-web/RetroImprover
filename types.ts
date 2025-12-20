export enum AppStep {
  UPLOAD = 'UPLOAD',
  CROP = 'CROP',
  PREVIEW = 'PREVIEW',
  // Steps below denote that we have moved past the initial edit phase
  // and are now in the viewing/generating phase
  WORKBENCH = 'WORKBENCH', 
}

export enum ViewMode {
  ORIGINAL = 'ORIGINAL',
  RESTORED = 'RESTORED',
  VIDEO = 'VIDEO'
}

export enum AppTab {
  HOME = 'HOME',
  GALLERY = 'GALLERY',
  PROJECTS = 'PROJECTS',
  PLANS = 'PLANS'
}

export interface RestoredImage {
  id: string;
  originalUrl: string;
  restoredUrl: string;
  timestamp: number;
  videoUrl?: string | null;
}

export interface VideoPrompt {
  id: string;
  text: string;
}

export enum SubscriptionPlan {
  FREE = 'Free',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
}

export interface Point {
  x: number;
  y: number;
}

export interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}