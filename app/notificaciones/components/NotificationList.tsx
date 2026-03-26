"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, CheckCircle, Clock, Copy, Search, XCircle, MessageCircle } from "lucide-react"
import type { Notificacion } from "../hooks/useNotificaciones"

interface NotificationListProps {
  notificaciones: Notificacion[]
  searchTerm: string
  filterTipo: Notificacion["tipo"] | "todos"
  filterEstado: Notificacion["estado"] | "todos"
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  loading?: boolean
  onSearchChange: (term: string) => void
  onFilterTipoChange: (tipo: Notificacion["tipo"] | "todos") => void
  onFilterEstadoChange: (estado: Notificacion["estado"] | "todos") => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onCopyMessage: (notif: Notificacion) => void
  onSendWhatsApp: (notif: Notificacion) => Promise<void>
}

const tiposNotificacion = [
  { valor: "pago_proximo", label: "Pago Próximo" },
  { valor: "pago_vencido", label: "Pago Vencido" },
  { valor: "corte_servicio", label: "Corte de Servicio" },
  { valor: "recordatorio", label: "Recordatorio" },
  { valor: "promocion", label: "Promoción" },
  { valor: "mantenimiento", label: "Mantenimiento" },
]

export function NotificationList({
  notificaciones,
  searchTerm,
  filterTipo,
  filterEstado,
  page,
  pageSize,
  totalPages,
  totalItems,
  loading,
  onSearchChange,
  onFilterTipoChange,
  onFilterEstadoChange,
  onPageChange,
  onPageSizeChange,
  onCopyMessage,
  onSendWhatsApp,
}: NotificationListProps) {
  const getTipoBadge = (tipo: Notificacion["tipo"]) => {
    const configs: Record<string, { color: string; label: string }> = {
      pago_proximo: { color: "bg-blue-50 text-blue-700 border-blue-200", label: "Pago Próximo" },
      pago_vencido: { color: "bg-orange-50 text-orange-700 border-orange-200", label: "Pago Vencido" },
      corte_servicio: { color: "bg-red-50 text-red-700 border-red-200", label: "Corte Servicio" },
      recordatorio: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Recordatorio" },
      promocion: { color: "bg-green-50 text-green-700 border-green-200", label: "Promoción" },
      mantenimiento: { color: "bg-purple-50 text-purple-700 border-purple-200", label: "Mantenimiento" },
    }
    const config = configs[tipo] || { color: "bg-gray-50 text-gray-700 border-gray-200", label: "Desconocido" }
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>
  }

  const getEstadoBadge = (estado: Notificacion["estado"]) => {
    const configs: Record<string, { color: string; label: string; icon: typeof CheckCircle }> = {
      pendiente: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Pendiente", icon: Clock },
      enviado: { color: "bg-green-50 text-green-700 border-green-200", label: "Enviado", icon: CheckCircle },
      fallido: { color: "bg-red-50 text-red-700 border-red-200", label: "Fallido", icon: XCircle },
    }
    const config = configs[estado] || { color: "bg-gray-50 text-gray-700 border-gray-200", label: "Desconocido", icon: Bell }
    const Icon = config.icon
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getCanalBadge = (canal: Notificacion["canal"]) => {
    const configs = {
      whatsapp: { color: "bg-green-50 text-green-700 border-green-200", label: "WHATSAPP" },
      email: { color: "bg-purple-50 text-purple-700 border-purple-200", label: "EMAIL" },
      sms: { color: "bg-orange-50 text-orange-700 border-orange-200", label: "SMS" },
    }
    const config = configs[canal] || { color: "bg-gray-50 text-gray-700 border-gray-200", label: "DESCONOCIDO" }
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por cliente o mensaje..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={filterTipo} onValueChange={onFilterTipoChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {tiposNotificacion.map((tipo) => (
                  <SelectItem key={tipo.valor} value={tipo.valor}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={onFilterEstadoChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="fallido">Fallido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Notificaciones ({totalItems})
            </h2>
            <div className="flex items-center gap-2">
              <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando notificaciones...</p>
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay notificaciones</h3>
              <p className="text-gray-600">Crea tu primera notificación para comenzar.</p>
            </div>
          ) : (
            notificaciones.map((notif) => (
              <div key={notif.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {notif.cliente_nombre}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {getEstadoBadge(notif.estado)}
                        {getTipoBadge(notif.tipo)}
                        {getCanalBadge(notif.canal)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{notif.mensaje}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Creada: {new Date(notif.fecha_creacion).toLocaleDateString()}</span>
                      {notif.fecha_envio && (
                        <span>Enviada: {new Date(notif.fecha_envio).toLocaleDateString()}</span>
                      )}
                      {notif.estado === "pendiente" && (
                        <span className="text-green-600 font-medium">Pendiente de envío</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex gap-2">
                    {notif.canal === "whatsapp" && notif.cliente_telefono && notif.estado === "pendiente" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => onSendWhatsApp(notif)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => onCopyMessage(notif)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)} de {totalItems}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
