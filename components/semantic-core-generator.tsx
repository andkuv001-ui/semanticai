"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Search,
  Hash,
  Loader2,
  History,
  Trash2,
  Clock,
  Inbox,
  Copy,
  Download,
  Check,
  Heart,
  Bookmark,
  Bot,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  estimateFrequency,
  formatFrequency,
  type GeneratedCore,
  type SemanticCore,
} from "@/lib/semantic-core";
import type { Favorite } from "@/lib/models";
import { copyToClipboard } from "@/lib/clipboard";
import { useUsage } from "./usage-provider";

function estimateTokens(core: SemanticCore): number {
  const text = [core.topic, ...core.keywords, ...core.queries].join(" ");
  return Math.max(1, Math.ceil(text.length / 4));
}

interface Generation {
  id: string;
  topic: string;
  keywords: string[];
  queries: string[];
  createdAt: string;
  frequencies?: Record<string, number>;
}

interface SemanticCoreGeneratorProps {
  initialGenerations: Generation[];
  initialFavorites: Favorite[];
  dbAvailable: boolean;
  yandexGptConfigured?: boolean;
}

export function SemanticCoreGenerator({
  initialGenerations,
  initialFavorites,
  dbAvailable,
  yandexGptConfigured = false,
}: SemanticCoreGeneratorProps) {
  const { increment } = useUsage();
  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<Generation | null>(null);
  const [history, setHistory] = useState<Generation[]>(initialGenerations);
  const [favorites, setFavorites] = useState<Favorite[]>(initialFavorites);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [favoritesCopied, setFavoritesCopied] = useState(false);
  const [usedModel, setUsedModel] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/generations")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: Generation[]) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        // Оставляем данные, переданные с сервера
      });

    fetch("/api/favorites")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: Favorite[]) => {
        if (!cancelled) setFavorites(data);
      })
      .catch(() => {
        // Оставляем данные, переданные с сервера
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveGeneration(
    core: SemanticCore,
    frequencies?: Record<string, number>
  ) {
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: core.topic,
          keywords: core.keywords,
          queries: core.queries,
          frequencies,
        }),
      });

      if (response.ok) {
        const saved: Generation = await response.json();
        setHistory((prev) => [
          saved,
          ...prev.filter((item) => item.id !== saved.id),
        ]);
        setSelected(saved);
        toast.success("Сохранено в историю");
        return;
      }

      const error = await response.json();
      fallbackSessionEntry(core, frequencies);
      toast.warning(error.error || "История не сохранена");
    } catch {
      fallbackSessionEntry(core, frequencies);
      toast.warning("Не удалось сохранить историю");
    }
  }

  function fallbackSessionEntry(
    core: SemanticCore,
    frequencies?: Record<string, number>
  ) {
    const entry: Generation = {
      id: `local-${Date.now()}`,
      topic: core.topic,
      keywords: core.keywords,
      queries: core.queries,
      createdAt: new Date().toISOString(),
      ...(frequencies ? { frequencies } : {}),
    };
    setHistory((prev) => [entry, ...prev]);
    setSelected(entry);
  }

  function frequencyFor(word: string, generation: Generation): number {
    return (
      generation.frequencies?.[word] ??
      estimateFrequency(word, generation.topic)
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = topic.trim();
    if (!value || loading) return;

    setLoading(true);
    setSelected(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: value }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Не удалось сгенерировать ядро");
        setLoading(false);
        return;
      }

      const result: GeneratedCore = await response.json();
      setUsedModel(result.usedModel);
      const frequencies: Record<string, number> = {};
      for (const item of result.keywords)
        frequencies[item.word] = item.frequency;
      for (const item of result.queries)
        frequencies[item.word] = item.frequency;

      const core: SemanticCore = {
        topic: result.topic,
        keywords: result.keywords.map((item) => item.word),
        queries: result.queries.map((item) => item.word),
      };

      void increment(estimateTokens(core));
      await saveGeneration(core, frequencies);
    } catch {
      toast.error("Не удалось сгенерировать ядро");
    } finally {
      setLoading(false);
    }
  }

  function formatCoreAsText(generation: Generation): string {
    const keywords = generation.keywords
      .map(
        (keyword) =>
          `${keyword} — ${formatFrequency(frequencyFor(keyword, generation))}`
      )
      .join("\n");
    const queries = generation.queries
      .map(
        (query) =>
          `${query} — ${formatFrequency(frequencyFor(query, generation))}`
      )
      .join("\n");
    return [
      `Семантическое ядро: ${generation.topic}`,
      "",
      "Ключевые слова:",
      keywords,
      "",
      "Поисковые запросы:",
      queries,
    ].join("\n");
  }

  async function handleCopy(generation: Generation) {
    const ok = await copyToClipboard(formatCoreAsText(generation));
    if (!ok) {
      toast.error("Не удалось скопировать результат");
      return;
    }
    setCopied(true);
    toast.success("Семантическое ядро скопировано");
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload(generation: Generation) {
    const blob = new Blob([formatCoreAsText(generation)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `семантическое-ядро-${generation.topic}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Файл скачан");
  }

  function handleDelete(id: string) {
    toast("Удалить из истории?", {
      action: {
        label: "Удалить",
        onClick: async () => {
          try {
            const response = await fetch(`/api/generations?id=${id}`, {
              method: "DELETE",
            });

            if (response.ok) {
              setHistory((prev) => prev.filter((item) => item.id !== id));
              setSelected((prev) => (prev?.id === id ? null : prev));
              toast.success("Удалено из истории");
            } else {
              const error = await response.json();
              toast.error(error.error || "Ошибка удаления");
            }
          } catch {
            toast.error("Ошибка удаления");
          }
        },
      },
      cancel: { label: "Отмена", onClick: () => {} },
    });
  }

  function isFavorite(keyword: string): boolean {
    return favorites.some((f) => f.keyword === keyword);
  }

  async function handleToggleFavorite(
    keyword: string,
    sourceGenerationId?: string
  ) {
    if (isFavorite(keyword)) {
      setFavorites((prev) => prev.filter((f) => f.keyword !== keyword));
      try {
        const response = await fetch(
          `/api/favorites?keyword=${encodeURIComponent(keyword)}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error();
        toast.success("Убрано из избранного");
      } catch {
        toast.warning("Изменение не сохранится между сессиями");
      }
      return;
    }

    const favorite: Favorite = {
      keyword,
      ...(sourceGenerationId ? { sourceGenerationId } : {}),
      createdAt: new Date().toISOString(),
    };
    setFavorites((prev) => [...prev, favorite]);
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          sourceGenerationId,
        }),
      });
      if (!response.ok) throw new Error();
      toast.success("Добавлено в избранное");
    } catch {
      toast.warning("Избранное не сохранится между сессиями");
    }
  }

  function formatFavoritesAsText(): string {
    const list = favorites.map((f) => f.keyword).join("\n");
    return ["Избранные ключевые слова:", "", list].join("\n");
  }

  async function handleCopyFavorites() {
    if (favorites.length === 0) return;
    const ok = await copyToClipboard(formatFavoritesAsText());
    if (!ok) {
      toast.error("Не удалось скопировать избранное");
      return;
    }
    setFavoritesCopied(true);
    toast.success("Избранное скопировано");
    window.setTimeout(() => setFavoritesCopied(false), 2000);
  }

  function handleDownloadFavorites() {
    if (favorites.length === 0) return;
    const blob = new Blob([formatFavoritesAsText()], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "избранные-ключевые-слова.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Файл скачан");
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        {yandexGptConfigured ? (
          <Badge variant="secondary" className="h-6 gap-1.5 text-xs">
            <Bot className="h-3.5 w-3.5 text-primary" />
            RouterAI подключён — реальная генерация
          </Badge>
        ) : (
          <Badge variant="outline" className="h-6 gap-1.5 text-xs">
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
            Приблизительная генерация (ключ RouterAI не задан)
          </Badge>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Например: зип-пакеты с бегунком"
            className="h-12 pl-9 text-base"
            aria-label="Тема продажи"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-12 gap-2"
          disabled={!topic.trim() || loading}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Генерируем..." : "Сгенерировать"}
        </Button>
      </form>

      {loading ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Формируем семантическое ядро по теме...
            </p>
          </CardContent>
        </Card>
      ) : selected ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge>Семантическое ядро</Badge>
                  {usedModel ? (
                    <Badge variant="secondary" className="gap-1">
                      <Bot className="h-3 w-3" />
                      RouterAI
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Wrench className="h-3 w-3" />
                      Приблизительно
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(selected)}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Скопировано" : "Копировать"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selected)}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    Скачать
                  </Button>
                </div>
              </div>
              <CardTitle>{selected.topic}</CardTitle>
              <CardDescription>
                Ключевые слова и поисковые запросы для объявлений на Авито.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  Ключевые слова
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.keywords.map((keyword) => {
                    const fav = isFavorite(keyword);
                    return (
                      <span
                        key={keyword}
                        className="inline-flex items-center gap-1 rounded-md border bg-secondary/40 pl-2.5 pr-1 py-1 text-sm text-secondary-foreground"
                      >
                        {keyword}
                        <span
                          className="text-xs text-muted-foreground"
                          title="Приблизительная частотность"
                        >
                          ≈ {formatFrequency(frequencyFor(keyword, selected))}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleFavorite(keyword, selected.id)
                          }
                          className={`h-6 w-6 shrink-0 p-0 ${
                            fav
                              ? "text-primary hover:text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          aria-label={
                            fav
                              ? "Убрать из избранного"
                              : "Отметить как избранное"
                          }
                          aria-pressed={fav}
                          title={
                            fav
                              ? "Убрать из избранного"
                              : "Отметить как избранное"
                          }
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${
                              fav ? "fill-current" : ""
                            }`}
                          />
                        </Button>
                      </span>
                    );
                  })}
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Search className="h-4 w-4" />
                  Поисковые запросы
                </div>
                <ul className="space-y-2">
                  {selected.queries.map((query) => (
                    <li
                      key={query}
                      className="flex items-center justify-between gap-3 rounded-md bg-secondary/30 px-3 py-2 text-sm"
                    >
                      <span>{query}</span>
                      <span
                        className="shrink-0 text-xs text-muted-foreground"
                        title="Приблизительная частотность"
                      >
                        ≈ {formatFrequency(frequencyFor(query, selected))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Введите тему продажи и нажмите «Сгенерировать», чтобы увидеть
              результат.
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <History className="h-5 w-5 text-primary" />
            История генераций
          </h2>
          <Badge variant="outline" className="text-sm">
            {history.length}{" "}
            {history.length === 1
              ? "тема"
              : history.length < 5
                ? "темы"
                : "тем"}
          </Badge>
        </div>

        {!dbAvailable && (
          <p className="text-xs text-muted-foreground">
            База данных недоступна — история сохраняется только на время текущей
            сессии.
          </p>
        )}

        {history.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Пока нет сохранённых тем. Сгенерируйте первое семантическое
                ядро.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => {
              const isSelected = selected?.id === item.id;
              return (
                <li key={item.id}>
                  <Card
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "border-primary" : "card-hover"
                    }`}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(item);
                          setUsedModel(false);
                        }}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.topic}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(item.createdAt).toLocaleString(
                                "ru-RU",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </button>
                      {dbAvailable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          aria-label="Удалить из истории"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Bookmark className="h-5 w-5 text-primary" />
            Избранные ключевые слова
          </h2>
          {favorites.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFavorites}
                className="gap-1.5"
              >
                {favoritesCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {favoritesCopied ? "Скопировано" : "Копировать"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadFavorites}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                Скачать
              </Button>
            </div>
          )}
        </div>

        {!dbAvailable && (
          <p className="text-xs text-muted-foreground">
            База данных недоступна — избранное сохраняется только на время
            текущей сессии.
          </p>
        )}

        {favorites.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Heart className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Отмечайте ключевые слова из ядер, чтобы собрать отдельный список
                избранного.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favorites.map((favorite) => (
              <span
                key={favorite.keyword}
                className="inline-flex items-center gap-1 rounded-md border bg-secondary/40 pl-2.5 pr-1 py-1 text-sm text-secondary-foreground"
              >
                {favorite.keyword}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleFavorite(favorite.keyword)}
                  className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  aria-label="Убрать из избранного"
                  title="Убрать из избранного"
                >
                  <Heart className="h-3.5 w-3.5 fill-current" />
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
