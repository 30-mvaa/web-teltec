"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { API_ENDPOINTS } from "@/lib/config/api"
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Users, 
  Filter, 
  Download, 
  RefreshCw, 
  BarChart3,
  Mail,
  FileText,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { FinancialChart } from "../components/FinancialChart"
import { useToast } from "@/app/components/shared/Toast"

// Interfaces
interface ClienteAnualData {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  tipo_plan: string;
  precio_plan: number;
  sector: string;
  estado: string;
  fecha_registro: string;
  meses_estado: Record<number, {
    pagado: boolean;
    cantidad_pagos: number;
    total_pagado: number;
    color: string;
  }>;
  total_anual: number;
  pagos_anual: number;
  meses_pagados: number;
  meses_sin_pagar: number;
  porcentaje_cumplimiento: number;
}

interface ReporteAnualData {
  anio: number;
  clientes: ClienteAnualData[];
  total_clientes: number;
  resumen: {
    total_recaudado_anio: number;
    total_pagos_anio: number;
    promedio_cumplimiento: number;
  };
}

interface UtilidadesAnualesData {
  anio: number;
  recaudacion_anual: number;
  gastos_anuales: number;
  utilidad_anual: number;
  total_pagos: number;
  total_gastos: number;
  porcentaje_utilidad: number;
}

interface RecaudacionMensualData {
  mes: number;
  nombre_mes: string;
  nombre_mes_corto: string;
  total_recaudado: number;
  total_pagos: number;
  es_mayor_recaudacion: boolean;
  es_menor_recaudacion: boolean;
}

interface ReporteGraficoAnualData {
  anio: number;
  datos_mensuales: RecaudacionMensualData[];
  estadisticas: {
    total_anual: number;
    total_pagos_anual: number;
    promedio_mensual: number;
    meses_mayor_recaudacion: RecaudacionMensualData[];
    meses_menor_recaudacion: RecaudacionMensualData[];
  };
  variacion_mensual: Array<{
    mes: number;
    nombre_mes: string;
    variacion_porcentual: number;
  }>;
  fecha_generacion: string;
}

interface PagoData {
  id: number;
  numero_comprobante: string;
  fecha_pago: string;
  cliente_nombre: string;
  cliente_cedula: string;
  tipo_plan: string;
  concepto: string;
  metodo_pago: string;
  monto: number;
  estado: string;
  comprobante_enviado: boolean;
}

interface GastoData {
  id: number;
  fecha_gasto: string;
  descripcion: string;
  categoria: string;
  monto: number;
  proveedor: string;
  metodo_pago: string;
  usuario_nombre: string;
}

