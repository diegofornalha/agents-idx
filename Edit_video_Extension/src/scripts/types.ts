// Tipos de dados para a extensão

export interface TranscriptionResult {
  text: string;
  timestamps: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface Timestamp {
  start: number;
  end: number;
  text: string;
}

export interface AISettings {
  model: string;
  apiKey: string;
  temperature: number;
}

export interface TranscriptionSettings {
  silenceThreshold: number;
  minSilence: number;
  language: string;
  segments: boolean;
}

export interface SEOResult {
  title: string;
  description: string;
  tags: string[];
} 