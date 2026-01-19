import * as React from "react";
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
import { Check, GripVertical, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { loadTokenState, saveTokenState } from "@/lib/storage";
import type { Category, Phrase } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ToastProvider";

function SortableCategory({
  category,
  selected,
  isEditing,
  editValue,
  onSelect,
  onStartEdit,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: {
  category: Category;
  selected: boolean;
  isEditing: boolean;
  editValue: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`space-y-2 rounded-lg border bg-white/70 p-2 ${selected ? "border-ink" : "border-ink/10"} ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button onClick={onSelect} className={`text-left text-sm font-semibold ${selected ? "text-ink" : "text-ink/60"}`}>
          {category.name}
        </button>
        <div className="flex items-center gap-1">
          <button className="text-ink/40" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
          <Button variant="ghost" size="sm" onClick={onStartEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            className="h-8"
            value={editValue}
            onChange={(event) => onEditChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onEditSave();
              }
              if (event.key === "Escape") {
                onEditCancel();
              }
            }}
          />
          <Button variant="ghost" size="sm" onClick={onEditSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEditCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SortablePhrase({
  phrase,
  onTextChange,
  onTextBlur,
  onFavoriteToggle,
  onDelete,
}: {
  phrase: Phrase;
  onTextChange: (value: string) => void;
  onTextBlur: () => void;
  onFavoriteToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phrase.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-ink/10 bg-white/70 p-2 ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <button className="text-ink/40" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        className="h-8 min-w-[220px] flex-1"
        value={phrase.textEn}
        onChange={(event) => onTextChange(event.target.value)}
        onBlur={onTextBlur}
      />
      <Button variant={phrase.favorite ? "accent" : "outline"} size="sm" onClick={onFavoriteToggle}>
        ⭐
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete}>
        Удалить
      </Button>
    </div>
  );
}

export default function PhrasesPage() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [phrases, setPhrases] = React.useState<Phrase[]>([]);
  const [newCategory, setNewCategory] = React.useState("");
  const [bulkLines, setBulkLines] = React.useState("");
  const [newPhrase, setNewPhrase] = React.useState("");
  const [translationInput, setTranslationInput] = React.useState("");
  const [translationOutput, setTranslationOutput] = React.useState("");
  const defaultTranslationMode: "ru2en" = "ru2en";
  const [isTranslating, setIsTranslating] = React.useState(false);
  const translationRequestId = React.useRef(0);
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = React.useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadCategories = React.useCallback(async () => {
    const data = await api.getCategories();
    setCategories(data.sort((a, b) => a.orderIndex - b.orderIndex));
    if (data.length && (!selectedCategory || !data.some((item) => item.id === selectedCategory))) {
      setSelectedCategory(data[0].id);
    }
  }, [selectedCategory]);

  const loadPhrases = React.useCallback(async () => {
    if (!selectedCategory) return;
    const data = await api.getPhrases(selectedCategory);
    setPhrases(data.sort((a, b) => a.orderIndex - b.orderIndex));
  }, [selectedCategory]);

  React.useEffect(() => {
    loadCategories().catch((error) => push({ title: "Ошибка", description: error.message, tone: "error" }));
  }, [loadCategories, push]);

  React.useEffect(() => {
    loadPhrases().catch((error) => push({ title: "Ошибка", description: error.message, tone: "error" }));
  }, [loadPhrases, push]);

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await api.createCategory(newCategory.trim());
    setNewCategory("");
    await loadCategories();
  };

  const startEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const saveEditCategory = async (category: Category) => {
    if (!editingCategoryName.trim()) {
      push({ title: "Введите название", tone: "error" });
      return;
    }
    await updateCategory(category, { name: editingCategoryName.trim() });
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const updateCategory = async (category: Category, patch: Partial<Category>) => {
    await api.updateCategory(category.id, {
      name: patch.name ?? category.name,
      orderIndex: patch.orderIndex ?? category.orderIndex,
    });
    await loadCategories();
  };

  const removeCategory = async (category: Category) => {
    await api.deleteCategory(category.id);
    setSelectedCategory(null);
    await loadCategories();
    setPhrases([]);
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = categories.findIndex((item) => item.id === event.active.id);
    const newIndex = categories.findIndex((item) => item.id === event.over?.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(categories, oldIndex, newIndex).map((category, index) => ({
      ...category,
      orderIndex: index + 1,
    }));
    setCategories(reordered);
    try {
      await Promise.all(
        reordered.map((category) => api.updateCategory(category.id, { orderIndex: category.orderIndex }))
      );
    } catch (error) {
      push({ title: "Ошибка сортировки", description: error instanceof Error ? error.message : "Не удалось обновить порядок", tone: "error" });
      await loadCategories();
    }
  };

  const addPhrase = async () => {
    if (!newPhrase.trim()) return;
    if (!selectedCategory) {
      push({ title: "Выберите категорию", tone: "error" });
      return;
    }
    const normalized = normalizeText(newPhrase);
    const existingSet = new Set(phrases.map((phrase) => normalizeText(phrase.textEn)));
    if (existingSet.has(normalized)) {
      push({ title: "Дубликат", description: "Такая фраза уже есть", tone: "error" });
      return;
    }
    try {
      await api.createPhrase({ categoryId: selectedCategory, textEn: newPhrase.trim() });
      setNewPhrase("");
      await loadPhrases();
    } catch (error) {
      push({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось добавить фразу",
        tone: "error",
      });
    }
  };

  const bulkAdd = async () => {
    if (!bulkLines.trim()) return;
    if (!selectedCategory) {
      push({ title: "Выберите категорию", tone: "error" });
      return;
    }
    const lines = bulkLines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const existingSet = new Set(phrases.map((phrase) => normalizeText(phrase.textEn)));
    const seen = new Set<string>();
    const uniqueLines: string[] = [];
    const duplicates: string[] = [];
    for (const line of lines) {
      const normalized = normalizeText(line);
      if (existingSet.has(normalized) || seen.has(normalized)) {
        duplicates.push(line);
        continue;
      }
      seen.add(normalized);
      uniqueLines.push(line);
    }
    if (duplicates.length) {
      push({ title: "Дубликаты пропущены", description: `Найдено: ${duplicates.length}`, tone: "error" });
    }
    if (!uniqueLines.length) {
      return;
    }
    try {
      const res = await api.bulkPhrases({ categoryId: selectedCategory, lines: uniqueLines.join("\n") });
      setBulkLines("");
      await loadPhrases();
      if (res.skipped) {
        push({ title: "Дубликаты пропущены", description: `Найдено: ${res.skipped}`, tone: "error" });
      }
    } catch (error) {
      push({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось добавить фразы",
        tone: "error",
      });
    }
  };

  const updatePhrase = async (phrase: Phrase, patch: Partial<Phrase>) => {
    await api.updatePhrase(phrase.id, {
      textEn: patch.textEn ?? phrase.textEn,
      favorite: patch.favorite ?? phrase.favorite,
      categoryId: patch.categoryId ?? phrase.categoryId,
      orderIndex: patch.orderIndex ?? phrase.orderIndex,
    });
    await loadPhrases();
  };

  const patchPhraseLocal = (id: string, patch: Partial<Phrase>) => {
    setPhrases((prev) => prev.map((phrase) => (phrase.id === id ? { ...phrase, ...patch } : phrase)));
  };

  const removePhrase = async (phrase: Phrase) => {
    await api.deletePhrase(phrase.id);
    await loadPhrases();
  };

  const handlePhraseDragEnd = async (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = phrases.findIndex((item) => item.id === event.active.id);
    const newIndex = phrases.findIndex((item) => item.id === event.over?.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(phrases, oldIndex, newIndex).map((phrase, index) => ({
      ...phrase,
      orderIndex: index + 1,
    }));
    setPhrases(reordered);
    try {
      await Promise.all(reordered.map((phrase) => api.updatePhrase(phrase.id, { orderIndex: phrase.orderIndex })));
    } catch (error) {
      push({
        title: "Ошибка сортировки",
        description: error instanceof Error ? error.message : "Не удалось обновить порядок",
        tone: "error",
      });
      await loadPhrases();
    }
  };

  const runTranslation = async (mode: "ru2en" | "en2ru" | "improve") => {
    if (!translationInput.trim()) {
      push({ title: "Введите текст", tone: "error" });
      return;
    }
    const requestId = translationRequestId.current + 1;
    translationRequestId.current = requestId;
    setIsTranslating(true);
    try {
      const res = await api.lmRequest({ mode, text: translationInput });
      if (translationRequestId.current === requestId) {
        setTranslationOutput(res.text);
        setIsTranslating(false);
      }
    } catch (error) {
      if (translationRequestId.current === requestId) {
        setIsTranslating(false);
        push({
          title: "Ошибка LLM",
          description: error instanceof Error ? error.message : "Не удалось получить ответ",
          tone: "error",
        });
      }
    }
  };

  const addAsToken = () => {
    if (!translationOutput.trim()) {
      push({ title: "Нет результата", tone: "error" });
      return;
    }
    const tokens = loadTokenState();
    const nextTokens = [...tokens, { text: translationOutput.trim(), enabled: true }];
    saveTokenState(nextTokens);
    push({ title: "Добавлено в Builder", tone: "success" });
    navigate("/", { state: { tokens: nextTokens.map((token) => token.text) } });
  };

  const saveAsPhrase = async () => {
    if (!translationOutput.trim()) {
      push({ title: "Нет результата", tone: "error" });
      return;
    }
    if (!selectedCategory) {
      push({ title: "Выберите категорию", tone: "error" });
      return;
    }
    const normalized = normalizeText(translationOutput);
    const existingSet = new Set(phrases.map((phrase) => normalizeText(phrase.textEn)));
    if (existingSet.has(normalized)) {
      push({ title: "Дубликат", description: "Такая фраза уже есть", tone: "error" });
      return;
    }
    await api.createPhrase({ categoryId: selectedCategory, textEn: translationOutput.trim() });
    await loadPhrases();
    push({ title: "Фраза сохранена", tone: "success" });
  };

  const handleTranslationKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      runTranslation(defaultTranslationMode);
    }
  };

  const selectedCategoryName =
    categories.find((category) => category.id === selectedCategory)?.name ?? "Категория не выбрана";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Категории</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Новая категория"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCategory();
                  }
                }}
              />
              <Button onClick={addCategory}>Добавить</Button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
              <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      selected={selectedCategory === category.id}
                      isEditing={editingCategoryId === category.id}
                      editValue={editingCategoryId === category.id ? editingCategoryName : category.name}
                      onSelect={() => setSelectedCategory(category.id)}
                      onStartEdit={() => startEditCategory(category)}
                      onEditChange={setEditingCategoryName}
                      onEditSave={() => saveEditCategory(category)}
                      onEditCancel={cancelEditCategory}
                      onDelete={() => removeCategory(category)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Перевод и улучшение</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Введите текст"
              value={translationInput}
              onChange={(event) => setTranslationInput(event.target.value)}
              onKeyDown={handleTranslationKeyDown}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => runTranslation("ru2en")} disabled={isTranslating}>
                RU → EN
              </Button>
              <Button variant="outline" onClick={() => runTranslation("en2ru")} disabled={isTranslating}>
                EN → RU
              </Button>
              <Button variant="outline" onClick={() => runTranslation("improve")} disabled={isTranslating}>
                Improve EN
              </Button>
              {isTranslating ? (
                <span className="flex items-center gap-2 text-xs font-semibold text-ink/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Запрос...
                </span>
              ) : null}
            </div>
            <Textarea placeholder="Результат" value={translationOutput} readOnly />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={addAsToken} disabled={isTranslating}>
                Добавить как токен
              </Button>
              <Button variant="accent" onClick={saveAsPhrase} disabled={isTranslating}>
                Сохранить как фразу
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фразы · {selectedCategoryName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Новая фраза"
              value={newPhrase}
              onChange={(event) => setNewPhrase(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addPhrase();
                }
              }}
            />
            <Button onClick={addPhrase}>Добавить</Button>
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Bulk add: каждая строка = фраза"
              value={bulkLines}
              onChange={(event) => setBulkLines(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  bulkAdd();
                }
              }}
            />
            <Button variant="secondary" onClick={bulkAdd}>
              Добавить строками
            </Button>
          </div>
          <div className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhraseDragEnd}>
              <SortableContext items={phrases.map((phrase) => phrase.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {phrases.map((phrase) => (
                    <SortablePhrase
                      key={phrase.id}
                      phrase={phrase}
                      onTextChange={(value) => patchPhraseLocal(phrase.id, { textEn: value })}
                      onTextBlur={() => updatePhrase(phrase, { textEn: phrase.textEn })}
                      onFavoriteToggle={() => updatePhrase(phrase, { favorite: phrase.favorite ? 0 : 1 })}
                      onDelete={() => removePhrase(phrase)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {!phrases.length && <p className="text-sm text-ink/50">Нет фраз для выбранной категории.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
