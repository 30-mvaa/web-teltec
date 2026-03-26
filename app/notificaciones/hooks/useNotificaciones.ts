"use client"

import { useState, useCallback, useEffect } from "react"
import { API_ENDPOINTS, apiRequest } from "@/lib/config/api"

export interface Notificacion {
  id: number
  cliente_id: number
  cliente_nombre: string
  cliente_telefono: string | null
  tipo: "pago_proximo" | "pago_vencido" | "corte_servicio" | "recordatorio" | "promocion" | "mantenimiento"
  mensaje: string
  estado: "pendiente" | "enviado" | "fallido"
  canal: "whatsapp" | "email" | "sms"
  fecha_creacion: string
  fecha_envio: string | null
}

export interface ClienteConPago {
  id: number
  nombre: string
  nombres?: string
  apellidos?: string
  telefono: string | null
  email?: string
  precio_plan?: number
  tipo_plan?: string
  estado: string
  fecha_registro?: string
  dias_desde_registro: number
  dias_sin_pago: number
  estado_pago: string
  debe_pagar: boolean
  total_pagado_anual?: number
  total_pagos_anual?: number
  ultimo_pago?: string
  deuda_actual?: number
}

export interface Estadisticas {
  total: number
  enviadas: number
  pendientes: number
  fallidas: number
}

export interface UseNotificacionesReturn {
  notificaciones: Notificacion[]
  clientes: ClienteConPago[]
  estadisticas: Estadisticas | null
  loading: boolean
  error: string | null
  apiStatus: "online" | "offline"
  pagination: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
  }
  filters: {
    searchTerm: string
    tipo: Notificacion["tipo"] | "todos"
    estado: Notificacion["estado"] | "todos"
  }
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSearchTerm: (term: string) => void
  setFilterTipo: (tipo: Notificacion["tipo"] | "todos") => void
  setFilterEstado: (estado: Notificacion["estado"] | "todos") => void
  cargarDatos: () => Promise<void>
  crearNotificacion: (data: { cliente_id: number; tipo: string; mensaje: string; canal: string }) => Promise<{ success: boolean; message?: string }>
  enviarMasiva: (data: { tipo: string; mensaje: string }) => Promise<{ success: boolean; message?: string; data?: any }>
  generarAutomaticas: () => Promise<{ success: boolean; message?: string; data?: any }>
  limpiarNotificaciones: (tipo: string, dias?: number) => Promise<{ success: boolean; message?: string; data?: any }>
  crearNotificacionCliente: (cliente: ClienteConPago) => Promise<{ success: boolean; message?: string }>
  copyToClipboard: (text: string) => Promise<boolean>
  sendWhatsApp: (notif: Notificacion) => Promise<{ success: boolean; message?: string }>
}

const DEFAULT_PAGE_SIZE = 20

