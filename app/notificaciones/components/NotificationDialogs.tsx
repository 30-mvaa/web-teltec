"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Users } from "lucide-react"
import type { ClienteConPago, Notificacion } from "../hooks/useNotificaciones"

const mensajesPredefinidos = {
  pago_proximo: "Recordatorio: Su factura vence pronto. Evite la suspensión del servicio realizando su pago a tiempo.",
  pago_vencido: "AVISO: Su factura está vencida. Su servicio será suspendido si no realiza el pago en las próximas 24 horas.",
  corte_servicio: "AVISO IMPORTANTE: Su servicio de internet será suspendido por falta de pago. Comuníquese inmediatamente con nosotros para evitar la suspensión.",
  recordatorio: "Recordatorio: Le recordamos que su pago mensual está próximo a vencer. Por favor, realice su pago a tiempo para mantener su servicio activo.",
  promocion: "¡Oferta especial! Renueve su plan y obtenga 2 meses gratis. Válido hasta fin de mes.",
  mantenimiento: "Mantenimiento programado: El servicio estará interrumpido el día de mañana de 2:00 AM a 6:00 AM. Disculpe las molestias.",
}

const tiposNotificacion = [
  { valor: "pago_proximo", label: "Pago Próximo" },
  { valor: "pago_vencido", label: "Pago Vencido" },
  { valor: "corte_servicio", label: "Corte de Servicio" },
  { valor: "recordatorio", label: "Recordatorio" },
  { valor: "promocion", label: "Promoción" },
  { valor: "mantenimiento", label: "Mantenimiento" },
]

interface NotificationDialogsProps {
  clientes: ClienteConPago[]
  loading: boolean
  onCrearNotificacion: (data: { cliente_id: number; tipo: string; mensaje: string; canal: string }) => Promise<{ success: boolean; message?: string }>
  onEnviarMasiva: (data: { tipo: string; mensaje: string }) => Promise<{ success: boolean; message?: string; data?: any }>
  onLimpiarNotificaciones: (tipo: string, dias?: number) => Promise<{ success: boolean; message?: string; data?: any }>
  onToast: (message: string, type: "success" | "error" | "info") => void
}

