"use client"

import { ArrowRight, CheckCircle2, Wifi, Headphones, Zap } from "lucide-react"
import { getWhatsAppLink } from "../lib/whatsapp"

interface HeroProps {
  isVisible: boolean
}

export default function Hero({ isVisible }: HeroProps) {
  
  return (
    <section id="inicio" className="relative bg-white overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24">
        <div className="max-w-3xl mx-auto">
          {/* Content */}
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
              <Wifi className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-medium tracking-wide text-green-700">
                Conectando hogares y negocios
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
              Internet de alta velocidad
              <span className="block text-blue-600 mt-2">
                estable, cercano y confiable
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Teltec Net es tu proveedor local de internet. Ofrecemos planes flexibles, soporte cercano y
              monitoreo constante para que navegues sin interrupciones.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <a
                href="#planes"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                Ver planes disponibles
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base text-gray-600 hover:text-blue-600 underline underline-offset-4 transition-colors"
              >
                ¿Necesitas una cotización?
              </a>
            </div>
            
            {/* Features Grid */}
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="p-2 rounded-md bg-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cobertura</dt>
                <dd className="text-base font-bold text-gray-900">Zonas rurales y urbanas</dd>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="p-2 rounded-md bg-green-100">
                  <Headphones className="w-4 h-4 text-green-600" />
                </div>
                <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Soporte</dt>
                <dd className="text-base font-bold text-gray-900">Lunes a sábado</dd>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="p-2 rounded-md bg-green-100">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Instalación</dt>
                <dd className="text-base font-bold text-gray-900">Rápida y programada</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
