"use client"

import { MessageCircle } from "lucide-react"

interface WhatsAppButtonProps {
  phone?: string
}

export default function WhatsAppButton({ phone }: WhatsAppButtonProps) {
  const whatsappNumber = phone || "593984517703"
  const whatsappMessage = "Hola, estoy interesado en los servicios de T&Tnet"
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20BA5A] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="w-6 h-6 text-white" />
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF0000] rounded-full animate-pulse border-2 border-white"></span>
    </a>
  )
}

