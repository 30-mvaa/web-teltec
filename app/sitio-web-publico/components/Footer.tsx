"use client"

import { motion } from "framer-motion"
import { Wifi, Mail, Phone, MapPin, Clock } from "lucide-react"

interface Empresa { nombre?: string; direccion?: string; telefono?: string; email?: string; horario?: string }
interface Contacto { id: number; tipo: string; titulo: string; valor: string; url: string; activo: boolean }
interface RedSocial { [key: string]: string }
interface FooterProps { empresa?: Empresa; contactos?: Contacto[]; redesSociales?: RedSocial }

const socialIcons: { [key: string]: JSX.Element } = {
  facebook: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  instagram: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  youtube: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  linkedin: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  twitter: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  tiktok: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
}

export default function Footer({ empresa, contactos = [], redesSociales = {} }: FooterProps) {
  const currentYear = new Date().getFullYear()
  const emailContact = contactos.find(c => c.tipo === 'email' && c.activo)
  const phoneContact = contactos.find(c => c.tipo === 'telefono' && c.activo)
  const redesArray = Object.entries(redesSociales || {}).map(([tipo, url]) => ({ tipo, url: String(url) })).filter(r => r.url)

  return (
    <footer className="relative bg-slate-950 border-t border-white/10">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-transparent pointer-events-none" />
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Wifi className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg text-white">{empresa?.nombre || "Teltec Net"}</p>
                <p className="text-xs text-slate-500">Internet & Tecnología</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Conectando comunidades con tecnología de vanguardia desde Cañar, Ecuador.
            </p>
            {redesArray.length > 0 && (
              <div className="flex gap-2">
                {redesArray.map((red) => (
                  <motion.a
                    key={red.tipo}
                    href={red.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-500/30 border border-white/10 transition-all"
                  >
                    {socialIcons[red.tipo] || <Wifi className="w-4 h-4" />}
                  </motion.a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Contacto</h3>
            <div className="space-y-3 text-sm text-slate-400">
              {phoneContact && (
                <a href={`tel:${phoneContact.valor}`} className="flex items-center gap-2.5 hover:text-cyan-400 transition-colors">
                  <Phone className="w-4 h-4 text-cyan-400" /> {phoneContact.valor}
                </a>
              )}
              {emailContact && (
                <a href={`mailto:${emailContact.valor}`} className="flex items-center gap-2.5 hover:text-cyan-400 transition-colors break-all">
                  <Mail className="w-4 h-4 text-cyan-400 flex-shrink-0" /> {emailContact.valor}
                </a>
              )}
              {empresa?.direccion && (
                <p className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" /> {empresa.direccion}
                </p>
              )}
              {empresa?.horario && (
                <p className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" /> {empresa.horario}
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Enlaces</h3>
            <ul className="space-y-2.5 text-sm">
              {["Inicio", "Servicios", "Planes", "Cobertura", "Contacto"].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase()}`} className="text-slate-400 hover:text-cyan-400 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">¿Necesitas ayuda?</h3>
            <motion.a
              href={`https://wa.me/593984517703`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2.5 px-5 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400 transition-all shadow-lg shadow-green-500/25"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.195.194 1.612.181.599-.019 1.56-.479 1.977-1.379.298-.601.446-1.123.496-1.287.05-.174.027-.3-.015-.42-.038-.117-.147-.223-.326-.346Z"/></svg>
              WhatsApp
            </motion.a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {currentYear} {empresa?.nombre || "Teltec Net"}. Todos los derechos reservados.
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">Términos</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
