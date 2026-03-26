#!/bin/bash

# Script para iniciar ambos servidores (Django y Next.js) en paralelo
# Uso: ./start-dev.sh

echo "🚀 Iniciando servidores de desarrollo..."
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Deteniendo servidores...${NC}"
    kill $DJANGO_PID $NEXT_PID 2>/dev/null
    exit
}

# Capturar Ctrl+C
trap cleanup INT TERM

# Verificar si existe el entorno virtual de Django
if [ ! -d "django_backend/venv" ]; then
    echo -e "${YELLOW}⚠️  No se encontró el entorno virtual de Django${NC}"
    echo "Por favor, crea el entorno virtual primero:"
    echo "  cd django_backend && python3 -m venv venv"
    exit 1
fi

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  No se encontró node_modules${NC}"
    echo "Instalando dependencias de Next.js..."
    npm install
fi

# Configurar variables de entorno para WeasyPrint en macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:$PKG_CONFIG_PATH"
    export DYLD_LIBRARY_PATH="/opt/homebrew/lib:$DYLD_LIBRARY_PATH"
    export PATH="/opt/homebrew/bin:$PATH"
fi

# Iniciar servidor Django en background
echo -e "${BLUE}🐍 Iniciando servidor Django...${NC}"
cd django_backend
source venv/bin/activate
python manage.py runserver > ../django.log 2>&1 &
DJANGO_PID=$!
cd ..

# Esperar un momento para que Django inicie
sleep 2

# Iniciar servidor Next.js en background
echo -e "${GREEN}⚛️  Iniciando servidor Next.js...${NC}"
npm run dev > nextjs.log 2>&1 &
NEXT_PID=$!

echo ""
echo -e "${GREEN}✅ Servidores iniciados correctamente!${NC}"
echo ""
echo "📊 Servidores corriendo:"
echo "  🐍 Django:    http://localhost:8000"
echo "  ⚛️  Next.js:   http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "  Django:  tail -f django.log"
echo "  Next.js: tail -f nextjs.log"
echo ""
echo -e "${YELLOW}Presiona Ctrl+C para detener ambos servidores${NC}"
echo ""

# Esperar a que los procesos terminen
wait $DJANGO_PID $NEXT_PID



