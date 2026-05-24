"use client"

import React, { useEffect, useMemo, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import Script from "next/script"

// =========================
//  CARGA DIFERIDA (lazy)  
// =========================
// Se cargan en el cliente y fuera del camino crítico de renderizado.
const Header = dynamic(() => import("./components/Header"), { ssr: false })
const Hero = dynamic(() => import("./components/Hero"), { ssr: false })
const WhatsAppButton = dynamic(() => import("./components/WhatsAppButton"), { ssr: false })
const StatsAndFeatures = dynamic(() => import("./components/StatsAndFeatures"), { 
  ssr: false, 
  loading: () => <SectionSkeleton title="Estadísticas y Características" /> 
})
const Servicios = dynamic(() => import("./components/Servicios"), { 
  ssr: false, 
  loading: () => <SectionSkeleton title="Servicios" /> 
})
const Planes = dynamic(() => import("./components/Planes"), { 
  ssr: false, 
  loading: () => <SectionSkeleton title="Planes" /> 
})
const Cobertura = dynamic(() => import("./components/Cobertura"), { 
  ssr: false, 
  loading: () => <SectionSkeleton title="Cobertura" /> 
})
const Contacto = dynamic(() => import("./components/Contacto"), { 
  ssr: false, 
  loading: () => <SectionSkeleton title="Contacto" /> 
})
const Footer = dynamic(() => import("./components/Footer"), { ssr: false })
const Modals = dynamic(() => import("./components/Modals"), { ssr: false })
const Chatbot = dynamic(() => import("./components/Chatbot"), { ssr: false })

// =========================
//  TIPOS
// =========================
interface ContactoItem {
  id: number
  tipo: "telefono" | "email" | "whatsapp" | "direccion" | "horario"
  url: string
  titulo: string
  valor: string
  activo: boolean
}

// =========================
//  HOOK DE DATOS
// =========================
import { useSitioWebData } from "./hooks/useSitioWebData"
import { setWhatsappPhone } from "./lib/whatsapp"

// =========================
//  SKELETON & UTILIDADES
// =========================
function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" aria-hidden />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" aria-hidden />
          ))}
        </div>
        <p className="sr-only">Cargando {title}</p>
      </div>
    </section>
  )
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="mx-auto my-6 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
      <strong className="block font-semibold">Problema al cargar el sitio</strong>
      <span className="text-sm">{message}</span>
    </div>
  )
}

function SkipLink() {
  return (
      <a 
      href="#contenido" 
      className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-blue-600 px-3 py-2 text-sm text-white shadow-lg outline-none focus:not-sr-only focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Saltar al contenido
    </a>
  )
}

// =========================
//  DATOS POR DEFECTO
// =========================
const defaultContactos: ContactoItem[] = [
  { id: 16, tipo: "telefono", url: "tel:0984517703", titulo: "Teléfono Principal", valor: "0984517703", activo: true },
  { id: 17, tipo: "email", url: "mailto:teltecnet@outlook.com", titulo: "Email de Contacto", valor: "teltecnet@outlook.com", activo: true },
  { id: 18, tipo: "whatsapp", url: "https://wa.me/593984517703", titulo: "WhatsApp", valor: "0984517703", activo: true },
  { id: 19, tipo: "direccion", url: "", titulo: "Dirección", valor: "CAÑAR - COMUNIDAD SISID", activo: true },
  { id: 20, tipo: "horario", url: "", titulo: "Horario de Atención", valor: "Lunes a Viernes: 8:00 AM - 6:00 PM", activo: true },
]

// ======================================================
//  PÁGINA
//  - Rendimiento: lazy + memo + skeletons
//  - Accesibilidad: skip link + roles + sr-only
//  - SEO: JSON‑LD de organización y Sitelinks
// ======================================================
export default function SitioWebPublicoPage() {
  const { data: sitioWeb, loading, error } = useSitioWebData()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)

  // Visibilidad de animaciones al entrar
  const [isVisible, setIsVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Sincronizar WhatsApp desde datos del backend
  useEffect(() => {
    if (contactos?.length) {
      const whatsappContact = contactos.find((c: any) => c.tipo === 'whatsapp')
      if (whatsappContact?.url) {
        const match = whatsappContact.url.match(/(\d{9,15})/)
        if (match) setWhatsappPhone(match[1])
      }
    }
  }, [contactos])

  // Carrusel eliminado - ahora usamos el logo original de la empresa

  const servicios = sitioWeb?.servicios ?? []
  const planes = sitioWeb?.planes ?? []
  const sectores = sitioWeb?.sectores ?? []
  const contactos = sitioWeb?.contactos ?? defaultContactos
  const redesSociales = sitioWeb?.redesSociales ?? {}

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-16 w-16">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
          <p className="text-lg font-medium text-gray-900">Cargando Teltec Net…</p>
          <p className="mt-2 text-sm text-gray-600">Conectando con el futuro</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-gray-900 flex flex-col overflow-x-hidden" role="document">
      <SkipLink />

      {/* SEO: JSON‑LD de organización y búsqueda de sitelinks */}
      <Script id="org-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "T&Tnet / TelTec Net",
          url: "https://www.teltecnet.ec",
          logo: "https://www.teltecnet.ec/logo.png",
          contactPoint: contactos
            .filter((c) => c.activo)
            .map((c) => ({
              "@type": "ContactPoint",
              telephone: c.tipo === "telefono" || c.tipo === "whatsapp" ? c.valor : undefined,
              contactType: c.titulo,
              email: c.tipo === "email" ? c.valor : undefined,
              areaServed: "EC",
              availableLanguage: ["es"],
            })),
          sameAs: [
            "https://www.facebook.com/teltecnet",
            "https://www.instagram.com/teltecnet",
          ],
        })}
      </Script>
      <Script id="sitelinks-searchbox" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          url: "https://www.teltecnet.ec/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.teltecnet.ec/buscar?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        })}
      </Script>

      {/* Header */}
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Main content */}
      <main id="contenido" className="isolate pt-20">
        {/* Hero */}
        <Hero 
          informacion={sitioWeb?.informacion} 
          empresa={sitioWeb?.empresa} 
          isVisible={isVisible} 
        />

        {/* Mensaje de error si el backend falló */}
        {error && <ErrorNotice message={String(error)} />}

        {/* Secciones (lazy + skeleton) */}
        <StatsAndFeatures isVisible={isVisible} />
        <Servicios servicios={servicios} onServiceClick={setSelectedService} />
        <Planes planes={planes} />
        <Cobertura sectores={sectores} onProductClick={setSelectedProduct} />
        <Contacto contactos={contactos} redesSociales={redesSociales} />
      </main>

      {/* Footer */}
      <Footer 
        empresa={sitioWeb?.empresa} 
        contactos={contactos} 
        redesSociales={redesSociales} 
      />

      {/* Botón flotante WhatsApp */}
      <WhatsAppButton />

      {/* Chatbot Inteligente */}
      <Chatbot />

      {/* Modales */}
      <Modals 
        selectedProduct={selectedProduct}
        selectedService={selectedService}
        onCloseProduct={() => setSelectedProduct(null)}
        onCloseService={() => setSelectedService(null)}
      />
    </div>
  )
}
