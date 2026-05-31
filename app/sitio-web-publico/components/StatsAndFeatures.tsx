"use client"

import { motion } from "framer-motion"
import { Headphones, Zap, Shield } from "lucide-react"

interface StatsAndFeaturesProps {
  isVisible: boolean
}

const features = [
  { icon: Headphones, title: "Soporte local", description: "Atención directa sin robots. Resolvemos tus dudas en minutos." },
  { icon: Zap, title: "Planes flexibles", description: "Velocidad que se adapta a tus necesidades. Escoge la ideal para ti." },
  { icon: Shield, title: "Monitoreo 24/7", description: "Supervisamos tu conexión constantemente para garantizar estabilidad." },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.15 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function StatsAndFeatures({ isVisible }: StatsAndFeaturesProps) {
  return (
    <section className="relative py-16 md:py-20 bg-slate-900">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            ¿Por qué elegir <span className="text-transparent bg-clip-text bg-gradient-to-r from-teltec-blue-light to-teltec-blue">Teltec Net</span>?
          </h2>
          <p className="text-slate-400 mt-3 max-w-lg mx-auto text-sm">
            Más que internet, una experiencia de conexión confiable.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-3 gap-5"
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-teltec-blue/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teltec-blue/20 to-teltec-blue-dark/20 border border-teltec-blue/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-teltec-blue-light" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
// trigger redeploy
