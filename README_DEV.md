# 🚀 Guía de Inicio Rápido - Desarrollo

Este proyecto incluye configuración automática para iniciar ambos servidores (Django y Next.js) al abrir el proyecto en Cursor o Visual Studio Code.

## 📋 Opciones para Iniciar los Servidores

### Opción 1: Automático al Abrir el Proyecto (Recomendado)

Al abrir el proyecto en **Cursor** o **Visual Studio Code**, los servidores se iniciarán automáticamente gracias a la configuración en `.vscode/tasks.json`.

**Nota:** Si no se inician automáticamente, puedes ejecutarlos manualmente desde la paleta de comandos:
1. Presiona `Cmd+Shift+P` (Mac) o `Ctrl+Shift+P` (Windows/Linux)
2. Escribe "Tasks: Run Task"
3. Selecciona "🚀 Iniciar Todos los Servidores"

### Opción 2: Script Shell

Ejecuta el script desde la terminal:

```bash
./start-dev.sh
```

O usando npm:

```bash
npm run start:all
```

### Opción 3: Manualmente

Inicia cada servidor en terminales separadas:

**Terminal 1 - Django:**
```bash
cd django_backend
source venv/bin/activate
python manage.py runserver
```

**Terminal 2 - Next.js:**
```bash
npm run dev
```

## 🌐 URLs de los Servidores

Una vez iniciados, los servidores estarán disponibles en:

- **🐍 Django Backend:** http://localhost:8000
- **⚛️ Next.js Frontend:** http://localhost:3000

## 📝 Logs

Si usas el script `start-dev.sh`, los logs se guardan en:
- `django.log` - Logs del servidor Django
- `nextjs.log` - Logs del servidor Next.js

Para ver los logs en tiempo real:
```bash
# Django
tail -f django.log

# Next.js
tail -f nextjs.log
```

## 🛑 Detener los Servidores

### Si usas el script `start-dev.sh`:
Presiona `Ctrl+C` en la terminal donde ejecutaste el script.

### Si usas las tareas de VS Code/Cursor:
1. Abre el panel de terminales
2. Busca los procesos de Django y Next.js
3. Presiona el botón de "trash" (🗑️) en cada terminal

### Manualmente:
```bash
# Encontrar procesos
lsof -ti:8000  # Django
lsof -ti:3000  # Next.js

# Matar procesos
kill $(lsof -ti:8000)
kill $(lsof -ti:3000)
```

## ⚙️ Configuración

### Archivos de Configuración Creados:

1. **`.vscode/tasks.json`** - Tareas automáticas para VS Code/Cursor
2. **`.vscode/settings.json`** - Configuración del editor
3. **`.vscode/extensions.json`** - Extensiones recomendadas
4. **`start-dev.sh`** - Script shell para iniciar ambos servidores

### Extensiones Recomendadas

El archivo `.vscode/extensions.json` incluye las siguientes extensiones recomendadas:
- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)

## 🔧 Solución de Problemas

### Los servidores no se inician automáticamente

1. Verifica que las tareas estén configuradas correctamente en `.vscode/tasks.json`
2. Asegúrate de que el entorno virtual de Django existe: `django_backend/venv`
3. Verifica que las dependencias de Node.js estén instaladas: `npm install`

### Error: "venv/bin/activate: No such file or directory"

Crea el entorno virtual de Django:
```bash
cd django_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Error: "node_modules not found"

Instala las dependencias de Node.js:
```bash
npm install
```

### Puerto ya en uso

Si los puertos 8000 o 3000 están ocupados:
- **Django:** Cambia el puerto en `django_backend/manage.py runserver 8001`
- **Next.js:** Usa `npm run dev -- -p 3001`

## 📚 Recursos Adicionales

- [Documentación de Django](https://docs.djangoproject.com/)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de VS Code Tasks](https://code.visualstudio.com/docs/editor/tasks)

