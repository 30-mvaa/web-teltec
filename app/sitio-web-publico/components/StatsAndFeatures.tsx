"use client"

import { Headphones, Zap, Shield } from "lucide-react"

interface StatsAndFeaturesProps {
  isVisible: boolean
}

const features = [
  { icon: Headphones, title: "Soporte local", description: "Atención directa sin robots." },
  { icon: Zap, title: "Planes flexibles", description: "Velocidad según tus necesidades." },
  { icon: Shield, title: "Monitoreo constante", description: "Supervisamos tu conexión 24/7." },
]

export default function StatsAndFeatures({ isVisible }: StatsAndFeaturesProps) {
  return (
    <section id="beneficios" className="py-8 bg-white">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            ¿Por qué elegir <span className="text-cyan-600">Teltec Net</span>?
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="flex items-start gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-cyan-200 hover:shadow-lg transition-all">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
