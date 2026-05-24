-- Tablas para TelTec Net
SET search_path TO public, public;

-- Tabla usuarios
CREATE TABLE public.usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('administrador', 'economia', 'atencion_cliente')),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    last_activity TIMESTAMP,
    session_timeout_minutes INTEGER DEFAULT 30
);

-- Tabla clientes
CREATE TABLE public.clientes (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) NOT NULL,
    nombres VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    direccion TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    telegram_chat_id VARCHAR(100),
    id_sector INTEGER,
    estado_pago VARCHAR(50) DEFAULT 'sin_fecha',
    meses_pendientes INTEGER DEFAULT 0,
    monto_total_deuda DECIMAL(10,2) DEFAULT 0.00,
    fecha_ultimo_pago DATE,
    fecha_vencimiento_pago DATE
);

-- Tabla pagos
CREATE TABLE public.pagos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    fecha_pago DATE DEFAULT CURRENT_DATE NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL,
    concepto TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'completado' CHECK (estado IN ('completado', 'pendiente', 'fallido')),
    comprobante_enviado BOOLEAN DEFAULT false,
    numero_comprobante VARCHAR(50) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE,
    observaciones TEXT,
    concepto_mes VARCHAR(20)
);

-- Tabla gastos
CREATE TABLE public.gastos (
    id SERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(100) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    observaciones TEXT,
    usuario_id INTEGER
);

-- Tabla planes (configuracion)
CREATE TABLE public.planes (
    id_plan SERIAL PRIMARY KEY,
    tipo_plan VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla sectores (configuracion)
CREATE TABLE public.sectores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla deudas
CREATE TABLE public.deudas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    meses_pendientes INTEGER DEFAULT 1,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla notificaciones
CREATE TABLE public.notificaciones (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'recordatorio',
    enviado BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_envio TIMESTAMP,
    canal VARCHAR(20) DEFAULT 'telegram'
);

-- Tablas sitio_web
CREATE TABLE public.sitio_web_empresa (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255),
    descripcion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(255),
    direccion TEXT,
    ruc VARCHAR(20)
);

CREATE TABLE public.sitio_web_servicio (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255),
    descripcion TEXT,
    precio DECIMAL(10,2),
    icono VARCHAR(50)
);

CREATE TABLE public.sitio_web_redsocial (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50),
    url VARCHAR(255),
    icono VARCHAR(50)
);

-- Tabla configuracion sistema
CREATE TABLE public.configuracion_sistema (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT,
    descripcion TEXT
);

-- Tabla clientes_planes
CREATE TABLE public.clientes_planes (
    id_cliente_plan SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    estado VARCHAR(20) DEFAULT 'activo'
);

-- Tabla historial_deudas
CREATE TABLE public.historial_deudas (
    id SERIAL PRIMARY KEY,
    deuda_id INTEGER NOT NULL,
    accion VARCHAR(50) NOT NULL,
    monto_anterior DECIMAL(10,2),
    monto_nuevo DECIMAL(10,2),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER
);

-- Tabla django
CREATE TABLE public.django_content_type (
    id SERIAL PRIMARY KEY,
    app_label VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL
);

CREATE TABLE public.django_migrations (
    id SERIAL PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar usuario admin
INSERT INTO usuarios (email, password_hash, nombre, rol) 
VALUES ('vangamarca4@gmail.com', '$2b$12$V5.5SSbxrwTVFAQ2iStZvO1UWNX0YcQfiUeiU4lV83IaqxWaIn6YC', 'Marco AA', 'administrador')
ON CONFLICT (email) DO NOTHING;