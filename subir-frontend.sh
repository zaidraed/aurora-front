#!/bin/bash

# Script para subir el frontend al repositorio original

REPO_URL="https://github.com/DotsComArg/panelAuroraSDR.git"
TEMP_DIR="/tmp/panelAuroraSDR-$(date +%s)"
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"

echo "🚀 Preparando para subir frontend al repositorio..."
echo "📁 Frontend: $FRONTEND_DIR"
echo "📍 Repo temporal: $TEMP_DIR"
echo ""

# Clonar el repositorio
echo "📥 Clonando repositorio..."
git clone $REPO_URL $TEMP_DIR
cd $TEMP_DIR

# Eliminar todo el contenido excepto .git
echo "🧹 Limpiando repositorio..."
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# Copiar frontend
echo "📋 Copiando archivos del frontend..."
cp -r "$FRONTEND_DIR"/* .
cp -r "$FRONTEND_DIR"/.gitignore . 2>/dev/null || true
cp -r "$FRONTEND_DIR"/.env.example . 2>/dev/null || true

# Mostrar estado
echo ""
echo "📊 Estado del repositorio:"
git status

echo ""
read -p "¿Deseas hacer commit y push? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]
then
    git add .
    git commit -m "feat: migración a Vite + React - frontend separado"
    git push origin main
    echo "✅ Frontend subido exitosamente!"
else
    echo "⏸️  Cambios preparados pero no subidos. Puedes revisar en: $TEMP_DIR"
fi
