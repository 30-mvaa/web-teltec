# 🌐 TelTec Net S.A.S B.I.C - Sistema de Gestión Integral

## 📋 Descripción del Proyecto

**TelTec Net** es un sistema de gestión integral para empresas de telecomunicaciones que permite administrar clientes, pagos, gastos, notificaciones, reportes y un sitio web público. El sistema está diseñado para optimizar la gestión empresarial de proveedores de internet.

## 🏗️ Arquitectura del Sistema

### Frontend
- **Framework**: Next.js 15.3.4 + React 18.3.1
- **UI**: Tailwind CSS + Radix UI Components
- **Iconos**: Lucide React
- **Puerto**: 3002 (dinámico)
- **URL**: http://localhost:3002

### Backend
- **Framework**: Django 4.2.23 + Django REST Framework
- **Base de Datos**: PostgreSQL
- **Autenticación**: Middleware personalizado basado en email
- **Puerto**: 8000
- **URL**: http://localhost:8000

## 🔐 Credenciales de Acceso

```
Email: vangamarca4@gmail.com
Contraseña: marco123
Rol: administrador
```

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/30-mvaa/TELTEC-NET-S.A.S-B.I.C.git
cd TELTEC-NET-S.A.S-B.I.C
```

### 2. Configurar Backend Django
```bash
cd django_backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Configurar Frontend React
```bash
npm install
npm run dev
```

### 4. Configurar Base de Datos PostgreSQL
```sql
CREATE DATABASE teltec_db;
CREATE USER teltec_user WITH PASSWORD '12345678';
GRANT ALL PRIVILEGES ON DATABASE teltec_db TO teltec_user;
```

## 📊 Módulos del Sistema

### ✅ Módulos Completamente Funcionales
- **🔐 Autenticación**: Login, recuperación de contraseña, roles y permisos, timeout de sesión (30 min)
- **👥 Gestión de Usuarios**: CRUD completo con roles (administrador, economía, atención cliente)
- **👤 Gestión de Clientes**: CRUD completo con validaciones y campo Telegram
- **💰 Gestión de Pagos**: Registro de pagos, comprobantes PDF, envío por email, bulk import
- **⚠️ Gestión de Deudas**: Control de pagos vencidos y cálculo automático
- **🧾 Gestión de Gastos**: Control de gastos empresariales, reportes ingresos vs gastos
- **👤 Perfil de Usuario**: Edición de nombre, cambio de contraseña
- **💬 Notificaciones**: Sistema de notificaciones Telegram automáticas
- **📊 Reportes**: Reportes detallados con exportación a Excel
- **⚙️ Configuración**: Configuración del sistema, planes y sectores
- **🌐 Sitio Web**: Panel de administración y sitio web público

### 🔧 Funcionalidades Avanzadas
- **PDF Generation**: Comprobantes de pago automáticos
- **Email System**: Envío de comprobantes por email
- **Telegram Bot**: Notificaciones automáticas (@teltecnoti_bot)
- **Responsive Design**: Interfaz adaptable a todos los dispositivos
- **Real-time Updates**: Actualizaciones en tiempo real
- **Data Export**: Exportación de datos a Excel
- **Session Security**: Timeout de 30 minutos con heartbeat automático
- **Modern UI**: Diálogos de confirmación de logout

## 🔌 APIs Disponibles

### Autenticación
- `POST /api/auth/login/` - Login de usuario
- `POST /api/auth/forgot/` - Recuperación de contraseña
- `POST /api/auth/reset/` - Reset de contraseña
- `GET /api/auth/user-info/` - Información del usuario

### Usuarios
- `GET /api/usuarios/` - Listar usuarios
- `POST /api/usuarios/create/` - Crear usuario
- `PUT /api/usuarios/update/` - Actualizar usuario
- `DELETE /api/usuarios/{id}/delete/` - Eliminar usuario

### Clientes
- `GET /api/clientes/` - Listar clientes
- `POST /api/clientes/` - Crear cliente
- `GET /api/clientes/{id}/` - Obtener cliente
- `PUT /api/clientes/{id}/` - Actualizar cliente
- `DELETE /api/clientes/{id}/` - Eliminar cliente
- `GET /api/clientes/valores_unicos/` - Valores únicos para filtros
- `GET /api/clientes/{id}/estadisticas/` - Estadísticas del cliente

### Pagos
- `GET /api/pagos/` - Listar pagos
- `POST /api/pagos/` - Crear pago
- `GET /api/pagos/{id}/` - Obtener pago
- `PUT /api/pagos/{id}/` - Actualizar pago
- `DELETE /api/pagos/{id}/` - Eliminar pago
- `GET /api/pagos/{id}/descargar/` - Descargar comprobante PDF
- `POST /api/pagos/{id}/enviar-email/` - Enviar comprobante por email

### Deudas
- `GET /api/deudas/` - Listar deudas
- `GET /api/deudas/stats/` - Estadísticas de deudas
- `POST /api/deudas/actualizar-estados/` - Actualizar estados de deudas

