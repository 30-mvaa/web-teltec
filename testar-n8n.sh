#!/bin/bash

echo "🔍 Diagnóstico de N8N - TelTec"
echo "================================"
echo ""

# Verificar que N8N está corriendo
echo "1️⃣ Verificando que N8N está corriendo..."
if docker ps | grep -q n8n; then
    echo "   ✅ N8N está corriendo"
else
    echo "   ❌ N8N NO está corriendo"
    echo "   💡 Ejecuta: docker-compose -f n8n-docker-compose.yml up -d"
    exit 1
fi
echo ""

# Verificar que Django responde
echo "2️⃣ Verificando que Django responde..."
DJANGO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/notificaciones/n8n/pendientes/)
if [ "$DJANGO_RESPONSE" = "200" ]; then
    echo "   ✅ Django responde correctamente"
else
    echo "   ❌ Django NO responde (código: $DJANGO_RESPONSE)"
    echo "   💡 Verifica que Django esté corriendo en el puerto 8000"
    exit 1
fi
echo ""

# Verificar notificaciones pendientes
echo "3️⃣ Verificando notificaciones pendientes..."
PENDIENTES=$(curl -s http://localhost:8000/api/notificaciones/n8n/pendientes/ | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
if [ -n "$PENDIENTES" ]; then
    echo "   ✅ Hay $PENDIENTES notificación(es) pendiente(s)"
else
    echo "   ⚠️  No se pudo obtener el número de notificaciones pendientes"
fi
echo ""

# Verificar logs de N8N
echo "4️⃣ Últimas líneas de logs de N8N..."
echo "   (Presiona Ctrl+C para salir)"
echo ""
docker logs n8n-teltec --tail 20
echo ""

echo "================================"
echo "✅ Verificaciones completadas"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Abre N8N en: http://localhost:5678"
echo "   2. Verifica que el workflow esté ACTIVO"
echo "   3. Verifica que la URL sea: http://host.docker.internal:8000/api/notificaciones/n8n/pendientes/"
echo "   4. Ejecuta el workflow manualmente para probar"
echo ""
