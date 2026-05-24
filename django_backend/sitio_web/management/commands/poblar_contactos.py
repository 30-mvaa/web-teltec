from django.core.management.base import BaseCommand
from sitio_web.models import Contacto, RedSocial

CONTACTOS = [
    {"tipo": "telefono", "titulo": "Teléfono Principal", "valor": "0984517703", "url": "tel:0984517703", "orden": 1},
    {"tipo": "email", "titulo": "Email de Contacto", "valor": "teltecnet@outlook.com", "url": "mailto:teltecnet@outlook.com", "orden": 2},
    {"tipo": "whatsapp", "titulo": "WhatsApp", "valor": "0984517703", "url": "https://wa.me/593984517703", "orden": 3},
    {"tipo": "direccion", "titulo": "Dirección", "valor": "CAÑAR - COMUNIDAD SISID", "url": "", "orden": 4},
    {"tipo": "horario", "titulo": "Horario de Atención", "valor": "Lunes a Viernes: 8:00 AM - 6:00 PM", "url": "", "orden": 5},
]

REDES = [
    {"tipo": "facebook", "url": "https://www.facebook.com/teltecnet"},
    {"tipo": "instagram", "url": "https://www.instagram.com/teltecnet"},
    {"tipo": "youtube", "url": "https://www.youtube.com/@teltecnet"},
]


class Command(BaseCommand):
    help = "Poblar contactos y redes sociales por defecto"

    def handle(self, *args, **options):
        for c in CONTACTOS:
            obj, created = Contacto.objects.get_or_create(tipo=c["tipo"], defaults={**c, "activo": True})
            self.stdout.write(f'  {"✅" if created else "⚠️"} Contacto {c["tipo"]}: {obj.valor}')

        for r in REDES:
            obj, created = RedSocial.objects.get_or_create(tipo=r["tipo"], defaults={**r, "activo": True})
            self.stdout.write(f'  {"✅" if created else "⚠️"} RedSocial {r["tipo"]}: {obj.url}')
