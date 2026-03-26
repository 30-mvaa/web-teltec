"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import * as XLSX from "xlsx"
import { useRouter } from "next/navigation"
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
import { ArrowLeft, Plus, Edit, Trash2, RefreshCw, Search, User, Mail, Phone, MapPin, X, Download, Calendar, MessageSquare, Filter, TrendingUp, TrendingDown, Users, AlertCircle, CheckCircle, Upload, FileSpreadsheet, Check, AlertTriangle } from "lucide-react"
import { validarCedulaEcuatoriana, formatearCedula, validarMayorEdad, calcularEdad, obtenerFechaMinima, obtenerFechaMaxima, formatearFecha } from "@/lib/utils"
import { Switch } from '@/components/ui/switch'
import { apiRequest, API_ENDPOINTS } from "@/lib/config/api"
import { isAuthenticated } from "@/lib/config/api"
import { useToast } from "@/app/components/shared/Toast"

interface Cliente {
  id: number
  cedula: string
  nombres: string
  apellidos: string
  tipo_plan_actual?: string
  precio_plan_actual?: number
  fecha_nacimiento: string
  direccion: string
  sector_nombre?: string
  email: string
  telefono: string
  telegram_chat_id?: string
  estado: "activo" | "inactivo" | "suspendido"
  fecha_registro: string
  fecha_actualizacion: string
  fecha_ultimo_pago?: string | null
  meses_pendientes?: number
  monto_total_deuda?: number
  fecha_vencimiento_pago?: string | null
  estado_pago?: string
}

interface FormData {
  cedula: string
  nombres: string
  apellidos: string
  tipo_plan: string
  precio_plan: number
  fecha_nacimiento: string
  direccion: string
  sector: string
  email: string
  telefono: string
  telegram_chat_id: string
  estado: Cliente["estado"]
}