export function useNotificaciones(): UseNotificacionesReturn {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [clientes, setClientes] = useState<ClienteConPago[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<"online" | "offline">("offline")
  
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalItems, setTotalItems] = useState(0)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTipo, setFilterTipo] = useState<Notificacion["tipo"] | "todos">("todos")
  const [filterEstado, setFilterEstado] = useState<Notificacion["estado"] | "todos">("todos")

  const totalPages = Math.ceil(totalItems / pageSize)

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      try {
        const testRes = await fetch(API_ENDPOINTS.NOTIFICACIONES_WHATSAPP_STATUS, {
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000),
        })
        setApiStatus(testRes.ok ? "online" : "offline")
      } catch {
        setApiStatus("offline")
      }

      const results = await Promise.allSettled([
        fetch(`${API_ENDPOINTS.NOTIFICACIONES}?page=${page}&page_size=${pageSize}&search=${searchTerm}&tipo=${filterTipo}&estado=${filterEstado}`, {
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
        }).then((res) => res.json()),
        fetch(API_ENDPOINTS.NOTIFICACIONES_ESTADO_PAGOS, {
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
        }).then((res) => res.json()),
        fetch(API_ENDPOINTS.NOTIFICACIONES_ESTADISTICAS, {
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
        }).then((res) => res.json()),
      ])

      if (results[0].status === "fulfilled" && results[0].value) {
        const data = results[0].value
        if (data.success !== false) {
          if (data.data?.results) {
            setNotificaciones(data.data.results)
            setTotalItems(data.data.count || 0)
          } else {
            setNotificaciones(data.data || data || [])
            setTotalItems((data.data || []).length)
          }
        }
      }

      if (results[1].status === "fulfilled" && results[1].value) {
        const data = results[1].value
        if (data.success !== false) {
          setClientes(data.data || [])
        }
      }

      if (results[2].status === "fulfilled" && results[2].value) {
        const data = results[2].value
        if (data.success !== false) {
          setEstadisticas(data.data || { total: 0, enviadas: 0, pendientes: 0, fallidas: 0 })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchTerm, filterTipo, filterEstado])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const crearNotificacion = useCallback(
    async (data: { cliente_id: number; tipo: string; mensaje: string; canal: string }) => {
      try {
        const res = await apiRequest(API_ENDPOINTS.NOTIFICACION_CREATE, {
          method: "POST",
          body: JSON.stringify(data),
        })
        
        if (res.success) {
          await cargarDatos()
          return { success: true, message: res.message || "Notificación creada exitosamente" }
        }
        return { success: false, message: res.message || "Error al crear notificación" }
      } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "Error desconocido" }
      }
    },
    [cargarDatos]
  )

  const enviarMasiva = useCallback(
    async (data: { tipo: string; mensaje: string }) => {
      try {
        const res = await apiRequest(API_ENDPOINTS.NOTIFICACION_MASIVA, {
          method: "POST",
          body: JSON.stringify(data),
        })
        
        if (res.success) {
          await cargarDatos()
          return { success: true, message: res.message, data: res.data }
        }
        return { success: false, message: res.message || "Error en envío masivo" }
      } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "Error desconocido" }
      }
    },
    [cargarDatos]
  )

  const generarAutomaticas = useCallback(async () => {
    try {
      const res = await apiRequest(API_ENDPOINTS.NOTIFICACIONES_GENERAR_AUTOMATICAS, {
        method: "POST",
      })
      
      if (res.success) {
        await cargarDatos()
        return { success: true, message: res.message, data: res.data }
      }
      return { success: false, message: res.message || "Error al generar notificaciones" }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Error desconocido" }
    }
  }, [cargarDatos])

  const limpiarNotificaciones = useCallback(
    async (tipo: string, dias?: number) => {
      try {
        const res = await apiRequest(API_ENDPOINTS.NOTIFICACIONES_LIMPIAR, {
          method: "POST",
          body: JSON.stringify({ tipo, dias }),
        })
        
        if (res.success) {
          await cargarDatos()
          return { success: true, message: res.message, data: res.data }
        }
        return { success: false, message: res.message || "Error al limpiar" }
      } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : "Error desconocido" }
      }
    },
    [cargarDatos]
  )

  const crearNotificacionCliente = useCallback(
    async (cliente: ClienteConPago) => {
      if (!cliente.telefono) {
        return { success: false, message: "Cliente no tiene teléfono" }
      }

      const deuda = cliente.deuda_actual || 0
      const mensaje =
        deuda > 0
          ? `Hola ${cliente.nombres}, este es un recordatorio de TelTec Net. Tu deuda actual es de $${deuda.toLocaleString()}. Por favor realiza tu pago para evitar la suspensión del servicio.`
          : `Hola ${cliente.nombres}, este es un mensaje de TelTec Net. Gracias por mantenerte al día con tus pagos.`

      return crearNotificacion({
        cliente_id: cliente.id,
        tipo: deuda > 0 ? "pago_vencido" : "recordatorio",
        mensaje,
        canal: "whatsapp",
      })
    },
    [crearNotificacion]
  )

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }, [])

  const sendWhatsApp = useCallback(async (notif: Notificacion) => {
    if (!notif.cliente_telefono) {
      return { success: false, message: "Cliente no tiene teléfono" }
    }

    try {
      let numero = notif.cliente_telefono.replace(/\D/g, "")
      
      if (!numero.startsWith("593")) {
        if (numero.startsWith("0")) {
          numero = "593" + numero.substring(1)
        } else if (numero.length === 9) {
          numero = "593" + numero
        }
      }

      const mensajeCodificado = encodeURIComponent(notif.mensaje)
      const urlWhatsApp = `https://wa.me/${numero}?text=${mensajeCodificado}`
      
      window.open(urlWhatsApp, "_blank")

      await apiRequest(API_ENDPOINTS.NOTIFICACION_MARK_ENVIADO(notif.id), {
        method: "POST",
      })

      await cargarDatos()

      return { success: true, message: "WhatsApp abierto" }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Error al abrir WhatsApp" }
    }
  }, [cargarDatos])

  return {
    notificaciones,
    clientes,
    estadisticas,
    loading,
    error,
    apiStatus,
    pagination: { page, pageSize, totalPages, totalItems },
    filters: { searchTerm, tipo: filterTipo, estado: filterEstado },
    setPage,
    setPageSize,
    setSearchTerm,
    setFilterTipo,
    setFilterEstado,
    cargarDatos,
    crearNotificacion,
    enviarMasiva,
    generarAutomaticas,
    limpiarNotificaciones,
    crearNotificacionCliente,
    copyToClipboard,
    sendWhatsApp,
  }
}
