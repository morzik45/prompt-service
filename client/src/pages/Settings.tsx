import * as React from "react";
import { api } from "@/lib/api";
import type { AppSettings, JoinMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ToastProvider";

export default function SettingsPage() {
  const { push } = useToast();
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [backupJson, setBackupJson] = React.useState("");

  const loadData = React.useCallback(async () => {
    const settingsData = await api.getSettings();
    setSettings(settingsData);
  }, []);

  React.useEffect(() => {
    loadData().catch((error) => push({ title: "Ошибка", description: error.message, tone: "error" }));
  }, [loadData, push]);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    try {
      const updated = await api.updateSettings({ ...settings, ...patch });
      setSettings(updated);
      push({ title: "Настройки сохранены", tone: "success" });
    } catch (error) {
      push({
        title: "Ошибка настроек",
        description: error instanceof Error ? error.message : "Не удалось сохранить",
        tone: "error",
      });
    }
  };

  const checkPath = async () => {
    if (!settings) return;
    const res = await api.checkPath(settings.promptOutputPath);
    push({ title: "Путь проверен", description: res.path, tone: "success" });
  };

  const exportBackup = async () => {
    const data = await api.exportBackup();
    const json = JSON.stringify(data, null, 2);
    setBackupJson(json);
    navigator.clipboard.writeText(json);
    push({ title: "Бэкап скопирован", tone: "success" });
  };

  const importBackup = async () => {
    if (!backupJson.trim()) return;
    try {
      const parsed = JSON.parse(backupJson);
      await api.importBackup(parsed);
      push({ title: "Бэкап импортирован", tone: "success" });
    } catch (error) {
      push({
        title: "Ошибка импорта",
        description: error instanceof Error ? error.message : "Проверьте JSON",
        tone: "error",
      });
    }
  };

  if (!settings) {
    return <p className="text-sm text-ink/50">Загрузка...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Основные настройки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink/70">Путь к prompt.txt</label>
            <Input
              value={settings.promptOutputPath}
              onChange={(event) => setSettings({ ...settings, promptOutputPath: event.target.value })}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => updateSettings({ promptOutputPath: settings.promptOutputPath })}>
                Сохранить путь
              </Button>
              <Button variant="outline" onClick={checkPath}>
                Проверить путь
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink/70">Join Mode</label>
            <Select
              value={settings.joinMode}
              onValueChange={(value) => {
                setSettings({ ...settings, joinMode: value as JoinMode });
                updateSettings({ joinMode: value as JoinMode });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите режим" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="space">space</SelectItem>
                <SelectItem value="comma">comma</SelectItem>
                <SelectItem value="sentence">sentence</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

        <Card>
          <CardHeader>
            <CardTitle>LLM API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Base URL"
              value={settings.lmBaseUrl}
              onChange={(event) => setSettings({ ...settings, lmBaseUrl: event.target.value })}
            />
            <Input
              placeholder="API Key"
              value={settings.lmApiKey}
              onChange={(event) => setSettings({ ...settings, lmApiKey: event.target.value })}
            />
            <Input
              placeholder="Model"
              value={settings.lmModel ?? ""}
              onChange={(event) => setSettings({ ...settings, lmModel: event.target.value })}
            />
            <div className="space-y-2 rounded-lg border border-ink/10 bg-white/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Параметры генерации</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink/70">Temperature</label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(settings.lmUseTemperature)}
                      onChange={(event) =>
                        setSettings({ ...settings, lmUseTemperature: event.target.checked ? 1 : 0 })
                      }
                    />
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      placeholder="0.2"
                      value={String(settings.lmTemperature)}
                      disabled={!settings.lmUseTemperature}
                      onChange={(event) =>
                        setSettings({ ...settings, lmTemperature: Number.parseFloat(event.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink/70">Top P</label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(settings.lmUseTopP)}
                      onChange={(event) => setSettings({ ...settings, lmUseTopP: event.target.checked ? 1 : 0 })}
                    />
                    <Input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      placeholder="0.9"
                      value={String(settings.lmTopP)}
                      disabled={!settings.lmUseTopP}
                      onChange={(event) =>
                        setSettings({ ...settings, lmTopP: Number.parseFloat(event.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink/70">Top K</label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(settings.lmUseTopK)}
                      onChange={(event) => setSettings({ ...settings, lmUseTopK: event.target.checked ? 1 : 0 })}
                    />
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="40"
                      value={String(settings.lmTopK)}
                      disabled={!settings.lmUseTopK}
                      onChange={(event) =>
                        setSettings({ ...settings, lmTopK: Number.parseInt(event.target.value, 10) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-ink/50">Если параметр отключён, он не передаётся в API.</p>
            </div>
            <Button variant="secondary" onClick={() => updateSettings(settings)}>
              Сохранить LLM настройки
            </Button>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportBackup}>
              Экспорт JSON
            </Button>
            <Button variant="outline" onClick={importBackup}>
              Импорт JSON
            </Button>
          </div>
          <Textarea
            placeholder="JSON backup"
            value={backupJson}
            onChange={(event) => setBackupJson(event.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
