from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
import json
import logging
import re

logger = logging.getLogger(__name__)

# Base de conocimiento para el chatbot
BASE_KNOWLEDGE = {
    "planes": {
        "keywords": ["plan", "planes", "precio", "costos", "tarifas", "servicio"],
        "info": "Ofrecemos varios planes de internet: Plan Básico ($25/mes), Plan Estándar ($35/mes), Plan Premium ($50/mes). Cada plan incluye diferentes velocidades y características."
    },
    "cobertura": {
        "keywords": ["cobertura", "zona", "sectores", "donde", "ubicación"],
        "info": "Tenemos cobertura en múltiples sectores. Puedes consultar nuestra sección de cobertura en el sitio web para ver las zonas disponibles."
    },
    "contacto": {
        "keywords": ["contacto", "teléfono", "email", "dirección", "ubicación", "soporte"],
        "info": "Puedes contactarnos al teléfono: 0984517703, email: teltec@outlook.com. Nuestro horario de atención es de Lunes a Domingo de 8:00 AM a 6:00 PM."
    },
    "registro": {
        "keywords": ["registro", "registrarse", "nuevo cliente", "inscribirse", "contrato"],
        "info": "Para registrarte como nuevo cliente, puedes contactarnos directamente por teléfono o WhatsApp. También puedes visitar nuestras oficinas para realizar el proceso de registro."
    },
    "pago": {
        "keywords": ["pago", "pagar", "factura", "deuda", "vencimiento"],
        "info": "Puedes realizar tus pagos de diferentes formas: en efectivo, transferencia bancaria, o a través de nuestro portal de clientes cuando esté disponible."
    },
    "problema": {
        "keywords": ["problema", "falla", "no funciona", "sin internet", "lento", "cortado"],
        "info": "Si tienes problemas con tu servicio, puedes reportarlo a través de nuestro sistema de tickets o contactarnos directamente. Nuestro equipo técnico te ayudará a resolver el problema."
    }
}

def obtener_planes_reales():
    """Obtiene los planes reales desde la base de datos"""
    try:
        from planes_app.models import Plan
        planes = Plan.objects.filter(estado='activo').order_by('precio')
        
        if not planes.exists():
            return "Actualmente no tenemos planes disponibles. Por favor, contacta directamente a nuestro equipo."
        
        planes_texto = []
        for plan in planes:
            precio = float(plan.precio)
            planes_texto.append(f"• {plan.tipo_plan}: ${precio:.2f}/mes")
        
        respuesta = "Tenemos los siguientes planes disponibles:\n\n" + "\n".join(planes_texto)
        respuesta += "\n\nCada plan incluye diferentes velocidades y características. ¿Te gustaría más información sobre algún plan en particular?"
        return respuesta
    except Exception as e:
        logger.error(f"Error al obtener planes: {str(e)}")
        return BASE_KNOWLEDGE["planes"]["info"]

