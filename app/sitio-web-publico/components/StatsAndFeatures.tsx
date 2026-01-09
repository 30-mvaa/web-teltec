"use client"

import { Headphones, Zap, Shield } from "lucide-react"

interface StatsAndFeaturesProps {
  isVisible: boolean
}

const features = [
  {
    icon: Headphones,
    title: "Soporte local",
    description: "Atención por canales directos (WhatsApp, llamada y oficina). Nada de robots que no entienden tu problema.",
  },
  {
    icon: Zap,
    title: "Planes flexibles",
    description: "Distintos niveles de velocidad según el uso: hogar, teletrabajo, cámaras de seguridad o negocio.",
  },
  {
    icon: Shield,
    title: "Monitoreo constante",
    description: "Supervisamos el estado de la red para anticiparnos a caídas y mantener la estabilidad del servicio.",
  },
]

export default function StatsAndFeatures({ isVisible }: StatsAndFeaturesProps) {
  return (
    <section id="beneficios" className="relative bg-gray-50 border-t border-gray-200 overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            ¿Por qué elegir <span className="text-blue-600">Teltec Net</span>?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            No solo instalamos internet, te acompañamos en el uso diario de tu conexión.
            Soporte cercano, tiempos de respuesta claros y atención pensada para tu realidad.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const colors = [
              { icon: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
              { icon: "text-green-600", bg: "bg-green-100", border: "border-green-200" },
              { icon: "text-green-600", bg: "bg-green-100", border: "border-green-200" },
            ][index]
            
            return (
              <div
                key={index}
                className="group rounded-xl border border-gray-200 bg-white p-6 space-y-4 hover:border-blue-300 hover:shadow-md transition-all"
              >
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                
                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
