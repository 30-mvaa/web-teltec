from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Deuda, HistorialDeuda

@admin.register(Deuda)
class DeudaAdmin(admin.ModelAdmin):
    """Admin para el modelo Deuda"""
    
    list_display = [
        'cliente_info', 
        'plan_info', 
        'mes_anio', 
        'monto_deuda', 
        'monto_pagado', 
        'monto_pendiente', 
        'estado_badge', 
        'meses_atraso', 
        'fecha_vencimiento'
    ]
    
    list_filter = [
        'estado', 
        'plan__tipo_plan', 
        'cliente__id_sector', 
        'fecha_vencimiento',
        'meses_atraso'
    ]
    
    search_fields = [
        'cliente__nombres', 
        'cliente__apellidos', 
        'cliente__cedula',
        'plan__tipo_plan'
    ]
    
    readonly_fields = [
        'monto_pendiente', 
        'dias_vencida', 
        'fecha_creacion', 
        'fecha_actualizacion'
    ]
    
    fieldsets = [
        ('Información del Cliente', {
            'fields': ['cliente', 'plan']
        }),
        ('Detalles de la Deuda', {
            'fields': ['mes_anio', 'fecha_vencimiento', 'monto_deuda', 'monto_pagado']
        }),
        ('Estado y Control', {
            'fields': ['estado', 'meses_atraso', 'observaciones']
        }),
        ('Metadatos', {
            'fields': ['fecha_creacion', 'fecha_actualizacion'],
            'classes': ['collapse']
        })
    ]
    
    list_per_page = 25
    date_hierarchy = 'fecha_vencimiento'
    
    def cliente_info(self, obj):
        """Muestra información del cliente con link al admin"""
        if obj.cliente:
            url = reverse('admin:clientes_cliente_change', args=[obj.cliente.id])
            return format_html(
                '<a href="{}">{} {}</a><br><small>{}</small>',
                url, obj.cliente.nombres, obj.cliente.apellidos, obj.cliente.cedula
            )
        return '-'
    cliente_info.short_description = 'Cliente'
    cliente_info.admin_order_field = 'cliente__nombres'
    
    def plan_info(self, obj):
        """Muestra información del plan"""
        if obj.plan:
            return format_html(
                '<strong>{}</strong><br><small>${}</small>',
                obj.plan.tipo_plan, obj.plan.precio
            )
        return '-'
    plan_info.short_description = 'Plan'
    plan_info.admin_order_field = 'plan__tipo_plan'
    
    def monto_pendiente(self, obj):
        """Calcula y muestra el monto pendiente"""
        pendiente = obj.monto_pendiente
        if pendiente <= 0:
            return format_html('<span style="color: green;">${:.2f}</span>', pendiente)
        else:
            return format_html('<span style="color: red;">${:.2f}</span>', pendiente)
    monto_pendiente.short_description = 'Pendiente'
    monto_pendiente.admin_order_field = 'monto_deuda'
    
    def estado_badge(self, obj):
        """Muestra el estado como un badge coloreado"""
        colors = {
            'al_dia': 'green',
            'proximo_vencimiento': 'orange',
            'vencido': 'red',
            'pagado': 'blue'
        }
        
        color = colors.get(obj.estado, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">{}</span>',
            color, obj.get_estado_display()
        )
    estado_badge.short_description = 'Estado'
    estado_badge.admin_order_field = 'estado'
    
    def dias_vencida(self, obj):
        """Calcula los días vencida la deuda"""
        dias = obj.dias_vencida
        if dias > 0:
            return format_html('<span style="color: red;">{} días</span>', dias)
        return format_html('<span style="color: green;">Al día</span>', dias)
    dias_vencida.short_description = 'Días Vencida'
    
    actions = ['marcar_como_pagada', 'recalcular_estados', 'generar_recordatorios']
    
    def marcar_como_pagada(self, request, queryset):
        """Marca las deudas seleccionadas como pagadas"""
        updated = queryset.update(estado='pagado', monto_pagado=models.F('monto_deuda'))
        self.message_user(request, f'{updated} deudas marcadas como pagadas.')
    marcar_como_pagada.short_description = 'Marcar como pagadas'
    
    def recalcular_estados(self, request, queryset):
        """Recalcula los estados de las deudas seleccionadas"""
        updated = 0
        for deuda in queryset:
            estado_anterior = deuda.estado
            deuda.calcular_estado()
            if deuda.estado != estado_anterior:
                deuda.save()
                updated += 1
        
        self.message_user(request, f'{updated} estados de deudas actualizados.')
    recalcular_estados.short_description = 'Recalcular estados'
    
    def generar_recordatorios(self, request, queryset):
        """Genera recordatorios para las deudas vencidas"""
        deudas_vencidas = queryset.filter(estado='vencido')
        count = deudas_vencidas.count()
        self.message_user(request, f'{count} recordatorios generados para deudas vencidas.')
    generar_recordatorios.short_description = 'Generar recordatorios'

@admin.register(HistorialDeuda)
class HistorialDeudaAdmin(admin.ModelAdmin):
    """Admin para el modelo HistorialDeuda"""
    
    list_display = [
        'deuda_info', 
        'tipo_cambio', 
        'descripcion_corta', 
        'monto_anterior', 
        'monto_nuevo', 
        'estado_anterior', 
        'estado_nuevo', 
        'fecha_cambio', 
        'usuario'
    ]
    
    list_filter = [
        'tipo_cambio', 
        'estado_anterior', 
        'estado_nuevo', 
        'fecha_cambio'
    ]
    
    search_fields = [
        'deuda__cliente__nombres', 
        'deuda__cliente__apellidos', 
        'deuda__cliente__cedula',
        'descripcion'
    ]
    
    readonly_fields = ['fecha_cambio']
    
    fieldsets = [
        ('Deuda Relacionada', {
            'fields': ['deuda']
        }),
        ('Detalles del Cambio', {
            'fields': ['tipo_cambio', 'descripcion']
        }),
        ('Montos', {
            'fields': ['monto_anterior', 'monto_nuevo']
        }),
        ('Estados', {
            'fields': ['estado_anterior', 'estado_nuevo']
        }),
        ('Metadatos', {
            'fields': ['fecha_cambio', 'usuario']
        })
    ]
    
    list_per_page = 50
    date_hierarchy = 'fecha_cambio'
    
    def deuda_info(self, obj):
        """Muestra información de la deuda"""
        if obj.deuda:
            return format_html(
                '{}<br><small>{} - ${}</small>',
                obj.deuda.cliente.nombres + ' ' + obj.deuda.cliente.apellidos,
                obj.deuda.mes_anio.strftime('%B %Y'),
                obj.deuda.monto_deuda
            )
        return '-'
    deuda_info.short_description = 'Deuda'
    
    def descripcion_corta(self, obj):
        """Muestra descripción truncada"""
        if len(obj.descripcion) > 50:
            return obj.descripcion[:50] + '...'
        return obj.descripcion
    descripcion_corta.short_description = 'Descripción'
