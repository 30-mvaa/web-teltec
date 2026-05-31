"use client"

import { X, Phone, MessageCircle, CheckCircle, Cpu, Home, Code, Video, Bell, Lock, Wifi, Shield, Calendar, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getWhatsAppLink } from "../lib/whatsapp"

interface ModalsProps {
  selectedProduct: string | null
  selectedService: string | null
  onCloseProduct: () => void
  onCloseService: () => void
}

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

const getServiceDetails = (serviceType: string | null) => {
  if (!serviceType) {
    return {
      title: 'Servicio',
      subtitle: 'Descripción del servicio',
      description: 'Información del servicio seleccionado.',
      features: [],
      benefits: [],
      process: [],
      includes: []
    }
  }

  switch (serviceType) {
    case 'domotizaciones':
      return {
        title: 'Domotizaciones',
        subtitle: 'Automatiza tu hogar con tecnología inteligente',
        description: 'Transformamos tu casa en un hogar inteligente mediante la instalación de sistemas domóticos que permiten controlar iluminación, climatización, persianas, electrodomésticos y más desde tu smartphone o asistentes de voz.',
        features: [
          { icon: 'Cpu', text: 'Control Centralizado', description: 'Gestiona todos los dispositivos desde una sola aplicación' },
          { icon: 'Wifi', text: 'Control Remoto', description: 'Accede y controla tu hogar desde cualquier lugar del mundo' },
          { icon: 'Calendar', text: 'Programación Inteligente', description: 'Automatiza tareas según horarios y rutinas personalizadas' },
          { icon: 'Shield', text: 'Integración con Seguridad', description: 'Conecta sensores, alarmas y cámaras en un mismo sistema' },
          { icon: 'Star', text: 'Escenarios Personalizados', description: 'Crea modos como "Noche", "Salir de casa", "Película"' },
          { icon: 'Code', text: 'Compatibilidad', description: 'Funciona con Alexa, Google Home, Siri y más' },
        ],
        benefits: [
          'Ahorro energético hasta 30%',
          'Comodidad y accesibilidad',
          'Aumento del valor de tu propiedad',
          'Seguridad mejorada',
          'Control total desde tu celular'
        ],
        process: [
          'Visita técnica y evaluación',
          'Diseño del sistema personalizado',
          'Instalación de dispositivos',
          'Configuración e integración',
          'Capacitación y soporte'
        ],
        includes: [
          'Servidor local o cloud',
          'Interruptores inteligentes',
          'Sensores de movimiento',
          'Termostatos inteligentes',
          'App de control gratuita'
        ]
      }
    case 'casas_inteliges':
    case 'casas_inteligentes':
      return {
        title: 'Casas Inteligentes',
        subtitle: 'El futuro de la vivienda hoy',
        description: 'Implementamos soluciones completas de vivienda inteligente que integran todos los sistemas del hogar: iluminación, climatización, seguridad, entretenimiento y electrodomésticos. Una casa que piensa, aprende y se adapta a ti.',
        features: [
          { icon: 'Home', text: 'Integración Total', description: 'Todos los sistemas conectados y controlados desde una sola plataforma' },
          { icon: 'Cpu', text: 'Inteligencia Artificial', description: 'El sistema aprende de tus hábitos y automatiza acciones' },
          { icon: 'Shield', text: 'Seguridad Integral', description: 'Alarmas, cámaras, sensores y cerraduras inteligentes' },
          { icon: 'Wifi', text: 'Conectividad Mesh', description: 'WiFi cobertura completa en toda la vivienda' },
          { icon: 'Star', text: 'Asistentes Virtuales', description: 'Control por voz con Alexa, Google y Siri' },
          { icon: 'Calendar', text: 'Rutinas Automáticas', description: 'El hogar se adapta a tu estilo de vida' },
        ],
        benefits: [
          'Confort total y personalización',
          'Ahorro energético significativo',
          'Mayor seguridad y tranquilidad',
          'Valor agregado a tu propiedad',
          'Acceso y control remoto'
        ],
        process: [
          'Auditoría del hogar',
          'Diseño del proyecto',
          'Instalación de infraestructura',
          'Configuración de sistemas',
          'Pruebas y capacitación'
        ],
        includes: [
          'Panel de control inteligente',
          'Sistema de iluminación LED',
          'Climatización automatizada',
          'Cerraduras biométricas',
          'Cámaras de seguridad',
          'Sensores diversos'
        ]
      }
    case 'desarrollo_software':
      return {
        title: 'Desarrollo de Software',
        subtitle: 'Soluciones tecnológicas personalizadas',
        description: 'Diseñamos y desarrollamos software a medida para empresas y proyectos específicos. Desde aplicaciones web y móviles hasta sistemas de gestión empresariales. Transformamos tus ideas en soluciones digitales.',
        features: [
          { icon: 'Code', text: 'Desarrollo Web', description: 'Sitios web, portales y aplicaciones web responsivas' },
          { icon: 'Cpu', text: 'Aplicaciones Móviles', description: 'Apps nativas e híbridas para iOS y Android' },
          { icon: 'Shield', text: 'Sistemas ERP', description: 'Software de gestión empresarial personalizado' },
          { icon: 'Wifi', text: 'Integraciones API', description: 'Conectamos tus sistemas con servicios externos' },
          { icon: 'Star', text: 'Bases de Datos', description: 'Diseño y optimización de bases de datos' },
          { icon: 'Calendar', text: 'Mantenimiento', description: 'Soporte y actualizaciones continuas' },
        ],
        benefits: [
          'Soluciones 100% personalizadas',
          'Escalabilidad para crecimiento',
          'Soporte técnico especializado',
          'Documentación completa',
          'Entrega en tiempos acordados'
        ],
        process: [
          'Requisitos y análisis',
          'Diseño y prototipado',
          'Desarrollo iterativo',
          'Pruebas de calidad',
          'Despliegue y lanzamiento',
          'Mantenimiento posterior'
        ],
        includes: [
          'Análisis de requisitos',
          'Diseño UX/UI profesional',
          'Código fuente documentado',
          'Pruebas completas',
          'Manual de usuario',
          '3 meses de soporte gratuito'
        ]
      }
    case 'camaras_seguridad':
      return {
        title: 'Cámaras de Seguridad',
        subtitle: 'Protección visual las 24 horas',
        description: 'Sistemas de videovigilancia de alta definición con tecnología de punta. Protege tu hogar o negocio con cámaras interiores y exteriores, visión nocturna, detección inteligente y acceso remoto en tiempo real.',
        features: [
          { icon: 'Video', text: 'Resolución 4K', description: 'Imágenes Ultra HD para detalles precisos' },
          { icon: 'Moon', text: 'Visión Nocturna', description: 'Vision nocturna a color hasta 30 metros' },
          { icon: 'Wifi', text: 'Conexión WiFi/LAN', description: 'Instalación cableada o inalámbrica' },
          { icon: 'Cpu', text: 'Detección IA', description: 'Reconoce personas, vehículos y mascotas' },
          { icon: 'Shield', text: 'Alertas en Tiempo Real', description: 'Notificaciones push ante movimiento' },
          { icon: 'Star', text: 'Audio Bidireccional', description: 'Escucha y habla desde la app' },
        ],
        benefits: [
          'Monitoreo remoto 24/7',
          'Grabación en la nube o local',
          'Evidencia visual ante incidentes',
          'Descuentos en seguros',
          'Disuasión contra ladrones'
        ],
        process: [
          'Inspección del área',
          'Diseño del sistema',
          'Instalación de cámaras',
          'Configuración de red',
          'Configuración de app',
          'Pruebas y capacitación'
        ],
        includes: [
          'Cámaras HD de alta calidad',
          'Grabador NVR/DVR',
          'Disco duro de almacenamiento',
          'Cables y accesorios',
          'App EZVIZ gratuita',
          'Soporte técnico'
        ]
      }
    case 'alarmas':
      return {
        title: 'Alarmas',
        subtitle: 'Seguridad activa para tu tranquilidad',
        description: 'Sistemas de alarma interconectados con monitoreo profesional 24/7. Detecta intrusiones, incendios, fugas de gas y más. Alertas inmediatas a tu celular y a nuestra central de monitoreo.',
        features: [
          { icon: 'Bell', text: 'Detección Multi-sensor', description: 'Sensores de movimiento, apertura, vibración' },
          { icon: 'Shield', text: 'Monitoreo 24/7', description: 'Central de monitoreo vela por ti' },
          { icon: 'Wifi', text: 'Conexión GSM/WiFi', description: 'Doble vía de comunicación' },
          { icon: 'Cpu', text: 'Zonas Configurables', description: 'Divide tu propiedad en zonas independientes' },
          { icon: 'Star', text: 'Notificaciones Instantáneas', description: 'Alertas inmediatas a tu celular' },
          { icon: 'Calendar', text: 'Armado Programado', description: 'Programa horarios de activación' },
        ],
        benefits: [
          'Respuesta inmediata ante emergencias',
          'Cobertura completa (intrusión, fuego, gas)',
          'Descuento en seguros patrimoniales',
          'Botón de pánico',
          ' llave inteligente'
        ],
        process: [
          'Evaluación de riesgos',
          'Diseño del sistema',
          'Instalación de sensores',
          'Configuración central',
          'Pruebas de funcionamiento',
          'Capacitación'
        ],
        includes: [
          'Panel de control',
          'Sensores de movimiento',
          'Sensores de apertura',
          'Sirena de alarma',
          'Teclado y controles',
          'App de monitoreo'
        ]
      }
    case 'cierres_electricos':
      return {
        title: 'Cierres Eléctricos',
        subtitle: 'Automatización de accesos',
        description: 'Sistemas de automatización para puertas y portones. Controla el acceso a tu propiedad desde cualquier lugar. Seguridad y comodidad con tecnología de última generación.',
        features: [
          { icon: 'Lock', text: 'Control Remoto', description: 'Abre y cierra desde tu celular' },
          { icon: 'Wifi', text: 'Conexión WiFi', description: 'Sin necesidad de cables adicionales' },
          { icon: 'Shield', text: 'Cerraduras Inteligentes', description: 'Sin llaves, acceso con código o huella' },
          { icon: 'Cpu', text: 'Apertura Automática', description: 'Detecta tu llegada y abre solo' },
          { icon: 'Star', text: 'Registro de Accesos', description: 'Historial de quién entró y cuándo' },
          { icon: 'Calendar', text: 'Códigos Temporales', description: 'Genera códigos para visitantes' },
        ],
        benefits: [
          'Olvídate de las llaves',
          'Comparte acceso temporalmente',
          'Mayor seguridad',
          'Comodidad total',
          'Integración con domótica'
        ],
        process: [
          'Inspección del tipo de puerta/portón',
          'Recomendación del sistema',
          'Instalación del motor/cerradura',
          'Configuración de accesos',
          'Pruebas de funcionamiento',
          'Capacitación'
        ],
        includes: [
          'Motor de portón o cerradura',
          'Control remoto',
          'Teclado numérico',
          'Sensor de seguridad',
          'App de control',
          'Garantía extendida'
        ]
      }
    default:
      return {
        title: 'Servicio',
        subtitle: 'Descripción del servicio',
        description: 'Información del servicio seleccionado.',
        features: [],
        benefits: [],
        process: [],
        includes: []
      }
  }
}

