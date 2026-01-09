"use client"

import { useState } from "react"
import { Wifi, Building2, Video, Code, Settings, ArrowRight } from "lucide-react"

interface Servicio {
  id: number
  nombre: string
  descripcion: string
  imagen: string
  orden: number
  activo: boolean
}

interface ServiciosProps {
  servicios: Servicio[]
  onServiceClick: (serviceType: string) => void
}

const serviceIcons = [Wifi, Building2, Video, Code, Settings]
const serviceColors = [
  { icon: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
  { icon: "text-green-600", bg: "bg-green-100", border: "border-green-200" },
  { icon: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
  { icon: "text-green-600", bg: "bg-green-100", border: "border-green-200" },
  { icon: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
]

export default function Servicios({ servicios, onServiceClick }: ServiciosProps) {
  const serviceTypes = ['emprendimientos', 'empresarial', 'camaras', 'desarrollo', 'mantenimiento']
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (servicios.length === 0) {
    return null
  }

  return (
    <section id="servicios" className="relative bg-white border-t border-gray-200 overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Nuestros <span className="text-blue-600">Servicios</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Soluciones de conectividad adaptadas a tus necesidades. Desde internet residencial hasta soluciones empresariales completas.
          </p>
        </div>
        
        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicios.map((servicio: Servicio, index: number) => {
            const Icon = serviceIcons[index % serviceIcons.length]
            const colors = serviceColors[index % serviceColors.length]
            const isHovered = hoveredIndex === index
            
            return (
              <div 
                key={servicio.id || index} 
                className="group rounded-xl border border-gray-200 bg-white p-6 space-y-4 cursor-pointer transition-all hover:border-blue-300 hover:shadow-md"
                onClick={() => onServiceClick(serviceTypes[index % serviceTypes.length])}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                
                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {servicio.nombre}
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    {servicio.descripcion}
                  </p>
                </div>
                
                {/* Arrow */}
                <div className="flex items-center gap-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-semibold">Más información</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
