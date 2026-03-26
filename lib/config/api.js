// Configuración de APIs para Django Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Autenticación
  LOGIN: `${API_BASE_URL}/api/auth/login/`,
  USER_INFO: `${API_BASE_URL}/api/auth/user-info/`,
  FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot/`,
  RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset/`,
  RESET_PASSWORD_CONFIRM: (token) => `${API_BASE_URL}/api/auth/reset/${token}/`,
  
  // Usuarios
  USUARIOS: `${API_BASE_URL}/api/usuarios/`,
  USUARIO_CREATE: `${API_BASE_URL}/api/usuarios/create/`,
  USUARIO_UPDATE: `${API_BASE_URL}/api/usuarios/update/`,
  USUARIO_DELETE: (id) => `${API_BASE_URL}/api/usuarios/${id}/delete/`,
  USUARIO_PERFIL: `${API_BASE_URL}/api/usuarios/perfil/`,
  USUARIO_PERFIL_ACTUALIZAR: `${API_BASE_URL}/api/usuarios/perfil/actualizar/`,
  USUARIO_CAMBIAR_PASSWORD: `${API_BASE_URL}/api/usuarios/perfil/cambiar-password/`,
  USUARIO_CONFIG: `${API_BASE_URL}/api/usuarios/config/`,
  USUARIO_CONFIG_ACTUALIZAR: `${API_BASE_URL}/api/usuarios/config/actualizar/`,
  
  // Clientes
  CLIENTES: `${API_BASE_URL}/api/clientes/`,
  CLIENTE_DETAIL: (id) => `${API_BASE_URL}/api/clientes/${id}/`,
  CLIENTES_VALORES_UNICOS: `${API_BASE_URL}/api/clientes/valores_unicos/`,
  CLIENTES_DATOS_SELECTS: `${API_BASE_URL}/api/clientes/datos_selects/`,
  CLIENTES_ESTADISTICAS: `${API_BASE_URL}/api/clientes/estadisticas/`,
  CLIENTE_ESTADISTICAS: (id) => `${API_BASE_URL}/api/clientes/${id}/estadisticas/`,
  CLIENTES_BULK_IMPORT: `${API_BASE_URL}/api/clientes/bulk-import/`,
  CLIENTES_BULK_TEMPLATE: `${API_BASE_URL}/api/clientes/bulk-template/`,
  
  // Pagos
  PAGOS: `${API_BASE_URL}/api/pagos/`,
  PAGO_DETAIL: (id) => `${API_BASE_URL}/api/pagos/${id}/`,
  PAGOS_STATS: `${API_BASE_URL}/api/pagos/stats/`,
  PAGO_CREATE: `${API_BASE_URL}/api/pagos/create/`,
  PAGO_FLEXIBLE: `${API_BASE_URL}/api/pagos/flexible/`,
  PAGOS_BULK_IMPORT: `${API_BASE_URL}/api/pagos/import/`,
  
  // Deudas
  DEUDAS: `${API_BASE_URL}/api/deudas/`,
  DEUDAS_FILTROS: `${API_BASE_URL}/api/deudas/filtros/`,
  DEUDAS_STATS: `${API_BASE_URL}/api/deudas/stats/`,
  DEUDAS_ACTUALIZAR_ESTADOS: `${API_BASE_URL}/api/deudas/actualizar-estados/`,
  DEUDAS_ACTUALIZAR_PAGOS_REALES: `${API_BASE_URL}/api/deudas/actualizar-pagos-reales/`,
  DEUDAS_CLIENTE_CUOTAS: (clienteId) => `${API_BASE_URL}/api/deudas/cliente/${clienteId}/cuotas/`,
  DEUDAS_CLIENTE_HISTORIAL: (clienteId) => `${API_BASE_URL}/api/deudas/cliente/${clienteId}/historial/`,
  
  // Comprobantes
  PAGO_DESCARGAR_COMPROBANTE: (pagoId) => `${API_BASE_URL}/api/pagos/${pagoId}/descargar/`,
  PAGO_ENVIAR_EMAIL: (pagoId) => `${API_BASE_URL}/api/pagos/${pagoId}/enviar-email/`,
  
  // Reportes de exportación
  REPORTE_PAGOS_EXCEL: `${API_BASE_URL}/api/reportes/pagos/excel/`,
  REPORTE_PAGOS_PDF: `${API_BASE_URL}/api/reportes/pagos/pdf/`,
  REPORTE_DEUDAS_EXCEL: `${API_BASE_URL}/api/reportes/deudas/excel/`,
  
  // Gastos
  GASTOS: `${API_BASE_URL}/api/gastos/`,
  GASTO_CREATE: `${API_BASE_URL}/api/gastos/create/`,
  GASTO_UPDATE: `${API_BASE_URL}/api/gastos/update/`,
  GASTO_DELETE: `${API_BASE_URL}/api/gastos/delete/`,
  GASTOS_TENDENCIAS: `${API_BASE_URL}/api/gastos/tendencias/`,
  GASTOS_BALANCE: `${API_BASE_URL}/api/gastos/balance/`,
  
  // Notificaciones
  NOTIFICACIONES: `${API_BASE_URL}/api/notificaciones/`,
  NOTIFICACIONES_CLIENTES: `${API_BASE_URL}/api/notificaciones/clientes/`,
  NOTIFICACIONES_ESTADO_PAGOS: `${API_BASE_URL}/api/notificaciones/estado-pagos/`,
  NOTIFICACIONES_ESTADISTICAS: `${API_BASE_URL}/api/notificaciones/estadisticas/`,
  NOTIFICACION_CREATE: `${API_BASE_URL}/api/notificaciones/create/`,
  NOTIFICACION_PROCESAR: `${API_BASE_URL}/api/notificaciones/procesar/`,
  NOTIFICACION_ENVIAR: (id) => `${API_BASE_URL}/api/notificaciones/${id}/enviar/`,
  NOTIFICACION_MARK_ENVIADO: (id) => `${API_BASE_URL}/api/notificaciones/${id}/mark-enviado/`,
  NOTIFICACION_MASIVA: `${API_BASE_URL}/api/notificaciones/masiva/`,
  NOTIFICACIONES_GENERAR_AUTOMATICAS: `${API_BASE_URL}/api/notificaciones/generar-automaticas/`,
  NOTIFICACIONES_LIMPIAR: `${API_BASE_URL}/api/notificaciones/limpiar/`,
  NOTIFICACIONES_WHATSAPP_STATUS: `${API_BASE_URL}/api/notificaciones/whatsapp/status/`,
  NOTIFICACIONES_WHATSAPP_SEND: `${API_BASE_URL}/api/notificaciones/whatsapp/send/`,
  NOTIFICACIONES_WHATSAPP_TEST: `${API_BASE_URL}/api/notificaciones/whatsapp/test/`,
  NOTIFICACIONES_WHATSAPP_URLS_PENDIENTES: `${API_BASE_URL}/api/notificaciones/whatsapp/urls-pendientes/`,
  NOTIFICACION_URL_WHATSAPP: (id) => `${API_BASE_URL}/api/notificaciones/${id}/url-whatsapp/`,
  
  // Configuración
  CONFIGURACION: `${API_BASE_URL}/api/configuracion/`,
  CONFIGURACION_GUARDAR: `${API_BASE_URL}/api/configuracion/guardar/`,
  CONFIGURACION_INITIALIZE: `${API_BASE_URL}/api/configuracion/inicializar/`,
  
  // Gestión de Planes
  CONFIGURACION_PLANES: `${API_BASE_URL}/api/configuracion/planes/`,
  CONFIGURACION_PLANES_CREAR: `${API_BASE_URL}/api/configuracion/planes/crear/`,
  CONFIGURACION_PLANES_ACTUALIZAR: (id) => `${API_BASE_URL}/api/configuracion/planes/${id}/actualizar/`,
  CONFIGURACION_PLANES_ELIMINAR: (id) => `${API_BASE_URL}/api/configuracion/planes/${id}/eliminar/`,
  CONFIGURACION_PLANES_DESACTIVAR: (id) => `${API_BASE_URL}/api/configuracion/planes/${id}/desactivar/`,
  CONFIGURACION_PLANES_ACTIVAR: (id) => `${API_BASE_URL}/api/configuracion/planes/${id}/activar/`,
  
  // Gestión de Sectores
  CONFIGURACION_SECTORES: `${API_BASE_URL}/api/configuracion/sectores/`,
  CONFIGURACION_SECTORES_CREAR: `${API_BASE_URL}/api/configuracion/sectores/crear/`,
  CONFIGURACION_SECTORES_ACTUALIZAR: (id) => `${API_BASE_URL}/api/configuracion/sectores/${id}/actualizar/`,
  CONFIGURACION_SECTORES_ELIMINAR: (id) => `${API_BASE_URL}/api/configuracion/sectores/${id}/eliminar/`,
  CONFIGURACION_SECTORES_DESACTIVAR: (id) => `${API_BASE_URL}/api/configuracion/sectores/${id}/desactivar/`,
  CONFIGURACION_SECTORES_ACTIVAR: (id) => `${API_BASE_URL}/api/configuracion/sectores/${id}/activar/`,

  // Sitio Web
  SITIO_WEB_CONFIGURACION: `${API_BASE_URL}/api/sitio-web/configuracion/`,
  SITIO_WEB_PUBLICO: `${API_BASE_URL}/api/sitio-web/publico/`,
  SITIO_WEB_INFORMACION: `${API_BASE_URL}/api/sitio-web/informacion/`,
  SITIO_WEB_EMPRESA: `${API_BASE_URL}/api/sitio-web/empresa/`,
  SITIO_WEB_SERVICIOS: `${API_BASE_URL}/api/sitio-web/servicios/`,
  SITIO_WEB_REDES_SOCIALES: `${API_BASE_URL}/api/sitio-web/redes-sociales/`,
  
  // Chatbot
  CHATBOT_MENSAJE: `${API_BASE_URL}/api/chatbot/mensaje/`,
  
  // Reportes
  REPORTES: `${API_BASE_URL}/api/reportes/`,
  REPORTES_SECTORES: `${API_BASE_URL}/api/reportes/sectores/`,
  REPORTES_UTILIDADES_ANUALES: `${API_BASE_URL}/api/reportes/utilidades-anuales/`,
  REPORTES_PAGOS_REALES: `${API_BASE_URL}/api/reportes/pagos-reales/`,
  REPORTES_GASTOS_REALES: `${API_BASE_URL}/api/reportes/gastos-reales/`,
  REPORTES_DESCARGAR_EXCEL: `${API_BASE_URL}/api/reportes/descargar-excel/`,
  REPORTES_DESCARGAR_DETALLADO: `${API_BASE_URL}/api/reportes/descargar-detallado/`,
  REPORTES_DEUDAS_DETALLE: `${API_BASE_URL}/api/reportes/deudas-detalle/`,
  REPORTES_RECAUDACION_MENSUAL: `${API_BASE_URL}/api/reportes/recaudacion-mensual/`,
  REPORTES_PAGOS: `${API_BASE_URL}/api/reportes/pagos/`,
  REPORTES_GASTOS: `${API_BASE_URL}/api/reportes/gastos/`,
};



