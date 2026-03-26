from django.contrib import admin
from .models import (
    InformacionSitio, Empresa, Servicio, Plan, Cobertura, 
    Contacto, Carrusel, Header, Footer, RedSocial, ConfiguracionSitio,
    SolicitudInstalacion
)

@admin.register(InformacionSitio)
class InformacionSitioAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'subtitulo', 'fecha_actualizacion']
    list_filter = ['fecha_actualizacion']
    search_fields = ['titulo', 'subtitulo', 'descripcion']
    readonly_fields = ['fecha_actualizacion']
    
    fieldsets = (
        ('Información General', {
            'fields': ('titulo', 'subtitulo', 'descripcion', 'lema')
        }),
        ('Metadatos', {
            'fields': ('fecha_actualizacion',),
            'classes': ('collapse',)
        }),
    )

@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'telefono', 'email', 'fecha_actualizacion']
    list_filter = ['fecha_actualizacion']
    search_fields = ['nombre', 'telefono', 'email', 'direccion']
    readonly_fields = ['fecha_actualizacion']
    
    fieldsets = (
        ('Información de la Empresa', {
            'fields': ('nombre', 'direccion', 'telefono', 'email', 'ruc', 'horario')
        }),
        ('Metadatos', {
            'fields': ('fecha_actualizacion',),
            'classes': ('collapse',)
        }),
    )

