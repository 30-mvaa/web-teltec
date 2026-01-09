"use client"

import { X, Phone, MessageCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getWhatsAppLink } from "../lib/whatsapp"

interface ModalsProps {
  selectedProduct: string | null
  selectedService: string | null
  onCloseProduct: () => void
  onCloseService: () => void
}

// Función para obtener información detallada de productos
const getProductDetails = (productType: string | null) => {
  if (!productType) {
    return {
      title: 'Producto',
      subtitle: 'Descripción del producto',
      description: 'Información del producto seleccionado.',
      features: [],
      models: []
    }
  }
  
  switch (productType) {
    case 'camaras':
      return {
        title: 'Cámaras de Seguridad EZVIZ',
        subtitle: 'Sistemas de videovigilancia profesional',
        description: 'Trabajamos con cámaras EZVIZ de última generación, tanto para interiores como exteriores. Tecnología avanzada con visión nocturna, detección de movimiento y monitoreo remoto 24/7.',
        features: [
          { icon: 'Camera', text: 'Cámaras IP HD 2K+', description: 'Resolución ultra alta para imágenes cristalinas' },
          { icon: 'Moon', text: 'Visión Nocturna', description: 'Visión nocturna en color hasta 30 metros' },
          { icon: 'Smartphone', text: 'Monitoreo Remoto', description: 'Acceso desde cualquier dispositivo móvil' },
          { icon: 'Target', text: 'Detección Inteligente', description: 'Detección de personas y vehículos con IA' },
        ],
        models: [
          {
            name: 'EZVIZ H90 - Interior',
            description: 'Cámara domo dual con rotación 360° para interiores',
            features: ['2K+ Resolución', 'Visión nocturna en color', 'Audio bidireccional'],
            price: 'Desde $100'
          }
        ]
      }
    case 'equipos-red':
      return {
        title: 'Equipos de Red Profesionales',
        subtitle: 'Infraestructura de red optimizada',
        description: 'Routers, switches y equipos de red de última generación para garantizar la mejor conectividad y rendimiento.',
        features: [
          { icon: 'Wifi', text: 'WiFi 6', description: 'Tecnología WiFi 6 para máxima velocidad' },
          { icon: 'Router', text: 'Routers Gigabit', description: 'Routers de alta velocidad y alcance' },
        ],
        models: [
          {
            name: 'Router WiFi 6 AX3000',
            description: 'Router de alta velocidad con WiFi 6',
            features: ['WiFi 6', '3000 Mbps', 'Cobertura amplia'],
            price: 'Desde precios accesibles'
          }
        ]
      }
    default:
      return {
        title: 'Producto',
        subtitle: 'Descripción del producto',
        description: 'Información del producto seleccionado.',
        features: [],
        models: []
      }
  }
}

// Función para obtener información detallada de servicios
const getServiceDetails = (serviceType: string | null) => {
  if (!serviceType) {
    return {
      title: 'Servicio',
      subtitle: 'Descripción del servicio',
      description: 'Información del servicio seleccionado.',
      features: [],
      benefits: []
    }
  }

  switch (serviceType) {
    case 'emprendimientos':
      return {
        title: 'Internet para Emprendimientos',
        subtitle: 'Conectividad diseñada para emprendedores',
        description: 'Conexión de alta velocidad especialmente diseñada para emprendedores y pequeñas empresas. Ideal para e-commerce, marketing digital, videoconferencias y comunicación empresarial.',
        features: [
          { icon: 'Wifi', text: 'Alta Velocidad', description: 'Conexión estable y rápida para múltiples dispositivos' },
          { icon: 'Smartphone', text: 'E-commerce', description: 'Optimizado para plataformas de venta online' },
        ],
        benefits: [
          'Instalación gratuita',
          'Soporte técnico especializado',
          'Garantía de velocidad',
          'Sin límite de datos'
        ]
      }
    case 'empresarial':
      return {
        title: 'Internet Empresarial',
        subtitle: 'Conectividad dedicada para empresas',
        description: 'Soluciones de conectividad dedicada para empresas medianas y grandes. Conexión estable, redundante y soporte técnico especializado 24/7.',
        features: [
          { icon: 'Building2', text: 'Conexión Dedicada', description: 'Línea exclusiva para tu empresa' },
          { icon: 'Server', text: 'Redundancia', description: 'Múltiples rutas de conexión para máxima disponibilidad' },
        ],
        benefits: [
          'SLA garantizado del 99.9%',
          'Soporte técnico prioritario',
          'Instalación profesional',
          'Monitoreo 24/7'
        ]
      }
    default:
      return {
        title: 'Servicio',
        subtitle: 'Descripción del servicio',
        description: 'Información del servicio seleccionado.',
        features: [],
        benefits: []
      }
  }
}

export default function Modals({ selectedProduct, selectedService, onCloseProduct, onCloseService }: ModalsProps) {
  // Modal de Producto
  const productDetails = selectedProduct ? getProductDetails(selectedProduct) : null

  // Modal de Servicio
  const serviceDetails = selectedService ? getServiceDetails(selectedService) : null

  return (
    <>
      {/* Modal de Producto */}
      {selectedProduct && productDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {productDetails.title}
              </h2>
              <button
                onClick={onCloseProduct}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="text-lg text-blue-600 font-semibold mb-2">
                  {productDetails.subtitle}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {productDetails.description}
                </p>
              </div>
              
              {/* Características principales */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Características Principales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productDetails.features.map((feature, index) => (
                    <div key={index} className="flex items-start p-4 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-xl border border-blue-600/20">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{feature.text}</h4>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Modelos disponibles */}
              {productDetails.models.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Modelos Disponibles</h3>
                  <div className="space-y-4">
                    {productDetails.models.map((model, index) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{model.name}</h4>
                            <p className="text-gray-600 text-sm">{model.description}</p>
                          </div>
                          <span className="text-lg font-bold text-green-600">{model.price}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {model.features.map((feature, featureIndex) => (
                            <span key={featureIndex} className="px-3 py-1 bg-blue-600/10 text-blue-600 text-xs rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => window.open(getWhatsAppLink(), '_blank')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Solicitar Cotización
                </Button>
                <Button
                  onClick={() => {
                    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })
                    onCloseProduct()
                  }}
                  variant="outline"
                  className="flex-1 border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Más Información
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Servicio */}
      {selectedService && serviceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {serviceDetails.title}
              </h2>
              <button
                onClick={onCloseService}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="text-lg text-blue-600 font-semibold mb-2">
                  {serviceDetails.subtitle}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {serviceDetails.description}
                </p>
              </div>
              
              {/* Características principales */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Características Principales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serviceDetails.features.map((feature, index) => (
                    <div key={index} className="flex items-start p-4 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-xl border border-blue-600/20">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{feature.text}</h4>
                        <p className="text-gray-600 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Beneficios */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Beneficios Incluidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {serviceDetails.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center p-3 bg-green-600/10 rounded-lg border border-green-600/20">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => window.open(getWhatsAppLink(), '_blank')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Solicitar Servicio
                </Button>
                <Button
                  onClick={() => {
                    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })
                    onCloseService()
                  }}
                  variant="outline"
                  className="flex-1 border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Más Información
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