def obtener_deuda_por_cedula(cedula: str):
    """Obtiene la deuda de un cliente por su cédula - SIEMPRE consulta la base de datos"""
    try:
        # Limpiar la cédula (remover espacios, guiones, etc.)
        cedula_limpia = re.sub(r'[^\d]', '', cedula)
        
        if not cedula_limpia or len(cedula_limpia) != 10:
            return "Por favor, proporciona una cédula válida (10 dígitos)."
        
        logger.info(f"Consultando deuda para cédula: {cedula_limpia}")
        
        # Buscar cliente por cédula - SIEMPRE consultar la base de datos
        with connection.cursor() as cursor:
            # Primero intentar con la vista clientes_deuda
            cliente = None
            try:
                cursor.execute("""
                    SELECT id, cedula, nombres, apellidos, 
                           estado_pago, meses_pendientes, monto_total_deuda,
                           fecha_ultimo_pago, fecha_vencimiento_pago
                    FROM clientes_deuda
                    WHERE cedula = %s
                """, [cedula_limpia])
                cliente = cursor.fetchone()
                logger.info(f"Consulta exitosa usando vista clientes_deuda para cédula {cedula_limpia}")
            except Exception as e:
                # Si la vista no existe, usar consulta directa calculando deuda
                logger.warning(f"Vista clientes_deuda no disponible, usando consulta alternativa: {str(e)}")
                try:
                    cursor.execute("""
                        SELECT 
                            c.id, 
                            c.cedula, 
                            c.nombres, 
                            c.apellidos,
                            CASE 
                                WHEN EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(
                                    (SELECT MAX(fecha_pago) FROM pagos WHERE cliente_id = c.id), 
                                    c.fecha_registro
                                ))) <= 25 THEN 'al_dia'
                                WHEN EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(
                                    (SELECT MAX(fecha_pago) FROM pagos WHERE cliente_id = c.id), 
                                    c.fecha_registro
                                ))) BETWEEN 26 AND 29 THEN 'proximo_vencimiento'
                                WHEN EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(
                                    (SELECT MAX(fecha_pago) FROM pagos WHERE cliente_id = c.id), 
                                    c.fecha_registro
                                ))) BETWEEN 30 AND 34 THEN 'vencido'
                                ELSE 'corte_pendiente'
                            END as estado_pago,
                            FLOOR(EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(
                                (SELECT MAX(fecha_pago) FROM pagos WHERE cliente_id = c.id), 
                                c.fecha_registro
                            ))) / 30.0)::numeric)::integer as meses_pendientes,
                            COALESCE((
                                SELECT SUM(p.monto) 
                                FROM pagos p 
                                WHERE p.cliente_id = c.id
                            ), 0) as total_pagado,
                            COALESCE(p.precio, 0) as precio_plan,
                            COALESCE((
                                SELECT MAX(fecha_pago) 
                                FROM pagos p 
                                WHERE p.cliente_id = c.id
                            ), NULL) as fecha_ultimo_pago,
                            COALESCE((
                                SELECT MAX(fecha_pago) + INTERVAL '30 days'
                                FROM pagos p 
                                WHERE p.cliente_id = c.id
                            ), NULL) as fecha_vencimiento
                        FROM clientes c
                        LEFT JOIN clientes_planes cp ON c.id = cp.id_cliente AND cp.estado = 'activo'
                        LEFT JOIN planes p ON cp.id_plan = p.id_plan
                        WHERE c.cedula = %s
                    """, [cedula_limpia])
                    cliente_raw = cursor.fetchone()
                    
                    if cliente_raw:
                        # Calcular monto de deuda
                        cliente_id, cedula_db, nombres, apellidos, estado_pago, meses_pendientes, total_pagado, precio_plan, fecha_ultimo_pago, fecha_vencimiento = cliente_raw
                        meses_pendientes = meses_pendientes or 0
                        precio_plan = float(precio_plan) if precio_plan else 0
                        total_pagado = float(total_pagado) if total_pagado else 0
                        monto_deuda = max(0, (meses_pendientes * precio_plan) - total_pagado)
                        
                        cliente = (cliente_id, cedula_db, nombres, apellidos, estado_pago, meses_pendientes, monto_deuda, fecha_ultimo_pago, fecha_vencimiento)
                        logger.info(f"Consulta alternativa exitosa para cédula {cedula_limpia}")
                except Exception as e2:
                    logger.error(f"Error en consulta alternativa: {str(e2)}")
            
            if not cliente:
                return f"No se encontró un cliente registrado con la cédula {cedula_limpia}. Por favor, verifica el número o contacta directamente a nuestro equipo de soporte al 0984517703."
            
            cliente_id, cedula_db, nombres, apellidos, estado_pago, meses_pendientes, monto_deuda, fecha_ultimo_pago, fecha_vencimiento = cliente
            
            # Construir respuesta con datos reales
            respuesta = f"📋 Información de cuenta para:\n{nombres} {apellidos}\nCédula: {cedula_db}\n\n"
            
            # Convertir monto_deuda a float si es necesario
            monto_deuda_float = float(monto_deuda) if monto_deuda else 0.0
            
            if monto_deuda_float > 0:
                respuesta += f"💰 Monto total de deuda: ${monto_deuda_float:.2f}\n"
                respuesta += f"📅 Meses pendientes: {meses_pendientes or 0}\n"
                respuesta += f"📊 Estado de pago: {estado_pago or 'Pendiente'}\n"
                
                if fecha_vencimiento:
                    if hasattr(fecha_vencimiento, 'strftime'):
                        respuesta += f"⏰ Fecha de vencimiento: {fecha_vencimiento.strftime('%d/%m/%Y')}\n"
                    else:
                        respuesta += f"⏰ Fecha de vencimiento: {fecha_vencimiento}\n"
                
                if fecha_ultimo_pago:
                    if hasattr(fecha_ultimo_pago, 'strftime'):
                        respuesta += f"✅ Último pago: {fecha_ultimo_pago.strftime('%d/%m/%Y')}\n"
                    else:
                        respuesta += f"✅ Último pago: {fecha_ultimo_pago}\n"
                
                respuesta += "\n💡 Puedes realizar tu pago de diferentes formas: en efectivo, transferencia bancaria, o contactando directamente a nuestro equipo al 0984517703."
            else:
                respuesta += "✅ No tienes deudas pendientes. ¡Gracias por estar al día con tus pagos!"
            
            logger.info(f"Respuesta generada exitosamente para cédula {cedula_limpia}")
            return respuesta
            
    except Exception as e:
        logger.error(f"Error al obtener deuda por cédula {cedula}: {str(e)}", exc_info=True)
        return f"Hubo un error al consultar tu información para la cédula {cedula}. Por favor, intenta de nuevo o contacta directamente a nuestro equipo de soporte al 0984517703."

