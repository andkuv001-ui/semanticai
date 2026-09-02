import "server-only";

/**
 * Серверная интеграция с RouterAI (OpenRouter-совместимый API).
 *
 * API-ключ читается только на сервере из переменной окружения и никогда
 * не попадает в браузер:
 * - переменная называется ROUTERAI_API_KEY (не префикс NEXT_PUBLIC_,
 *   поэтому Next.js не встраивает её в клиентский бандл);
 * - модуль помечен `import "server-only"`, поэтому импорт из клиентского
 *   компонента приводит к ошибке сборки.
 *
 * Если ключ не задан, все функции безопасно возвращают null / false, и
 * приложение продолжает работать на прежней приблизительной генерации.
 */

export interface RouterAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface RouterAiResult {
  text: string;
  model: string;
}

const DEFAULT_BASE_URL = "https://routerai.ru/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

/** Читает конфигурацию RouterAI из переменных окружения. */
export function getRouterAiConfig(): RouterAiConfig | null {
  const apiKey = process.env.ROUTERAI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl =
    process.env.ROUTERAI_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model =
    process.env.ROUTERAI_MODEL?.trim() || DEFAULT_MODEL;

  return { apiKey, baseUrl, model };
}

/** Есть ли настроенный API-ключ RouterAI на сервере. */
export function isRouterAiConfigured(): boolean {
  return getRouterAiConfig() !== null;
}

interface RouterAiCallOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Отправляет запрос к RouterAI на сервере и возвращает текст ответа.
 * Возвращает null, если ключ не задан, запрос не удался или ответ пуст.
 */
export async function callRouterAi(
  promptText: string,
  options: RouterAiCallOptions = {}
): Promise<RouterAiResult | null> {
  const config = getRouterAiConfig();
  if (!config) return null;

  const messages: ChatMessage[] = [
    ...(options.systemPrompt
      ? [{ role: "system" as const, content: options.systemPrompt }]
      : []),
    { role: "user", content: promptText },
  ];

  const body: ChatCompletionRequest = {
    model: config.model,
    messages,
    temperature: options.temperature ?? 0.6,
    max_tokens: options.maxTokens ?? 3000,
  };

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(
        `Ошибка RouterAI API: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    return { text, model: config.model };
  } catch (error) {
    console.error("Ошибка вызова RouterAI:", error);
    return null;
  }
}
