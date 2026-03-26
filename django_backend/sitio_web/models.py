from django.db import models
from django.utils import timezone

class InformacionSitio(models.Model):
    """Modelo para almacenar información general del sitio web"""
    titulo = models.CharField(max_length=200, default="TelTec Net - Proveedor de Internet")
    subtitulo = models.CharField(max_length=300, default="Conectando comunidades con tecnología de vanguardia")
    descripcion = models.TextField(default="Somos una empresa líder en servicios de internet de alta velocidad, comprometida con brindar conectividad confiable y soporte técnico excepcional.")
    lema = models.CharField(max_length=200, default="Conectando tu mundo digital")
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Información del Sitio"
        verbose_name_plural = "Información del Sitio"

class Empresa(models.Model):
    """Modelo para información de la empresa"""
    nombre = models.CharField(max_length=200, default="TelTec Net")
    direccion = models.CharField(max_length=300, default="Av. Principal 123, Centro")
    telefono = models.CharField(max_length=20, default="0999859689")
    email = models.EmailField(default="info@teltecnet.com")
    ruc = models.CharField(max_length=20, default="1234567890001")
    horario = models.CharField(max_length=200, default="Lunes a Viernes: 8:00 AM - 6:00 PM")
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresa"

class Servicio(models.Model):
    """Modelo para servicios ofrecidos"""
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField()
    icono = models.CharField(max_length=50, blank=True, null=True)
    imagen = models.URLField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"
        ordering = ['orden', 'nombre']

class Plan(models.Model):
    """Modelo para planes de internet"""
    nombre = models.CharField(max_length=200)
    velocidad = models.CharField(max_length=100)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    descripcion = models.TextField()
    caracteristicas = models.JSONField(default=list)  # Lista de características
    popular = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Plan"
        verbose_name_plural = "Planes"
        ordering = ['orden', 'precio']

class Cobertura(models.Model):
    """Modelo para zonas de cobertura"""
    zona = models.CharField(max_length=200)
    descripcion = models.TextField()
    coordenadas = models.JSONField(default=dict)  # Para mapa
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Cobertura"
        verbose_name_plural = "Coberturas"
        ordering = ['orden', 'zona']

class Contacto(models.Model):
    """Modelo para información de contacto"""
    TIPO_CHOICES = [
        ('telefono', 'Teléfono'),
        ('email', 'Email'),
        ('whatsapp', 'WhatsApp'),
        ('direccion', 'Dirección'),
        ('horario', 'Horario'),
    ]
    
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    titulo = models.CharField(max_length=100)
    valor = models.CharField(max_length=300)
    icono = models.CharField(max_length=50, blank=True, null=True)
    url = models.URLField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Contacto"
        verbose_name_plural = "Contactos"
        ordering = ['orden', 'tipo']

class RedSocial(models.Model):
    """Modelo para redes sociales"""
    REDES_CHOICES = [
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('twitter', 'Twitter'),
        ('linkedin', 'LinkedIn'),
        ('youtube', 'YouTube'),
        ('tiktok', 'TikTok'),
    ]
    
    nombre = models.CharField(max_length=100, blank=True, null=True)
    url = models.URLField()
    icono = models.CharField(max_length=50, blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    tipo = models.CharField(max_length=20, choices=REDES_CHOICES)
    
    class Meta:
        verbose_name = "Red Social"
        verbose_name_plural = "Redes Sociales"
        unique_together = ['tipo']

class Carrusel(models.Model):
    """Modelo para imágenes del carrusel"""
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    imagen = models.URLField()
    video = models.URLField(blank=True, null=True)
    enlace = models.URLField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Carrusel"
        verbose_name_plural = "Carrusel"
        ordering = ['orden', 'titulo']

class ConfiguracionSitio(models.Model):
    """Modelo para configuración general del sitio"""
    mostrar_precios = models.BooleanField(default=True)
    mostrar_contacto = models.BooleanField(default=True)
    mostrar_testimonios = models.BooleanField(default=True)
    modo_mantenimiento = models.BooleanField(default=False)
    mensaje_mantenimiento = models.TextField(blank=True, default="Sitio en mantenimiento. Volveremos pronto.")
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Configuración del Sitio"
        verbose_name_plural = "Configuración del Sitio"

class Header(models.Model):
    """Modelo para configuración del header"""
    logo_url = models.URLField(blank=True, null=True)
    logo_alt = models.CharField(max_length=200, default="TelTec Net Logo")
    mostrar_menu = models.BooleanField(default=True)
    color_fondo = models.CharField(max_length=7, default="#ffffff")
    color_texto = models.CharField(max_length=7, default="#000000")
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Header"
        verbose_name_plural = "Header"

class Footer(models.Model):
    """Modelo para configuración del footer"""
    texto_copyright = models.CharField(max_length=300, default="© 2025 T&T net - Todos los derechos reservados")
    mostrar_redes_sociales = models.BooleanField(default=True)
    mostrar_contacto = models.BooleanField(default=True)
    color_fondo = models.CharField(max_length=7, default="#1f2937")
    color_texto = models.CharField(max_length=7, default="#ffffff")
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Footer"
        verbose_name_plural = "Footer"

class SolicitudInstalacion(models.Model):
    """Modelo para solicitudes de instalación desde el sitio web"""
    nombre = models.CharField(max_length=200)
    telefono = models.CharField(max_length=20)
    email = models.EmailField()
    direccion = models.TextField()
    plan = models.CharField(max_length=100, blank=True, null=True)
    comentarios = models.TextField(blank=True, null=True)
    estado = models.CharField(
        max_length=20,
        choices=[
            ('pendiente', 'Pendiente'),
            ('contactado', 'Contactado'),
            ('agendado', 'Agendado'),
            ('completado', 'Completado'),
            ('cancelado', 'Cancelado')
        ],
        default='pendiente'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Solicitud de Instalación"
        verbose_name_plural = "Solicitudes de Instalación"
        ordering = ['-fecha_creacion']
