const STORAGE_KEY = "prompt-manager.tokens";

export interface TokenState {
  text: string;
  enabled: boolean;
}

export function loadTokenState(): TokenState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data
        .map((item) => {
          if (typeof item === "string") {
            return { text: item, enabled: true } satisfies TokenState;
          }
          if (item && typeof item.text === "string") {
            return { text: item.text, enabled: item.enabled !== false } satisfies TokenState;
          }
          return null;
        })
        .filter(Boolean) as TokenState[];
    }
  } catch {
    return [];
  }
  return [];
}

export function saveTokenState(tokens: TokenState[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function loadTokens(): string[] {
  return loadTokenState()
    .filter((token) => token.enabled)
    .map((token) => token.text);
}

export function saveTokens(tokens: string[]) {
  saveTokenState(tokens.map((text) => ({ text, enabled: true })));
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}
