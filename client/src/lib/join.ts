import type { JoinMode } from "@/lib/types";

const PUNCTUATION = new Set([",", ".", "!", "?", ";", ":"]);

export function buildPrompt(tokens: string[], joinMode: JoinMode): string {
  const cleaned = tokens.map((token) => token.trim()).filter(Boolean);

  if (joinMode === "space") {
    let text = cleaned.join(" ");
    text = text.replace(/\s+/g, " ").trim();
    text = text.replace(/\s+([,.;!?])/g, "$1");
    return text;
  }

  if (joinMode === "comma") {
    const filtered = cleaned.filter((token) => token !== ",");
    let text = filtered.join(", ");
    text = text.replace(/,\s*,+/g, ", ");
    text = text.replace(/\s+/g, " ").trim();
    return text.replace(/\s+,/g, ",");
  }

  const filtered = cleaned.filter((token) => token !== ".").map((token) => {
    if (token.length > 1 && token.endsWith(".")) {
      return token.slice(0, -1);
    }
    return token;
  });
  let text = filtered.join(". ");
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/\s+\./g, ".");
  if (text && !text.endsWith(".")) {
    text += ".";
  }
  return text;
}

export function splitPrompt(content: string, joinMode: JoinMode): string[] {
  if (!content.trim()) return [];
  if (joinMode === "sentence") {
    return content.split(". ").map((token) => token.replace(/\.$/, "").trim()).filter(Boolean);
  }
  if (joinMode === "comma") {
    return content.split(", ").map((token) => token.trim()).filter(Boolean);
  }
  return [content.trim()];
}

export function normalizeTokens(tokens: string[]): string[] {
  return tokens.map((token) => token.trim()).filter(Boolean);
}

export function isPunctuationToken(token: string) {
  return PUNCTUATION.has(token.trim());
}
