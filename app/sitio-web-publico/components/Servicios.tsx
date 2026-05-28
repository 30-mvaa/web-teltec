"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Wifi, Home, Code, Video, Bell, Lock, Cpu, ArrowRight, Sparkles } from "lucide-react"

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
  { id: 2, nombre: "Casas Inteligentes", descripcion: "Transforma tu vivienda con tecnología.", icono: "home", serviceType: "casas_inteligentes", gradient: "from-cyan-500 to-blue-600" },
  { id: 3, nombre: "Desarrollo Software", descripcion: "Soluciones personalizadas para empresas.", icono: "code", serviceType: "desarrollo_software", gradient: "from-green-500 to-emerald-600" },
  { id: 4, nombre: "Cámaras Seguridad", descripcion: "Videovigilancia HD con acceso remoto.", icono: "video", serviceType: "camaras_seguridad", gradient: "from-red-500 to-orange-600" },
  { id: 5, nombre: "Alarmas", descripcion: "Sistemas con monitoreo 24/7.", icono: "bell", serviceType: "alarmas", gradient: "from-amber-500 to-yellow-600" },
  { id: 6, nombre: "Cierres Eléctricos", descripcion: "Automatización de puertas y portones.", icono: "lock", serviceType: "cierres_electricos", gradient: "from-blue-500 to-indigo-600" },
]

const iconMap: { [key: string]: any } = { wifi: Wifi, home: Home, code: Code, video: Video, bell: Bell, lock: Lock, settings: Wifi, cpu: Cpu }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.1 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export default function Servicios({ servicios, onServiceClick }: ServiciosProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section id="servicios" className="relative py-16 md:py-20 bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-transparent" />
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-slate-300">Servicios</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Nuestros <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Servicios</span>
          </h2>
          <p className="text-slate-400 mt-3 max-w-lg mx-auto text-sm">Soluciones integrales para hogar y empresa.</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {serviciosData.map((servicio, index) => {
            const Icon = iconMap[servicio.icono] || Wifi
            return (
              <motion.div
                key={servicio.id}
                variants={cardVariants}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onServiceClick(servicio.serviceType)}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 cursor-pointer transition-colors hover:bg-white/[0.06] hover:border-cyan-500/30"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${servicio.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">{servicio.nombre}</h3>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{servicio.descripcion}</p>
                <div className="flex items-center gap-1.5 text-cyan-400 mt-4 text-xs font-medium group-hover:gap-2.5 transition-all">
                  <span>Más info</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
