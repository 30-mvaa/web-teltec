from django.db import models
from django.contrib.auth.models import AbstractUser
import bcrypt
import secrets
import string
from datetime import datetime, timedelta

class Usuario(AbstractUser):
    """Modelo de Usuario siguiendo arquitectura MVC"""
    
    ROLES_CHOICES = [
        ('administrador', 'Administrador'),
        ('economia', 'Economía'),
        ('atencion_cliente', 'Atención Cliente'),
    ]
    
    email = models.EmailField(unique=True)
    nombre = models.CharField(max_length=100)
    rol = models.CharField(max_length=20, choices=ROLES_CHOICES, default='atencion_cliente')
    activo = models.BooleanField(default=True)
    reset_token = models.CharField(max_length=100, null=True, blank=True)
    reset_token_expires = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(null=True, blank=True, help_text="Última actividad del usuario para timeout de sesión")
    session_timeout_minutes = models.IntegerField(default=30, help_text="Tiempo de expire de sesión en minutos")
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre', 'rol']
    
    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
    
    def __str__(self):
        return f"{self.nombre} ({self.email})"
    
    @staticmethod
    def hash_password(password):
        """Hash de contraseña usando bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    @staticmethod
    def verify_password(password, hashed):
        """Verificar contraseña"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def generate_reset_token(self):
        """Generar token de reset de contraseña"""
        token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        self.reset_token = token
        self.reset_token_expires = datetime.now() + timedelta(hours=24)
        self.save()
        return token
    
    def is_reset_token_valid(self, token):
        """Verificar si el token de reset es válido"""
        return (self.reset_token == token and 
                self.reset_token_expires and 
                self.reset_token_expires > datetime.now())
    
    def clear_reset_token(self):
        """Limpiar token de reset"""
        self.reset_token = None
        self.reset_token_expires = None
        self.save()
