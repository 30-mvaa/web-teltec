"use client"

import { motion } from "framer-motion"
import { MapPin, CheckCircle2, Search, Sparkles } from "lucide-react"

interface Sector {
  id: number
  nombre_sector: string
  descripcion?: string
}

interface CoberturaProps {
  sectores: Sector[]
  onProductClick: (productType: string) => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function Cobertura({ sectores, onProductClick }: CoberturaProps) {
  return (
    <section id="cobertura" className="relative py-16 md:py-20 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 w-[400px] h-[400px] bg-teltec-green/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4">
            <MapPin className="w-3.5 h-3.5 text-teltec-green" />
            <span className="text-xs font-medium text-slate-300">Cobertura</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Zonas de <span className="text-transparent bg-clip-text bg-gradient-to-r from-teltec-green to-teltec-blue-light">Cobertura</span>
          </h2>
          <p className="text-slate-400 mt-3 max-w-lg mx-auto text-sm">Priorizamos zonas donde otros no llegan. Infraestructura para comunidades rurales y urbanas.</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid lg:grid-cols-2 gap-8 items-center"
        >
          <motion.div variants={itemVariants} className="space-y-5">
            <ul className="space-y-3">
              {["Barrios y comunidades rurales", "Centros poblados", "Negocios y locales"].map((item) => (
                <li key={item} className="flex gap-3 items-center text-sm text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-teltec-green/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teltec-green" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            {sectores && sectores.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10"
              >
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teltec-green" /> Sectores disponibles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sectores.map((sector, index) =>
                    sector?.nombre_sector && (
                      <span key={sector.id || index} className="text-xs text-slate-300 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        {sector.nombre_sector}
                      </span>
                    )
                  )}
                </div>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onProductClick('cobertura')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-teltec-green to-teltec-blue text-white text-sm font-semibold shadow-lg shadow-teltec-green/25"
            >
              <Search className="w-4 h-4" /> Consultar disponibilidad
            </motion.button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-xl overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-teltec-green" />
                <p className="font-semibold text-sm text-white">Mapa de cobertura</p>
              </div>
              <div className="h-64 rounded-xl border border-white/10 overflow-hidden bg-slate-800/50">
                <iframe
                  src="https://www.google.com/maps?q=Cañar,+Ecuador&output=embed&z=10&center=-2.7397,-79.0417"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full opacity-70 hover:opacity-100 transition-opacity duration-500"
                  title="Mapa"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
