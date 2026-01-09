"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Menu, X, ChevronRight } from "lucide-react"
import { getWhatsAppLink } from "../lib/whatsapp"

interface HeaderProps {
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export default function Header({ mobileMenuOpen, setMobileMenuOpen }: HeaderProps) {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { href: "#inicio", label: "Inicio" },
    { href: "#servicios", label: "Servicios" },
    { href: "#planes", label: "Planes" },
    { href: "#cobertura", label: "Cobertura" },
    { href: "#contacto", label: "Contacto" },
  ]

  return (
    <header className={`w-full bg-white sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'shadow-lg border-b-2 border-gray-200' 
        : 'shadow-md border-b border-gray-100'
    }`}>
      {/* Separador visual superior */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-green-500 to-blue-600"></div>
      
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 lg:h-28">
          {/* Logo - Protagonista */}
          <div 
            className="flex items-center gap-4 cursor-pointer group flex-shrink-0" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="relative w-16 h-16 lg:w-20 lg:h-20 transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
              <Image
                src="/images/logo-vectorizado.png"
                alt="Logo Teltec Net"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="leading-tight min-w-0">
              <p className="font-bold text-2xl lg:text-3xl tracking-tight text-gray-900 group-hover:text-blue-600 transition-colors">
                Teltec Net
              </p>
              <p className="text-xs lg:text-sm text-gray-500 font-normal mt-0.5">Internet de alta velocidad</p>
            </div>
          </div>
          
          {/* Desktop Navigation - Mejor espaciado y legibilidad */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-5 py-2.5 text-base font-medium text-gray-700 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
              >
                {item.label}
              </a>
            ))}
          </nav>
          
          {/* Desktop CTA Buttons - Balanceados */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 text-base font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg whitespace-nowrap"
            >
              Solicitar instalación
            </a>
            <button
              onClick={() => router.push('/login-simple')}
              className="px-5 py-2.5 text-base font-semibold rounded-lg bg-transparent text-gray-700 hover:text-blue-600 hover:bg-blue-50 border-2 border-gray-300 hover:border-blue-300 transition-all duration-200 whitespace-nowrap"
            >
              Iniciar sesión
            </button>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white shadow-xl">
          <nav className="px-4 py-6 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-3.5 text-base font-medium text-gray-700 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{item.label}</span>
                <ChevronRight className="w-5 h-5" />
              </a>
            ))}
            <div className="pt-4 space-y-3 border-t border-gray-200 mt-4">
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-3.5 text-base font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Solicitar instalación
              </a>
              <button
                onClick={() => {
                  router.push('/login-simple')
                  setMobileMenuOpen(false)
                }}
                className="w-full px-4 py-3.5 text-base font-semibold rounded-lg bg-transparent text-gray-700 hover:text-blue-600 hover:bg-blue-50 border-2 border-gray-300 transition-colors"
              >
                Iniciar sesión
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