// Función para hacer peticiones autenticadas
export async function apiRequest(url, options = {}) {
  const userEmail = localStorage.getItem('userEmail');
  
  // Construir la URL completa si no es una URL absoluta
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(userEmail && { 'X-User-Email': userEmail }),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(fullUrl, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Manejar errores específicos
      if (response.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
      } else if (response.status === 403) {
        throw new Error('Acceso denegado. No tiene permisos para esta acción.');
      } else if (response.status === 404) {
        throw new Error('Recurso no encontrado.');
      } else if (response.status >= 500) {
        throw new Error('Error del servidor. Intente más tarde.');
      } else {
        // Para errores 400 (Bad Request), devolver el objeto completo para manejar validaciones
        if (response.status === 400) {
          return {
            success: false,
            message: errorData.message || 'Datos inválidos',
            errors: errorData.errors || errorData
          };
        }
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

// Función para login optimizada
export async function loginUser(email, password) {
  // Validaciones básicas
  if (!email || !password) {
    throw new Error('Email y contraseña son requeridos');
  }
  
  if (!email.includes('@')) {
    throw new Error('Email inválido');
  }
  
  try {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    // Verificar si la respuesta HTTP es exitosa
    if (!response.ok) {
      // Manejar errores específicos del servidor
      if (response.status === 401) {
        throw new Error('Credenciales incorrectas');
      } else if (response.status === 429) {
        throw new Error('Demasiados intentos. Intente más tarde.');
      } else if (response.status >= 500) {
        throw new Error('Error del servidor. Intente más tarde.');
      } else {
        throw new Error(data.message || `Error en login: ${response.status}`);
      }
    }

    // Verificar si el login fue exitoso según la respuesta del servidor
    if (!data.success) {
      throw new Error(data.message || 'Credenciales incorrectas');
    }

    // Guardar información del usuario solo si el login fue exitoso
    if (data.data) {
      localStorage.setItem('userEmail', data.data.email);
      localStorage.setItem('userName', data.data.nombre);
      localStorage.setItem('userRole', data.data.rol);
      localStorage.setItem('userId', data.data.id);
    }

    return data;
  } catch (error) {
    // Limpiar localStorage en caso de error
    if (error.message.includes('Credenciales incorrectas') || 
        error.message.includes('No autorizado')) {
      logoutUser();
    }
    
    throw error;
  }
}

// Función para logout
export function logoutUser() {
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId');
}

// Función para verificar si el usuario está autenticado
export function isAuthenticated() {
  const userEmail = localStorage.getItem('userEmail');
  const userName = localStorage.getItem('userName');
  const userRole = localStorage.getItem('userRole');
  
  // Verificar que todos los datos necesarios estén presentes
  if (!userEmail || !userName || !userRole) {
    return false;
  }
  
  return true;
}

// Función para validar autenticación con el servidor
export async function validateAuthentication() {
  const userEmail = localStorage.getItem('userEmail');
  
  if (!userEmail) {
    return false;
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.USER_INFO}?email=${encodeURIComponent(userEmail)}`);
    
    if (!response.ok) {
      logoutUser();
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      logoutUser();
      return false;
    }
    
    // Actualizar datos del usuario si es necesario
    const user = data.data;
    localStorage.setItem('userName', user.nombre);
    localStorage.setItem('userRole', user.rol);
    localStorage.setItem('userId', user.id);
    
    return true;
  } catch (error) {
    console.error('Error validando autenticación:', error);
    logoutUser();
    return false;
  }
}

// Función para obtener información del usuario actual
export function getCurrentUser() {
  const email = localStorage.getItem('userEmail');
  const name = localStorage.getItem('userName');
  const role = localStorage.getItem('userRole');
  const id = localStorage.getItem('userId');

  if (!email) {
    return null;
  }

  return {
    id,
    email,
    nombre: name,
    rol: role,
  };
}

// Función para limpiar localStorage
export function clearLocalStorage() {
  localStorage.clear();
}

export default API_BASE_URL; 