"use client";

import { useState } from "react";
import { Gauge, Hash, Coins, Save, AlertTriangle, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUsage } from "./usage-provider";

function formatTokens(tokens: number): string {
  return tokens.toLocaleString("ru-RU");
}

export function UsageCounter() {
  const { usage, dbAvailable, updateLimit } = useUsage();
  const [limitInput, setLimitInput] = useState(String(usage.limit));
  const limitReached = usage.generationCount >= usage.limit;
  const percent =
    usage.limit > 0
      ? Math.min(100, Math.round((usage.generationCount / usage.limit) * 100))
      : 0;

  async function handleSaveLimit() {
    const parsed = Number(limitInput);
    if (!Number.isInteger(parsed) || parsed < 1) {
      toast.error("Лимит должен быть целым числом не меньше 1");
      return;
    }
    await updateLimit(parsed);
    toast.success("Лимит обновлён");
  }

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-primary" />
            Счётчик использования ИИ
          </CardTitle>
          <CardDescription>
            Количество генераций и примерный расход токенов.
          </CardDescription>
        </div>
        {limitReached && (
          <Badge variant="destructive" className="gap-1.5 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" />
            Лимит достигнут
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              Генераций
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight">
              {usage.generationCount}
            </div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              Расход токенов
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight">
              {formatTokens(usage.tokenCount)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Использовано от лимита</span>
            <span>
              {usage.generationCount} / {usage.limit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all ${
                limitReached ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label
              htmlFor="usage-limit"
              className="text-sm text-muted-foreground"
            >
              Лимит
            </label>
            <Input
              id="usage-limit"
              type="number"
              min={1}
              step={1}
              value={limitInput}
              onChange={(event) => setLimitInput(event.target.value)}
              className="h-9 w-28"
              aria-label="Лимит генераций"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveLimit}
              className="h-9 gap-1.5"
            >
              <Save className="h-4 w-4" />
              Сохранить
            </Button>
          </div>
          {!dbAvailable && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Не сохранится между сессиями (БД недоступна)
            </div>
          )}
        </div>

        {limitReached && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Лимит достигнут, но генерация продолжает работать.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
