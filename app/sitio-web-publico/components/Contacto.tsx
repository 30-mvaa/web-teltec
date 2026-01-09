"use client"

import { Phone, Mail, MessageCircle, MapPin, Clock, ExternalLink, Facebook, Instagram, Twitter, Linkedin, Youtube } from "lucide-react"

interface Contacto {
  id: number
  tipo: string
  titulo: string
  valor: string
  url: string
  icono?: string
  activo: boolean
}

interface RedSocial {
  [key: string]: string // tipo: url
}

interface ContactoProps {
  contactos: Contacto[]
  redesSociales?: RedSocial
}

const iconMap: { [key: string]: any } = {
  'telefono': Phone,
  'email': Mail,
  'whatsapp': MessageCircle,
  'direccion': MapPin,
  'horario': Clock,
  'facebook': Facebook,
  'instagram': Instagram,
  'twitter': Twitter,
  'linkedin': Linkedin,
  'youtube': Youtube,
}

const colorMap: { [key: string]: string } = {
  'telefono': 'text-blue-600 bg-blue-100 border-blue-200',
  'email': 'text-red-600 bg-red-100 border-red-200',
  'whatsapp': 'text-green-600 bg-green-100 border-green-200',
  'direccion': 'text-gray-600 bg-gray-100 border-gray-200',
  'horario': 'text-green-600 bg-green-100 border-green-200',
  'facebook': 'text-blue-600 bg-blue-100 border-blue-200',
  'instagram': 'text-green-600 bg-green-100 border-green-200',
  'twitter': 'text-sky-600 bg-sky-100 border-sky-200',
  'linkedin': 'text-blue-600 bg-blue-100 border-blue-200',
  'youtube': 'text-red-600 bg-red-100 border-red-200',
}

export default function Contacto({ contactos, redesSociales = {} }: ContactoProps) {
  // Filtrar contactos activos
  const contactosActivos = contactos?.filter(c => c.activo) || []
  
  // Preparar redes sociales para mostrar
  const redesSocialesArray = Object.entries(redesSociales || {}).map(([tipo, url]) => ({
    tipo,
    url: String(url),
    titulo: tipo.charAt(0).toUpperCase() + tipo.slice(1)
  }))

  return (
    <section id="contacto" className="relative bg-gray-50 border-t border-gray-200 overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            <span className="text-blue-600">Contáctanos</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Contáctanos a través de cualquiera de nuestros canales. Estamos aquí para ayudarte.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-10">
          {/* Información de contacto */}
          {contactosActivos.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                Información de contacto
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {contactosActivos.map((contacto) => {
                  const Icon = iconMap[contacto.tipo.toLowerCase()] || MapPin
                  const colors = colorMap[contacto.tipo.toLowerCase()] || 'text-gray-600 bg-gray-100 border-gray-200'
                  
                  return (
                    <a
                      key={contacto.id}
                      href={contacto.url || `tel:${contacto.valor}` || `mailto:${contacto.valor}`}
                      target={contacto.url ? '_blank' : undefined}
                      rel={contacto.url ? 'noopener noreferrer' : undefined}
                      className="group flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${colors.split(' ')[1]} border ${colors.split(' ')[2]} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${colors.split(' ')[0]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{contacto.titulo}</p>
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{contacto.valor}</p>
                      </div>
                      {contacto.url && (
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                      )}
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Redes sociales */}
          {redesSocialesArray.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                Síguenos en redes sociales
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {redesSocialesArray.map((red) => {
                  const Icon = iconMap[red.tipo.toLowerCase()] || MessageCircle
                  const colors = colorMap[red.tipo.toLowerCase()] || 'text-gray-600 bg-gray-100 border-gray-200'
                  
                  return (
                    <a
                      key={red.tipo}
                      href={red.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col items-center gap-2 p-5 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className={`w-12 h-12 rounded-lg ${colors.split(' ')[1]} border ${colors.split(' ')[2]} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${colors.split(' ')[0]}`} />
                      </div>
                      <p className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors text-center">{red.titulo}</p>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {contactosActivos.length === 0 && redesSocialesArray.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No hay información de contacto disponible</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
