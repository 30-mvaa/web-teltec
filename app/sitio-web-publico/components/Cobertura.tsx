"use client"

import { MapPin, CheckCircle2 } from "lucide-react"

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
    <section id="cobertura" className="relative bg-white border-t border-gray-200 overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 mb-3">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium tracking-wide text-blue-700">
                Zona de Cobertura
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
              Cobertura <span className="text-blue-600">Teltec Net</span>
            </h2>
            
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              Priorizamos las zonas donde otros proveedores no llegan o no ofrecen estabilidad. 
              Instalamos infraestructura pensando en comunidades rurales y urbanas que necesitan conexión confiable.
            </p>
            
            {/* Features List */}
            <ul className="space-y-3 pt-3">
              {[
                "Barrios y comunidades rurales cercanas a la zona de operación",
                "Centros poblados con baja oferta de conectividad",
                "Negocios y locales que requieren internet para su operación diaria",
              ].map((item, index) => (
                <li key={index} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="p-1 rounded bg-green-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            
            {/* Sectores Atendidos */}
            {sectores && sectores.length > 0 && (
              <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Sectores Atendidos
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {sectores.map((sector: Sector, index: number) => {
                    if (!sector || !sector.nombre_sector) return null
                    return (
                      <div 
                        key={sector.id || index} 
                        className="text-xs text-gray-700 p-2 rounded-md bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        {sector.nombre_sector}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Content - Map */}
          <div className="relative">
            <div className="relative rounded-xl border border-gray-200 bg-white shadow-md p-5">
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <p className="font-bold text-base text-gray-900">Mapa de cobertura</p>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Zonas de cobertura de Teltec Net en la provincia de Cañar, Ecuador.
                </p>
              </div>
              
              <div className="relative h-80 rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                <iframe
                  src="https://www.google.com/maps?q=Cañar,+Ecuador&output=embed&z=10&center=-2.7397,-79.0417"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                  title="Mapa de cobertura Teltec Net - Provincia de Cañar, Ecuador"
                ></iframe>
                <div className="absolute bottom-2 right-2">
                  <a
                    href="https://www.google.com/maps?q=Cañar,+Ecuador&ll=-2.7397,-79.0417&z=10"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] text-gray-700 hover:text-blue-600 bg-white/95 backdrop-blur-sm px-2 py-1.5 rounded-md border border-gray-300 hover:border-blue-300 transition-colors shadow-sm"
                  >
                    <MapPin className="w-3 h-3" />
                    Ver en Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(243, 244, 246, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(37, 99, 235, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(37, 99, 235, 0.7);
        }
      `}</style>
    </section>
  )
}