export default function ReportesPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Estados principales
  const [activeTab, setActiveTab] = useState("anual")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para reporte anual
  const [reporteAnualData, setReporteAnualData] = useState<ReporteAnualData | null>(null)
  const [anualSearch, setAnualSearch] = useState("")
  const [anualSector, setAnualSector] = useState("todos")
  const [sectores, setSectores] = useState<string[]>([])

  // Estados para paginación del reporte anual
  const [anualPage, setAnualPage] = useState(1)
  const [anualPageSize, setAnualPageSize] = useState(20)

  // Estados para reporte gráfico anual
  const [reporteGraficoData, setReporteGraficoData] = useState<ReporteGraficoAnualData | null>(null)
  const [utilidadesAnuales, setUtilidadesAnuales] = useState<UtilidadesAnualesData | null>(null)
  const [anioUtilidades, setAnioUtilidades] = useState(new Date().getFullYear())
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'radar' | 'doughnut'>('bar')

  // Estados para pagos
  const [pagosData, setPagosData] = useState<PagoData[]>([])
  const [pagosSearch, setPagosSearch] = useState("")
  const [pagosMetodo, setPagosMetodo] = useState("todos")
  const [pagosEstado, setPagosEstado] = useState("todos")
  const [pagosPage, setPagosPage] = useState(1)
  const [pagosPageSize, setPagosPageSize] = useState(10)
  const [selectedPagos, setSelectedPagos] = useState<number[]>([])
  const [isSendingComprobantes, setIsSendingComprobantes] = useState(false)
  const [pagosMes, setPagosMes] = useState(new Date().getMonth() + 1)

  // Estados para gastos
  const [gastosData, setGastosData] = useState<GastoData[]>([])
  const [gastosSearch, setGastosSearch] = useState("")
  const [gastosCategoria, setGastosCategoria] = useState("todos")
  const [gastosPage, setGastosPage] = useState(1)
  const [gastosPageSize, setGastosPageSize] = useState(10)
  const [gastosMes, setGastosMes] = useState(new Date().getMonth() + 1)

  // Funciones auxiliares
  const generateYears = () => {
    const years = []
    const currentYear = new Date().getFullYear()
    
    // Incluir el año actual y hasta 5 años atrás
    for (let year = currentYear; year >= currentYear - 5; year--) {
      years.push(year)
    }
    
    // También incluir el próximo año para planificación
    years.unshift(currentYear + 1)
    
    return years
  }

  // Función para generar meses desde la fecha de registro hasta el mes actual
  const getMesesDesdeRegistro = (fechaRegistro: string) => {
    const fecha = new Date(fechaRegistro)
    const mesActual = new Date()
    const meses = []
    
    // Solo mostrar meses del año seleccionado
    const anioSeleccionado = selectedYear
    let fechaActual = new Date(anioSeleccionado, 0, 1) // 1 de enero del año seleccionado
    
    // Si la fecha de registro es posterior al año seleccionado, usar esa fecha
    if (fecha > fechaActual) {
      fechaActual = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    }
    
    // Solo incluir meses del año seleccionado
    while (fechaActual <= mesActual && fechaActual.getFullYear() === anioSeleccionado) {
      meses.push({
        anio: fechaActual.getFullYear(),
        mes: fechaActual.getMonth() + 1
      })
      fechaActual.setMonth(fechaActual.getMonth() + 1)
    }
    
    return meses
  }

  // Función para generar encabezados de meses para la tabla
  const getMesesEncabezados = () => {
    const mesActual = new Date()
    const meses = []
    
    // Solo mostrar meses del año seleccionado
    const anioSeleccionado = selectedYear
    const mesInicio = anioSeleccionado === 2025 ? 1 : 1
    const mesFin = anioSeleccionado === mesActual.getFullYear() ? mesActual.getMonth() + 1 : 12
    
    for (let mes = mesInicio; mes <= mesFin; mes++) {
      meses.push({
        anio: anioSeleccionado,
        mes,
        nombreCorto: new Date(anioSeleccionado, mes - 1).toLocaleDateString('es-ES', { month: 'short' })
      })
    }
    
    return meses
  }

  // Funciones de fetch
  const fetchSectores = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.REPORTES_SECTORES, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': localStorage.getItem('userEmail') || 'admin@teltec.com'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success && Array.isArray(data.sectores)) {
        const cleanSectores = data.sectores
          .filter((sector: any) => sector && typeof sector === 'string' && sector.trim() !== '')
          .map((sector: string) => sector.trim())
          .filter((sector: string) => sector.length > 0)
        setSectores(cleanSectores)
      } else {
        setSectores([])
        if (process.env.NODE_ENV === 'development') {
          console.warn("Sectores no encontrados o formato incorrecto:", data)
        }
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching sectores:", error)
      }
      setSectores([])
      // No mostrar error al usuario si es solo para cargar sectores
    }
  }, [])

  const fetchUtilidadesAnuales = useCallback(async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.REPORTES_UTILIDADES_ANUALES}?year=${anioUtilidades}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': localStorage.getItem('userEmail') || 'admin@teltec.com'
        },
        signal: AbortSignal.timeout(15000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setUtilidadesAnuales(data)
      }
    } catch (error: any) {
      // Solo mostrar error si es un error real, no si el servidor está offline
      if (error.message && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error fetching utilidades anuales:", error)
        }
        setError("Error al cargar utilidades anuales. Verifique que el servidor esté ejecutándose.")
      }
    }
  }, [anioUtilidades])

  const fetchPagosReales = useCallback(async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.REPORTES_PAGOS_REALES}?year=${selectedYear}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': localStorage.getItem('userEmail') || 'admin@teltec.com'
        },
        signal: AbortSignal.timeout(15000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setPagosData(data.pagos || [])
      } else {
        setPagosData([])
      }
    } catch (error: any) {
      // Solo mostrar error si es un error real, no si el servidor está offline
      if (error.message && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error fetching pagos reales:", error)
        }
        setError("Error al cargar pagos. Verifique que el servidor esté ejecutándose.")
      }
      setPagosData([])
    }
  }, [selectedYear])

  const fetchGastosReales = useCallback(async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.REPORTES_GASTOS_REALES}?year=${selectedYear}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': localStorage.getItem('userEmail') || 'admin@teltec.com'
        },
        signal: AbortSignal.timeout(15000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setGastosData(data.gastos || [])
      } else {
        setGastosData([])
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching gastos reales:", error)
      }
      setGastosData([])
    }
  }, [selectedYear])

  // Funciones para descargar reportes Excel
  const descargarReporteCompleto = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.REPORTES_DESCARGAR_EXCEL)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `reporte_completo_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        setError('Error al descargar el reporte completo')
      }
    } catch (error) {
      setError('Error de conexión al descargar el reporte')
      console.error('Error downloading report:', error)
    }
  }

  const descargarReporteDetallado = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.REPORTES_DESCARGAR_DETALLADO)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `reporte_detallado_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        setError('Error al descargar el reporte detallado')
      }
    } catch (error) {
      setError('Error de conexión al descargar el reporte detallado')
      console.error('Error downloading detailed report:', error)
    }
  }



  const fetchReporteAnual = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // console.log('Fetching datos para el año:', selectedYear)
      // Obtener todos los clientes sin paginación para el año seleccionado
      const response = await fetch(`${API_ENDPOINTS.REPORTES_DEUDAS_DETALLE}?page_size=1000&year=${selectedYear}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': localStorage.getItem('userEmail') || 'admin@teltec.com'
        },
        signal: AbortSignal.timeout(30000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        // console.log('Datos recibidos del API:', data.data.clientes?.length || 0, 'clientes')
        
        // Transformar los datos para mantener compatibilidad
        const transformedData = {
          anio: selectedYear,
          clientes: data.data.clientes.map((cliente: any) => ({
            id: cliente.id,
            cedula: cliente.cedula,
            nombres: cliente.nombres,
            apellidos: cliente.apellidos,
            nombre_completo: `${cliente.nombres} ${cliente.apellidos}`,
            tipo_plan: cliente.tipo_plan,
            precio_plan: cliente.precio_plan,
            sector: cliente.sector,
            estado: cliente.estado_pago,
            fecha_registro: cliente.fecha_registro,
            meses_estado: {}, // Se llenará con la lógica de meses
            total_anual: cliente.monto_total_deuda,
            pagos_anual: cliente.total_pagado,
            meses_pagados: Math.floor(cliente.total_pagado / cliente.precio_plan),
            meses_sin_pagar: cliente.meses_pendientes,
            porcentaje_cumplimiento: cliente.total_pagado > 0 ? 
              ((cliente.total_pagado / cliente.monto_total_deuda) * 100) : 0
          })),
          total_clientes: data.data.paginacion.total_registros,
          resumen: {
            total_recaudado_anio: data.data.clientes.reduce((sum: number, c: any) => sum + c.total_pagado, 0),
            total_pagos_anio: data.data.clientes.reduce((sum: number, c: any) => sum + Math.floor(c.total_pagado / c.precio_plan), 0),
            promedio_cumplimiento: data.data.clientes.reduce((sum: number, c: any) => 
              sum + (c.total_pagado > 0 ? (c.total_pagado / c.monto_total_deuda) * 100 : 0), 0) / data.data.clientes.length
          }
        }
        // console.log('Clientes cargados:', transformedData.clientes.length, 'de', transformedData.total_clientes)
        setReporteAnualData(transformedData)
      } else {
        setError(data.message || 'Error al cargar reporte anual')
        setReporteAnualData(null)
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching reporte anual:', err)
      }
      setError(err.message || 'Error al cargar reporte anual')
      setReporteAnualData(null)
    } finally {
      setIsLoading(false)
    }
  }, [selectedYear])

  const fetchReporteGraficoAnual = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_ENDPOINTS.REPORTES_RECAUDACION_MENSUAL}?year=${selectedYear}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': localStorage.getItem('userEmail') || 'admin@teltec.com'
        },
        signal: AbortSignal.timeout(20000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        // Generar todos los meses del año seleccionado
        const todosLosMeses = []
        const mesActual = new Date()
        const anioSeleccionado = selectedYear
        
        for (let mes = 1; mes <= 12; mes++) {
          const nombreMes = new Date(anioSeleccionado, mes - 1).toLocaleDateString('es-ES', { month: 'long' })
          const nombreMesCorto = new Date(anioSeleccionado, mes - 1).toLocaleDateString('es-ES', { month: 'short' })
          
          // Buscar si hay datos para este mes en la respuesta de la API
          const mesExistente = data.data.meses.find((m: any) => m.mes === mes)
          
          todosLosMeses.push({
            mes: mes,
            nombre_mes: nombreMes,
            nombre_mes_corto: nombreMesCorto,
            total_recaudado: mesExistente ? mesExistente.total_recaudado : 0,
            total_pagos: mesExistente ? mesExistente.total_pagos : 0,
            es_mayor_recaudacion: false,
            es_menor_recaudacion: false
          })
        }
        
        // Calcular estadísticas
        const totalAnual = todosLosMeses.reduce((sum, mes) => sum + mes.total_recaudado, 0)
        const totalPagosAnual = todosLosMeses.reduce((sum, mes) => sum + mes.total_pagos, 0)
        const promedioMensual = totalAnual / 12
        
        // Identificar meses con mayor y menor recaudación
        const mesesConRecaudacion = todosLosMeses.filter(mes => mes.total_recaudado > 0)
        if (mesesConRecaudacion.length > 0) {
          const maxRecaudacion = Math.max(...mesesConRecaudacion.map(mes => mes.total_recaudado))
          const minRecaudacion = Math.min(...mesesConRecaudacion.map(mes => mes.total_recaudado))
          
          todosLosMeses.forEach(mes => {
            if (mes.total_recaudado === maxRecaudacion && maxRecaudacion > 0) {
              mes.es_mayor_recaudacion = true
            }
            if (mes.total_recaudado === minRecaudacion && minRecaudacion > 0) {
              mes.es_menor_recaudacion = true
            }
          })
        }
        
        // Calcular variación mensual
        const variacionMensual = []
        for (let i = 1; i < todosLosMeses.length; i++) {
          const mesActual = todosLosMeses[i]
          const mesAnterior = todosLosMeses[i - 1]
          const variacion = mesAnterior.total_recaudado > 0 ? 
            ((mesActual.total_recaudado - mesAnterior.total_recaudado) / mesAnterior.total_recaudado) * 100 : 0
          
          variacionMensual.push({
            mes: mesActual.mes,
            nombre_mes: mesActual.nombre_mes_corto,
            variacion_porcentual: variacion
          })
        }
        
        const transformedData = {
          anio: anioSeleccionado,
          datos_mensuales: todosLosMeses,
          estadisticas: {
            total_anual: totalAnual,
            total_pagos_anual: totalPagosAnual,
            promedio_mensual: promedioMensual,
            meses_mayor_recaudacion: todosLosMeses.filter(mes => mes.es_mayor_recaudacion),
            meses_menor_recaudacion: todosLosMeses.filter(mes => mes.es_menor_recaudacion)
          },
          variacion_mensual: variacionMensual,
          fecha_generacion: new Date().toISOString()
        }
        
        // console.log('Datos del gráfico generados:', transformedData.datos_mensuales.length, 'meses')
        setReporteGraficoData(transformedData)
      } else {
        setError(data.message || 'Error al cargar el reporte gráfico anual')
        setReporteGraficoData(null)
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error en fetchReporteGraficoAnual:', err)
      }
      setError(err instanceof Error ? err.message : "Error desconocido")
      setReporteGraficoData(null)
    } finally {
      setIsLoading(false)
    }
  }, [selectedYear])

  const fetchPagosData = useCallback(async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.REPORTES_PAGOS}?month=${pagosMes}&year=${selectedYear}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': localStorage.getItem('userEmail') || 'admin@teltec.com'
        },
        signal: AbortSignal.timeout(15000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setPagosData(data.data || [])
      }
    } catch (error: any) {
      // Solo mostrar error si es un error real, no si el servidor está offline
      if (error.message && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error fetching pagos:", error)
        }
        setError("Error al cargar pagos. Verifique que el servidor esté ejecutándose.")
      }
      setPagosData([])
    }
  }, [selectedYear, pagosMes])

  const fetchGastosData = useCallback(async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.REPORTES_GASTOS}?month=${gastosMes}&year=${selectedYear}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': localStorage.getItem('userEmail') || 'admin@teltec.com'
        },
        signal: AbortSignal.timeout(15000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setGastosData(data.data || [])
      }
    } catch (error: any) {
      // Solo mostrar error si es un error real, no si el servidor está offline
      if (error.message && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error fetching gastos:", error)
        }
        setError("Error al cargar gastos. Verifique que el servidor esté ejecutándose.")
      }
      setGastosData([])
    }
  }, [selectedYear, gastosMes])

  // Funciones de pagos
  const togglePago = (id: number) => {
    setSelectedPagos(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    )
  }

  const toggleAllPagos = () => {
    const currentPagePagos = pagosFiltrados.slice((pagosPage - 1) * pagosPageSize, pagosPage * pagosPageSize)
    const allSelected = currentPagePagos.every(p => selectedPagos.includes(p.id))
    
    if (allSelected) {
      setSelectedPagos(prev => prev.filter(id => !currentPagePagos.some(p => p.id === id)))
    } else {
      setSelectedPagos(prev => [...new Set([...prev, ...currentPagePagos.map(p => p.id)])])
    }
  }

  const enviarComprobantesMasivos = async () => {
    setIsSendingComprobantes(true)
    try {
      const response = await fetch('/api/comprobantes/enviar-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagoIds: selectedPagos })
      })
      
      if (response.ok) {
        toast('Comprobantes enviados exitosamente', 'success')
        setSelectedPagos([])
        fetchPagosData()
      } else {
        toast('Error al enviar comprobantes', 'error')
      }
    } catch (error) {
      toast('Error al enviar comprobantes', 'error')
    } finally {
      setIsSendingComprobantes(false)
    }
  }

  // Cálculos derivados - memoizados
  const pagosFiltrados = useMemo(() => {
    if (!pagosSearch && pagosMetodo === "todos" && pagosEstado === "todos") {
      return pagosData
    }
    const searchLower = pagosSearch.toLowerCase()
    return pagosData.filter(pago => {
      const matchesSearch = !pagosSearch || 
        pago.cliente_nombre.toLowerCase().includes(searchLower) ||
        pago.cliente_cedula.includes(pagosSearch) ||
        pago.numero_comprobante.includes(pagosSearch) ||
        pago.concepto.toLowerCase().includes(searchLower)
      
      const matchesMetodo = pagosMetodo === "todos" || pago.metodo_pago === pagosMetodo
      const matchesEstado = pagosEstado === "todos" || pago.estado === pagosEstado
      
      return matchesSearch && matchesMetodo && matchesEstado
    })
  }, [pagosData, pagosSearch, pagosMetodo, pagosEstado])

  // Filtro memoizado para clientes del reporte anual
  const clientesAnualFiltrados = useMemo(() => {
    if (!reporteAnualData) return []
    if (!anualSearch && anualSector === "todos") {
      return reporteAnualData.clientes
    }
    const searchLower = anualSearch.toLowerCase()
    return reporteAnualData.clientes.filter(cliente => {
      const cumpleBusqueda = !anualSearch || 
        cliente.nombre_completo.toLowerCase().includes(searchLower) ||
        cliente.cedula.includes(anualSearch)
      const cumpleSector = anualSector === "todos" || cliente.sector === anualSector
      return cumpleBusqueda && cumpleSector
    })
  }, [reporteAnualData, anualSearch, anualSector])

  const clientesAnualPageData = useMemo(() => 
    clientesAnualFiltrados.slice((anualPage - 1) * anualPageSize, anualPage * anualPageSize),
    [clientesAnualFiltrados, anualPage, anualPageSize]
  )
  const clientesAnualTotalPages = useMemo(() => 
    Math.ceil(clientesAnualFiltrados.length / anualPageSize),
    [clientesAnualFiltrados.length, anualPageSize]
  )

  const pagosPageData = useMemo(() => 
    pagosFiltrados.slice((pagosPage - 1) * pagosPageSize, pagosPage * pagosPageSize),
    [pagosFiltrados, pagosPage, pagosPageSize]
  )
  const pagosTotalPages = useMemo(() => 
    Math.ceil(pagosFiltrados.length / pagosPageSize),
    [pagosFiltrados.length, pagosPageSize]
  )
  const pagosNoEnviadosPage = useMemo(() => 
    pagosPageData.filter(p => !p.comprobante_enviado),
    [pagosPageData]
  )
  const canShowEnviarComprobantes = pagosNoEnviadosPage.length > 0

  // useEffect hooks
  useEffect(() => {
    fetchSectores()
  }, [fetchSectores])

  useEffect(() => {
    if (activeTab === 'utilidades') {
      fetchUtilidadesAnuales()
    }
  }, [activeTab, fetchUtilidadesAnuales])

  useEffect(() => {
    if (activeTab === 'anual') {
      fetchReporteAnual()
      fetchReporteGraficoAnual()
    }
  }, [activeTab, fetchReporteAnual, fetchReporteGraficoAnual])

  useEffect(() => {
    if (activeTab === 'grafico') {
      fetchReporteGraficoAnual()
    }
  }, [activeTab, fetchReporteGraficoAnual])

  useEffect(() => {
    if (activeTab === 'anual' && !reporteAnualData) {
      fetchReporteAnual()
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'grafico' && !reporteGraficoData) {
      fetchReporteGraficoAnual()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'utilidades' && !utilidadesAnuales) {
      fetchUtilidadesAnuales()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'pagos' && pagosData.length === 0) {
      fetchPagosReales()
    }
  }, [activeTab, pagosData.length, fetchPagosReales])

  useEffect(() => {
    if (activeTab === 'gastos' && gastosData.length === 0) {
      fetchGastosReales()
    }
  }, [activeTab, gastosData.length, fetchGastosReales])

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setAnualPage(1)
  }, [anualSearch, anualSector])

  // Actualizar datos cuando cambie el año seleccionado
  useEffect(() => {
    if (activeTab === 'anual') {
      // console.log('Año cambiado a:', selectedYear, '- Actualizando datos...')
      setAnualPage(1)
      fetchReporteAnual()
    }
  }, [selectedYear, activeTab, fetchReporteAnual])

  useEffect(() => {
    if (activeTab === 'pagos') {
      fetchPagosData()
    }
  }, [activeTab, fetchPagosData])

  useEffect(() => {
    if (activeTab === 'gastos') {
      fetchGastosData()
    }
  }, [activeTab, fetchGastosData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Reportes y Estadísticas</h1>
                <p className="text-slate-600">Dashboard ejecutivo y reportes detallados</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={descargarReporteCompleto} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Reporte Completo
              </Button>
              <Button 
                onClick={descargarReporteDetallado} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Reporte Detallado
              </Button>
            </div>
          </div>

          {/* Tabs de navegación */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="anual" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Anual
              </TabsTrigger>
              <TabsTrigger value="grafico" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Gráfico
              </TabsTrigger>
              <TabsTrigger value="utilidades" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Utilidades
              </TabsTrigger>
              <TabsTrigger value="pagos" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Pagos
              </TabsTrigger>
              <TabsTrigger value="gastos" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" /> Gastos
              </TabsTrigger>
            </TabsList>

            {/* Tab Reporte Anual de Clientes */}
            <TabsContent value="anual" className="space-y-6">
              {/* Filtros */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Reporte Anual de Clientes - {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-row flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium">Año</label>
                      <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar año" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateYears().map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year} {year === new Date().getFullYear() ? '(Actual)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium">Buscar Cliente</label>
                      <Input
                        placeholder="Nombre o cédula..."
                        value={anualSearch}
                        onChange={(e) => setAnualSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium">Sector</label>
                      <Select value={anualSector} onValueChange={setAnualSector}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los sectores" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los sectores</SelectItem>
                          {Array.isArray(sectores) && sectores.length > 0 && sectores
                            .filter(sector => sector && typeof sector === 'string' && sector.trim() !== '')
                            .map((sector) => {
                              const cleanSector = sector.trim()
                              if (!cleanSector || cleanSector === '') {
                                return null
                              }
                              return (
                                <SelectItem key={cleanSector} value={cleanSector}>
                                  {cleanSector}
                                </SelectItem>
                              )
                            }).filter(Boolean)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[150px]">
                      <Button onClick={() => fetchReporteAnual()} className="w-full flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" /> Actualizar
                      </Button>
                    </div>
                    <div className="min-w-[150px]">
                      <Button 
                        onClick={() => {
                          setAnualSearch("")
                          setAnualSector("todos")
                          setAnualPage(1) // Resetear a la primera página
                        }} 
                        variant="outline" 
                        className="w-full flex items-center gap-2"
                      >
                        Limpiar Filtros
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen del Año */}
              {reporteAnualData && (
                <div className="space-y-4">
                  {/* Indicador de filtros aplicados */}
                  <div className="text-sm text-gray-600">
                    Mostrando {Math.min(anualPageSize, clientesAnualFiltrados.length)} de {clientesAnualFiltrados.length} clientes filtrados (página {anualPage} de {clientesAnualTotalPages})
                    {anualSearch && ` (filtrado por: "${anualSearch}")`}
                    {anualSector !== "todos" && ` (sector: ${anualSector})`}
                  </div>
                  
                <div className="flex flex-row overflow-x-auto gap-4 pb-4">
                  <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white min-w-[200px] flex-shrink-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium opacity-90">Total Clientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{reporteAnualData.total_clientes}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white min-w-[200px] flex-shrink-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium opacity-90">Total Recaudado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">${reporteAnualData.resumen.total_recaudado_anio.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white min-w-[200px] flex-shrink-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium opacity-90">Total Pagos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{reporteAnualData.resumen.total_pagos_anio}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white min-w-[200px] flex-shrink-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium opacity-90">Promedio Cumplimiento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{reporteAnualData.resumen.promedio_cumplimiento.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                  </div>
                </div>
              )}

              {/* Tabla de Clientes con Estado de Pagos */}
              {reporteAnualData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Estado de Pagos por Cliente - {selectedYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[150px]">Cliente</TableHead>
                            <TableHead className="min-w-[100px]">Cédula</TableHead>
                            <TableHead className="min-w-[120px]">Plan</TableHead>
                            <TableHead className="min-w-[100px]">Sector</TableHead>
                            <TableHead className="min-w-[100px]">Estado</TableHead>
                            {getMesesEncabezados().map((mes) => (
                              <TableHead key={`${mes.anio}-${mes.mes}`} className="min-w-[80px] text-center">
                                <div className="text-xs">
                                  <div className="font-medium">{mes.anio}</div>
                                  <div>{mes.nombreCorto}</div>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="min-w-[100px]">Total Anual</TableHead>
                            <TableHead className="min-w-[120px]">Cumplimiento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientesAnualPageData.map((cliente) => (
                              <TableRow key={cliente.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium">{cliente.nombre_completo}</TableCell>
                                <TableCell>{cliente.cedula}</TableCell>
                                <TableCell>{cliente.tipo_plan}</TableCell>
                                <TableCell>{cliente.sector}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    cliente.estado === 'al_dia' ? 'bg-green-500' : 
                                    cliente.estado === 'vencido' ? 'bg-red-500' : 
                                    cliente.estado === 'pendiente' ? 'bg-yellow-500' : 
                                    'bg-gray-500'
                                  }>
                                    {cliente.estado === 'al_dia' ? 'Al Día' : 
                                     cliente.estado === 'vencido' ? 'Vencido' : 
                                     cliente.estado === 'pendiente' ? 'Pendiente' : 
                                     cliente.estado}
                                  </Badge>
                                </TableCell>
                                {getMesesDesdeRegistro(cliente.fecha_registro).map((mes) => {
                                  const mesKey = `${mes.anio}-${String(mes.mes).padStart(2, '0')}`
                                  
                                  // Calcular si el mes está pagado basado en la fecha de registro y pagos realizados
                                  const fechaRegistro = new Date(cliente.fecha_registro)
                                  const fechaMes = new Date(mes.anio, mes.mes - 1, 1)
                                  
                                  // Un mes está pagado si:
                                  // 1. Es posterior a la fecha de registro
                                  // 2. El número de meses desde el registro hasta este mes es menor o igual a los meses pagados
                                  const mesesDesdeRegistro = (fechaMes.getFullYear() - fechaRegistro.getFullYear()) * 12 + 
                                    (fechaMes.getMonth() - fechaRegistro.getMonth())
                                  
                                  const tienePagos = mesesDesdeRegistro >= 0 && mesesDesdeRegistro < cliente.meses_pagados
                                  const esMesActual = mes.anio === new Date().getFullYear() && mes.mes === new Date().getMonth() + 1
                                  const esMesFuturo = fechaMes > new Date()
                                  
                                  return (
                                    <TableCell key={mesKey} className="text-center">
                                      <div className="flex flex-col items-center">
                                        <div 
                                          className={`w-6 h-6 rounded-full mx-auto shadow-sm ${
                                            tienePagos 
                                              ? 'bg-green-500' 
                                              : esMesActual
                                                ? 'bg-yellow-500'
                                                : esMesFuturo
                                                  ? 'bg-gray-300'
                                              : 'bg-red-500'
                                          }`}
                                          title={`${mesKey}: ${tienePagos ? 'Pagado' : esMesActual ? 'Mes Actual' : esMesFuturo ? 'Futuro' : 'Pendiente'}`}
                                        />
                                        {tienePagos && (
                                          <span className="text-gray-600 mt-1 font-medium text-xs">
                                            ${cliente.precio_plan}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                  )
                                })}
                                <TableCell className="font-medium">
                                  ${cliente.total_anual.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    className={`${
                                      cliente.porcentaje_cumplimiento >= 80 
                                        ? 'bg-green-500' 
                                        : cliente.porcentaje_cumplimiento >= 60 
                                          ? 'bg-yellow-500' 
                                          : 'bg-red-500'
                                    } hover:opacity-80`}
                                  >
                                    {cliente.porcentaje_cumplimiento.toFixed(1)}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          {reporteAnualData.clientes.filter(cliente => {
                            const cumpleBusqueda = anualSearch === "" || 
                             cliente.nombre_completo.toLowerCase().includes(anualSearch.toLowerCase()) ||
                              cliente.cedula.includes(anualSearch)
                            const cumpleSector = anualSector === "todos" || cliente.sector === anualSector
                            return cumpleBusqueda && cumpleSector
                          }).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7 + getMesesEncabezados().length} className="text-center py-8">
                                <div className="text-center">
                                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron clientes</h3>
                                  <p className="text-gray-500">Intenta ajustar los filtros de búsqueda o sector</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Paginación */}
                    {reporteAnualData && (
                      <div className="mt-6">
                        <Pagination
                          currentPage={anualPage}
                          totalPages={clientesAnualTotalPages}
                          totalCount={clientesAnualFiltrados.length}
                          pageSize={anualPageSize}
                          onPageChange={setAnualPage}
                          showPageSizeSelector={true}
                          onPageSizeChange={setAnualPageSize}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Estado de carga */}
              {isLoading && (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Cargando reporte anual</h3>
                      <p className="text-gray-500">Obteniendo datos de clientes y pagos...</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error */}
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="text-red-500 text-4xl mb-4">⚠️</div>
                      <h3 className="text-lg font-semibold text-red-700 mb-2">Error al cargar datos</h3>
                      <p className="text-red-600 mb-4">{error}</p>
                      <Button onClick={fetchReporteAnual} variant="outline">
                        Reintentar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sin datos */}
              {!isLoading && !error && !reporteAnualData && (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay datos disponibles</h3>
                      <p className="text-gray-500">Selecciona un año y haz clic en "Actualizar" para cargar los datos</p>
                      <Button onClick={fetchReporteAnual} className="mt-4">
                        Cargar Datos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Otros tabs se pueden implementar aquí */}
            <TabsContent value="grafico" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Gráfico de Recaudación Mensual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Controles del gráfico */}
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Año</label>
                      <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {generateYears().map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year} {year === new Date().getFullYear() ? '(Actual)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Tipo de Gráfico</label>
                      <Select value={chartType} onValueChange={(value: 'bar' | 'line' | 'area' | 'radar' | 'doughnut') => setChartType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Barras</SelectItem>
                          <SelectItem value="line">Líneas</SelectItem>
                          <SelectItem value="area">Área</SelectItem>
                          <SelectItem value="radar">Radar</SelectItem>
                          <SelectItem value="doughnut">Dona</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                                             <Button onClick={() => fetchReporteGraficoAnual()} className="flex items-center gap-2">
                         <RefreshCw className="h-4 w-4" /> Actualizar
                       </Button>
                  </div>

                  {/* Gráfico */}
                  {reporteGraficoData ? (
                    <div className="space-y-6">
                      {/* Estadísticas del gráfico */}
                      <div className="flex flex-row overflow-x-auto gap-4 pb-4">
                        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Total Anual</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${reporteGraficoData.estadisticas.total_anual.toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Total Pagos</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{reporteGraficoData.estadisticas.total_pagos_anual}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Promedio Mensual</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${reporteGraficoData.estadisticas.promedio_mensual.toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Año</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{reporteGraficoData.anio}</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico principal */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Recaudación Mensual - {reporteGraficoData.anio}</CardTitle>
                          <p className="text-sm text-gray-600">
                            Visualización de la recaudación mensual con indicadores de rendimiento
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="h-96">
                            <FinancialChart 
                              data={reporteGraficoData} 
                              chartType={chartType} 
                            />
                                  </div>
                          

                                </CardContent>
                              </Card>
                              
                      {/* Mejores y peores meses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-green-600">Mejores Meses de Recaudación</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {reporteGraficoData.estadisticas.meses_mayor_recaudacion.map((mes, index) => (
                                <div key={mes.mes} className="flex justify-between items-center p-2 bg-green-50 rounded">
                                  <span className="font-medium">{mes.nombre_mes}</span>
                                  <span className="text-green-600 font-bold">${mes.total_recaudado.toLocaleString()}</span>
                                  </div>
                              ))}
                            </div>
                                </CardContent>
                              </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-red-600">Mes con Menor Recaudación</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {reporteGraficoData.estadisticas.meses_menor_recaudacion.map((mes, index) => (
                                <div key={mes.mes} className="flex justify-between items-center p-2 bg-red-50 rounded">
                                  <span className="font-medium">{mes.nombre_mes}</span>
                                  <span className="text-red-600 font-bold">${mes.total_recaudado.toLocaleString()}</span>
                            </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                      </div>

                      {/* Variación mensual */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Variación Mensual</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Mes</TableHead>
                                  <TableHead>Variación</TableHead>
                                  <TableHead>Estado</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {reporteGraficoData.variacion_mensual.map((mes) => (
                                  <TableRow key={mes.mes}>
                                    <TableCell className="font-medium">{mes.nombre_mes}</TableCell>
                                    <TableCell className={mes.variacion_porcentual >= 0 ? 'text-green-600' : 'text-red-600'}>
                                      {mes.variacion_porcentual >= 0 ? '+' : ''}{mes.variacion_porcentual.toFixed(1)}%
                                       </TableCell>
                                    <TableCell>
                                      <Badge variant={mes.variacion_porcentual >= 0 ? 'default' : 'destructive'}>
                                        {mes.variacion_porcentual >= 0 ? 'Incremento' : 'Decremento'}
                                      </Badge>
                                       </TableCell>
                                     </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                                  </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay datos disponibles para el gráfico</p>
                      <Button onClick={() => fetchReporteGraficoAnual()} className="mt-4">
                        Cargar Datos
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="utilidades" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Utilidades Anuales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Controles */}
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Año</label>
                      <Select value={anioUtilidades.toString()} onValueChange={(value) => setAnioUtilidades(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {generateYears().map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year} {year === new Date().getFullYear() ? '(Actual)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                      <Button onClick={() => fetchUtilidadesAnuales()} className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" /> Actualizar
                      </Button>
                  </div>

                  {/* Datos de utilidades */}
                  {utilidadesAnuales ? (
                    <div className="space-y-6">
                      {/* Resumen de utilidades - ALINEADAS HORIZONTALMENTE */}
                      <div className="flex flex-row overflow-x-auto gap-4 pb-4">
                        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Recaudación</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${utilidadesAnuales.recaudacion_anual.toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Gastos</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${utilidadesAnuales.gastos_anuales.toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Utilidad</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${utilidadesAnuales.utilidad_anual.toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">% Utilidad</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{utilidadesAnuales.porcentaje_utilidad.toFixed(1)}%</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico de utilidades */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Análisis de Utilidades - {utilidadesAnuales.anio}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Barra de progreso de utilidad */}
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Porcentaje de Utilidad</span>
                                <span>{utilidadesAnuales.porcentaje_utilidad.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(utilidadesAnuales.porcentaje_utilidad, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Comparación recaudación vs gastos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">${utilidadesAnuales.recaudacion_anual.toLocaleString()}</div>
                                <div className="text-sm text-green-600">Total Recaudado</div>
                              </div>
                              <div className="text-center p-4 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">${utilidadesAnuales.gastos_anuales.toLocaleString()}</div>
                                <div className="text-sm text-red-600">Total Gastos</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay datos de utilidades disponibles</p>
                      <Button onClick={() => fetchUtilidadesAnuales()} className="mt-4">
                        Cargar Datos
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pagos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Reporte de Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Controles */}
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Año</label>
                      <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {generateYears().map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year} {year === new Date().getFullYear() ? '(Actual)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Mes</label>
                      <Select value={pagosMes.toString()} onValueChange={(value) => setPagosMes(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                            <SelectItem key={mes} value={mes.toString()}>
                              {new Date(selectedYear, mes - 1).toLocaleDateString('es-ES', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Método de Pago</label>
                      <Select value={pagosMetodo} onValueChange={setPagosMetodo}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los métodos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los métodos</SelectItem>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Estado</label>
                      <Select value={pagosEstado} onValueChange={setPagosEstado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los estados</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="rechazado">Rechazado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Buscar</label>
                      <Input
                        placeholder="Cliente o comprobante..."
                        value={pagosSearch}
                        onChange={(e) => setPagosSearch(e.target.value)}
                      />
                    </div>
                    <Button onClick={() => fetchPagosReales()} className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" /> Actualizar
                      </Button>
                  </div>

                  {/* Tabla de pagos */}
                  {pagosData.length > 0 ? (
                    <div className="space-y-4">
                                            {/* Resumen - ALINEADAS HORIZONTALMENTE */}
                      <div className="flex flex-row overflow-x-auto gap-4 pb-4">
                        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Total Pagos</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{pagosData.length}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Total Recaudado</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${pagosData.reduce((sum, pago) => sum + pago.monto, 0).toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Promedio por Pago</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${(pagosData.reduce((sum, pago) => sum + pago.monto, 0) / pagosData.length).toFixed(0)}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Comprobantes Enviados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{pagosData.filter(p => p.comprobante_enviado).length}</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Tabla */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Detalle de Pagos</CardTitle>
                        </CardHeader>
                        <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                                  <TableHead>Cliente</TableHead>
                          <TableHead>Comprobante</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Monto</TableHead>
                                  <TableHead>Método</TableHead>
                          <TableHead>Estado</TableHead>
                                  <TableHead>Comprobante</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                                {pagosData
                                  .filter(pago => {
                                    const cumpleBusqueda = pagosSearch === "" || 
                                      pago.cliente_nombre.toLowerCase().includes(pagosSearch.toLowerCase()) ||
                                      pago.numero_comprobante.includes(pagosSearch)
                                    const cumpleMetodo = pagosMetodo === "todos" || pago.metodo_pago === pagosMetodo
                                    const cumpleEstado = pagosEstado === "todos" || pago.estado === pagosEstado
                                    return cumpleBusqueda && cumpleMetodo && cumpleEstado
                                  })
                                  .slice((pagosPage - 1) * pagosPageSize, pagosPage * pagosPageSize)
                                  .map((pago) => (
                                    <TableRow key={pago.id}>
                            <TableCell>
                                        <div>
                                          <div className="font-medium">{pago.cliente_nombre}</div>
                                          <div className="text-sm text-gray-500">{pago.cliente_cedula}</div>
                                        </div>
                            </TableCell>
                                      <TableCell className="font-mono">{pago.numero_comprobante}</TableCell>
                                      <TableCell>{new Date(pago.fecha_pago).toLocaleDateString('es-ES')}</TableCell>
                                      <TableCell className="font-bold">${pago.monto.toLocaleString()}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{pago.metodo_pago}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={pago.estado === 'confirmado' ? 'default' : pago.estado === 'pendiente' ? 'secondary' : 'destructive'}>
                                          {pago.estado}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={pago.comprobante_enviado ? 'default' : 'secondary'}>
                                          {pago.comprobante_enviado ? 'Enviado' : 'Pendiente'}
                                        </Badge>
                                      </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                          {/* Paginación */}
                          {pagosData.length > pagosPageSize && (
                            <div className="mt-6">
                  <Pagination
                    currentPage={pagosPage}
                                totalPages={Math.ceil(pagosData.length / pagosPageSize)}
                    totalCount={pagosData.length}
                    pageSize={pagosPageSize}
                    onPageChange={setPagosPage}
                    showPageSizeSelector={true}
                    onPageSizeChange={setPagosPageSize}
                  />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay datos de pagos disponibles</p>
                      <Button onClick={() => fetchPagosReales()} className="mt-4">
                        Cargar Datos
                    </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gastos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Reporte de Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Controles */}
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Año</label>
                      <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {generateYears().map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year} {year === new Date().getFullYear() ? '(Actual)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Mes</label>
                      <Select value={gastosMes.toString()} onValueChange={(value) => setGastosMes(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                            <SelectItem key={mes} value={mes.toString()}>
                              {new Date(selectedYear, mes - 1).toLocaleDateString('es-ES', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Categoría</label>
                      <Select value={gastosCategoria} onValueChange={setGastosCategoria}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas las categorías</SelectItem>
                          <SelectItem value="servicios">Servicios</SelectItem>
                          <SelectItem value="equipos">Equipos</SelectItem>
                          <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                          <SelectItem value="otros">Otros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[150px]">
                      <label className="text-sm font-medium">Buscar</label>
                      <Input
                        placeholder="Descripción o proveedor..."
                        value={gastosSearch}
                        onChange={(e) => setGastosSearch(e.target.value)}
                      />
                    </div>
                    <Button onClick={() => fetchGastosReales()} className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" /> Actualizar
                      </Button>
                  </div>

                  {/* Tabla de gastos */}
                  {gastosData.length > 0 ? (
                    <div className="space-y-4">
                      {/* Resumen - ALINEADAS HORIZONTALMENTE */}
                      <div className="flex flex-row overflow-x-auto gap-4 pb-4">
                        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Total Gastos</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{gastosData.length}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Monto Total</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${gastosData.reduce((sum, gasto) => sum + gasto.monto, 0).toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Promedio por Gasto</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${(gastosData.reduce((sum, gasto) => sum + gasto.monto, 0) / gastosData.length).toFixed(0)}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white min-w-[200px] flex-shrink-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Categorías</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{new Set(gastosData.map(g => g.categoria)).size}</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Tabla */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Detalle de Gastos</CardTitle>
                        </CardHeader>
                        <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Categoría</TableHead>
                                  <TableHead>Monto</TableHead>
                                  <TableHead>Fecha</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Método de Pago</TableHead>
                          <TableHead>Usuario</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gastosData
                          .filter(gasto => {
                                    const cumpleBusqueda = gastosSearch === "" || 
                              gasto.descripcion.toLowerCase().includes(gastosSearch.toLowerCase()) ||
                                      gasto.proveedor.toLowerCase().includes(gastosSearch.toLowerCase())
                                    const cumpleCategoria = gastosCategoria === "todos" || gasto.categoria === gastosCategoria
                                    return cumpleBusqueda && cumpleCategoria
                          })
                          .slice((gastosPage - 1) * gastosPageSize, gastosPage * gastosPageSize)
                          .map((gasto) => (
                            <TableRow key={gasto.id}>
                                      <TableCell className="font-medium">{gasto.descripcion}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{gasto.categoria}</Badge>
                                      </TableCell>
                                      <TableCell className="font-bold text-red-600">${gasto.monto.toLocaleString()}</TableCell>
                              <TableCell>{new Date(gasto.fecha_gasto).toLocaleDateString('es-ES')}</TableCell>
                              <TableCell>{gasto.proveedor}</TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">{gasto.metodo_pago}</Badge>
                                      </TableCell>
                                      <TableCell className="text-sm text-gray-600">{gasto.usuario_nombre}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>

                          {/* Paginación */}
                          {gastosData.length > gastosPageSize && (
                            <div className="mt-6">
                  <Pagination
                    currentPage={gastosPage}
                    totalPages={Math.ceil(gastosData.length / gastosPageSize)}
                    totalCount={gastosData.length}
                    pageSize={gastosPageSize}
                    onPageChange={setGastosPage}
                    showPageSizeSelector={true}
                    onPageSizeChange={setGastosPageSize}
                  />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay datos de gastos disponibles</p>
                      <Button onClick={() => fetchGastosReales()} className="mt-4">
                        Cargar Datos
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}







