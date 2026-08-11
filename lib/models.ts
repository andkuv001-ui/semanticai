import { docClient } from "./db";
import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { TableName } from "./schema";

export interface Generation {
  id: string;
  topic: string;
  keywords: string[];
  queries: string[];
  createdAt: string;
  /** Частотность по элементам ядра (word -> число запросов в месяц). */
  frequencies?: Record<string, number>;
}

export async function getAllGenerations(): Promise<Generation[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.GENERATIONS,
    })
  );
  const items = (result.Items as Generation[]) ?? [];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createGeneration(
  data: Omit<Generation, "createdAt">
): Promise<Generation> {
  const generation: Generation = {
    ...data,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TableName.GENERATIONS,
      Item: generation,
    })
  );

  return generation;
}

export async function deleteGeneration(id: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TableName.GENERATIONS,
      Key: { id },
    })
  );
}

export interface Favorite {
  keyword: string;
  sourceGenerationId?: string;
  createdAt: string;
}

export async function getAllFavorites(): Promise<Favorite[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.FAVORITES,
    })
  );
  const items = (result.Items as Favorite[]) ?? [];
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addFavorite(
  keyword: string,
  sourceGenerationId?: string
): Promise<Favorite> {
  const favorite: Favorite = {
    keyword,
    ...(sourceGenerationId ? { sourceGenerationId } : {}),
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TableName.FAVORITES,
      Item: favorite,
    })
  );

  return favorite;
}

export async function removeFavorite(keyword: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TableName.FAVORITES,
      Key: { keyword },
    })
  );
}

export interface Usage {
  id: string;
  generationCount: number;
  tokenCount: number;
  limit: number;
  updatedAt: string;
}

export const USAGE_ID = "current";

export async function getUsage(): Promise<Usage | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.USAGE,
      Key: { id: USAGE_ID },
    })
  );
  return (result.Item as Usage) ?? null;
}

export async function saveUsage(
  data: Omit<Usage, "updatedAt">
): Promise<Usage> {
  const usage: Usage = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TableName.USAGE,
      Item: usage,
    })
  );

  return usage;
}
