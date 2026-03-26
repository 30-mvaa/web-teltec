"""
Script para eliminar un cliente por cédula directamente desde la base de datos
Uso: python manage.py shell < eliminar_cliente_por_cedula.py
O ejecutar desde Django shell: exec(open('clientes/eliminar_cliente_por_cedula.py').read())
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'configuracion.settings')
django.setup()

from django.db import connection
import re

def eliminar_cliente_por_cedula(cedula):
    """Eliminar cliente por cédula directamente desde la base de datos"""
    # Normalizar cédula
    cedula_limpia = re.sub(r'[^\d]', '', cedula)
    if len(cedula_limpia) < 10:
        cedula_limpia = cedula_limpia.zfill(10)
    
    print(f"🗑️ Eliminando cliente por cédula: {cedula_limpia}")
    
    with connection.cursor() as cursor:
        # Buscar el cliente por cédula
        cursor.execute("SELECT id, nombres, apellidos FROM clientes WHERE cedula = %s", [cedula_limpia])
        result = cursor.fetchone()
        
        if not result:
            print(f"❌ Cliente con cédula {cedula_limpia} no encontrado")
            return False
        
        cliente_id = result[0]
        nombres = result[1]
        apellidos = result[2]
        print(f"  - Cliente encontrado: {nombres} {apellidos} (ID: {cliente_id})")
        
        # Eliminar todas las relaciones
        print(f"  - Eliminando relaciones...")
        cursor.execute("DELETE FROM notificaciones WHERE cliente_id = %s", [cliente_id])
        print(f"    - Notificaciones eliminadas")
        
        cursor.execute("DELETE FROM clientes_planes WHERE id_cliente = %s", [cliente_id])
        print(f"    - Clientes_planes eliminados")
        
        cursor.execute("DELETE FROM pagos WHERE cliente_id = %s", [cliente_id])
        print(f"    - Pagos eliminados")
        
        cursor.execute("DELETE FROM deudas WHERE cliente_id = %s", [cliente_id])
        print(f"    - Deudas eliminadas")
        
        # Eliminar el cliente
        cursor.execute("DELETE FROM clientes WHERE id = %s", [cliente_id])
        print(f"    - Cliente eliminado de la tabla clientes")
        
        # Verificar que fue eliminado
        cursor.execute("SELECT COUNT(*) FROM clientes WHERE cedula = %s", [cedula_limpia])
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"❌ Error: El cliente con cédula {cedula_limpia} no pudo ser eliminado")
            return False
        
        print(f"✅ Cliente con cédula {cedula_limpia} eliminado exitosamente")
        return True

# Ejecutar eliminación
if __name__ == "__main__":
    # Cambiar esta cédula por la que necesites eliminar
    cedula_a_eliminar = "0302766712"
    eliminar_cliente_por_cedula(cedula_a_eliminar)