export function NotificationDialogs({
  clientes,
  loading,
  onCrearNotificacion,
  onEnviarMasiva,
  onLimpiarNotificaciones,
  onToast,
}: NotificationDialogsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMasivaDialogOpen, setIsMasivaDialogOpen] = useState(false)
  const [isLimpiarDialogOpen, setIsLimpiarDialogOpen] = useState(false)
  const [tipoLimpieza, setTipoLimpieza] = useState("enviadas")
  const [diasAntiguedad, setDiasAntiguedad] = useState(30)

  const [formData, setFormData] = useState({
    cliente_id: null as number | null,
    tipo: "pago_proximo" as Notificacion["tipo"],
    mensaje: "",
    canal: "whatsapp" as Notificacion["canal"],
  })

  const [masivaData, setMasivaData] = useState({
    tipo: "promocion" as Notificacion["tipo"],
    mensaje: "",
    canal: "whatsapp" as Notificacion["canal"],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.cliente_id) {
      onToast("Debe seleccionar un cliente", "error")
      return
    }
    
    if (!formData.mensaje.trim()) {
      onToast("El mensaje no puede estar vacío", "error")
      return
    }

    const result = await onCrearNotificacion({
      cliente_id: formData.cliente_id,
      tipo: formData.tipo,
      mensaje: formData.mensaje,
      canal: formData.canal,
    })

    if (result.success) {
      onToast("Notificación creada exitosamente", "success")
      setIsDialogOpen(false)
      setFormData({
        cliente_id: null,
        tipo: "pago_proximo",
        mensaje: "",
        canal: "whatsapp",
      })
    } else {
      onToast(result.message || "Error al crear notificación", "error")
    }
  }

  const handleMasiva = async () => {
    if (!masivaData.mensaje.trim()) {
      onToast("El mensaje no puede estar vacío", "error")
      return
    }

    const result = await onEnviarMasiva({
      tipo: masivaData.tipo,
      mensaje: masivaData.mensaje,
    })

    if (result.success) {
      onToast(result.message || "Envío masivo completado", "success")
      setIsMasivaDialogOpen(false)
      setMasivaData({
        tipo: "promocion",
        mensaje: "",
        canal: "whatsapp",
      })
    } else {
      onToast(result.message || "Error en envío masivo", "error")
    }
  }

  const handleLimpiar = async () => {
    const result = await onLimpiarNotificaciones(tipoLimpieza, tipoLimpieza === "antiguas" ? diasAntiguedad : undefined)
    
    if (result.success) {
      onToast(result.message || "Limpieza completada", "success")
      setIsLimpiarDialogOpen(false)
      setTipoLimpieza("enviadas")
      setDiasAntiguedad(30)
    } else {
      onToast(result.message || "Error al limpiar", "error")
    }
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Notificación
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nueva Notificación</DialogTitle>
            <DialogDescription>
              Crea una nueva notificación para enviar a un cliente específico por WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cliente" className="text-sm font-medium">Cliente</Label>
              <Select
                value={formData.cliente_id?.toString() || ""}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: parseInt(value) })}
              >
                <SelectTrigger id="cliente" className="mt-2">
                  <SelectValue placeholder={clientes.length > 0 ? "Seleccionar cliente" : "Cargando clientes..."} />
                </SelectTrigger>
                <SelectContent>
                  {clientes.length === 0 ? (
                    <SelectItem value="" disabled>No hay clientes disponibles</SelectItem>
                  ) : (
                    clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id.toString()}>
                        {cliente.nombre || `${cliente.nombres} ${cliente.apellidos}` || "Cliente sin nombre"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tipo" className="text-sm font-medium">Tipo de Notificación</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value: Notificacion["tipo"]) => {
                  setFormData({ ...formData, tipo: value, mensaje: mensajesPredefinidos[value] })
                }}
              >
                <SelectTrigger id="tipo" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposNotificacion.map((tipo) => (
                    <SelectItem key={tipo.valor} value={tipo.valor}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mensaje" className="text-sm font-medium">Mensaje</Label>
              <Textarea
                id="mensaje"
                value={formData.mensaje}
                onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                placeholder="Mensaje de la notificación"
                rows={4}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="canal" className="text-sm font-medium">Canal</Label>
              <Select value="whatsapp" disabled>
                <SelectTrigger id="canal" className="mt-2">
                  <SelectValue placeholder="WhatsApp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creando..." : "Crear Notificación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMasivaDialogOpen} onOpenChange={setIsMasivaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envío Masivo</DialogTitle>
            <DialogDescription>
              Envía el mismo mensaje a todos los clientes con teléfono registrado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="masivaTipo" className="text-sm font-medium">Tipo de Notificación</Label>
              <Select
                value={masivaData.tipo}
                onValueChange={(value: Notificacion["tipo"]) => {
                  setMasivaData({ ...masivaData, tipo: value, mensaje: mensajesPredefinidos[value] })
                }}
              >
                <SelectTrigger id="masivaTipo" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposNotificacion.map((tipo) => (
                    <SelectItem key={tipo.valor} value={tipo.valor}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="masivaMensaje" className="text-sm font-medium">Mensaje</Label>
              <Textarea
                id="masivaMensaje"
                value={masivaData.mensaje}
                onChange={(e) => setMasivaData({ ...masivaData, mensaje: e.target.value })}
                placeholder="Mensaje para todos los clientes"
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMasivaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMasiva} disabled={loading}>
              {loading ? "Enviando..." : "Enviar a Todos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLimpiarDialogOpen} onOpenChange={setIsLimpiarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpiar Notificaciones</DialogTitle>
            <DialogDescription>
              Elimina notificaciones antiguas o fallidas para mantener la base de datos limpia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tipoLimpieza" className="text-sm font-medium">Tipo de Limpieza</Label>
              <Select value={tipoLimpieza} onValueChange={setTipoLimpieza}>
                <SelectTrigger id="tipoLimpieza" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enviadas">Notificaciones Enviadas</SelectItem>
                  <SelectItem value="fallidas">Notificaciones Fallidas</SelectItem>
                  <SelectItem value="antiguas">Notificaciones Antiguas</SelectItem>
                  <SelectItem value="todas">Todas las Notificaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tipoLimpieza === "antiguas" && (
              <div>
                <Label htmlFor="diasAntiguedad" className="text-sm font-medium">Días de Antigüedad</Label>
                <Input
                  id="diasAntiguedad"
                  type="number"
                  value={diasAntiguedad}
                  onChange={(e) => setDiasAntiguedad(parseInt(e.target.value))}
                  className="mt-2"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLimpiarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleLimpiar} disabled={loading}>
              {loading ? "Limpiando..." : "Limpiar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap justify-center gap-4">
        <Button variant="outline" onClick={() => setIsMasivaDialogOpen(true)} className="text-sm">
          <Users className="h-4 w-4 mr-2" />
          Envío Masivo
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsLimpiarDialogOpen(true)}
          className="text-sm text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      </div>
    </>
  )
}
