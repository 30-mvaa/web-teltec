"use client"

import { MapPin, CheckCircle2, ArrowRight, Search, Sparkles } from "lucide-react"

interface Sector {
  id: number
  nombre_sector: string
  descripcion?: string
}

interface CoberturaProps {
  sectores: Sector[]
  onProductClick: (productType: string) => void
}

export default function Cobertura({ sectores, onProductClick }: CoberturaProps) {
  return (
    <section id="cobertura" className="py-8 md:py-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              <MapPin className="w-3 h-3 text-green-400" />
              <span className="text-xs font-semibold text-white">Cobertura</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              Zonas de <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">Cobertura</span>
            </h2>
            
            <p className="text-sm text-slate-300">
              Priorizamos zonas donde otros no llegan. Infraestructura para comunidades rurales y urbanas.
            </p>
            
            <ul className="space-y-2">
              {["Barrios y comunidades rurales", "Centros poblados", "Negocios y locales"].map((item, index) => (
                <li key={index} className="flex gap-2 items-center text-xs text-slate-300">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />{item}
                </li>
              ))}
            </ul>
            
            {sectores && sectores.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-400" /> Sectores
                </h3>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {sectores.map((sector, index) => (
                    sector?.nombre_sector && (
                      <span key={sector.id || index} className="text-xs text-slate-300 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                        {sector.nombre_sector}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => onProductClick('cobertura')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-green-500 to-cyan-500 text-white text-sm font-semibold hover:scale-105 transition-transform">
              <Search className="w-4 h-4" /> Consultar
            </button>
          </div>
          
          <div className="relative">
            <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-xl p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-green-400" />
                <p className="font-bold text-sm text-white">Mapa de cobertura</p>
              </div>
              <div className="h-64 rounded-xl border border-white/10 overflow-hidden bg-slate-800/50">
                <iframe src="https://www.google.com/maps?q=Cañar,+Ecuador&output=embed&z=10&center=-2.7397,-79.0417" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full h-full opacity-70" title="Mapa"></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
