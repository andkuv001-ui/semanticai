import {
  type KeySchemaElement,
  type AttributeDefinition,
} from "@aws-sdk/client-dynamodb";

export const TableName = {
  GENERATIONS: "generations",
  FAVORITES: "favorites",
  USAGE: "usage",
} as const;

export type TableName = (typeof TableName)[keyof typeof TableName];

export interface TableSchema {
  name: TableName;
  keySchema: KeySchemaElement[];
  attributeDefinitions: AttributeDefinition[];
}

export const TABLE_SCHEMAS: Record<TableName, TableSchema> = {
  [TableName.GENERATIONS]: {
    name: TableName.GENERATIONS,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
  },
  [TableName.FAVORITES]: {
    name: TableName.FAVORITES,
    keySchema: [{ AttributeName: "keyword", KeyType: "HASH" }],
    attributeDefinitions: [{ AttributeName: "keyword", AttributeType: "S" }],
  },
  [TableName.USAGE]: {
    name: TableName.USAGE,
    keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    attributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
  },
};

export const TABLE_NAMES: TableName[] = Object.values(TableName);
