"use client"

import { ArrowRight, Wifi, Zap, Shield, Clock, Sparkles } from "lucide-react"
import { getWhatsAppLink } from "../lib/whatsapp"
import Reveal from "./Reveal"
import AnimatedCounter from "./AnimatedCounter"

interface Informacion {
  titulo?: string
  subtitulo?: string
  descripcion?: string
  lema?: string
}

interface Empresa {
  nombre?: string
  telefono?: string
  email?: string
}

interface HeroProps {
  informacion?: Informacion
  empresa?: Empresa
  isVisible: boolean
}

export default function Hero({ informacion, empresa, isVisible }: HeroProps) {
  return (
    <section id="inicio" className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Background effects - más sutil */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-blue-500/30 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[250px] h-[250px] bg-cyan-500/30 rounded-full blur-[60px]"></div>
      </div>

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Content - más compacto */}
          <Reveal className="space-y-4">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Internet Fibra Óptica</span>
            </div>

            {/* Title - más pequeño */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              {informacion?.titulo || "TelTec Net"}
              <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                {informacion?.lema || "Conectando tu mundo digital"}
              </span>
            </h1>

            {/* Subtitle - más corto */}
            <p className="text-base text-slate-300 max-w-lg">
              {informacion?.descripcion || "Internet de alta velocidad con tecnología fibra óptica. Rápido, estable y con el mejor soporte local."}
            </p>

            {/* CTA Buttons - más compactos */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="#planes"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40"
              >
                Ver planes
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-bold border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.195.194 1.612.181.599-.019 1.56-.479 1.977-1.379.298-.601.446-1.123.496-1.287.05-.174.027-.3-.015-.42-.038-.117-.147-.223-.326-.346Z"/>
                </svg>
                WhatsApp
              </a>
            </div>

            {/* Stats animated */}
            <div className="flex gap-6 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <AnimatedCounter end={500} suffix="+" label="Clientes" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <AnimatedCounter end={99} suffix=".9%" label="Uptime" />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right Content - Visual compacto */}
          <Reveal delay={200} className="hidden lg:flex justify-center">
            <div className="relative w-64 h-64">
              {/* Central circle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 shadow-[0_0_60px_rgba(6,182,212,0.4)] flex items-center justify-center">
                  <div className="text-center">
                    <Wifi className="w-16 h-16 mx-auto mb-1 text-white" />
                    <p className="text-lg font-bold text-white">Teltec</p>
                  </div>
                </div>
              </div>
              
              {/* Floating cards pequeños */}
              <div className="absolute top-0 right-0 bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-300">Velocidad</p>
                    <p className="text-sm font-bold text-white">500 Mbps</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-300">Seguridad</p>
                    <p className="text-sm font-bold text-white">100%</p>
                  </div>
                </div>
            </div>
            </div>
          </Reveal>

          {/* Mobile visual */}
          <Reveal delay={300} className="lg:hidden flex justify-center py-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                <Zap className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-semibold text-white">500 Mbps</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-semibold text-white">100% Seguro</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Bottom wave - más pequeño */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" className="w-full h-10 md:h-12">
          <path fill="#f8fafc" fillOpacity="1" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
        </svg>
      </div>
    </section>
  )
}
