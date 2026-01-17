import * as React from "react";
import { useLocation } from "react-router-dom";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { buildPrompt, normalizeTokens } from "@/lib/join";
import { loadTokenState, saveTokenState } from "@/lib/storage";
import type { Category, JoinMode, Phrase } from "@/lib/types";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ToastProvider";

interface TokenItem {
  id: string;
  text: string;
  enabled: boolean;
}

function SortableToken({
  token,
  onChange,
  onRemove,
  onToggle,
}: {
  token: TokenItem;
  onChange: (value: string) => void;
  onRemove: () => void;
  onToggle: (checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: token.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border border-ink/10 bg-white/80 px-3 py-2 ${
        isDragging ? "shadow-lg" : ""
      } ${token.enabled ? "" : "opacity-60"}`}
    >
      <button className="text-ink/40" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox checked={token.enabled} onChange={(event) => onToggle(event.target.checked)} />
      <Input
        value={token.text}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8 ${token.enabled ? "" : "text-ink/40 line-through"}`}
      />
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function BuilderPage() {
  const { push } = useToast();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [phrases, setPhrases] = React.useState<Phrase[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [tokens, setTokens] = React.useState<TokenItem[]>([]);
  const [manualToken, setManualToken] = React.useState("");
  const [settingsMode, setSettingsMode] = React.useState<JoinMode>("space");
  const [saveTitle, setSaveTitle] = React.useState("");
  const location = useLocation();
  const hasHydrated = React.useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const refreshCategories = React.useCallback(async () => {
    const data = await api.getCategories();
    setCategories(data.sort((a, b) => a.orderIndex - b.orderIndex));
    if (data.length && !selectedCategory) {
      setSelectedCategory(data[0].id);
    }
  }, [selectedCategory]);

  const refreshPhrases = React.useCallback(async () => {
    if (!selectedCategory) return;
    const data = await api.getPhrases(selectedCategory);
    setPhrases(data);
  }, [selectedCategory]);

  React.useEffect(() => {
    refreshCategories().catch((error) => push({ title: "Ошибка", description: error.message, tone: "error" }));
  }, [refreshCategories, push]);

  React.useEffect(() => {
    refreshPhrases().catch((error) => push({ title: "Ошибка", description: error.message, tone: "error" }));
  }, [refreshPhrases, push]);

  React.useEffect(() => {
    api
      .getSettings()
      .then((settings) => setSettingsMode(settings.joinMode))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    const stored = loadTokenState();
    setTokens(stored.map((token) => ({ id: createId(), text: token.text, enabled: token.enabled })));
  }, []);

  React.useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    saveTokenState(tokens.map((token) => ({ text: token.text, enabled: token.enabled })));
  }, [tokens]);

  React.useEffect(() => {
    const state = location.state as { tokens?: string[] } | null;
    if (state?.tokens?.length) {
      setTokens(state.tokens.map((text) => ({ id: createId(), text, enabled: true })));
    }
  }, [location.key]);

  const filteredPhrases = phrases.filter((phrase) => {
    if (favoritesOnly && !phrase.favorite) return false;
    if (!search.trim()) return true;
    return phrase.textEn.toLowerCase().includes(search.toLowerCase());
  });

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = tokens.findIndex((item) => item.id === event.active.id);
    const newIndex = tokens.findIndex((item) => item.id === event.over?.id);
    setTokens((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const addToken = (text: string) => {
    if (!text.trim()) return;
    setTokens((prev) => [...prev, { id: createId(), text, enabled: true }]);
  };

  const activeTokens = tokens.filter((token) => token.enabled).map((token) => token.text);
  const preview = buildPrompt(activeTokens, settingsMode);

  const saveToLibrary = async () => {
    try {
      const cleaned = normalizeTokens(activeTokens);
      const content = buildPrompt(cleaned, settingsMode);
      await api.createPrompt({ title: saveTitle.trim() || undefined, content, tokens: cleaned });
      await api.createHistory({ content, source: "manual-save", tokens: cleaned });
      setSaveTitle("");
      push({ title: "Сохранено", description: "Добавлено в библиотеку", tone: "success" });
    } catch (error) {
      push({ title: "Ошибка", description: error instanceof Error ? error.message : "Не удалось сохранить", tone: "error" });
    }
  };

  const exportPrompt = async () => {
    try {
      const cleaned = normalizeTokens(activeTokens);
      const res = await api.exportPrompt(cleaned);
      push({ title: "Файл обновлён", description: res.path, tone: "success" });
    } catch (error) {
      push({ title: "Ошибка экспорта", description: error instanceof Error ? error.message : "Не удалось записать файл", tone: "error" });
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Фразы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input placeholder="Поиск по фразам" value={search} onChange={(event) => setSearch(event.target.value)} />
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <Checkbox checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} />
              ⭐ Избранное
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Категории</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    selectedCategory === category.id
                      ? "border-ink bg-ink text-white"
                      : "border-ink/10 bg-white/70 text-ink/70"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Фразы</p>
            <div className="scrollbar-thin max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {filteredPhrases.map((phrase) => (
                <button
                  key={phrase.id}
                  onClick={() => addToken(phrase.textEn)}
                  className="flex w-full items-center justify-between rounded-lg border border-ink/10 bg-white/70 px-3 py-2 text-left text-sm transition hover:border-ink/30"
                >
                  <span>{phrase.textEn}</span>
                  {phrase.favorite ? <Badge>★</Badge> : null}
                </button>
              ))}
              {!filteredPhrases.length && <p className="text-sm text-ink/50">Нет фраз</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Текущая сборка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[",", ".", "and"].map((token) => (
              <Button key={token} variant="secondary" size="sm" onClick={() => addToken(token)}>
                {token}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setTokens([])}>
              Очистить сборку
            </Button>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Ручной токен" value={manualToken} onChange={(event) => setManualToken(event.target.value)} />
            <Button
              onClick={() => {
                addToken(manualToken);
                setManualToken("");
              }}
            >
              Add
            </Button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tokens.map((token) => token.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {tokens.map((token) => (
                  <SortableToken
                    key={token.id}
                    token={token}
                    onChange={(value) =>
                      setTokens((prev) => prev.map((item) => (item.id === token.id ? { ...item, text: value } : item)))
                    }
                    onToggle={(checked) =>
                      setTokens((prev) =>
                        prev.map((item) => (item.id === token.id ? { ...item, enabled: checked } : item))
                      )
                    }
                    onRemove={() => setTokens((prev) => prev.filter((item) => item.id !== token.id))}
                  />
                ))}
                {!tokens.length && <p className="text-sm text-ink/50">Добавьте фразы слева или вручную.</p>}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-ink/10 bg-white/70 p-3 text-sm text-ink">
            {preview || "Пока пусто"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(preview);
                push({ title: "Скопировано", tone: "success" });
              }}
            >
              Copy to clipboard
            </Button>
            <Button variant="accent" onClick={exportPrompt}>
              Export
            </Button>
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Описание (опционально)"
              value={saveTitle}
              onChange={(event) => setSaveTitle(event.target.value)}
            />
            <Button variant="secondary" onClick={saveToLibrary}>
              Save to library
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