export default function ClientesPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Estados principales
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<Cliente["estado"] | "todos">("todos")
  const [filterSector, setFilterSector] = useState<string>("todos")
  
  // Estados del modal
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  
  // Estados de datos
  const [sectores, setSectores] = useState<{ id: number, nombre_sector: string }[]>([])
  const [planes, setPlanes] = useState<{ id: number, tipo_plan: string, precio: number }[]>([])
  
  // Estados de estadísticas
  const [estadisticas, setEstadisticas] = useState({
    total_clientes: 0,
    clientes_activos: 0,
    clientes_inactivos: 0,
    clientes_suspendidos: 0
  })
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Estados de validación
  const [cedulaError, setCedulaError] = useState<string | null>(null)
  const [cedulaValida, setCedulaValida] = useState(false)
  const [fechaError, setFechaError] = useState<string | null>(null)
  const [edadCalculada, setEdadCalculada] = useState<number | null>(null)
  
  // Estados de confirmación
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, cliente: Cliente | null }>({
    open: false,
    cliente: null
  })

  // Estados de importación masiva
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    success: number
    errors: { row: number; data: any; error: string; columnas?: string[] }[]
  } | null>(null)
  const [importSummary, setImportSummary] = useState<{
    total_procesados: number
    clientes_creados: number
    errores: number
    sectores_creados: number
    planes_creados: number
    nuevos_sectores: string[]
    nuevos_planes: { nombre: string; precio: number }[]
  } | null>(null)
  const [previewData, setPreviewData] = useState<string[][]>([])
  const [importingFile, setImportingFile] = useState<File | null>(null)
  
  // Estado del formulario
  const [formData, setFormData] = useState<FormData>({
    cedula: "",
    nombres: "",
    apellidos: "",
    tipo_plan: "",
    precio_plan: 0,
    fecha_nacimiento: "",
    direccion: "",
    sector: "",
    email: "",
    telefono: "",
    telegram_chat_id: "",
    estado: "activo",
  })

  // Verificar autenticación
  const checkAuth = () => {
    if (!isAuthenticated()) {
      router.push("/")
      return false
    }
    return true
  }

  // Cargar datos de clientes
  const loadData = useCallback(async (page = 1) => {
    if (!checkAuth()) return
    
    // Limpiar término de búsqueda de espacios en blanco
    const searchTermTrimmed = searchTerm.trim()
    
    // Si hay término de búsqueda, mostrar estado de búsqueda
    if (searchTermTrimmed) {
      setSearching(true)
      setLoading(false)
    } else {
      setLoading(true)
      setSearching(false)
    }
    
    setError(null)
    try {
      const params = new URLSearchParams()
      // Solo agregar search si hay un término válido (no vacío)
      if (searchTermTrimmed) {
        params.set("search", searchTermTrimmed)
      }
      if (filterEstado !== "todos") {
        params.set("estado", filterEstado)
      }
      if (filterSector !== "todos") {
        params.set("sector", filterSector)
      }
      
      // Parámetros de paginación
      params.set("page", page.toString())
      params.set("page_size", pageSize.toString())
      
      const url = `${API_ENDPOINTS.CLIENTES}?${params.toString()}`
      const json = await apiRequest(url)
      
      if (json.success && Array.isArray(json.data)) {
        console.log('loadData - received clientes:', json.data.length, 'page:', page, 'data:', json.data)
        setClientes(json.data)
        
        // Actualizar información de paginación
        if (json.pagination) {
          setCurrentPage(json.pagination.page)
          setTotalPages(json.pagination.total_pages)
          setTotalCount(json.pagination.total_count)
        } else {
          // Si no hay paginación, usar valores por defecto
          setCurrentPage(1)
          setTotalPages(1)
          setTotalCount(json.data.length)
        }
      } else {
        throw new Error(json.message || "Error cargando clientes")
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error en loadData:", e)
      }
      setError((e as Error).message || "Error cargando clientes")
      // En caso de error, limpiar los datos
      setClientes([])
      setTotalCount(0)
      setTotalPages(1)
      setCurrentPage(1)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }, [searchTerm, filterEstado, filterSector, pageSize])

  // Cargar estadísticas reales del backend
  const loadEstadisticas = useCallback(async () => {
    if (!checkAuth()) return
    
    try {
      const data = await apiRequest(API_ENDPOINTS.CLIENTES_ESTADISTICAS)
      
      if (data.success) {
        setEstadisticas(data.data)
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error cargando estadísticas:', err)
      }
    }
  }, [])

  // Cargar valores únicos (sectores y planes)
  const loadValoresUnicos = useCallback(async () => {
    if (!checkAuth()) return
    
    try {
      // console.log("Cargando valores únicos...")
      const data = await apiRequest(API_ENDPOINTS.CLIENTES_DATOS_SELECTS)
      
      if (data.success) {
        const sectoresData = data.data.sectores || []
        const planesData = data.data.planes || []
        
        // console.log("Sectores cargados:", sectoresData.length)
        // console.log("Planes cargados:", planesData.length)
        
        setSectores(sectoresData)
        setPlanes(planesData)
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error cargando valores únicos:', err)
      }
    }
  }, [])

  // Validar cédula en tiempo real
  const validarCedulaEnTiempoReal = (cedula: string) => {
    if (cedula.length === 0) {
      setCedulaError(null)
      setCedulaValida(false)
      return
    }

    if (cedula.length < 10) {
      setCedulaError("La cédula debe tener 10 dígitos")
      setCedulaValida(false)
      return
    }

    if (!/^\d+$/.test(cedula)) {
      setCedulaError("La cédula solo debe contener números")
      setCedulaValida(false)
      return
    }

    if (cedula.length === 10) {
      if (validarCedulaEcuatoriana(cedula)) {
        setCedulaError(null)
        setCedulaValida(true)
      } else {
        setCedulaError("Cédula ecuatoriana inválida")
        setCedulaValida(false)
      }
    } else {
      setCedulaError("La cédula debe tener exactamente 10 dígitos")
      setCedulaValida(false)
    }
  }

  // Validar fecha de nacimiento en tiempo real
  const validarFechaNacimientoEnTiempoReal = (fecha: string) => {
    if (!fecha) {
      setFechaError(null)
      setEdadCalculada(null)
      return
    }

    const fechaSeleccionada = new Date(fecha)
    const fechaMinima = new Date(obtenerFechaMinima())
    const fechaMaxima = new Date(obtenerFechaMaxima())

    if (fechaSeleccionada > fechaMinima) {
      setFechaError("El usuario debe ser mayor de 18 años")
      setEdadCalculada(null)
      return
    }

    if (fechaSeleccionada < fechaMaxima) {
      setFechaError("Fecha de nacimiento inválida")
      setEdadCalculada(null)
      return
    }

    const edad = calcularEdad(fecha)
    setEdadCalculada(edad)
    setFechaError(null)
  }

  // Abrir modal para nuevo cliente
  const openNew = useCallback(() => {
    setEditing(null)
    setFormData({
      cedula: "",
      nombres: "",
      apellidos: "",
      tipo_plan: "",
      precio_plan: 0,
      fecha_nacimiento: "",
      direccion: "",
      sector: "",
      email: "",
      telefono: "",
      telegram_chat_id: "",
      estado: "activo",
    })
    setCedulaError(null)
    setCedulaValida(false)
    setFechaError(null)
    setEdadCalculada(null)
    setIsDialogOpen(true)
  }, [])

  // Manejar cambio de plan
  const handlePlanChange = (planId: string) => {
    const planSeleccionado = planes.find(p => p.id.toString() === planId)
    setFormData(prev => ({
      ...prev,
      tipo_plan: planId,
      precio_plan: planSeleccionado?.precio || 0
    }))
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkAuth()) return

    // Log para debug de validaciones
    // console.log("Validando formulario:", {
    //   cedulaValida,
    //   fechaError,
    //   nombres: formData.nombres.trim(),
    //   apellidos: formData.apellidos.trim(),
    //   tipo_plan: formData.tipo_plan,
    //   sector: formData.sector,
    //   email: formData.email.trim(),
    //   telefono: formData.telefono.trim(),
    //   fecha_nacimiento: formData.fecha_nacimiento,
    //   direccion: formData.direccion.trim()
    // })

    // Validaciones del frontend
    const errores: string[] = []
    
    if (!cedulaValida) {
      errores.push("Por favor, ingrese una cédula válida")
    }
    
    if (fechaError) {
      errores.push("Por favor, corrija la fecha de nacimiento")
    }
    
    if (!formData.nombres.trim()) {
      errores.push("Los nombres son obligatorios")
    }
    
    if (!formData.apellidos.trim()) {
      errores.push("Los apellidos son obligatorios")
    }
    
    if (!formData.tipo_plan) {
      errores.push("Debe seleccionar un plan")
    }
    
    if (!formData.sector) {
      errores.push("Debe seleccionar un sector")
    }
    
    if (!formData.email.trim()) {
      errores.push("El email es obligatorio")
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errores.push("El formato del email es inválido")
    }
    
    if (!formData.telefono.trim()) {
      errores.push("El teléfono es obligatorio")
    }
    
    if (!formData.fecha_nacimiento) {
      errores.push("La fecha de nacimiento es obligatoria")
    }
    
    if (!formData.direccion.trim()) {
      errores.push("La dirección es obligatoria")
    }
    
    // Si hay errores de validación, mostrarlos todos
    if (errores.length > 0) {
      toast(`Por favor, corrija los siguientes errores:\n${errores.join('\n')}`, "error")
      return
    }

    try {
      const url = editing 
        ? `${API_ENDPOINTS.CLIENTES}${editing.id}/` 
        : API_ENDPOINTS.CLIENTES
      
      const method = editing ? 'PUT' : 'POST'
      
      // Asegurar que la fecha de nacimiento esté presente
      const fechaNacimiento = formData.fecha_nacimiento
      
      // Validar que la fecha esté presente antes de enviar
      if (!fechaNacimiento) {
        toast("La fecha de nacimiento es requerida", "error")
        return
      }
      
      // Preparar datos para el backend normalizado
      const datosBackend = {
        cedula: formData.cedula,
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        fecha_nacimiento: fechaNacimiento,
        direccion: formData.direccion,
        id_sector: formData.sector ? parseInt(formData.sector) : null,
        email: formData.email,
        telefono: formData.telefono,
        telegram_chat_id: null,
        estado: formData.estado,
        plan_id: formData.tipo_plan ? parseInt(formData.tipo_plan) : null
      }
      
      // Log para debug
      // console.log("Datos del formulario:", formData)
      // console.log("Datos enviados al backend:", datosBackend)
      // console.log("URL:", url)
      // console.log("Método:", method)
      
      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(datosBackend)
      })

      if (response.success) {
        toast(editing ? "Cliente actualizado exitosamente" : "Cliente creado exitosamente", "success")
        
        // Cerrar modal
        setIsDialogOpen(false)
        loadData(1)
        loadEstadisticas()
      } else {
        // Mostrar error
        let errorMessage = "Error al guardar cliente"
        
        if (response.message) {
          errorMessage = response.message
        } else if (response.error_details) {
          errorMessage = response.error_details
        }
        
        if (response.errors) {
          const errorDetails = Object.entries(response.errors)
            .map(([field, messages]) => {
              const fieldNames: { [key: string]: string } = {
                'cedula': 'Cédula',
                'nombres': 'Nombres',
                'apellidos': 'Apellidos',
                'fecha_nacimiento': 'Fecha de nacimiento',
                'direccion': 'Dirección',
                'email': 'Email',
                'telefono': 'Teléfono',
                'id_sector': 'Sector',
                'plan_id': 'Plan'
              }
              
              const fieldName = fieldNames[field] || field
              const message = Array.isArray(messages) ? messages.join(', ') : messages
              
              return `${fieldName}: ${message}`
            })
            .join('\n')
          errorMessage = `Errores de validación:\n${errorDetails}`
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.error("Error completo del backend:", response)
        }
        
        toast(errorMessage, "error")
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error en handleSubmit:", e)
      }
      
      let errorMessage = "Error al guardar cliente"
      
      if (e instanceof Error) {
        errorMessage = e.message
      } else if (typeof e === 'object' && e !== null && 'message' in e) {
        errorMessage = String((e as any).message)
      }
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        errorMessage = "Error de conexión con el servidor."
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorMessage = "Tiempo de espera agotado."
      }
      
      toast(errorMessage, "error")
    }
  }

  // Abrir modal de edición
  const handleEdit = useCallback((c: Cliente) => {
    console.log("handleEdit - Cliente recibido:", c)
    console.log("handleEdit - fecha_nacimiento:", c.fecha_nacimiento)
    console.log("handleEdit - direccion:", c.direccion)
    setEditing(c)
    
    // Necesitamos obtener el ID del sector y plan, no solo el nombre
    // Para esto, vamos a buscar en los arrays de sectores y planes
    const sectorId = sectores.find(s => s.nombre_sector === c.sector_nombre)?.id?.toString() || ""
    const planId = planes.find(p => p.tipo_plan === c.tipo_plan_actual)?.id?.toString() || ""
    
    // console.log("Sector encontrado:", { nombre: c.sector_nombre, id: sectorId })
    // console.log("Plan encontrado:", { tipo: c.tipo_plan_actual, id: planId })
    
    const formDataToSet = {
      cedula: c.cedula,
      nombres: c.nombres,
      apellidos: c.apellidos,
      tipo_plan: planId,
      precio_plan: c.precio_plan_actual || 0,
      fecha_nacimiento: c.fecha_nacimiento,
      direccion: c.direccion,
      sector: sectorId,
      email: c.email,
      telefono: c.telefono,
      telegram_chat_id: c.telegram_chat_id || "",
      estado: c.estado,
    }
    
    console.log("handleEdit - formDataToSet:", formDataToSet)
    console.log("handleEdit - fecha_nacimiento en formDataToSet:", formDataToSet.fecha_nacimiento)
    console.log("handleEdit - direccion en formDataToSet:", formDataToSet.direccion)
    
    setFormData(formDataToSet)
    setCedulaError(null)
    setCedulaValida(true)
    setFechaError(null)
    setEdadCalculada(calcularEdad(c.fecha_nacimiento))
    
    // Validar la fecha de nacimiento después de establecer el formData usando requestAnimationFrame
    requestAnimationFrame(() => {
      validarFechaNacimientoEnTiempoReal(c.fecha_nacimiento)
    })
    
    setIsDialogOpen(true)
  }, [sectores, planes])

  // Abrir diálogo de confirmación de eliminación
  const handleDeleteClick = useCallback((cliente: Cliente) => {
    setDeleteDialog({ open: true, cliente })
  }, [])

  // Confirmar eliminación
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.cliente) return
    
    try {
      const response = await apiRequest(`${API_ENDPOINTS.CLIENTES}${deleteDialog.cliente.id}/`, {
        method: 'DELETE'
      })

      if (response.success) {
        toast("Cliente eliminado exitosamente", "success")
        
        // Recargar datos manteniendo los filtros actuales y la página
        const currentPageAfterDelete = clientes.length === 1 && currentPage > 1 
          ? currentPage - 1 
          : currentPage
        
        setCurrentPage(currentPageAfterDelete)
        loadData(currentPageAfterDelete)
        loadEstadisticas()
      } else {
        toast(response.message || "Error al eliminar cliente", "error")
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error en handleDelete:", e)
      }
      toast((e as Error).message || "Error al eliminar cliente", "error")
    } finally {
      setDeleteDialog({ open: false, cliente: null })
    }
  }, [deleteDialog.cliente, clientes.length, currentPage, loadData, loadEstadisticas, toast])

  // Función auxiliar para parsear CSV
  const parseCSV = (text: string) => {
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedText.split('\n').filter(line => line.trim())
    console.log('CSV lines:', lines.length, 'First line:', lines[0]?.substring(0, 50))
    if (lines.length < 2) return null
    
    const rows = lines.map(line => {
      const cells: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          cells.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      cells.push(current.trim())
      return cells
    })
    
    console.log('CSV parsed, rows:', rows.length, 'cols:', rows[0]?.length)
    return { rows, separator: ',' }
  }

  const parseExcel = (arrayBuffer: ArrayBuffer): { rows: string[][]; separator: string } | null => {
    try {
      console.log('Parsing Excel, buffer size:', arrayBuffer.byteLength, 'XLSX available:', typeof XLSX)
      if (!XLSX || !XLSX.read) {
        console.error('XLSX not loaded')
        return null
      }
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
      console.log('Workbook sheets:', workbook.SheetNames)
      if (workbook.SheetNames.length === 0) {
        console.error('No sheets in workbook')
        return null
      }
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]
      console.log('Excel rows:', jsonData?.length)
      
      if (!jsonData || jsonData.length < 2) return null
      
      const rows = jsonData.map(row => {
        const arr = row as any[]
        return arr.map(cell => {
          if (cell === null || cell === undefined) return ''
          if (typeof cell === 'object' && cell instanceof Date) {
            return cell.toISOString().split('T')[0]
          }
          return String(cell)
        })
      })
      console.log('Parsed rows:', rows.length, 'Headers:', rows[0])
      return { rows, separator: 'excel' }
    } catch (error) {
      console.error('Error parsing Excel:', error)
      return null
    }
  }

  const isExcelFile = (filename: string): boolean => {
    return filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')
  }

  // Manejar carga de archivo CSV/Excel
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isExcel = isExcelFile(file.name)
    
    if (!file.name.endsWith('.csv') && !isExcel) {
      toast("Solo se permiten archivos CSV o Excel (.xlsx)", "error")
      setImportingFile(null)
      setPreviewData([])
      return
    }

    setImportingFile(file)
    setImportResults(null)
    setImportSummary(null)
    setPreviewData([])

    if (isExcel) {
      const reader = new FileReader()
      reader.onload = (event) => {
        console.log('Excel file read complete, result type:', typeof event.target?.result)
        const arrayBuffer = event.target?.result as ArrayBuffer
        if (!arrayBuffer) {
          toast("No se pudo leer el archivo", "error")
          return
        }
        
        console.log('Buffer size:', arrayBuffer.byteLength)
        const parsed = parseExcel(arrayBuffer)
        if (!parsed) {
          toast("El archivo está vacío o no tiene datos", "error")
          setImportingFile(null)
          return
        }

        const { rows } = parsed
        
        const headers = rows[0].map(h => String(h).toLowerCase().replace(/[_\s]/g, ''))
        const requiredHeaders = ['cedula', 'nombres', 'apellidos', 'email', 'telefono']
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
        
        if (missingHeaders.length > 0) {
          toast(`Faltan columnas: ${missingHeaders.join(', ')}`, "error")
          setPreviewData([])
          return
        }

        setPreviewData(rows.slice(0, 6))
        toast(`${rows.length - 1} registros (Excel)`, "success")
      }
      reader.onerror = (e) => {
        console.error('FileReader error:', e)
        toast("Error al leer el archivo: " + (e.target as any)?.error?.message || "Error desconocido", "error")
        setImportingFile(null)
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        if (!text) {
          toast("No se pudo leer el archivo", "error")
          return
        }
        
        const parsed = parseCSV(text)
        if (!parsed) {
          toast("El archivo está vacío o no tiene datos", "error")
          setImportingFile(null)
          return
        }

        const { rows, separator } = parsed

        const headers = rows[0].map(h => h.toLowerCase().replace(/[_\s]/g, ''))
        const requiredHeaders = ['cedula', 'nombres', 'apellidos', 'email', 'telefono']
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
        
        console.log('Preview - Separator:', separator, 'Headers:', headers)
        
        if (missingHeaders.length > 0) {
          toast(`Faltan columnas: ${missingHeaders.join(', ')}. Separador: ${separator}`, "error")
          setPreviewData([])
          return
        }

        setPreviewData(rows.slice(0, 6))
        toast(`${rows.length - 1} regs - Separador: ${separator === ';' ? ';' : ','}`, "success")
      }
      reader.onerror = () => {
        toast("Error al leer el archivo", "error")
        setImportingFile(null)
      }
      reader.readAsText(file)
    }
  }, [toast])

  // Descargar plantilla
  const handleDownloadTemplate = useCallback(() => {
    const headers = ['cedula', 'nombres', 'apellidos', 'email', 'telefono', 'direccion', 'sector', 'plan', 'precio', 'fechanacimiento', 'estado']
    const exampleRows = [
      ['1234567890', 'Juan', 'Pérez', 'juan@email.com', '0987654321', 'Av. Principal 123', 'Centro', 'Básico', '25.00', '1990-01-15', 'activo'],
      ['1712345678', 'María', 'García', 'maria@email.com', '0991234567', 'Calle 2 #3-45', 'Norte', 'Premium', '45.00', '1985-06-20', 'activo'],
    ]
    
    const sectoresDisponibles = sectores.map(s => s.nombre_sector).join(', ')
    const planesDisponibles = planes.map(p => `${p.tipo_plan} ($${p.precio})`).join(', ')
    
    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.join(',')),
      '',
      `# Columnas requeridas: cedula, nombres, apellidos, email, telefono`,
      `# Columnas opcionales: direccion, sector, plan, precio, fechanacimiento, estado`,
      `# Sector y Plan se crean automaticamente si no existen`,
      `# Sectores disponibles: ${sectoresDisponibles || 'Ninguno'}`,  
      `# Planes disponibles: ${planesDisponibles || 'Ninguno'}`
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla_clientes.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [sectores, planes])

  // Ejecutar importación
  const handleExecuteImport = useCallback(async () => {
    if (!importingFile) {
      toast("Seleccione un archivo primero", "error")
      return
    }

    setImporting(true)
    setImportResults(null)
    setImportSummary(null)

    try {
      const isExcel = isExcelFile(importingFile.name)
      let rows: string[][]
      
      if (isExcel) {
        const arrayBuffer = await importingFile.arrayBuffer()
        const parsed = parseExcel(arrayBuffer)
        if (!parsed) {
          toast("El archivo está vacío o no tiene datos", "error")
          setImporting(false)
          return
        }
        rows = parsed.rows
      } else {
        const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject(new Error("Error reading file"))
        reader.readAsText(importingFile)
      })
        const parsed = parseCSV(text)
        if (!parsed) {
          toast("El archivo está vacío o no tiene datos", "error")
          setImporting(false)
          return
        }
        rows = parsed.rows
      }
      
      console.log('Rows count:', rows.length, 'Headers:', rows[0])
      const headers = rows[0].map(h => String(h).toLowerCase().replace(/[_\s]/g, ''))
      const dataRows = rows.slice(1)

      const requiredHeaders = ['cedula', 'nombres', 'apellidos', 'email', 'telefono']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        const mensajeError = `Columnas faltantes: ${missingHeaders.join(', ')}. Verifica que el archivo tenga el formato correcto.`
        setImportResults({ 
          success: 0, 
          errors: [{ 
            row: 1, 
            data: rows[0], 
            error: mensajeError,
            columnas: missingHeaders
          }] 
        })
        setImporting(false)
        return
      }

      const getColumnIndex = (name: string) => {
        const idx = headers.indexOf(name)
        if (idx === -1) {
          const variations = [name, name.replace('_', ''), name.replace(' ', '')]
          for (const v of variations) {
            const found = headers.findIndex(h => h.includes(v) || v.includes(h))
            if (found !== -1) return found
          }
        }
        return idx
      }
      const getValue = (row: string[], name: string) => {
        const idx = getColumnIndex(name)
        return idx >= 0 && idx < row.length ? row[idx] || '' : ''
      }

      const clientesData: any[] = []
      const errors: { row: number; data: any; error: string; columnas?: string[] }[] = []

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        const rowNumber = i + 2

        const cedula = getValue(row, 'cedula')
        const email = getValue(row, 'email')
        const nombres = getValue(row, 'nombres')
        const apellidos = getValue(row, 'apellidos')
        const telefono = getValue(row, 'telefono')
        
        const missingFields: string[] = []
        
        if (!cedula.trim()) missingFields.push('cédula')
        if (!email.trim()) missingFields.push('email')
        if (!nombres.trim()) missingFields.push('nombres')
        if (!apellidos.trim()) missingFields.push('apellidos')
        if (!telefono.trim()) missingFields.push('teléfono')

        if (missingFields.length > 0) {
          errors.push({
            row: rowNumber,
            data: row,
            error: `Campos faltantes: ${missingFields.join(', ')}`,
            columnas: missingFields
          })
          continue
        }

        if (!validarCedulaEcuatoriana(cedula)) {
          errors.push({
            row: rowNumber,
            data: row,
            error: `Cédula inválida: "${cedula}" (debe tener 10 dígitos y ser ecuatoriana válida)`,
            columnas: ['cédula']
          })
          continue
        }

        if (!email.includes('@') || !email.includes('.')) {
          errors.push({
            row: rowNumber,
            data: row,
            error: `Email inválido: "${email}"`,
            columnas: ['email']
          })
          continue
        }

        const sectorNombre = getValue(row, 'sector').trim()
        const planTipo = getValue(row, 'plan').trim()
        const planPrecio = getValue(row, 'precio').trim()
        const fechanacimiento = getValue(row, 'fechanacimiento').trim()
        
        clientesData.push({
          cedula,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          email: email.trim().toLowerCase(),
          telefono: telefono.replace(/\D/g, ''),
          direccion: getValue(row, 'direccion').trim() || 'Sin dirección',
          sector: sectorNombre,
          plan: planTipo,
          precio: planPrecio || '25.00',
          fecha_nacimiento: fechanacimiento || '1990-01-01',
          estado: getValue(row, 'estado').trim().toLowerCase() || 'activo',
        })
      }

      if (clientesData.length === 0) {
        setImportResults({ success: 0, errors })
        setImporting(false)
        return
      }

      const response = await apiRequest(API_ENDPOINTS.CLIENTES_BULK_IMPORT, {
        method: 'POST',
        body: JSON.stringify({ clientes: clientesData }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.success || response.created?.length > 0) {
        const successCount = response.resumen?.clientes_creados || response.created?.length || clientesData.length - errors.length
        setImportResults({
          success: successCount,
          errors: [...errors, ...(response.errors || [])]
        })
        setImportSummary(response.resumen || {
          total_procesados: clientesData.length,
          clientes_creados: successCount,
          errores: errors.length + (response.errors?.length || 0),
          sectores_creados: 0,
          planes_creados: 0,
          nuevos_sectores: [],
          nuevos_planes: []
        })
        toast(`Se importaron ${successCount} clientes exitosamente`, "success")
        
        if (errors.length > 0 || response.errors?.length > 0) {
          toast(`${errors.length + (response.errors?.length || 0)} registros tuvieron errores`, "error")
        }

        loadData(1)
        loadEstadisticas()
        loadValoresUnicos()
      } else {
        toast(response.message || "Error al importar clientes", "error")
        if (response.errors) {
          setImportResults({
            success: 0,
            errors: response.errors
          })
        }
      }
    } catch (e) {
      toast((e as Error).message || "Error al procesar el archivo", "error")
    } finally {
      setImporting(false)
    }
  }, [importingFile, sectores, planes, loadData, loadEstadisticas, toast])

  // Cerrar modal de importación y limpiar estados
  const handleCloseImportModal = useCallback(() => {
    setImportModalOpen(false)
    setImportingFile(null)
    setPreviewData([])
    setImportResults(null)
    setImportSummary(null)
  }, [])

  // Calcular estadísticas usando datos reales del backend
  const getStats = useMemo(() => {
    const total = estadisticas.total_clientes
    const activos = estadisticas.clientes_activos
    const suspendidos = estadisticas.clientes_suspendidos
    const inactivos = estadisticas.clientes_inactivos

    return {
      total,
      activos,
      suspendidos,
      inactivos,
      porcentajeActivos: total > 0 ? Math.round((activos / total) * 100) : 0,
      porcentajeSuspendidos: total > 0 ? Math.round((suspendidos / total) * 100) : 0,
      porcentajeInactivos: total > 0 ? Math.round((inactivos / total) * 100) : 0
    }
  }, [estadisticas])

  // Refrescar datos
  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setSearchTerm("")
    setFilterEstado("todos")
    setFilterSector("todos")
    setCurrentPage(1)
    loadData(1)
    loadValoresUnicos()
    loadEstadisticas()
    setTimeout(() => {
      setRefreshing(false)
      toast("Datos actualizados correctamente", "success")
    }, 500)
  }, [loadData, loadValoresUnicos, loadEstadisticas, toast])

  // Limpiar filtros
  const handleLimpiarFiltros = useCallback(() => {
    setSearchTerm("")
    setFilterEstado("todos")
    setFilterSector("todos")
    setCurrentPage(1)
    loadData(1)
  }, [loadData])

  // Contactar por WhatsApp
  const handleContactarWhatsApp = (cliente: Cliente) => {
    if (!cliente.telefono) {
      toast("El cliente no tiene número de teléfono registrado", "error")
      return
    }
    const telefonoLimpio = cliente.telefono.replace(/\D/g, '')
    const mensaje = `Hola ${cliente.nombres}, desde TelTec nos comunicamos con usted.`
    window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  // Contactar por Email
  const handleContactarEmail = (cliente: Cliente) => {
    if (!cliente.email) {
      toast("El cliente no tiene email registrado", "error")
      return
    }
    const asunto = "Comunicación desde TelTec"
    const mensaje = `Estimado/a ${cliente.nombres} ${cliente.apellidos},\n\n`
    window.location.href = `mailto:${cliente.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`
  }

  // Función para exportar clientes a CSV
  const handleExport = useCallback(async () => {
    try {
      // Obtener todos los clientes del backend sin paginación
      // Aplicar los mismos filtros que el usuario tiene seleccionados
      const params = new URLSearchParams()
      if (searchTerm) params.set("search", searchTerm)
      if (filterEstado !== "todos") params.set("estado", filterEstado)
      
      // Solicitar todos los clientes sin paginación (usar un page_size muy grande)
      params.set("page", "1")
      params.set("page_size", "10000") // Número grande para obtener todos
      
      const apiUrl = `${API_ENDPOINTS.CLIENTES}?${params.toString()}`
      const json = await apiRequest(apiUrl)
      
      if (!json.success || !Array.isArray(json.data)) {
        toast('Error al obtener los clientes para exportar', 'error');
        return;
      }

      const todosLosClientes = json.data;

      if (todosLosClientes.length === 0) {
        toast('No hay clientes para exportar', 'error');
        return;
      }

      // Preparar datos para CSV
      const headers = [
        'ID',
        'Cédula',
        'Nombres',
        'Apellidos',
        'Plan',
        'Precio Plan',
        'Fecha de Nacimiento',
        'Dirección',
        'Sector',
        'Email',
        'Teléfono',
        'Estado',
        'Fecha Registro',
        'Fecha Actualización',
        'Último Pago',
        'Meses Pendientes',
        'Monto Total Deuda',
        'Fecha Vencimiento',
        'Estado Pago'
      ];

      const rows = todosLosClientes.map((cliente: Cliente) => {
        const fechaNacimiento = cliente.fecha_nacimiento ? new Date(cliente.fecha_nacimiento).toLocaleDateString('es-ES') : 'N/A';
        const fechaRegistro = formatearFecha(cliente.fecha_registro);
        const fechaActualizacion = formatearFecha(cliente.fecha_actualizacion);
        const ultimoPago = cliente.fecha_ultimo_pago ? formatearFecha(cliente.fecha_ultimo_pago) : 'N/A';
        const fechaVencimiento = cliente.fecha_vencimiento_pago ? formatearFecha(cliente.fecha_vencimiento_pago) : 'N/A';
        
        return [
          cliente.id.toString(),
          cliente.cedula || '',
          cliente.nombres || '',
          cliente.apellidos || '',
          cliente.tipo_plan_actual || 'Sin plan',
          cliente.precio_plan_actual ? `$${cliente.precio_plan_actual.toFixed(2)}` : '$0.00',
          fechaNacimiento,
          cliente.direccion || '',
          cliente.sector_nombre || 'Sin sector',
          cliente.email || '',
          cliente.telefono || '',
          cliente.estado || '',
          fechaRegistro,
          fechaActualizacion,
          ultimoPago,
          cliente.meses_pendientes?.toString() || '0',
          cliente.monto_total_deuda ? `$${cliente.monto_total_deuda.toFixed(2)}` : '$0.00',
          fechaVencimiento,
          cliente.estado_pago || 'N/A'
        ];
      });

      // Crear contenido CSV
      const csvContent = [
        headers.join(','),
        ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
      ].join('\n');

      // Crear y descargar archivo
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const downloadUrl = URL.createObjectURL(blob);
      link.setAttribute('href', downloadUrl);
      link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      // Usar requestAnimationFrame para evitar bloqueo del hilo principal
      requestAnimationFrame(() => {
        toast(`Se exportaron ${todosLosClientes.length} clientes exitosamente.`, 'success');
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al exportar clientes:', error);
      }
      requestAnimationFrame(() => {
        toast('Error al exportar los clientes. Por favor, intenta de nuevo.', 'error');
      })
    }
  }, [searchTerm, filterEstado])
  
  // Cambiar página
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    requestAnimationFrame(() => {
      loadData(page)
    })
  }, [loadData])
  
  // Cambiar tamaño de página
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
    requestAnimationFrame(() => {
      loadData(1)
    })
  }, [loadData])

  // Cargar datos iniciales
  useEffect(() => {
    if (checkAuth()) {
      loadData(1)
      loadEstadisticas()
      loadValoresUnicos()
    }
  }, [loadData, loadEstadisticas, loadValoresUnicos])

  // Búsqueda con debounce
  useEffect(() => {
    // Si el término de búsqueda está vacío, recargar inmediatamente
    if (searchTerm.trim() === "") {
      if (checkAuth()) {
        setCurrentPage(1)
        loadData(1)
      }
      return
    }
    
    // Si hay término de búsqueda, esperar 300ms después de que el usuario deje de escribir
    const timeoutId = setTimeout(() => {
      if (checkAuth()) {
        setCurrentPage(1)
        loadData(1)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filterEstado, loadData])

  if (loading) return <div className="p-6 text-center">Cargando clientes...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
              <p className="text-gray-600">Administra los clientes del sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setImportModalOpen(true)} variant="outline" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              Importar
            </Button>
            <Button onClick={openNew} className="flex items-center space-x-2 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium">Total Clientes</p>
                <p className="text-2xl font-bold">{getStats.total}</p>
                <p className="text-blue-200 text-xs">{getStats.total > 0 ? 'Registros' : 'Sin clientes'}</p>
              </div>
              <div className="p-2 bg-blue-400/20 rounded-full">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs font-medium">Activos</p>
                <p className="text-2xl font-bold">{getStats.activos}</p>
                <p className="text-green-200 text-xs">{getStats.porcentajeActivos}% del total</p>
              </div>
              <div className="p-2 bg-green-400/20 rounded-full">
                <CheckCircle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-xs font-medium">Suspendidos</p>
                <p className="text-2xl font-bold">{getStats.suspendidos}</p>
                <p className="text-yellow-200 text-xs">{getStats.porcentajeSuspendidos}% del total</p>
              </div>
              <div className="p-2 bg-yellow-400/20 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs font-medium">Inactivos</p>
                <p className="text-2xl font-bold">{getStats.inactivos}</p>
                <p className="text-red-200 text-xs">{getStats.porcentajeInactivos}% del total</p>
              </div>
              <div className="p-2 bg-red-400/20 rounded-full">
                <TrendingDown className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y búsqueda */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-end">
              {/* Estado */}
              <div className="w-full md:w-40">
                <Label className="text-xs font-medium text-gray-500">Estado</Label>
                <Select value={filterEstado} onValueChange={(value: any) => {
                  setFilterEstado(value)
                  setCurrentPage(1)
                  loadData(1)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sector */}
              <div className="w-full md:w-48">
                <Label className="text-xs font-medium text-gray-500">Sector</Label>
                <Select value={filterSector} onValueChange={(value) => {
                  setFilterSector(value)
                  setCurrentPage(1)
                  loadData(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los sectores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los sectores</SelectItem>
                    {sectores.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id.toString()}>
                        {sector.nombre_sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Buscar */}
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs font-medium text-gray-500">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Nombre, cédula, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setCurrentPage(1)
                        loadData(1)
                      }
                    }}
                    className="pl-10"
                    disabled={searching}
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {searchTerm && !searching && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("")
                        setCurrentPage(1)
                        loadData(1)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <Button onClick={handleRefresh} variant="outline" disabled={refreshing} className="gap-1">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Actualizando...' : 'Actualizar'}
                </Button>
                <Button onClick={handleLimpiarFiltros} variant="outline" className="gap-1">
                  <Filter className="h-4 w-4" />
                  Limpiar
                </Button>
                <Button onClick={handleExport} variant="outline" className="gap-1">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>

            {/* Filtros activos */}
            {(filterEstado !== 'todos' || filterSector !== 'todos' || searchTerm) && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-gray-500">Filtros activos:</span>
                {filterEstado !== 'todos' && (
                  <Badge variant="secondary" className="text-xs">
                    Estado: {filterEstado}
                    <button onClick={() => { setFilterEstado('todos'); loadData(1) }} className="ml-1 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterSector !== 'todos' && (
                  <Badge variant="secondary" className="text-xs">
                    Sector: {sectores.find(s => s.id.toString() === filterSector)?.nombre_sector || filterSector}
                    <button onClick={() => { setFilterSector('todos'); loadData(1) }} className="ml-1 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Búsqueda: "{searchTerm}"
                    <button onClick={() => { setSearchTerm(""); loadData(1) }} className="ml-1 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabla de clientes */}
        <Card>
          <CardHeader>
            <CardTitle>
              Clientes ({totalCount > 0 ? totalCount : clientes.length})
              {searchTerm && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - Resultados para "{searchTerm}"
                </span>
              )}
              {filterEstado !== "todos" && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - Filtrado por estado: {filterEstado}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{cliente.nombres} {cliente.apellidos}</p>
                            <p className="text-sm text-gray-500">
                              Registrado: {formatearFecha(cliente.fecha_registro)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {formatearCedula(cliente.cedula)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cliente.tipo_plan_actual || 'Sin plan'}</p>
                          <p className="text-sm text-gray-500">
                            {cliente.precio_plan_actual ? `$${cliente.precio_plan_actual}` : 'Sin precio'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{cliente.email || '-'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{cliente.telefono || '-'}</span>
                          </div>
                          {/* Botones de contacto rápido */}
                          <div className="flex gap-1 mt-1">
                            {cliente.telefono && (
                              <button
                                onClick={() => handleContactarWhatsApp(cliente)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Contactar por WhatsApp"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                            )}
                            {cliente.email && (
                              <button
                                onClick={() => handleContactarEmail(cliente)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Contactar por Email"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{cliente.sector_nombre || 'Sin sector'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            cliente.estado === 'activo' ? 'default' : 
                            cliente.estado === 'inactivo' ? 'secondary' : 'destructive'
                          }
                        >
                          {cliente.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(cliente)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(cliente)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Controles de paginación */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showPageSizeSelector={true}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de formulario */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Modifica la información del cliente seleccionado." : "Completa el formulario para registrar un nuevo cliente en el sistema."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cédula */}
              <div>
                <Label htmlFor="cedula">Cédula *</Label>
                <Input
                  id="cedula"
                  value={formData.cedula}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setFormData(prev => ({ ...prev, cedula: value }))
                    validarCedulaEnTiempoReal(value)
                  }}
                  placeholder="1234567890"
                  maxLength={10}
                />
                {cedulaError && (
                  <p className="text-sm text-red-600 mt-1">{cedulaError}</p>
                )}
                {cedulaValida && (
                  <p className="text-sm text-green-600 mt-1">✓ Cédula válida</p>
                )}
              </div>

              {/* Nombres */}
              <div>
                <Label htmlFor="nombres">Nombres *</Label>
                <Input
                  id="nombres"
                  value={formData.nombres}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombres: e.target.value }))}
                  placeholder="Juan Carlos"
                />
              </div>

              {/* Apellidos */}
              <div>
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  value={formData.apellidos}
                  onChange={(e) => setFormData(prev => ({ ...prev, apellidos: e.target.value }))}
                  placeholder="Pérez González"
                />
              </div>

              {/* Fecha de nacimiento */}
              <div>
                <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={formData.fecha_nacimiento}
                  placeholder="Seleccione fecha"
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, fecha_nacimiento: e.target.value }))
                    if (e.target.value) {
                      validarFechaNacimientoEnTiempoReal(e.target.value)
                    }
                  }}
                  max={formatearFecha(obtenerFechaMaxima())}
                  min={formatearFecha(obtenerFechaMinima())}
                />
                {fechaError && (
                  <p className="text-sm text-red-600 mt-1">{fechaError}</p>
                )}
                {edadCalculada && (
                  <p className="text-sm text-green-600 mt-1">✓ Edad: {edadCalculada} años</p>
                )}
              </div>

              {/* Plan */}
              <div>
                <Label htmlFor="tipo_plan">Plan *</Label>
                <Select value={formData.tipo_plan} onValueChange={handlePlanChange}>
                  <SelectTrigger id="tipo_plan">
                    <SelectValue placeholder="Seleccione un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {planes.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.tipo_plan} - ${plan.precio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Precio del plan */}
              <div>
                <Label htmlFor="precio_plan">Precio del Plan</Label>
                <Input
                  id="precio_plan"
                  type="number"
                  value={formData.precio_plan}
                  onChange={(e) => setFormData(prev => ({ ...prev, precio_plan: Number(e.target.value) }))}
                  placeholder="0.00"
                  step="0.01"
                  readOnly
                />
              </div>

              {/* Sector */}
              <div>
                <Label htmlFor="sector">Sector *</Label>
                <Select value={formData.sector} onValueChange={(value) => setFormData(prev => ({ ...prev, sector: value }))}>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Seleccione un sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectores.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id.toString()}>
                        {sector.nombre_sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>

              {/* Teléfono */}
              <div>
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value.replace(/\D/g, '') }))}
                  placeholder="0987654321"
                  maxLength={10}
                />
              </div>

              {/* Dirección */}
              <div className="md:col-span-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                  placeholder="Av. Principal 123"
                />
              </div>

              {/* Estado */}
              <div>
                <Label htmlFor="estado_modal">Estado</Label>
                <Select value={formData.estado} onValueChange={(value: any) => setFormData(prev => ({ ...prev, estado: value }))}>
                  <SelectTrigger id="estado_modal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editing ? "Actualizar" : "Crear"} Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, cliente: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro que desea eliminar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al cliente{" "}
              <strong>{deleteDialog.cliente?.nombres} {deleteDialog.cliente?.apellidos}</strong>{" "}
              de la base de datos. Esta acción no se puede deshacer y también se eliminarán todos los registros relacionados 
              (planes, pagos, notificaciones, deudas).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de importación masiva */}
      <Dialog open={importModalOpen} onOpenChange={handleCloseImportModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Clientes Masivamente
            </DialogTitle>
            <DialogDescription>
              Carga un archivo CSV o Excel con los datos de los clientes. 
              El archivo debe contener las columnas: cédula, nombres, apellidos, email, teléfono.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Descargar plantilla */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">¿No tienes el formato?</p>
                  <p className="text-sm text-blue-700">Descarga la plantilla con los sectores y planes disponibles</p>
                </div>
              </div>
              <Button onClick={handleDownloadTemplate} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </Button>
            </div>

            {/* Sectores y Planes disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Sectores Disponibles
                </p>
                {sectores.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {sectores.map((s) => (
                      <Badge key={s.id} variant="outline" className="text-xs">
                        {s.nombre_sector}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay sectores configurados</p>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Planes Disponibles
                </p>
                {planes.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {planes.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-xs">
                        {p.tipo_plan} (${p.precio})
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay planes configurados</p>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Si el sector o plan no existe en el sistema, se creará automáticamente durante la importación.
            </p>

            {/* Upload area */}
            <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${importingFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              
              {importingFile ? (
                <div className="space-y-4">
                  <FileSpreadsheet className="h-12 w-12 text-green-600 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-green-800">{importingFile.name}</p>
                    <p className="text-sm text-green-600">{(importingFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <label htmlFor="file-upload" className="cursor-pointer inline-block">
                    <span className="text-blue-600 hover:text-blue-800 underline text-sm">
                      Cambiar archivo
                    </span>
                  </label>
                </div>
              ) : (
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700">
                    Arrastra un archivo o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Formato aceptado: CSV (solo UTF-8)
                  </p>
                </label>
              )}
            </div>

            {/* Preview data */}
            {previewData.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Vista previa (primeras 5 filas)</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData[0].map((header, idx) => (
                          <TableHead key={idx} className="bg-gray-50">{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(1).map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <TableCell key={cellIdx}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Results */}
            {importResults && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      {importResults.success} clientes importados exitosamente
                    </span>
                  </div>
                  {importResults.errors.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">
                        {importResults.errors.length} errores
                      </span>
                    </div>
                  )}
                </div>

                {/* Resumen de importación */}
                {importSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(importSummary.sectores_creados > 0 || importSummary.planes_creados > 0) && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-medium text-blue-900 mb-2">Elementos creados automáticamente:</p>
                        {importSummary.nuevos_sectores.length > 0 && (
                          <div className="mb-2">
                            <p className="text-sm text-blue-700 font-medium">Sectores:</p>
                            <div className="flex flex-wrap gap-1">
                              {importSummary.nuevos_sectores.map((sector, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  {sector}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {importSummary.nuevos_planes.length > 0 && (
                          <div>
                            <p className="text-sm text-blue-700 font-medium">Planes:</p>
                            <div className="flex flex-wrap gap-1">
                              {importSummary.nuevos_planes.map((plan, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  {plan.nombre} (${plan.precio})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-3 bg-gray-50 border rounded-lg">
                      <p className="font-medium text-gray-900 mb-2">Resumen:</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Procesados:</span>
                          <span className="ml-1 font-medium">{importSummary.total_procesados}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Creados:</span>
                          <span className="ml-1 font-medium text-green-600">{importSummary.clientes_creados}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Errores:</span>
                          <span className="ml-1 font-medium text-red-600">{importSummary.errores}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {importResults.errors.length > 0 && (
                  <div className="border-2 border-red-300 rounded-lg bg-red-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <p className="font-medium text-red-800">
                        Se encontraron {importResults.errors.length} errores de validación
                      </p>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {importResults.errors.slice(0, 20).map((err, idx) => (
                        <div key={idx} className="bg-white border border-red-200 rounded p-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-red-800">Fila {err.row}</p>
                              <p className="text-sm text-red-600 mt-1">{err.error}</p>
                            </div>
                            {err.columnas && err.columnas.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {err.columnas.map((col, i) => (
                                  <Badge key={i} variant="destructive" className="text-xs">
                                    {col}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {err.data && err.data.length > 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                              Datos: {err.data.slice(0, 5).map((d: string, i: number) => `${i+1}: "${d}"`).join(' | ')}
                              {err.data.length > 5 && ' ...'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {importResults.errors.length > 20 && (
                      <p className="p-2 text-sm text-red-600 text-center font-medium mt-2">
                        ... y {importResults.errors.length - 20} errores más
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={handleCloseImportModal} variant="outline">
              Cerrar
            </Button>
            {importResults && importResults.success === 0 ? (
              <label htmlFor="file-upload" className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-2"
                />
                <Button type="button" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar archivo corregido
                </Button>
              </label>
            ) : (
              importingFile && !importResults && (
                <Button onClick={handleExecuteImport} disabled={importing} className="bg-green-600 hover:bg-green-700">
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar {previewData.length > 0 ? previewData.length - 1 : 'los'} Registros
                    </>
                  )}
                </Button>
              )
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
