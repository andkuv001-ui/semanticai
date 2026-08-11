#!/bin/bash
cd "$(dirname "$0")"

echo "Остановка Семантического ядра..."
docker compose down
echo "Готово."
