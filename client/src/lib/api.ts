import type { AppSettings, Category, Phrase, PromptHistory, PromptSaved } from "@/lib/types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const api = {
  getCategories: () => request<Category[]>("/api/categories"),
  createCategory: (name: string) => request<Category>("/api/categories", { method: "POST", body: JSON.stringify({ name }) }),
  updateCategory: (id: string, payload: { name?: string; orderIndex?: number }) =>
    request<Category>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (id: string) => request<void>(`/api/categories/${id}`, { method: "DELETE" }),

  getPhrases: (categoryId?: string) =>
    request<Phrase[]>(categoryId ? `/api/phrases?categoryId=${encodeURIComponent(categoryId)}` : "/api/phrases"),
  createPhrase: (payload: { categoryId: string; textEn: string }) =>
    request<Phrase>("/api/phrases", { method: "POST", body: JSON.stringify(payload) }),
  bulkPhrases: (payload: { categoryId: string; lines: string }) =>
    request<{ count: number; skipped?: number; duplicates?: string[] }>("/api/phrases/bulk", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePhrase: (id: string, payload: { textEn?: string; favorite?: number; categoryId?: string; orderIndex?: number }) =>
    request<Phrase>(`/api/phrases/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePhrase: (id: string) => request<void>(`/api/phrases/${id}`, { method: "DELETE" }),

  getPrompts: () => request<PromptSaved[]>("/api/prompts"),
  createPrompt: (payload: { title?: string; content?: string; tokens?: string[] }) =>
    request<PromptSaved>("/api/prompts", { method: "POST", body: JSON.stringify(payload) }),
  updatePrompt: (id: string, payload: { title?: string; content?: string; tokens?: string[] }) =>
    request<PromptSaved>(`/api/prompts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePrompt: (id: string) => request<void>(`/api/prompts/${id}`, { method: "DELETE" }),

  getHistory: (limit = 50) => request<PromptHistory[]>(`/api/history?limit=${limit}`),
  createHistory: (payload: { content?: string; source: string; tokens?: string[] }) =>
    request<PromptHistory>("/api/history", { method: "POST", body: JSON.stringify(payload) }),
  deleteHistory: (id: string) => request<void>(`/api/history/${id}`, { method: "DELETE" }),

  getSettings: () => request<AppSettings>("/api/settings"),
  updateSettings: (payload: Partial<AppSettings>) =>
    request<AppSettings>("/api/settings", { method: "PUT", body: JSON.stringify(payload) }),
  checkPath: (promptOutputPath: string) =>
    request<{ ok: boolean; path: string }>("/api/settings/check-path", {
      method: "POST",
      body: JSON.stringify({ promptOutputPath }),
    }),

  exportPrompt: (tokens: string[]) =>
    request<{ ok: boolean; path: string; bytesWritten: number; finalText: string }>("/api/export", {
      method: "POST",
      body: JSON.stringify({ tokens }),
    }),

  lmRequest: (payload: { mode: "ru2en" | "en2ru" | "improve"; text: string }) =>
    request<{ text: string }>("/api/lm", { method: "POST", body: JSON.stringify(payload) }),

  exportBackup: () => request<unknown>("/api/backup/export"),
  importBackup: (payload: unknown) =>
    request<{ ok: boolean }>("/api/backup/import", { method: "POST", body: JSON.stringify(payload) }),
};