### Notificaciones
- `GET /api/notificaciones/` - Listar notificaciones
- `POST /api/notificaciones/create/` - Crear notificación
- `POST /api/notificaciones/procesar/` - Procesar notificaciones
- `POST /api/notificaciones/telegram/enviar-prueba/` - Enviar prueba Telegram
- `GET /api/notificaciones/telegram/estadisticas/` - Estadísticas Telegram

### Sitio Web
- `GET /api/sitio-web/configuracion/` - Configuración del sitio (admin)
- `GET /api/sitio-web/publico/` - Datos públicos del sitio

### Reportes
- `GET /api/reportes/pagos/excel/` - Exportar reporte de pagos a Excel

## 🔐 Sistema de Roles y Permisos

### Administrador
- **Acceso completo** a todos los módulos
- **Gestión de usuarios** del sistema
- **Configuración** del sistema
- **Gestión del sitio web**

### Economía
- **Módulos financieros**: Pagos, deudas, reportes
- **Gestión de clientes** y notificaciones
- **Sin acceso** a usuarios, gastos, configuración

### Atención al Cliente
- **Módulos básicos**: Clientes, pagos, deudas, notificaciones
- **Reportes** de clientes
- **Sin acceso** a usuarios, gastos, configuración

## 🌐 Características del Sitio Web

### Panel de Administración
- **Gestión de información** del sitio
- **Configuración de empresa** y contacto
- **Gestión de servicios** y planes
- **Redes sociales** y configuración
- **Modo mantenimiento** configurable

### Sitio Web Público
- **Diseño responsivo** y moderno
- **Información de empresa** y servicios
- **Enlaces a redes sociales**
- **Botón de acceso** al sistema

## 📱 Sistema de Notificaciones

### Telegram Bot
- **Bot**: @teltecnoti_bot
- **Registro automático** de clientes
- **Notificaciones automáticas** de pagos
- **Comandos disponibles**: /start, /help, /status, /contact

### Funcionalidades
- **Registro por cédula** automático
- **Notificaciones de pago** próximos y vencidos
- **Mensajes personalizados** por cliente
- **Estadísticas** de envío

## 🔧 Configuración de Variables de Entorno

Crear archivo `.env.local` en la raíz del proyecto:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True

# Database
DB_NAME=teltec_db
DB_USER=teltec_user
DB_PASSWORD=12345678
DB_HOST=localhost
DB_PORT=5432

# Telegram
TELEGRAM_BOT_TOKEN=8288608865:AAGRieiqjt73SXphtjLzg7kiK-YjqgM4udk

# Email
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📊 Estructura del Proyecto

```
TELTEC-NET-S.A.S-B.I.C/
├── app/                          # Frontend Next.js
│   ├── components/               # Componentes UI
│   ├── dashboard/               # Panel principal
│   ├── clientes/               # Gestión de clientes
│   ├── usuarios/               # Gestión de usuarios
│   ├── recaudacion/            # Gestión de pagos
│   ├── deudas/                 # Gestión de deudas
│   ├── gastos/                 # Gestión de gastos
│   ├── notificaciones/         # Sistema de notificaciones
│   ├── reportes/               # Reportes y estadísticas
│   ├── configuracion/          # Configuración del sistema
│   ├── sitio-web/              # Panel admin del sitio web
│   ├── sitio-web-publico/      # Sitio web público
│   └── login-simple/           # Página de login
├── django_backend/              # Backend Django
│   ├── teltec_backend/         # Configuración principal
│   ├── clientes/               # App de clientes
│   ├── usuarios/               # App de usuarios
│   ├── pagos/                  # App de pagos
│   ├── gastos/                 # App de gastos
│   ├── notificaciones/         # App de notificaciones
│   ├── sitio_web/              # App del sitio web
│   ├── reportes_app/           # App de reportes
│   ├── configuracion/          # App de configuración
│   └── requirements.txt        # Dependencias Python
├── lib/                        # Librerías y configuración
├── public/                     # Archivos públicos
└── README.md                   # Documentación
```

## 🚀 Comandos Útiles

### Desarrollo
```bash
# Iniciar backend
cd django_backend && source venv/bin/activate && python manage.py runserver

# Iniciar frontend
npm run dev

# Iniciar ambos
npm run start:backend & npm run start:frontend
```

### Base de Datos
```bash
# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser
```

### Producción
```bash
# Build del frontend
npm run build

# Iniciar en producción
npm start
```

## 📈 Métricas del Proyecto

- **Frontend**: 15+ páginas, 50+ componentes
- **Backend**: 8 apps Django, 20+ modelos
- **APIs**: 30+ endpoints REST
- **Base de datos**: 15+ tablas
- **Funcionalidades**: 100+ características implementadas

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Contacto

- **Empresa**: TelTec Net S.A.S B.I.C
- **Email**: vangamarca4@gmail.com
- **Teléfono**: 0999859689
- **Dirección**: Av. Principal 123, Centro

## 🙏 Agradecimientos

- **Next.js** por el framework de React
- **Django** por el framework de Python
- **Tailwind CSS** por el sistema de diseño
- **Radix UI** por los componentes accesibles
- **PostgreSQL** por la base de datos robusta

---

**¡Gracias por usar TelTec Net!** 🚀

*Conectando tu mundo digital* 