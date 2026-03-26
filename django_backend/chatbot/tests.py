from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

class ChatbotAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
    
    def test_chatbot_health(self):
        """Test del endpoint de salud del chatbot"""
        url = reverse('chatbot_health')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')
        self.assertEqual(response.data['service'], 'chatbot')
    
    def test_procesar_mensaje_vacio(self):
        """Test que rechaza mensajes vacíos"""
        url = reverse('chatbot_mensaje')
        response = self.client.post(url, {'mensaje': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_procesar_mensaje_planes(self):
        """Test de procesamiento de mensaje sobre planes"""
        url = reverse('chatbot_mensaje')
        response = self.client.post(url, {
            'mensaje': '¿Qué planes tienen?',
            'contexto': 'sitio_publico'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('respuesta', response.data)
        self.assertIn('plan', response.data['respuesta'].lower())
    
    def test_procesar_mensaje_contacto(self):
        """Test de procesamiento de mensaje sobre contacto"""
        url = reverse('chatbot_mensaje')
        response = self.client.post(url, {
            'mensaje': '¿Cuál es su teléfono?',
            'contexto': 'sitio_publico'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('respuesta', response.data)
        self.assertIn('0984517703', response.data['respuesta'])