@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'activo', 'orden', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion', 'fecha_actualizacion']
    search_fields = ['nombre', 'descripcion']
    list_editable = ['activo', 'orden']
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion']
    ordering = ['orden', 'nombre']
    
    fieldsets = (
        ('Información del Servicio', {
            'fields': ('nombre', 'descripcion', 'icono', 'imagen')
        }),
        ('Configuración', {
            'fields': ('activo', 'orden')
        }),
        ('Metadatos', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'velocidad', 'precio', 'popular', 'activo', 'orden']
    list_filter = ['popular', 'activo', 'fecha_creacion', 'fecha_actualizacion']
    search_fields = ['nombre', 'velocidad', 'descripcion']
    list_editable = ['popular', 'activo', 'orden']
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion']
    ordering = ['orden', 'precio']
    
    fieldsets = (
        ('Información del Plan', {
            'fields': ('nombre', 'velocidad', 'precio', 'descripcion', 'caracteristicas')
        }),
        ('Configuración', {
            'fields': ('popular', 'activo', 'orden')
        }),
        ('Metadatos', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Cobertura)
class CoberturaAdmin(admin.ModelAdmin):
    list_display = ['zona', 'activo', 'orden', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion', 'fecha_actualizacion']
    search_fields = ['zona', 'descripcion']
    list_editable = ['activo', 'orden']
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion']
    ordering = ['orden', 'zona']
    
    fieldsets = (
        ('Información de Cobertura', {
            'fields': ('zona', 'descripcion', 'coordenadas')
        }),
        ('Configuración', {
            'fields': ('activo', 'orden')
        }),
        ('Metadatos', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'tipo', 'valor', 'activo', 'orden']
    list_filter = ['tipo', 'activo', 'fecha_creacion', 'fecha_actualizacion']
    search_fields = ['titulo', 'valor']
    list_editable = ['activo', 'orden']
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion']
    ordering = ['orden', 'tipo']
    
    fieldsets = (
        ('Información de Contacto', {
            'fields': ('tipo', 'titulo', 'valor', 'icono', 'url')
        }),
        ('Configuración', {
            'fields': ('activo', 'orden')
        }),
        ('Metadatos', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Carrusel)
class CarruselAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'activo', 'orden', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion', 'fecha_actualizacion']
    search_fields = ['titulo', 'descripcion']
    list_editable = ['activo', 'orden']
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion']
    ordering = ['orden', 'titulo']
    
    fieldsets = (
        ('Contenido del Carrusel', {
            'fields': ('titulo', 'descripcion', 'imagen', 'video', 'enlace')
        }),
        ('Configuración', {
            'fields': ('activo', 'orden')
        }),
        ('Metadatos', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Header)
class HeaderAdmin(admin.ModelAdmin):
    list_display = ['logo_alt', 'mostrar_menu', 'color_fondo', 'fecha_actualizacion']
    list_filter = ['mostrar_menu', 'fecha_actualizacion']
    search_fields = ['logo_alt']
    readonly_fields = ['fecha_actualizacion']
    
    fieldsets = (
        ('Configuración del Header', {
            'fields': ('logo_url', 'logo_alt', 'mostrar_menu', 'color_fondo', 'color_texto')
        }),
        ('Metadatos', {
            'fields': ('fecha_actualizacion',),
            'classes': ('collapse',)
        }),
    )

@admin.register(Footer)
class FooterAdmin(admin.ModelAdmin):
    list_display = ['texto_copyright', 'mostrar_redes_sociales', 'mostrar_contacto', 'fecha_actualizacion']
    list_filter = ['mostrar_redes_sociales', 'mostrar_contacto', 'fecha_actualizacion']
    search_fields = ['texto_copyright']
    readonly_fields = ['fecha_actualizacion']
    
    fieldsets = (
        ('Configuración del Footer', {
            'fields': ('texto_copyright', 'mostrar_redes_sociales', 'mostrar_contacto', 'color_fondo', 'color_texto')
        }),
        ('Metadatos', {
            'fields': ('fecha_actualizacion',),
            'classes': ('collapse',)
        }),
    )

@admin.register(RedSocial)
class RedSocialAdmin(admin.ModelAdmin):
    list_display = ['tipo', 'url', 'activo', 'fecha_creacion']
    list_filter = ['tipo', 'activo', 'fecha_creacion', 'fecha_actualizacion']
    search_fields = ['tipo', 'url']
    list_editable = ['activo']
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion']
    ordering = ['tipo']
    
    fieldsets = (
        ('Información de Red Social', {
            'fields': ('tipo', 'url', 'icono')
        }),
        ('Configuración', {
            'fields': ('activo',)
        }),
        ('Metadatos', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ConfiguracionSitio)
class ConfiguracionSitioAdmin(admin.ModelAdmin):
    list_display = ['mostrar_precios', 'mostrar_contacto', 'mostrar_testimonios', 'modo_mantenimiento', 'fecha_actualizacion']
    list_filter = ['mostrar_precios', 'mostrar_contacto', 'mostrar_testimonios', 'modo_mantenimiento', 'fecha_actualizacion']
    readonly_fields = ['fecha_actualizacion']
    
    fieldsets = (
        ('Configuración General', {
            'fields': ('mostrar_precios', 'mostrar_contacto', 'mostrar_testimonios')
        }),
        ('Modo Mantenimiento', {
            'fields': ('modo_mantenimiento', 'mensaje_mantenimiento')
        }),
        ('Metadatos', {
            'fields': ('fecha_actualizacion',),
            'classes': ('collapse',)
        }),
    )

@admin.register(SolicitudInstalacion)
class SolicitudInstalacionAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'telefono', 'email', 'plan', 'estado', 'fecha_creacion']
    list_filter = ['estado', 'fecha_creacion', 'fecha_actualizacion']
    search_fields = ['nombre', 'telefono', 'email', 'direccion']
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion']
    list_editable = ['estado']
    ordering = ['-fecha_creacion']
    
    fieldsets = (
        ('Información del Cliente', {
            'fields': ('nombre', 'telefono', 'email', 'direccion')
        }),
        ('Detalles de la Solicitud', {
            'fields': ('plan', 'comentarios', 'estado')
        }),
        ('Metadatos', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )

# Configuración del admin site
admin.site.site_header = "TelTec Net - Administración del Sitio Web"
admin.site.site_title = "TelTec Net Admin"
admin.site.index_title = "Gestión del Sitio Web"
