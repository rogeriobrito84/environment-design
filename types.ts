export interface GeneratedImage {
  mimeType: string;
  data: string; // Base64 string
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GenerationResult {
  image: GeneratedImage | null;
  text: string | null;
}

export interface HistoryItem {
  id: string;
  generatedImage: GeneratedImage;
  prompt: string; // The prompt used to generate this specific version
  suggestion: string | null;
  timestamp: number;
}