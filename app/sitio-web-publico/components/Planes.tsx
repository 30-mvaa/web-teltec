"use client"

import { Check, Zap, Star, Rocket, Shield, Headphones, Clock } from "lucide-react"
import { getWhatsAppLink } from "../lib/whatsapp"
import Reveal from "./Reveal"

interface Plan {
  id: number
  tipo_plan: string
  precio: number
  descripcion: string
}

interface PlanesProps {
  planes: Plan[]
}

const getPlanFeatures = (planName: string) => {
  const name = planName.toLowerCase()
  if (name.includes('familiar') || name.includes('hogar') || name.includes('residencial')) {
    return ["Instalación incluida", "Soporte técnico", "WiFi amplio"]
  } else if (name.includes('preferencial') || name.includes('premium') || name.includes('avanzado')) {
    return ["Soporte prioritario", "Router doble banda", "Velocidad estable"]
  } else if (name.includes('empresarial') || name.includes('business') || name.includes('corporativo')) {
    return ["Atención personalizada", "Monitoreo preventivo", "IP fija"]
  }
  return ["Instalación incluida", "Soporte técnico", "WiFi amplio"]
}

const getSpeedFromPlan = (plan: Plan) => {
  if (plan.descripcion) {
    const speedMatch = plan.descripcion.match(/(\d+)\s*(Mbps|mbps|MBPS)/i)
    if (speedMatch) return `${speedMatch[1]}`
  }
  const precio = Number(plan.precio)
  if (precio <= 20) return "20"
  if (precio <= 25) return "40"
  if (precio <= 35) return "80"
  if (precio <= 50) return "120"
  if (precio <= 80) return "200"
  if (precio <= 150) return "300"
  return `${Math.round(precio * 1.6)}`
}

const planGradients = ["from-violet-500 to-purple-600", "from-cyan-500 to-blue-600", "from-orange-500 to-amber-600"]

export default function Planes({ planes }: PlanesProps) {
  const displayPlans = planes.map((plan, index) => ({
    id: plan.id,
    name: plan.tipo_plan,
    speed: getSpeedFromPlan(plan),
    desc: plan.descripcion || `Plan ${plan.tipo_plan}`,
    price: `$${Number(plan.precio).toFixed(2)}`,
    featured: index === 1 && planes.length >= 2,
    features: getPlanFeatures(plan.tipo_plan),
    gradient: planGradients[index % planGradients.length]
  }))

  if (displayPlans.length === 0) {
    return (
      <section id="planes" className="py-8 bg-slate-50">
        <div className="max-w-[1200px] mx-auto px-4">
          <p className="text-slate-600 text-center">No hay planes disponibles.</p>
        </div>
      </section>
    )
  }

  return (
    <section id="planes" className="py-10 md:py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-3">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Planes</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
              Elige tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Internet</span>
            </h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto">Planes flexibles sin contratos. Soporte técnico incluido.</p>
          </div>
        </Reveal>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayPlans.map((plan, index) => (
            <Reveal key={plan.id} delay={index * 150}>
              <article className={`relative rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                plan.featured ? "bg-white/10 backdrop-blur-xl border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]" : "bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10"
              }`}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${plan.gradient} text-white text-xs font-bold px-3 py-1`}>
                      <Star className="w-3 h-3 fill-white" /> Popular
                    </span>
                  </div>
                )}
                
                <div className="p-5 pb-4 text-center border-b border-white/10">
                  <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-3`}>
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                </div>
                
                <div className="p-4 text-center bg-black/20">
                  <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    {plan.speed} <span className="text-sm font-normal text-slate-400">Mbps</span>
                  </p>
                  <p className="text-xl font-bold text-white">{plan.price}<span className="text-xs text-slate-400">/mes</span></p>
                </div>
                
                <div className="p-4 pt-3 space-y-2">
                  <ul className="space-y-2">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex gap-2 items-center text-xs text-slate-200">
                        <Check className="w-3 h-3 text-cyan-400 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <a href={getWhatsAppLink(plan.name, plan.price)} target="_blank" rel="noopener noreferrer" className={`block w-full py-2.5 rounded-xl font-semibold text-center text-white transition-all ${
                    plan.featured ? `bg-gradient-to-r ${plan.gradient}` : "bg-white/10 hover:bg-white/20"
                  }`}>
                    Solicitar
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-xs font-medium text-white">Sin contrato</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10">
              <Headphones className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-white">Soporte 24/7</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-white">Instalación 24-48h</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
