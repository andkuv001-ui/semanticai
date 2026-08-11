// Мок-данные для статического режима (без БД)
// Используются когда USE_DATABASE=false или БД недоступна

import { Favorite, Generation, Usage } from "./models";

export const mockGenerations: Generation[] = [
  {
    id: "mock-gen-1",
    topic: "зип-пакеты с бегунком",
    keywords: [
      "зип-пакеты с бегунком",
      "зип-пакеты с бегунком купить",
      "купить зип-пакеты с бегунком",
      "зип-пакеты с бегунком цена",
      "зип-пакеты с бегунком недорого",
      "зип-пакеты с бегунком оптом",
      "зип-пакеты с бегунком на авито",
    ],
    queries: [
      "купить зип-пакеты с бегунком недорого",
      "зип-пакеты с бегунком купить на авито",
      "зип-пакеты с бегунком цена на авито",
      "где купить зип-пакеты с бегунком",
      "зип-пакеты с бегунком с доставкой",
    ],
    createdAt: new Date("2024-04-01").toISOString(),
  },
  {
    id: "mock-gen-2",
    topic: "клейкая лента скотч",
    keywords: [
      "клейкая лента скотч",
      "клейкая лента скотч купить",
      "купить клейкая лента скотч",
      "клейкая лента скотч цена",
      "клейкая лента скотч недорого",
    ],
    queries: [
      "купить клейкая лента скотч недорого",
      "клейкая лента скотч купить на авито",
      "клейкая лента скотч цена на авито",
      "где купить клейкая лента скотч",
      "клейкая лента скотч в наличии",
    ],
    createdAt: new Date("2024-04-02").toISOString(),
  },
];

export const mockFavorites: Favorite[] = [
  {
    keyword: "зип-пакеты с бегунком оптом",
    sourceGenerationId: "mock-gen-1",
    createdAt: new Date("2024-04-01").toISOString(),
  },
  {
    keyword: "купить зип-пакеты с бегунком недорого",
    sourceGenerationId: "mock-gen-1",
    createdAt: new Date("2024-04-01").toISOString(),
  },
  {
    keyword: "клейкая лента скотч недорого",
    sourceGenerationId: "mock-gen-2",
    createdAt: new Date("2024-04-02").toISOString(),
  },
];

export const mockUsage: Usage = {
  id: "current",
  generationCount: 2,
  tokenCount: 1560,
  limit: 100,
  updatedAt: new Date("2024-04-02").toISOString(),
};

export const emptyUsage: Usage = {
  id: "current",
  generationCount: 0,
  tokenCount: 0,
  limit: 100,
  updatedAt: new Date().toISOString(),
};
