from django.db import connection
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import Usuario
import bcrypt
import secrets
import string
import os
from datetime import datetime, timedelta

# Intentar importar psycopg2 para conexión directa a PostgreSQL
try:
    import psycopg2
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False

class UsuarioService:
    """Servicio de Usuario - Lógica de negocio"""
    
    @staticmethod
    def authenticate_user(email, password):
        """Autenticar usuario"""
        try:
            # Usar conexión de Django directamente para evitar SQL injection
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, email, nombre, rol, activo, password
                    FROM usuarios 
                    WHERE email = %s AND activo = true
                """, [email])
                user_data = cursor.fetchone()
            
            if not user_data:
                return None
            
            user_id, user_email, nombre, rol, activo, password_hash = user_data
            
            # Verificar contraseña usando bcrypt
            if password_hash and bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
                return {
                    'id': user_id,
                    'email': user_email,
                    'nombre': nombre,
                    'rol': rol,
                    'activo': activo
                }
            
            return None
            
        except Exception as e:
            print(f"Error en autenticación: {e}")
            return None
    
    @staticmethod
    def get_user_info(email):
        """Obtener información del usuario"""
        try:
            # Usar conexión de Django en lugar de psycopg2 directo
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, email, nombre, rol, activo 
                    FROM usuarios 
                    WHERE email = %s AND activo = true
                """, [email])
                user_data = cursor.fetchone()
            
            if not user_data:
                return None
            
            user_id, user_email, nombre, rol, activo = user_data
            
            return {
                'id': user_id,
                'email': user_email,
                'nombre': nombre,
                'rol': rol,
                'activo': activo
            }
            
        except Exception as e:
            print(f"Error obteniendo información del usuario: {e}")
            return None
    
    @staticmethod
    def create_user(email, nombre, rol, password):
        """Crear nuevo usuario"""
        try:
            # Verificar si el email ya existe
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM usuarios WHERE email = %s", [email])
                if cursor.fetchone():
                    return False, "El email ya está registrado"
            
            # Hash de la contraseña
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Insertar usuario
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO usuarios (email, nombre, rol, password, activo, date_joined)
                    VALUES (%s, %s, %s, %s, true, NOW())
                    RETURNING id
                """, [email, nombre, rol, password_hash])
                user_id = cursor.fetchone()[0]
            
            return True, f"Usuario creado exitosamente con ID: {user_id}"
            
        except Exception as e:
            print(f"Error creando usuario: {e}")
            return False, f"Error al crear usuario: {str(e)}"
    
    @staticmethod
    def update_user(user_id, nombre=None, rol=None, activo=None):
        """Actualizar usuario"""
        try:
            updates = []
            params = []
            
            # Construir updates de forma segura con validación
            if nombre is not None:
                updates.append("nombre = %s")
                params.append(nombre)
            
            if rol is not None:
                # Validar que el rol sea válido
                valid_roles = ['administrador', 'economia', 'atencion_cliente']
                if rol not in valid_roles:
                    return False, f"Rol inválido. Roles permitidos: {', '.join(valid_roles)}"
                updates.append("rol = %s")
                params.append(rol)
            
            if activo is not None:
                # Validar que activo sea booleano
                if not isinstance(activo, bool):
                    activo = str(activo).lower() == 'true'
                updates.append("activo = %s")
                params.append(activo)
            
            if not updates:
                return False, "No hay campos para actualizar"
            
            params.append(user_id)
            
            with connection.cursor() as cursor:
                # Construir query de forma segura
                set_clause = ', '.join(updates)
                cursor.execute(f"""
                    UPDATE usuarios 
                    SET {set_clause}, fecha_actualizacion = NOW()
                    WHERE id = %s
                """, params)
            
            return True, "Usuario actualizado exitosamente"
            
        except Exception as e:
            print(f"Error actualizando usuario: {e}")
            return False, f"Error al actualizar usuario: {str(e)}"
    
    @staticmethod
    def delete_user(user_id):
        """Eliminar usuario"""
        try:
            # Verificar que no sea el último administrador
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT COUNT(*) FROM usuarios 
                    WHERE rol = 'administrador' AND activo = true
                """)
                admin_count = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT rol FROM usuarios WHERE id = %s
                """, [user_id])
                user_role = cursor.fetchone()
                
                if user_role and user_role[0] == 'administrador' and admin_count <= 1:
                    return False, "No se puede eliminar el último administrador del sistema"
            
            # Eliminar usuario
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM usuarios WHERE id = %s", [user_id])
            
            return True, "Usuario eliminado exitosamente"
            
        except Exception as e:
            print(f"Error eliminando usuario: {e}")
            return False, f"Error al eliminar usuario: {str(e)}"
    
    @staticmethod
    def generate_reset_token(email):
        """Generar token de reset de contraseña y enviar email"""
        try:
            # Verificar que el usuario existe
            with connection.cursor() as cursor:
                cursor.execute("SELECT id, nombre FROM usuarios WHERE email = %s", [email])
                user_data = cursor.fetchone()
            
            if not user_data:
                return False, "Usuario no encontrado"
            
            user_id, nombre = user_data
            
            # Generar token
            token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
            expires = datetime.now() + timedelta(hours=24)
            
            # Guardar token en la base de datos
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE usuarios 
                    SET reset_token = %s, reset_token_expires = %s
                    WHERE email = %s
                """, [token, expires, email])
            
                # Enviar email
                try:
                    frontend_url = os.environ.get('FRONTEND_URL', 'https://web-teltec-u5kr.vercel.app')
                    reset_url = f"{frontend_url}/reset-password?token={token}"

                    subject = "Recuperación de Contraseña - TelTec Net"
                    message = f"""
Hola {nombre},

Has solicitado recuperar tu contraseña en TelTec Net.

Para restablecer tu contraseña, haz clic en el siguiente enlace:
{reset_url}

Este enlace expirará en 24 horas.

Si no solicitaste este cambio, puedes ignorar este email.

Saludos,
Equipo TelTec Net
                    """

                    # Enviar email
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[email],
                        fail_silently=False,
                    )

                    print(f"Email de recuperación enviado a: {email}")
                    return True, token
                
            except Exception as email_error:
                print(f"Error enviando email: {email_error}")
                # Si falla el email, limpiar el token
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE usuarios 
                        SET reset_token = NULL, reset_token_expires = NULL
                        WHERE email = %s
                    """, [email])
                return False, f"Error enviando email de recuperación: {str(email_error)}"
            
        except Exception as e:
            print(f"Error generando token: {e}")
            return False, f"Error al generar token: {str(e)}"
    
    @staticmethod
    def verify_reset_token(token):
        """Verificar token de reset"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, email FROM usuarios 
                    WHERE reset_token = %s AND reset_token_expires > NOW()
                """, [token])
                user_data = cursor.fetchone()
            
            if user_data:
                return True, user_data
            else:
                return False, "Token inválido o expirado"
                
        except Exception as e:
            print(f"Error verificando token: {e}")
            return False, f"Error al verificar token: {str(e)}"
    
    @staticmethod
    def reset_password(token, new_password):
        """Resetear contraseña"""
        try:
            # Verificar token
            is_valid, user_data = UsuarioService.verify_reset_token(token)
            if not is_valid:
                return False, user_data
            
            # Hash de la nueva contraseña
            password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Actualizar contraseña y limpiar token
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE usuarios 
                    SET password = %s, reset_token = NULL, reset_token_expires = NULL
                    WHERE id = %s
                """, [password_hash, user_data[0]])
            
            return True, "Contraseña actualizada exitosamente"
            
        except Exception as e:
            print(f"Error reseteando contraseña: {e}")
            return False, f"Error al resetear contraseña: {str(e)}"
    
    @staticmethod
    def get_all_users():
        """Obtener todos los usuarios"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, email, nombre, rol, activo, date_joined
                    FROM usuarios 
                    ORDER BY date_joined DESC
                """)
                users = []
                for row in cursor.fetchall():
                    users.append({
                        'id': row[0],
                        'email': row[1],
                        'nombre': row[2],
                        'rol': row[3],
                        'activo': row[4],
                        'fecha_creacion': row[5].isoformat() if row[5] else None,
                        'fecha_actualizacion': None
                    })
                
                return users
                
        except Exception as e:
            print(f"Error obteniendo usuarios: {e}")
            return [] 