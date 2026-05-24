"use client"

import { useState } from "react"
import { Wifi, Building2, Video, Code, Settings, ArrowRight, Home, Shield, Bell, Lock, Cpu, Sparkles } from "lucide-react"
import Reveal from "./Reveal"

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

const serviciosData = [
  { id: 1, nombre: "Domotizaciones", descripcion: "Automatiza tu hogar con sistemas inteligentes.", icono: "cpu", serviceType: "domotizaciones", gradient: "from-violet-500 to-purple-600" },
  { id: 2, nombre: "Casas Inteligentes", descripcion: "Transforma tu vivienda con tecnología de punta.", icono: "home", serviceType: "casas_inteligentes", gradient: "from-cyan-500 to-blue-600" },
  { id: 3, nombre: "Desarrollo Software", descripcion: "Soluciones personalizadas para tu empresa.", icono: "code", serviceType: "desarrollo_software", gradient: "from-green-500 to-emerald-600" },
  { id: 4, nombre: "Cámaras Seguridad", descripcion: "Videovigilancia HD con acceso remoto.", icono: "video", serviceType: "camaras_seguridad", gradient: "from-red-500 to-orange-600" },
  { id: 5, nombre: "Alarmas", descripcion: "Sistemas con monitoreo 24/7.", icono: "bell", serviceType: "alarmas", gradient: "from-amber-500 to-yellow-600" },
  { id: 6, nombre: "Cierres Eléctricos", descripcion: "Automatización de puertas y portones.", icono: "lock", serviceType: "cierres_electricos", gradient: "from-blue-500 to-indigo-600" },
]

const iconMap: { [key: string]: any } = { wifi: Wifi, home: Home, code: Code, video: Video, bell: Bell, lock: Lock, settings: Settings, cpu: Cpu }

export default function Servicios({ servicios, onServiceClick }: ServiciosProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section id="servicios" className="py-8 md:py-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-3">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Servicios</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
              Nuestros <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Servicios</span>
            </h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto">Soluciones integrales para hogar y empresa.</p>
          </div>
        </Reveal>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviciosData.map((servicio, index) => {
            const Icon = iconMap[servicio.icono] || Wifi
            const isHovered = hoveredIndex === index
            
            return (
              <Reveal key={servicio.id} delay={index * 100}>
                <div className={`group relative rounded-2xl border p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                  isHovered ? "bg-white/10 backdrop-blur-xl border-cyan-500/30" : "bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10"
                }`}
                onClick={() => onServiceClick(servicio.serviceType)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${servicio.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300">{servicio.nombre}</h3>
                  <p className="text-xs text-slate-300 mt-1">{servicio.descripcion}</p>
                  <div className="flex items-center gap-2 text-cyan-400 mt-3 text-xs font-semibold">
                    <span>Más info</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1" />
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