def extraer_cedula_del_mensaje(mensaje: str):
    """Extrae una cédula del mensaje del usuario"""
    # Buscar patrones de cédula (10 dígitos)
    patrones = [
        r'\b\d{10}\b',  # 10 dígitos consecutivos
        r'\b\d{3}[-.\s]?\d{7}[-.\s]?\d{1}\b',  # Formato con guiones
    ]
    
    for patron in patrones:
        matches = re.findall(patron, mensaje)
        if matches:
            # Limpiar y retornar la primera coincidencia
            cedula = re.sub(r'[^\d]', '', matches[0])
            if len(cedula) == 10:
                return cedula
    
    return None

def verificar_es_cliente(cedula: str = None):
    """Verifica si una cédula pertenece a un cliente registrado"""
    try:
        if not cedula:
            return False, None
        
        cedula_limpia = re.sub(r'[^\d]', '', cedula)
        if len(cedula_limpia) != 10:
            return False, None
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, nombres, apellidos, estado
                FROM clientes
                WHERE cedula = %s
            """, [cedula_limpia])
            
            cliente = cursor.fetchone()
            if cliente:
                cliente_id, nombres, apellidos, estado = cliente
                return True, {
                    'id': cliente_id,
                    'nombres': nombres,
                    'apellidos': apellidos,
                    'estado': estado,
                    'cedula': cedula_limpia
                }
        return False, None
    except Exception as e:
        logger.error(f"Error verificando cliente: {str(e)}")
        return False, None

def obtener_mensaje_marketing():
    """Genera mensaje de marketing para no-clientes"""
    try:
        from planes_app.models import Plan
        planes = Plan.objects.filter(estado='activo').order_by('precio')[:3]
        
        mensaje = "🎉 ¡Bienvenido a TelTec Net!\n\n"
        mensaje += "Actualmente no eres cliente, pero podemos ayudarte a convertirte en uno. Tenemos excelentes ofertas para ti:\n\n"
        
        if planes.exists():
            mensaje += "📦 **Planes Disponibles:**\n"
            for plan in planes:
                precio = float(plan.precio)
                mensaje += f"• {plan.tipo_plan}: ${precio:.2f}/mes\n"
            mensaje += "\n"
        
        mensaje += "✨ **Beneficios Exclusivos:**\n"
        mensaje += "• 🎁 Instalación GRATUITA (válido por tiempo limitado)\n"
        mensaje += "• ⚡ Internet de alta velocidad\n"
        mensaje += "• 📞 Soporte técnico 24/7\n"
        mensaje += "• 💳 Múltiples formas de pago\n"
        mensaje += "• 🏠 Cobertura en múltiples sectores\n\n"
        
        mensaje += "🚀 **¿Quieres convertirte en cliente?**\n"
        mensaje += "Puedes:\n"
        mensaje += "• Ver todos nuestros planes disponibles\n"
        mensaje += "• Solicitar una instalación gratuita\n"
        mensaje += "• Consultar cobertura en tu sector\n"
        mensaje += "• Contactarnos directamente al 0984517703\n\n"
        
        mensaje += "💬 Escribe 'ver planes', 'quiero instalación' o 'consultar cobertura' para más información."
        
        return mensaje
    except Exception as e:
        logger.error(f"Error generando mensaje marketing: {str(e)}")
        return "🎉 ¡Bienvenido a TelTec Net! Actualmente no eres cliente, pero podemos ayudarte. Contáctanos al 0984517703 o visita nuestro sitio web para conocer nuestros planes y servicios."

def procesar_mensaje_simple(mensaje: str, contexto: str = "sitio_publico", es_cliente: bool = False, cliente_data: dict = None) -> str:
    """
    Procesa un mensaje del usuario y genera una respuesta basada en conocimiento base
    y consultas a la base de datos cuando sea necesario.
    SIEMPRE consulta la base de datos para planes y deudas.
    """
    mensaje_original = mensaje.strip()
    mensaje_lower = mensaje_original.lower()
    
    # PRIORIDAD 1: Detectar si el mensaje es SOLO una cédula (10 dígitos)
    cedula_detectada = extraer_cedula_del_mensaje(mensaje_original)
    
    # Si NO es cliente y envía solo cédula, verificar primero
    if not es_cliente and cedula_detectada and len(re.sub(r'[^\d]', '', mensaje_original)) == 10:
        es_cliente_verificado, cliente_info = verificar_es_cliente(cedula_detectada)
        if es_cliente_verificado:
            # Actualizar estado de cliente
            es_cliente = True
            cliente_data = cliente_info
            logger.info(f"Cliente verificado: {cedula_detectada}")
            return obtener_deuda_por_cedula(cedula_detectada)
        else:
            # No es cliente, mostrar marketing
            return obtener_mensaje_marketing()
    
    # Si es cliente y envía solo cédula, consultar deuda
    if es_cliente and cedula_detectada and len(re.sub(r'[^\d]', '', mensaje_original)) == 10:
        logger.info(f"Cliente consultando deuda: {cedula_detectada}")
        return obtener_deuda_por_cedula(cedula_detectada)
    
    # PRIORIDAD 2: Detectar consulta de planes (SIEMPRE consultar BD)
    if any(keyword in mensaje_lower for keyword in ["plan", "planes", "precio", "costos", "tarifas", "servicio", "qué planes", "planes disponibles", "ver planes"]):
        logger.info("Consulta de planes detectada - consultando base de datos")
        return obtener_planes_reales()
    
    # PRIORIDAD 3: Detectar consulta de deuda (solo para clientes)
    if any(keyword in mensaje_lower for keyword in ["deuda", "debo", "debo dinero", "cuánto debo", "mi deuda", "estado de cuenta", "factura pendiente", "consulta mi deuda", "quiero consultar"]):
        if not es_cliente:
            return obtener_mensaje_marketing()
        
        # Intentar extraer cédula del mensaje
        cedula = extraer_cedula_del_mensaje(mensaje_original)
        
        if cedula:
            logger.info(f"Cliente consultando deuda con cédula: {cedula}")
            return obtener_deuda_por_cedula(cedula)
        elif cliente_data and cliente_data.get('cedula'):
            return obtener_deuda_por_cedula(cliente_data['cedula'])
        else:
            return "Para consultar tu deuda, necesito tu número de cédula. Por favor, proporciona tu cédula (10 dígitos) o escribe tu mensaje incluyendo tu cédula. Ejemplo: '¿Cuánto debo con cédula 1234567890?'"
    
    # PRIORIDAD 4: Detectar intenciones de marketing (para no-clientes)
    if not es_cliente:
        if any(keyword in mensaje_lower for keyword in ["quiero ser cliente", "quiero instalación", "instalación gratuita", "quiero contratar", "quiero el servicio", "quiero plan"]):
            return obtener_mensaje_marketing()
    
    # PRIORIDAD 5: Detectar otras intenciones (solo si no hay cédula en el mensaje)
    if not cedula_detectada:
        for categoria, data in BASE_KNOWLEDGE.items():
            if categoria not in ["planes", "pago"]:  # Ya manejamos planes y pago arriba
                for keyword in data["keywords"]:
                    if keyword in mensaje_lower:
                        # Si no es cliente y pregunta por pago, mostrar marketing
                        if categoria == "pago" and not es_cliente:
                            return obtener_mensaje_marketing()
                        return data["info"]
    
    # PRIORIDAD 6: Respuestas genéricas
    if any(palabra in mensaje_lower for palabra in ["hola", "buenos días", "buenas tardes", "buenas noches"]):
        if es_cliente:
            return f"¡Hola {cliente_data.get('nombres', '')}! Soy el asistente virtual de TelTec Net. Como cliente, puedo ayudarte con:\n\n• Consultar planes disponibles\n• Ver tu deuda\n• Información de cobertura\n• Datos de contacto\n• Estado de tu cuenta\n\n¿En qué puedo ayudarte?"
        else:
            return "¡Hola! Soy el asistente virtual de TelTec Net. Puedo ayudarte con:\n\n• Ver planes disponibles\n• Información de cobertura\n• Datos de contacto\n• Proceso de registro\n• Instalación gratuita\n\n¿Eres cliente de TelTec Net? Si no lo eres, puedo ayudarte a convertirte en uno. ¿En qué puedo ayudarte?"
    
    if any(palabra in mensaje_lower for palabra in ["gracias", "muchas gracias"]):
        return "¡De nada! Estoy aquí para ayudarte. Si tienes más preguntas, no dudes en consultarme."
    
    if any(palabra in mensaje_lower for palabra in ["adiós", "chao", "hasta luego"]):
        return "¡Hasta luego! Que tengas un excelente día. Recuerda que puedes contactarnos directamente si necesitas asistencia adicional."
    
    # PRIORIDAD 7: Si hay una cédula en el mensaje pero no se detectó intención clara
    if cedula_detectada:
        if not es_cliente:
            es_cliente_verificado, cliente_info = verificar_es_cliente(cedula_detectada)
            if es_cliente_verificado:
                return f"¡Hola {cliente_info['nombres']}! Detecté tu cédula. ¿Quieres consultar tu deuda? Responde 'sí' o 'consultar deuda'."
            else:
                return obtener_mensaje_marketing()
        else:
            return f"Detecté la cédula {cedula_detectada} en tu mensaje. ¿Quieres consultar tu deuda? Responde 'sí' o 'consultar deuda'."
    
    # Respuesta por defecto
    if es_cliente:
        return "Gracias por tu consulta. Como cliente, puedo ayudarte con:\n• Consultar planes disponibles\n• Ver tu deuda\n• Información de cobertura\n• Datos de contacto\n• Estado de tu cuenta\n\n¿Sobre qué te gustaría saber más?"
    else:
        return obtener_mensaje_marketing()

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def procesar_mensaje_chatbot(request):
    """
    Endpoint para procesar mensajes del chatbot.
    """
    try:
        data = request.data
        mensaje = data.get('mensaje', '').strip()
        contexto = data.get('contexto', 'sitio_publico')
        cliente_id = data.get('cliente_id', None)
        
        if not mensaje:
            return Response(
                {'error': 'El mensaje no puede estar vacío'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Procesar mensaje (versión simple sin IA externa)
        respuesta = procesar_mensaje_simple(mensaje, contexto)
        
        # En una implementación completa, aquí se integraría con OpenAI/Claude:
        # respuesta = procesar_con_ia(mensaje, contexto, cliente_id)
        
        return Response({
            'respuesta': respuesta,
            'contexto': contexto,
            'mensaje_original': mensaje
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error al procesar mensaje del chatbot: {str(e)}")
        return Response(
            {'error': 'Error al procesar el mensaje. Por favor, intenta de nuevo.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def chatbot_health(request):
    """
    Endpoint de salud para verificar que el chatbot está funcionando.
    """
    return Response({
        'status': 'ok',
        'service': 'chatbot',
        'version': '1.0'
    }, status=status.HTTP_200_OK)

