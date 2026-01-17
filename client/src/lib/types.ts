export interface Category {
  id: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Phrase {
  id: string;
  categoryId: string;
  textEn: string;
  favorite: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptSaved {
  id: string;
  title: string;
  content: string;
  tokens?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptHistory {
  id: string;
  content: string;
  tokens?: string[];
  createdAt: string;
  source: string;
}

export type JoinMode = "space" | "comma" | "sentence";

export interface AppSettings {
  id: number;
  promptOutputPath: string;
  joinMode: JoinMode;
  lmBaseUrl: string;
  lmApiKey: string;
  lmModel: string | null;
  lmTemperature: number;
  lmTopP: number;
  lmTopK: number;
}
