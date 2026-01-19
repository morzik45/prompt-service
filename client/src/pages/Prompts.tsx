import * as React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { buildPrompt, splitPrompt } from "@/lib/join";
import { saveTokens } from "@/lib/storage";
import type { JoinMode, PromptSaved } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ToastProvider";

export default function PromptsPage() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [prompts, setPrompts] = React.useState<PromptSaved[]>([]);
  const [joinMode, setJoinMode] = React.useState<JoinMode>("space");

  const loadData = React.useCallback(async () => {
    const [promptsData, settings] = await Promise.all([api.getPrompts(), api.getSettings()]);
    setPrompts(promptsData);
    setJoinMode(settings.joinMode);
  }, []);

  React.useEffect(() => {
    loadData().catch((error) => push({ title: "Ошибка", description: error.message, tone: "error" }));
  }, [loadData, push]);

  const updatePrompt = async (prompt: PromptSaved, patch: Partial<PromptSaved>) => {
    const updated = await api.updatePrompt(prompt.id, {
      title: patch.title ?? prompt.title,
    });
    setPrompts((prev) => prev.map((item) => (item.id === prompt.id ? updated : item)));
  };

  const patchPromptLocal = (id: string, patch: Partial<PromptSaved>) => {
    setPrompts((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removePrompt = async (prompt: PromptSaved) => {
    await api.deletePrompt(prompt.id);
    setPrompts((prev) => prev.filter((item) => item.id !== prompt.id));
  };

  const getTokens = (prompt: PromptSaved) => {
    if (prompt.tokens && prompt.tokens.length) return prompt.tokens;
    return splitPrompt(prompt.content, joinMode);
  };

  const loadPrompt = (prompt: PromptSaved) => {
    const tokens = getTokens(prompt);
    saveTokens(tokens);
    push({ title: "Загружено в Builder", tone: "success" });
    navigate("/", { state: { tokens } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сохранённые промпты</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="space-y-2 rounded-lg border border-ink/10 bg-white/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Input
                placeholder="Описание (опционально)"
                value={prompt.title}
                onChange={(event) => patchPromptLocal(prompt.id, { title: event.target.value })}
                onBlur={() => updatePrompt(prompt, { title: prompt.title })}
              />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => loadPrompt(prompt)}>
                  Открыть
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const text = buildPrompt(getTokens(prompt), joinMode);
                    navigator.clipboard.writeText(text);
                    push({ title: "Скопировано", tone: "success" });
                  }}
                >
                  Copy
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removePrompt(prompt)}>
                  Удалить
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-ink/10 bg-white/70 p-3 text-sm text-ink/80">
              {buildPrompt(getTokens(prompt), joinMode) || "Пусто"}
            </div>
          </div>
        ))}
        {!prompts.length && <p className="text-sm text-ink/50">Пока нет сохранённых промптов.</p>}
      </CardContent>
    </Card>
  );
}
