import * as React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { buildPrompt, splitPrompt } from "@/lib/join";
import { saveTokens } from "@/lib/storage";
import type { JoinMode, PromptHistory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ToastProvider";

export default function HistoryPage() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [history, setHistory] = React.useState<PromptHistory[]>([]);
  const [joinMode, setJoinMode] = React.useState<JoinMode>("space");

  const loadData = React.useCallback(async () => {
    const [historyData, settings] = await Promise.all([api.getHistory(50), api.getSettings()]);
    setHistory(historyData);
    setJoinMode(settings.joinMode);
  }, []);

  React.useEffect(() => {
    loadData().catch((error) => push({ title: "Ошибка", description: error.message, tone: "error" }));
  }, [loadData, push]);

  const getTokens = (item: PromptHistory) => {
    if (item.tokens && item.tokens.length) return item.tokens;
    return splitPrompt(item.content, joinMode);
  };

  const restore = async (item: PromptHistory) => {
    const tokens = getTokens(item);
    saveTokens(tokens);
    await api.createHistory({ content: item.content, source: "restore", tokens });
    push({ title: "Восстановлено", tone: "success" });
    navigate("/", { state: { tokens } });
  };

  const exportFromHistory = async (item: PromptHistory) => {
    const tokens = getTokens(item);
    const res = await api.exportPrompt(tokens);
    push({ title: "Файл обновлён", description: res.path, tone: "success" });
  };

  const remove = async (item: PromptHistory) => {
    await api.deleteHistory(item.id);
    setHistory((prev) => prev.filter((row) => row.id !== item.id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>История версий</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {history.map((item) => (
          <div key={item.id} className="space-y-3 rounded-lg border border-ink/10 bg-white/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{new Date(item.createdAt).toLocaleString()}</p>
                <p className="text-xs text-ink/60">Источник: {item.source}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => restore(item)}>
                  Restore
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(buildPrompt(getTokens(item), joinMode));
                    push({ title: "Скопировано", tone: "success" });
                  }}
                >
                  Copy
                </Button>
                <Button variant="accent" size="sm" onClick={() => exportFromHistory(item)}>
                  Export
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(item)}>
                  Удалить
                </Button>
              </div>
            </div>
            <p className="text-sm text-ink/80">{buildPrompt(getTokens(item), joinMode) || item.content}</p>
          </div>
        ))}
        {!history.length && <p className="text-sm text-ink/50">История пока пустая.</p>}
      </CardContent>
    </Card>
  );
}
