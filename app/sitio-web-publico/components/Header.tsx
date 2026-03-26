"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Menu, X, LogIn, Zap } from "lucide-react"
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5' 
        : 'bg-white'
    }`}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="relative w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
              <Image
                src="/images/logo-vectorizado.png"
                alt="Logo Teltec Net"
                fill
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-lg md:text-xl text-slate-900 group-hover:text-blue-600 transition-colors">
                Teltec Net
              </p>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Internet & Tecnología</p>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                {item.label}
              </a>
            ))}
          </nav>
          
          <div className="hidden lg:flex items-center gap-3">
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-green-500 text-white hover:bg-green-600 transition-all"
            >
              <Zap className="w-4 h-4" />
              WhatsApp
            </a>
            <button
              onClick={() => router.push('/login-simple')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all"
            >
              <LogIn className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white shadow-xl">
          <nav className="px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block px-4 py-3 text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 space-y-3 border-t border-slate-100 mt-4">
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-base font-semibold rounded-xl bg-green-500 text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Zap className="w-5 h-5" />
                WhatsApp
              </a>
              <button
                onClick={() => {
                  router.push('/login-simple')
                  setMobileMenuOpen(false)
                }}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-base font-semibold rounded-xl bg-slate-900 text-white"
              >
                <LogIn className="w-5 h-5" />
                Iniciar sesión
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
