"use client"

import { Wifi, Mail, Phone } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-gray-100 border-t-2 border-gray-300 overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 z-10">
        <div className="grid md:grid-cols-3 gap-10 lg:gap-12 mb-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100 border-2 border-blue-200">
                <Wifi className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-lg lg:text-xl text-gray-900">Teltec Net</p>
                <p className="text-xs lg:text-sm text-gray-600 font-medium">Internet de alta velocidad</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Proveedor local de servicios de internet. Conectando hogares y negocios con tecnología de vanguardia.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900">Enlaces rápidos</h3>
            <nav className="flex flex-col gap-2">
              <a href="#inicio" className="text-sm text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Inicio
              </a>
              <a href="#servicios" className="text-sm text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Servicios
              </a>
              <a href="#planes" className="text-sm text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Planes
              </a>
              <a href="#cobertura" className="text-sm text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Cobertura
              </a>
              <a href="#contacto" className="text-sm text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Contacto
              </a>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900">Contacto</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="font-medium">0984517703</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="font-medium">teltecnet@outlook.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Separador más marcado */}
        <div className="pt-8 border-t-2 border-gray-300 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600 font-medium">
            © {currentYear} Teltec Net. Todos los derechos reservados.
          </p>
          <p className="text-sm text-gray-500">
            Desarrollado con ❤️ para la comunidad
          </p>
        </div>
      </div>
    </footer>
  )
}