export default function Modals({ selectedProduct, selectedService, onCloseProduct, onCloseService }: ModalsProps) {
  const productDetails = selectedProduct ? getProductDetails(selectedProduct) : null
  const serviceDetails = selectedService ? getServiceDetails(selectedService) : null

  return (
    <>
      {/* Modal de Producto */}
      {selectedProduct && productDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">
                {productDetails.title}
              </h2>
              <button
                onClick={onCloseProduct}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="text-lg text-teltec-blue font-semibold mb-2">
                  {productDetails.subtitle}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {productDetails.description}
                </p>
              </div>
              
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Características Principales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productDetails.features.map((feature, index) => (
                    <div key={index} className="flex items-start p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-12 h-12 bg-teltec-blue/10 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-teltec-blue" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">{feature.text}</h4>
                        <p className="text-sm text-slate-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {productDetails.models.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Modelos Disponibles</h3>
                  <div className="space-y-4">
                    {productDetails.models.map((model, index) => (
                      <div key={index} className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900">{model.name}</h4>
                            <p className="text-slate-600 text-sm">{model.description}</p>
                          </div>
                          <span className="text-lg font-bold text-teltec-green">{model.price}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {model.features.map((feature, featureIndex) => (
                            <span key={featureIndex} className="px-3 py-1 bg-teltec-blue/10 text-teltec-blue text-xs rounded-full font-medium">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => window.open(getWhatsAppLink(), '_blank')}
                  className="flex-1 bg-teltec-blue hover:bg-teltec-blue-dark text-white font-semibold py-3 px-6 rounded-xl"
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
                  className="flex-1 border-2 border-teltec-green text-teltec-green hover:bg-teltec-green hover:text-white font-semibold py-3 px-6 rounded-xl"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">
                {serviceDetails.title}
              </h2>
              <button
                onClick={onCloseService}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="text-lg text-teltec-blue font-semibold mb-2">
                  {serviceDetails.subtitle}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {serviceDetails.description}
                </p>
              </div>
              
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Características Principales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serviceDetails.features.map((feature, index) => (
                    <div key={index} className="flex items-start p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-12 h-12 bg-teltec-blue/10 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-teltec-blue" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">{feature.text}</h4>
                        <p className="text-sm text-slate-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {serviceDetails.benefits && serviceDetails.benefits.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Beneficios Incluidos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {serviceDetails.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center p-3 bg-teltec-green/5 rounded-lg border border-teltec-green/20">
                        <CheckCircle className="w-5 h-5 text-teltec-green mr-3 flex-shrink-0" />
                        <span className="text-slate-700 font-medium">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {serviceDetails.includes && serviceDetails.includes.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">¿Qué Incluye el Servicio?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {serviceDetails.includes.map((item, index) => (
                      <div key={index} className="flex items-center p-3 bg-teltec-blue/5 rounded-lg border border-teltec-blue/20">
                        <Star className="w-5 h-5 text-teltec-blue mr-3 flex-shrink-0" />
                        <span className="text-slate-700 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {serviceDetails.process && serviceDetails.process.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Proceso de Trabajo</h3>
                  <div className="flex flex-wrap gap-2">
                    {serviceDetails.process.map((step, index) => (
                      <div key={index} className="flex items-center">
                        <span className="w-8 h-8 bg-teltec-blue text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">
                          {index + 1}
                        </span>
                        <span className="text-slate-700 font-medium mr-3">{step}</span>
                        {index < serviceDetails.process.length - 1 && (
                          <span className="text-slate-300 mr-3">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => window.open(getWhatsAppLink(), '_blank')}
                  className="flex-1 bg-teltec-blue hover:bg-teltec-blue-dark text-white font-semibold py-3 px-6 rounded-xl"
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
                  className="flex-1 border-2 border-teltec-green text-teltec-green hover:bg-teltec-green hover:text-white font-semibold py-3 px-6 rounded-xl"
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
