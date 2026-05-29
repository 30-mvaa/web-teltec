"use client"

import { motion } from "framer-motion"
import { Check, Zap, Star, Shield, Headphones, Clock } from "lucide-react"
import { getWhatsAppLink } from "../lib/whatsapp"

interface Plan {
  id: number
  tipo_plan: string
  precio: number
  descripcion: string
  velocidad?: string | null
}

interface PlanDisplay {
  id: number
  name: string
  speed: string
  desc: string
  price: string
  featured: boolean
  features: string[]
  gradient: string
}

interface PlanesProps {
  planes: Plan[]
}

const getSpeedFromPlan = (plan: Plan): string => {
  if (plan.velocidad) return plan.velocidad
  const precio = Number(plan.precio)
  if (precio <= 20) return "20 Mbps"
  if (precio <= 25) return "40 Mbps"
  if (precio <= 35) return "80 Mbps"
  if (precio <= 50) return "120 Mbps"
  if (precio <= 80) return "200 Mbps"
  if (precio <= 150) return "300 Mbps"
  return `${Math.round(precio * 1.6)} Mbps`
}

const getPlanFeatures = (planName: string) => {
  const name = planName.toLowerCase()
  if (name.includes('familiar') || name.includes('hogar') || name.includes('residencial'))
    return ["Instalación incluida", "Soporte técnico", "WiFi amplio"]
  if (name.includes('preferencial') || name.includes('premium') || name.includes('avanzado'))
    return ["Soporte prioritario", "Router doble banda", "Velocidad estable"]
  if (name.includes('empresarial') || name.includes('business') || name.includes('corporativo'))
    return ["Atención personalizada", "Monitoreo preventivo", "IP fija"]
  return ["Instalación incluida", "Soporte técnico", "WiFi amplio"]
}

const planGradients = ["from-violet-500 to-purple-600", "from-cyan-500 to-blue-600", "from-orange-500 to-amber-600"]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.15 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function Planes({ planes }: PlanesProps) {
  const displayPlans = planes.map((plan, index) => ({
    id: plan.id,
    name: plan.tipo_plan,
    speed: getSpeedFromPlan(plan),
    desc: plan.descripcion || `Plan ${plan.tipo_plan}`,
    price: `$${Number(plan.precio).toFixed(2)}`,
    featured: index === 1 && planes.length >= 2,
    features: getPlanFeatures(plan.tipo_plan),
    gradient: planGradients[index % planGradients.length],
  }))

  if (displayPlans.length === 0) {
    return (
      <section id="planes" className="py-16 bg-slate-900">
        <div className="max-w-[1200px] mx-auto px-4">
          <p className="text-slate-400 text-center">No hay planes disponibles.</p>
        </div>
      </section>
    )
  }

  return (
    <section id="planes" className="relative py-16 md:py-20 bg-slate-900 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-slate-950/50" />
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-slate-300">Planes</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Elige tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Internet</span>
          </h2>
          <p className="text-slate-400 mt-3 max-w-lg mx-auto text-sm">Planes flexibles sin contratos. Soporte técnico incluido.</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {displayPlans.map((plan) => (
            <motion.div
              key={plan.id}
              variants={cardVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`relative rounded-2xl border overflow-hidden ${
                plan.featured
                  ? "bg-gradient-to-b from-white/[0.08] to-white/[0.03] border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.12)]"
                  : "bg-white/[0.03] border-white/10 hover:border-white/20"
              }`}
            >
              {plan.featured && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                >
                  <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${plan.gradient} text-white text-xs font-semibold px-4 py-1.5 shadow-lg`}>
                    <Star className="w-3 h-3 fill-white" /> Popular
                  </span>
                </motion.div>
              )}

              <div className="p-6 pb-4 text-center border-b border-white/10">
                <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              </div>

              <div className="p-5 text-center bg-black/20">
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
                  {plan.speed}
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  {plan.price}
                  <span className="text-sm font-normal text-slate-500">/mes</span>
                </p>
              </div>

              <div className="p-5 pt-4 space-y-3">
                <ul className="space-y-2.5">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className="flex gap-2.5 items-center text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-cyan-400" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <motion.a
                  href={getWhatsAppLink(plan.name, plan.price)}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`block w-full py-3 rounded-xl font-semibold text-center text-white transition-all ${
                    plan.featured
                      ? `bg-gradient-to-r ${plan.gradient} shadow-lg`
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  Solicitar
                </motion.a>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            { icon: Shield, text: "Sin contrato", color: "text-green-400" },
            { icon: Headphones, text: "Soporte 24/7", color: "text-cyan-400" },
            { icon: Clock, text: "Instalación 24-48h", color: "text-blue-400" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <item.icon className={`w-4 h-4 ${item.color}`} />
              <span className="text-xs font-medium text-slate-300">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
