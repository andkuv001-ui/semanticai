#!/bin/bash
cd "$(dirname "$0")"

echo "Запуск Семантического ядра..."

if ! command -v docker &>/dev/null; then
  echo "Docker не установлен. Установите Docker Desktop: https://www.docker.com/products/docker-desktop"
  open "https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Запуск Docker Desktop..."
  open -a Docker
  echo "Ожидание Docker..."
  for i in $(seq 1 30); do
    docker info >/dev/null 2>&1 && break
    sleep 2
  done
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker не запустился. Проверьте Docker Desktop."
  exit 1
fi

echo "Сборка и запуск контейнеров..."
docker compose up -d --build

echo ""
echo "Ожидание запуска приложения..."
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    break
  fi
  sleep 2
done

echo ""
echo "Приложение запущено: http://localhost:8080"
open "http://localhost:8080"
