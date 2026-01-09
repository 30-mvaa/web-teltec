"use client"

import { Check, Zap, Star } from "lucide-react"
import { getWhatsAppLink } from "../lib/whatsapp"

interface Plan {
  id: number
  tipo_plan: string
  precio: number
  descripcion: string
}

interface PlanesProps {
  planes: Plan[]
}

// Función para obtener características basadas en el tipo de plan
const getPlanFeatures = (planName: string) => {
  const name = planName.toLowerCase()
  if (name.includes('familiar') || name.includes('hogar') || name.includes('residencial')) {
    return [
      "Instalación básica incluida",
      "Soporte técnico remoto",
      "WiFi de amplio alcance",
    ]
  } else if (name.includes('preferencial') || name.includes('premium') || name.includes('avanzado')) {
    return [
      "Prioridad en soporte",
      "Router de doble banda",
      "Velocidad estable en horas pico",
    ]
  } else if (name.includes('empresarial') || name.includes('business') || name.includes('corporativo')) {
    return [
      "Atención técnica personalizada",
      "Monitoreo preventivo",
      "Opciones de IP fija",
    ]
  }
  return [
    "Instalación básica incluida",
    "Soporte técnico remoto",
    "WiFi de amplio alcance",
  ]
}

// Función para obtener velocidad desde la descripción o calcularla basada en el precio
const getSpeedFromPlan = (plan: Plan) => {
  // Intentar extraer velocidad de la descripción
  if (plan.descripcion) {
    const speedMatch = plan.descripcion.match(/(\d+)\s*(Mbps|mbps|MBPS)/i)
    if (speedMatch) {
      return `${speedMatch[1]} Mbps`
    }
  }
  
  // Si no hay velocidad en la descripción, calcular basado en precio
  const precio = Number(plan.precio)
  if (precio <= 25) return "40 Mbps"
  if (precio <= 35) return "80 Mbps"
  if (precio <= 50) return "120 Mbps"
  return `${Math.round(precio * 1.6)} Mbps`
}

export default function Planes({ planes }: PlanesProps) {
  // Usar solo los planes de la base de datos
  const displayPlans = planes.map((plan, index) => ({
    id: plan.id,
    name: plan.tipo_plan,
    speed: getSpeedFromPlan(plan),
    desc: plan.descripcion || `Plan ${plan.tipo_plan} con conexión de alta velocidad.`,
    price: `$${Number(plan.precio).toFixed(2)}/mes`,
    featured: index === 1 && planes.length >= 2, // El segundo plan es destacado si hay al menos 2
    features: getPlanFeatures(plan.tipo_plan)
  }))

  if (displayPlans.length === 0) {
    return (
      <section id="planes" className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center">
            <p className="text-gray-600">No hay planes disponibles en este momento.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="planes" className="relative bg-gray-50 border-t border-gray-200 overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Planes de <span className="text-blue-600">Internet</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Elige el plan que se ajusta a tu uso diario. Todos incluyen soporte técnico y monitoreo de la conexión.
          </p>
        </div>
        
        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayPlans.map((plan) => (
            <article
              key={plan.id}
              className={`group relative rounded-xl border p-6 flex flex-col gap-4 transition-all ${
                plan.featured
                  ? "border-blue-300 bg-blue-50 shadow-lg"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 text-white text-[10px] font-bold px-3 py-1 shadow-md">
                    <Star className="w-2.5 h-2.5 fill-white" />
                    Más elegido
                  </span>
                </div>
              )}
              
              {/* Plan Header */}
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-gray-900">
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">{plan.desc}</p>
              </div>
              
              {/* Speed & Price */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <p className="text-2xl font-bold text-blue-600">
                    {plan.speed}
                  </p>
                </div>
                <p className="text-xl font-bold text-gray-900">{plan.price}</p>
              </div>
              
              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="p-0.5 rounded bg-green-100">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
              
              {/* CTA Button */}
              <div className="pt-3 border-t border-gray-200">
                <a
                  href={getWhatsAppLink(plan.name, plan.price)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/btn inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                >
                  Quiero este plan
                  <span className="ml-2 group-hover/btn:translate-x-1 transition-transform">→</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
