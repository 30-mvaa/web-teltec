"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { ExportButtons } from "@/components/ui/export-buttons";
import { MonthSelector } from "@/components/ui/month-selector";
import { 
  RefreshCw, 
  BarChart3, 
  PieChart, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  X, 
  Receipt,
  Download,
  Mail,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Trash2,
  Loader2,
  Users,
  TrendingUp
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/config/api';
import { useToast } from "@/app/components/shared/Toast";

interface Cliente {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  tipo_plan?: string;
  precio_plan?: number;
  tipo_plan_actual?: string;
  precio_plan_actual?: number;
  estado?: string;
}

interface Pago {
  id: number;
  cliente_id: number;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  concepto: string;
  estado: string;
  comprobante_enviado: boolean;
  numero_comprobante: string;
  fecha_creacion: string;
  cliente_nombre?: string;
}

interface Stats {
  totalRecaudado: number;
  pagosHoy: number;
  recaudacionHoy: number;
  comprobantesPendientes: number;
  totalTransacciones: number;
  promedioTicket: number;
  pagosMesActual: number;
  recaudacionMesActual: number;
  clientesConDeuda: number;
  totalDeudaPendiente: number;
}

interface MesDisponible {
  año: number;
  mes: number;
  nombre_mes: string;
  ya_pagado: boolean;
  monto: number;
  fecha_limite: string;
}

export default function RecaudacionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  
  // Estados principales
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRecaudado: 0,
    pagosHoy: 0,
    recaudacionHoy: 0,
    comprobantesPendientes: 0,
    totalTransacciones: 0,
    promedioTicket: 0,
    pagosMesActual: 0,
    recaudacionMesActual: 0,
    clientesConDeuda: 0,
    totalDeudaPendiente: 0
  });
  
  // Estados del formulario
  const [selCli, setSelCli] = useState("");
  const [metodo_pago, setMetodoPago] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [meses_pagar, setMesesPagar] = useState(1);
  
  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMetodo, setFilterMetodo] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  
  // Estados para búsqueda de clientes
  const [clienteSearchTerm, setClienteSearchTerm] = useState("");
  const [showClienteSearch, setShowClienteSearch] = useState(false);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 50,
    total_count: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
    next_page: null,
    previous_page: null
  });

  // Estados para filtros de exportación
  const [filtrosExportacion, setFiltrosExportacion] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    metodo_pago: ''
  });

  // Estados para el sistema flexible de pagos
  const [mesesSeleccionados, setMesesSeleccionados] = useState<MesDisponible[]>([]);
  const [montoTotalSeleccionado, setMontoTotalSeleccionado] = useState(0);
  const [modoFlexible, setModoFlexible] = useState(false);

  // Estados para importación masiva de pagos
  const [importPagosModalOpen, setImportPagosModalOpen] = useState(false);
  const [importingPagosFile, setImportingPagosFile] = useState<File | null>(null);
  const [importingPagos, setImportingPagos] = useState(false);
  const [importPagosResults, setImportPagosResults] = useState<{
    success: number;
    errors: { row: number; data: any; error: string }[];
  } | null>(null);
  const [importPagosPreviewData, setImportPagosPreviewData] = useState<string[][]>([]);

  // Función para verificar si es archivo Excel
  const isPagosExcelFile = (filename: string) => {
    return filename.endsWith('.xlsx') || filename.endsWith('.xls');
  };

  // Función para parsear CSV
  const parsePagosCSV = (text: string): { rows: string[][] } | null => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return null;
    const rows = lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
    return { rows };
  };

  // Función para parsear Excel
  const parsePagosExcel = (arrayBuffer: ArrayBuffer): { rows: string[][] } | null => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      if (!workbook) return null;
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
      return rows.length > 0 ? { rows } : null;
    } catch {
      return null;
    }
  };

  // Función para recargar pagos
  const fetchPagos = useCallback(async () => {
    const pagosParams = new URLSearchParams();
    pagosParams.append('page', '1');
    pagosParams.append('page_size', '1000');
    
    if (searchTerm) {
      pagosParams.append('search', searchTerm);
    }
    if (filterMetodo && filterMetodo !== 'todos') {
      pagosParams.append('metodo_pago', filterMetodo);
    }
    if (filterEstado && filterEstado !== 'todos') {
      pagosParams.append('estado', filterEstado);
    }
    
    try {
      const response = await fetch(`${API_ENDPOINTS.PAGOS}?${pagosParams.toString()}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const pagosConNombres = data.data.map((pago: Pago) => {
          const cliente = clientes.find((c: Cliente) => c.id === pago.cliente_id);
          return {
            ...pago,
            cliente_nombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Cliente no encontrado'
          };
        });
        setPagos(pagosConNombres);
      }
    } catch (error) {
      console.error('Error al recargar pagos:', error);
    }
  }, [searchTerm, filterMetodo, filterEstado, clientes]);

  // Función para ejecutar la importación de pagos
  const handleExecutePagosImport = useCallback(async () => {
    if (!importingPagosFile) {
      toast("Seleccione un archivo primero", "error");
      return;
    }

    setImportingPagos(true);
    setImportPagosResults(null);

    try {
      const isExcel = isPagosExcelFile(importingPagosFile.name);
      let rows: string[][];

      if (isExcel) {
        const arrayBuffer = await importingPagosFile.arrayBuffer();
        const parsed = parsePagosExcel(arrayBuffer);
        if (!parsed) {
          toast("El archivo está vacío o no tiene datos", "error");
          setImportingPagos(false);
          return;
        }
        rows = parsed.rows;
      } else {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error("Error reading file"));
          reader.readAsText(importingPagosFile);
        });
        const parsed = parsePagosCSV(text);
        if (!parsed) {
          toast("El archivo está vacío o no tiene datos", "error");
          setImportingPagos(false);
          return;
        }
        rows = parsed.rows;
      }

      const headers = rows[0].map(h => String(h).toLowerCase().replace(/[_\s]/g, ''));
      const dataRows = rows.slice(1);

      const requiredHeaders = ['cedula', 'monto', 'fechapago', 'metodopago', 'concepto'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        setImportPagosResults({
          success: 0,
          errors: [{ row: 1, data: rows[0], error: `Columnas faltantes: ${missingHeaders.join(', ')}` }]
        });
        setImportingPagos(false);
        return;
      }

      const getColumnIndex = (name: string) => {
        const idx = headers.indexOf(name);
        if (idx === -1) {
          const variations = [name, name.replace('_', ''), name.replace(' ', '')];
          for (const v of variations) {
            const found = headers.findIndex(h => h.includes(v) || v.includes(h));
            if (found !== -1) return found;
          }
        }
        return idx;
      };

      const getValue = (row: string[], name: string) => {
        const idx = getColumnIndex(name);
        return idx >= 0 && idx < row.length ? row[idx] || '' : '';
      };

      const pagosData: any[] = [];
      const errors: { row: number; data: any; error: string }[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (row.length === 0 || row.every(cell => !cell.trim())) continue;
        
        const rowNumber = i + 2;
        const cedula = getValue(row, 'cedula').replace(/\D/g, '').padStart(10, '0');
        const montoStr = getValue(row, 'monto').replace(/[,$]/g, '');
        const monto = parseFloat(montoStr);
        const fechaPago = getValue(row, 'fechapago');
        const metodoPago = getValue(row, 'metodopago');
        const concepto = getValue(row, 'concepto');

        if (!cedula || cedula.length !== 10) {
          errors.push({ row: rowNumber, data: row, error: 'Cédula inválida o vacía' });
          continue;
        }
        if (isNaN(monto) || monto <= 0) {
          errors.push({ row: rowNumber, data: row, error: 'Monto inválido' });
          continue;
        }
        if (!fechaPago) {
          errors.push({ row: rowNumber, data: row, error: 'Fecha de pago vacía' });
          continue;
        }
        if (!metodoPago) {
          errors.push({ row: rowNumber, data: row, error: 'Método de pago vacío' });
          continue;
        }

        pagosData.push({
          cedula,
          monto,
          fecha_pago: fechaPago,
          metodo_pago: metodoPago,
          concepto: concepto || 'Pago registrado'
        });
      }

      if (pagosData.length === 0 && errors.length === 0) {
        toast("El archivo no contiene datos válidos", "error");
        setImportingPagos(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.PAGOS_BULK_IMPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagos: pagosData })
      });

      const result = await response.json();

      if (result.success) {
        setImportPagosResults({
          success: result.data?.procesados || pagosData.length,
          errors: result.data?.errores || []
        });
        if (result.data?.procesados > 0) {
          toast(`${result.data.procesados} pagos importados correctamente`, "success");
          fetchPagos();
        }
      } else {
        setImportPagosResults({
          success: 0,
          errors: [{ row: 0, data: null, error: result.message || 'Error en el servidor' }]
        });
      }
    } catch (error) {
      toast("Error al procesar el archivo", "error");
      setImportPagosResults({
        success: 0,
        errors: [{ row: 0, data: null, error: 'Error al procesar el archivo' }]
      });
    } finally {
      setImportingPagos(false);
    }
  }, [importingPagosFile, toast, fetchPagos]);

  // Función para calcular estadísticas completas
  const calcularEstadisticasCompletas = useCallback(async () => {
    try {
      // console.log('Calculando estadísticas...');
      
      // Cargar estadísticas de pagos
      const statsResponse = await fetch(API_ENDPOINTS.PAGOS_STATS);
      // console.log('Respuesta de estadísticas de pagos:', statsResponse.status);
      
      // Cargar estadísticas de deudas
      const deudasResponse = await fetch(API_ENDPOINTS.DEUDAS_STATS);
      // console.log('Respuesta de estadísticas de deudas:', deudasResponse.status);
      
      let newStats = {
        totalRecaudado: 0,
        totalTransacciones: 0,
        promedioTicket: 0,
        pagosHoy: 0,
        recaudacionHoy: 0,
        comprobantesPendientes: 0,
        pagosMesActual: 0,
        recaudacionMesActual: 0,
        clientesConDeuda: 0,
        totalDeudaPendiente: 0
      };
      
      // Procesar estadísticas de pagos
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        // console.log('Datos de estadísticas de pagos:', statsData);
        
        if (statsData.success && statsData.data) {
          const data = statsData.data;
          
          newStats = {
            ...newStats,
            totalRecaudado: data.total_recaudado || 0,
            totalTransacciones: data.total_pagos || 0,
            promedioTicket: data.promedio_ticket || 0,
            pagosHoy: data.pagos_hoy || 0,
            recaudacionHoy: data.recaudacion_hoy || 0,
            comprobantesPendientes: data.comprobantes_pendientes || 0,
            pagosMesActual: data.pagos_mes_actual || 0,
            recaudacionMesActual: data.recaudacion_mes_actual || 0,
          };
        }
      }
      
      // Procesar estadísticas de deudas
      if (deudasResponse.ok) {
        const deudasData = await deudasResponse.json();
        // console.log('Datos de estadísticas de deudas:', deudasData);
        
        if (deudasData.success && deudasData.data) {
          const data = deudasData.data;
          
          newStats = {
            ...newStats,
            clientesConDeuda: data.clientes_vencidos || 0,
            totalDeudaPendiente: data.total_deuda || 0
          };
        }
      }
      
      // console.log('Estadísticas combinadas:', newStats);
      setStats(newStats);
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error calculando estadísticas:', error);
      }
      // No establecer error global, solo log
    }
  }, []);

  // Cargar todos los datos
  const loadAll = useCallback(async (page = 1, size = 50) => {
    setLoading(true);
    try {
      // console.log('Iniciando carga de datos...');
      
      // Cargar clientes - usar tamaño de página grande para obtener todos los clientes
      const clientesResponse = await fetch(`${API_ENDPOINTS.CLIENTES}?page_size=200`);
      if (!clientesResponse.ok) {
        throw new Error(`Error HTTP: ${clientesResponse.status}`);
      }
      const clientesData = await clientesResponse.json();
      // console.log('Clientes cargados:', clientesData);
      
      let clientesActivos: Cliente[] = [];
      
      if (clientesData.success && clientesData.data && Array.isArray(clientesData.data)) {
        clientesActivos = clientesData.data.filter((c: Cliente) => c.estado === 'activo');
        setClientes(clientesActivos);
        // console.log('Clientes activos:', clientesActivos.length);
      } else {
        // console.warn('No se pudieron cargar los clientes o formato incorrecto');
        setClientes([]);
      }
      
      // Cargar pagos con paginación
      const pagosParams = new URLSearchParams({
        page: page.toString(),
        page_size: size.toString()
      });
      
      // Agregar filtros si están presentes
      if (searchTerm) {
        pagosParams.append('search', searchTerm);
      }
      if (filterMetodo && filterMetodo !== 'todos') {
        pagosParams.append('metodo_pago', filterMetodo);
      }
      if (filterEstado && filterEstado !== 'todos') {
        pagosParams.append('estado', filterEstado);
      }
      
      const pagosResponse = await fetch(`${API_ENDPOINTS.PAGOS}?${pagosParams.toString()}`);
      if (!pagosResponse.ok) {
        throw new Error(`Error HTTP: ${pagosResponse.status}`);
      }
      const pagosData = await pagosResponse.json();
      if (process.env.NODE_ENV === 'development') {
        // console.log('Pagos cargados:', pagosData);
      }
      
      if (pagosData.success && pagosData.data && Array.isArray(pagosData.data)) {
        const pagosConNombres = pagosData.data.map((pago: Pago) => {
          const cliente = clientesActivos.find((c: Cliente) => c.id === pago.cliente_id);
          return {
            ...pago,
            cliente_nombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Cliente no encontrado'
          };
        });
        
        setPagos(pagosConNombres);
        // console.log('Pagos con nombres:', pagosConNombres.length);
        
        // Actualizar información de paginación
        if (pagosData.pagination) {
          setPagination(pagosData.pagination);
          setCurrentPage(pagosData.pagination.page);
          setPageSize(pagosData.pagination.page_size);
        }
        
        // Calcular estadísticas básicas (usando todos los pagos, no solo la página actual)
        await calcularEstadisticasCompletas();
        
      } else {
        // console.warn('No se pudieron cargar los pagos o formato incorrecto');
        setPagos([]);
        // No resetear estadísticas aquí, mantener las anteriores
      }
      
    } catch (error) {
      if (page === 1) {
        toast(error instanceof Error ? error.message : 'Error desconocido', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterMetodo, filterEstado, calcularEstadisticasCompletas]);

  // Función para manejar cambio de página
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    loadAll(page, pageSize);
  }, [loadAll, pageSize]);

  // Función para manejar cambio de tamaño de página
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    loadAll(1, size);
  }, [loadAll]);

  // Función para manejar búsqueda
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    loadAll(1, pageSize);
  }, [loadAll, pageSize]);

  // Función para limpiar filtros
  const limpiarFiltros = useCallback(() => {
    setSearchTerm("");
    setFilterMetodo("todos");
    setFilterEstado("todos");
    setCurrentPage(1);
    loadAll(1, pageSize);
  }, [loadAll, pageSize]);

  // Función para actualizar filtros de exportación
  const actualizarFiltrosExportacion = () => {
    setFiltrosExportacion({
      fecha_inicio: '',
      fecha_fin: '',
      metodo_pago: filterMetodo !== 'todos' ? filterMetodo : ''
    });
  };

  // Funciones básicas
  const handleGoBack = () => {
    router.push("/dashboard");
  };

  const handleRefresh = async () => {
    setSearchTerm("");
    setFilterMetodo("todos");
    setFilterEstado("todos");
    setCurrentPage(1);
    
    // Actualizar estadísticas primero
    await calcularEstadisticasCompletas();
    
    // Luego recargar datos
    loadAll(1, pageSize);
  };

  // Función para actualizar solo las estadísticas
  const handleUpdateStats = useCallback(async () => {
    try {
      setLoading(true);
      await calcularEstadisticasCompletas();
      toast("Estadísticas actualizadas correctamente", "success");
    } catch (error) {
      toast("Error al actualizar las estadísticas", "error");
    } finally {
      setLoading(false);
    }
  }, [calcularEstadisticasCompletas]);

  // Función para cargar solo estadísticas de deudas
  const handleUpdateDeudas = useCallback(async () => {
    try {
      setLoading(true);
      const deudasResponse = await fetch(API_ENDPOINTS.DEUDAS_STATS);
      
      if (deudasResponse.ok) {
        const deudasData = await deudasResponse.json();
        
        if (deudasData.success && deudasData.data) {
          const data = deudasData.data;
          
          setStats(prev => ({
            ...prev,
            clientesConDeuda: data.clientes_vencidos || 0,
            totalDeudaPendiente: data.total_deuda || 0
          }));
          
          toast("Estadísticas de deudas actualizadas correctamente", "success");
        }
      }
    } catch (error) {
      toast("Error al actualizar las estadísticas de deudas", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener información del mes actual
  const getMesActualInfo = () => {
    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1; // getMonth() devuelve 0-11
    const añoActual = ahora.getFullYear();
    const nombreMes = ahora.toLocaleDateString('es-ES', { month: 'long' });
    
    return {
      mes: mesActual,
      año: añoActual,
      nombre: nombreMes,
      fechaCompleta: `${nombreMes} ${añoActual}`
    };
  };

  // Función para debug de estadísticas
  // const debugStats = () => {
  //   // console.log('=== DEBUG ESTADÍSTICAS ===');
  //   // console.log('Estado actual de stats:', stats);
  //   // console.log('Mes actual:', getMesActualInfo());
  //   // console.log('Fecha actual:', new Date().toISOString());
  //   // console.log('==========================');
  // };

  // Función para calcular métricas avanzadas
  const calcularMetricasAvanzadas = () => {
    const metricas = {
      // Eficiencia de cobro
      eficienciaCobro: stats.totalRecaudado > 0 ? 
        Math.round((stats.totalRecaudado / (stats.totalRecaudado + stats.totalDeudaPendiente)) * 100) : 0,
      
      // Porcentaje de deuda
      porcentajeDeuda: stats.totalRecaudado > 0 ? 
        Math.round((stats.totalDeudaPendiente / (stats.totalRecaudado + stats.totalDeudaPendiente)) * 100) : 0,
      
      // Tasa de conversión de clientes
      tasaConversion: clientes.length > 0 ? 
        Math.round((stats.totalTransacciones / clientes.length) * 100) : 0,
      
      // Eficiencia operativa
      eficienciaOperativa: stats.totalTransacciones > 0 ? 
        Math.round((stats.totalRecaudado / stats.totalTransacciones) / stats.promedioTicket * 100) : 0,
      
      // Proyección mensual
      proyeccionMensual: Math.round(stats.recaudacionMesActual * 1.1),
      
      // Distribución de deudas
      distribucionDeudas: {
        alDia: clientes.length - stats.clientesConDeuda,
        proximoVencimiento: Math.round(stats.clientesConDeuda * 0.2),
        vencidos: Math.round(stats.clientesConDeuda * 0.8)
      }
    };
    
    return metricas;
  };

  // Función para actualizar deudas
  const handleActualizarDeudas = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(API_ENDPOINTS.DEUDAS_ACTUALIZAR_PAGOS_REALES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast(result.message || "Deudas actualizadas exitosamente", "success");
      } else {
        toast(result.message || "Error al actualizar las deudas", "error");
      }
    } catch (error) {
      toast(`Error al actualizar deudas: ${error instanceof Error ? error.message : 'Error desconocido'}`, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para registrar nuevo pago
  const handleRegistrarPago = useCallback(async () => {
    if (!selCli || !metodo_pago || !monto || !concepto) {
      toast("Todos los campos son obligatorios", "error");
      return;
    }

    // Validar que el cliente tenga un plan válido
    const clienteSeleccionado = clientes.find(c => c.id.toString() === selCli);
    if (clienteSeleccionado) {
      const precioPlan = clienteSeleccionado.precio_plan_actual || clienteSeleccionado.precio_plan || 0;
      if (precioPlan <= 0) {
        toast("El cliente seleccionado no tiene un plan válido asignado. Contacte al administrador.", "error");
        return;
      }
    }

    try {
      let pagoData: any;

      if (modoFlexible && mesesSeleccionados.length > 0) {
        // Modo flexible con meses específicos
        pagoData = {
          cliente_id: parseInt(selCli),
          monto: parseFloat(monto),
          metodo_pago: metodo_pago,
          concepto: concepto,
          meses_seleccionados: mesesSeleccionados.map(mes => ({
            año: mes.año,
            mes: mes.mes,
            nombre_mes: mes.nombre_mes
          })),
          fecha_pago: new Date().toISOString().split('T')[0]
        };
      } else {
        // Modo tradicional
        pagoData = {
          cliente_id: parseInt(selCli),
          monto: parseFloat(monto),
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: metodo_pago,
          concepto: concepto,
          estado: "completado",
          meses: meses_pagar
        };
      }

      const endpoint = modoFlexible ? API_ENDPOINTS.PAGO_FLEXIBLE : API_ENDPOINTS.PAGO_CREATE;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pagoData)
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast(result.message || "Pago registrado exitosamente", "success");
        // Limpiar formulario
        setSelCli("");
        setMetodoPago("");
        setMonto("");
        setConcepto("");
        setMesesSeleccionados([]);
        setMontoTotalSeleccionado(0);
        
        // Actualizar estadísticas inmediatamente
        await calcularEstadisticasCompletas();
        
        // Recargar datos de pagos
        const pagosParams = new URLSearchParams({
          page: '1',
          page_size: pageSize.toString()
        });
        
        try {
          const pagosResponse = await fetch(`${API_ENDPOINTS.PAGOS}?${pagosParams.toString()}`);
          if (pagosResponse.ok) {
            const pagosData = await pagosResponse.json();
            if (pagosData.success && pagosData.data && Array.isArray(pagosData.data)) {
              const pagosConNombres = pagosData.data.map((pago: Pago) => {
                const cliente = clientes.find((c: Cliente) => c.id === pago.cliente_id);
                return {
                  ...pago,
                  cliente_nombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Cliente no encontrado'
                };
              });
              setPagos(pagosConNombres);
            }
          }
        } catch (error) {
          // Silent fail for reload
        }
      } else {
        toast(result.message || "Error al registrar el pago", "error");
      }
    } catch (error) {
      toast("Error al registrar el pago: " + (error instanceof Error ? error.message : 'Error desconocido'), "error");
    }
  }, [selCli, metodo_pago, monto, concepto, modoFlexible, mesesSeleccionados, meses_pagar, clientes, pageSize, calcularEstadisticasCompletas]);

  const handleMesesSeleccionados = useCallback((meses: MesDisponible[]) => {
    setMesesSeleccionados(meses);
  }, []);

  const handleMontoTotalChange = useCallback((monto: number) => {
    setMontoTotalSeleccionado(monto);
    setMonto(monto.toString());
  }, []);

  // Función para calcular monto automáticamente
  const calcularMontoAutomatico = useCallback(() => {
    if (selCli && meses_pagar > 0) {
      const clienteSeleccionado = clientes.find(c => c.id.toString() === selCli);
      if (clienteSeleccionado) {
        const precioPlan = clienteSeleccionado.precio_plan_actual || clienteSeleccionado.precio_plan || 0;
        const tipoPlan = clienteSeleccionado.tipo_plan_actual || clienteSeleccionado.tipo_plan || 'Sin plan';
        
        if (precioPlan > 0) {
          const montoCalculado = precioPlan * meses_pagar;
          setMonto(montoCalculado.toString());
          
          // Actualizar concepto automáticamente
          const conceptoCalculado = `Pago ${meses_pagar === 1 ? 'mensual' : `${meses_pagar} meses`} - ${tipoPlan}`;
          setConcepto(conceptoCalculado);
        } else {
          setMonto("");
          setConcepto("");
        }
      }
    }
  }, [selCli, meses_pagar, clientes]);

  // Función para limpiar formulario
  const handleLimpiarFormulario = useCallback(() => {
      setSelCli("");
      setMetodoPago("");
      setMonto("");
      setConcepto("");
      setMesesPagar(1);
      setClienteSearchTerm("");
      setShowClienteSearch(false);
  }, []);

  // Función para seleccionar cliente desde la búsqueda
  const handleSelectCliente = (clienteId: string) => {
    setSelCli(clienteId);
    setShowClienteSearch(false);
    setClienteSearchTerm("");
  };

  // Función para abrir búsqueda de clientes
  const handleOpenClienteSearch = () => {
    setShowClienteSearch(true);
    setClienteSearchTerm("");
  };

  // Función para cerrar búsqueda de clientes
  const handleCloseClienteSearch = () => {
    setShowClienteSearch(false);
    setClienteSearchTerm("");
  };

  // Función para manejar clic fuera del área de búsqueda
  const handleClickOutside = (e: React.MouseEvent) => {
    if (showClienteSearch && !(e.target as Element).closest('.cliente-search-container')) {
      handleCloseClienteSearch();
    }
  };

  // Función para cargar clientes adicionales si es necesario
  const loadClientesAdicionales = useCallback(async () => {
    try {
      // console.log('Cargando clientes adicionales...');
      const response = await fetch(`${API_ENDPOINTS.CLIENTES}?page_size=500`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const clientesActivos = data.data.filter((c: Cliente) => c.estado === 'activo');
          setClientes(clientesActivos);
          // console.log('Clientes adicionales cargados:', clientesActivos.length);
        }
      }
    } catch (error) {
      // console.error('Error cargando clientes adicionales:', error);
    }
  }, []);

  // Función para descargar comprobante
  const handleDescargarComprobante = useCallback(async (pagoId: number) => {
    setDownloading(pagoId);
    try {
      const response = await fetch(API_ENDPOINTS.PAGO_DESCARGAR_COMPROBANTE(pagoId));
      
      // Verificar si la respuesta es un error (JSON)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Es un JSON de error
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al generar el comprobante');
      }
      
      if (!response.ok) {
        // Intentar obtener el mensaje de error si es JSON
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error HTTP: ${response.status}`);
        } catch {
          throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
      }
      
      // Verificar que sea un PDF
      if (!contentType || !contentType.includes('application/pdf')) {
        // Intentar leer como JSON para obtener el mensaje de error
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'El servidor no devolvió un PDF válido');
        } catch {
          throw new Error('El servidor no devolvió un PDF válido. Verifique que WeasyPrint esté instalado.');
        }
      }
      
      // Crear blob y descargar
      const blob = await response.blob();
      
      // Verificar que el blob no esté vacío
      if (blob.size === 0) {
        throw new Error('El PDF generado está vacío');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Obtener el nombre del archivo del header o usar el ID del pago
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `comprobante_${pagoId}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast("Comprobante descargado exitosamente", "success");
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al descargar comprobante:', error);
        // Mostrar mensaje más detallado en consola para debugging
        if (error.message?.includes('WeasyPrint')) {
          console.error('⚠️ WeasyPrint no está instalado en el servidor. Instale con: pip install weasyprint');
        }
      }
      const errorMessage = error.message || "Error al descargar el comprobante";
      toast(errorMessage, "error");
    } finally {
      setDownloading(null);
    }
  }, []);

  // Función para enviar comprobante por email
  const handleEnviarComprobante = useCallback(async (pagoId: number) => {
    setSendingEmail(pagoId);
    try {
      const response = await fetch(API_ENDPOINTS.PAGO_ENVIAR_EMAIL(pagoId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast("Comprobante enviado por email exitosamente", "success");
      } else {
        toast(result.message || "Error al enviar el comprobante", "error");
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al enviar comprobante:', error);
      }
      toast("Error al enviar el comprobante por email", "error");
    } finally {
      setSendingEmail(null);
    }
  }, []);

  // Filtrar clientes para búsqueda
  const filteredClientes = useMemo(() => {
    return clientes.filter(cliente => {
      if (!clienteSearchTerm) return true;
      
      const searchLower = clienteSearchTerm.toLowerCase();
      return (
        cliente.nombres.toLowerCase().includes(searchLower) ||
        cliente.apellidos.toLowerCase().includes(searchLower) ||
        cliente.cedula.includes(searchLower) ||
        cliente.email.toLowerCase().includes(searchLower) ||
        cliente.telefono.includes(searchLower)
      );
    });
  }, [clientes, clienteSearchTerm]);

  // Filtrar pagos
  const filteredPagos = useMemo(() => {
    return pagos.filter(pago => {
      const matchesSearch = searchTerm === "" || 
        (pago.cliente_nombre && pago.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pago.numero_comprobante && pago.numero_comprobante.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (pago.concepto && pago.concepto.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesMetodo = filterMetodo === "todos" || filterMetodo === "" || pago.metodo_pago === filterMetodo;
      const matchesEstado = filterEstado === "todos" || filterEstado === "" || pago.estado === filterEstado;
      
      return matchesSearch && matchesMetodo && matchesEstado;
    });
  }, [pagos, searchTerm, filterMetodo, filterEstado]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // console.log('Inicializando datos...');
        
        // Cargar estadísticas primero
        // console.log('Cargando estadísticas iniciales...');
        await calcularEstadisticasCompletas();
        
        // Luego cargar otros datos
        await loadAll(1, pageSize);
        
        // console.log('Datos inicializados correctamente');
      } catch (error) {
        // console.error('Error en useEffect:', error);
        // No establecer error global, solo log
        setLoading(false);
      }
    };
    
    initializeData();
  }, [calcularEstadisticasCompletas, pageSize]);

  // Calcular monto automáticamente cuando cambie el cliente o los meses
  useEffect(() => {
    calcularMontoAutomatico();
  }, [selCli, meses_pagar]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-700">Cargando sistema de recaudación...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" onClick={handleClickOutside}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sistema de Recaudación</h1>
            <p className="text-gray-600">Gestión de pagos y comprobantes</p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Estadísticas del Sistema</h2>
          <p className="text-sm text-gray-600">
            Período: {getMesActualInfo().fechaCompleta} | 
            Última actualización: {new Date().toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleUpdateStats} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar Estadísticas
          </Button>
          <Button onClick={handleUpdateDeudas} variant="outline" size="sm" disabled={loading} className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Actualizar Deudas
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-white">
              <DollarSign className="w-5 h-5 mr-2" />
              Total Recaudado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalRecaudado !== undefined ? stats.totalRecaudado.toLocaleString() : '0'}
            </div>
            <p className="text-blue-100 text-sm">Recaudación total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-white">
              <Calendar className="w-5 h-5 mr-2" />
              Pagos Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pagosHoy !== undefined ? stats.pagosHoy : '...'}
            </div>
            <p className="text-green-100 text-sm">
              ${stats.recaudacionHoy !== undefined ? stats.recaudacionHoy.toLocaleString() : '0'} recaudado
            </p>
            <p className="text-green-200 text-xs mt-1">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-white">
              <BarChart3 className="w-5 h-5 mr-2" />
              Mes Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pagosMesActual !== undefined ? stats.pagosMesActual : '...'}
            </div>
            <p className="text-purple-100 text-sm">
              ${stats.recaudacionMesActual !== undefined ? stats.recaudacionMesActual.toLocaleString() : '0'} recaudado
            </p>
            <p className="text-purple-200 text-xs mt-1">
              {getMesActualInfo().fechaCompleta}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-white">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Deuda Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.clientesConDeuda !== undefined ? stats.clientesConDeuda : '...'}
            </div>
            <p className="text-orange-100 text-sm">
              ${stats.totalDeudaPendiente !== undefined ? stats.totalDeudaPendiente.toLocaleString() : '0'} por cobrar
            </p>
            <p className="text-orange-200 text-xs mt-1">
              {stats.clientesConDeuda > 0 ? `${stats.clientesConDeuda} cliente(s) con deuda` : 'Todos al día'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="registrar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="registrar" className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Registrar Pago
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Historial de Pagos
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="flex items-center">
            <PieChart className="w-4 h-4 mr-2" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Registrar Pago */}
        <TabsContent value="registrar">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Nuevo Pago</CardTitle>
              <CardDescription>Complete los datos para registrar un nuevo pago</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mensaje informativo */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <Search className="w-4 h-4 text-blue-600 mr-2" />
                  <div className="text-sm text-blue-800">
                    <strong>Consejo:</strong> Si no encuentra un cliente, use el botón de búsqueda (🔍) y escriba la cédula, nombre o email.
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cliente con búsqueda */}
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente *</Label>
                  <div className="relative">
                    {!showClienteSearch ? (
                      <div className="flex gap-2">
                        <Select value={selCli} onValueChange={setSelCli}>
                          <SelectTrigger id="cliente" className="flex-1">
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientes.map((cliente) => (
                              <SelectItem key={cliente.id} value={cliente.id.toString()}>
                                {cliente.nombres} {cliente.apellidos} - {cliente.cedula}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          variant={selCli ? "default" : "outline"}
                          size="icon"
                          onClick={handleOpenClienteSearch}
                          title="Buscar cliente"
                          className={selCli ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 cliente-search-container">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="cliente-search"
                            placeholder="Buscar por nombre, cédula, email o teléfono..."
                            value={clienteSearchTerm}
                            onChange={(e) => setClienteSearchTerm(e.target.value)}
                            className="pl-10 pr-10"
                            autoFocus
                            aria-label="Buscar cliente"
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={handleCloseClienteSearch}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Lista de clientes filtrados */}
                        {clienteSearchTerm ? (
                          <div className="max-h-60 overflow-y-auto border rounded-md bg-white">
                            <div className="p-2 bg-gray-50 border-b text-xs text-gray-600">
                              {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''} encontrado{filteredClientes.length !== 1 ? 's' : ''}
                            </div>
                            {filteredClientes.length > 0 ? (
                              filteredClientes.map((cliente) => (
                                <div
                                  key={cliente.id}
                                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                  onClick={() => handleSelectCliente(cliente.id.toString())}
                                >
                                  <div className="font-medium text-gray-900">
                                    {cliente.nombres} {cliente.apellidos}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Cédula: {cliente.cedula} | Plan: {cliente.tipo_plan_actual || cliente.tipo_plan || 'Sin plan'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {cliente.email} | {cliente.telefono}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-gray-500">
                                <div className="mb-2">No se encontraron clientes</div>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={loadClientesAdicionales}
                                  className="text-xs"
                                >
                                  Cargar más clientes
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-gray-500 border rounded-md bg-gray-50">
                            <Search className="w-4 h-4 mx-auto mb-2" />
                            <div className="text-sm">Escriba para buscar clientes</div>
                            <div className="text-xs text-gray-400">Nombre, cédula, email o teléfono</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="space-y-2">
                  <Label htmlFor="metodo">Método de Pago *</Label>
                  <Select value={metodo_pago} onValueChange={setMetodoPago}>
                    <SelectTrigger id="metodo">
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Meses a Pagar */}
                <div className="space-y-2">
                  <Label htmlFor="meses">Meses a Pagar *</Label>
                  <Select value={meses_pagar.toString()} onValueChange={(value) => setMesesPagar(parseInt(value))}>
                    <SelectTrigger id="meses">
                      <SelectValue placeholder="Seleccionar meses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 mes</SelectItem>
                      <SelectItem value="2">2 meses</SelectItem>
                      <SelectItem value="3">3 meses</SelectItem>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">12 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Monto */}
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto *</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    readOnly={selCli !== ""} // Solo lectura si hay cliente seleccionado
                  />
                </div>

                {/* Concepto */}
                <div className="space-y-2">
                  <Label htmlFor="concepto">Concepto *</Label>
                  <Input
                    id="concepto"
                    placeholder="Ej: Pago mensual - Plan Básico"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    readOnly={selCli !== ""} // Solo lectura si hay cliente seleccionado
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-4 mt-6">
                <Button onClick={handleRegistrarPago} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Registrar Pago
                </Button>
                <Button onClick={handleActualizarDeudas} variant="secondary" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Actualizar Deudas
                </Button>
                <Button onClick={handleLimpiarFormulario} variant="outline" className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Limpiar
                </Button>
              </div>

              {/* Selector de modo de pago */}
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="font-medium">Modo de Pago:</span>
                  <div className="flex gap-2" role="group" aria-label="Modo de pago">
                    <Button
                      variant={!modoFlexible ? "default" : "outline"}
                      size="sm"
                      onClick={() => setModoFlexible(false)}
                    >
                      Tradicional
                    </Button>
                    <Button
                      variant={modoFlexible ? "default" : "outline"}
                      size="sm"
                      onClick={() => setModoFlexible(true)}
                    >
                      Flexible (Selección de Meses)
                    </Button>
                  </div>
                </div>
              </div>

              {/* MonthSelector para modo flexible */}
              {modoFlexible && selCli && (
                <div className="mt-6">
                  <MonthSelector
                    clienteId={parseInt(selCli)}
                    onMesesSeleccionados={handleMesesSeleccionados}
                    onMontoTotalChange={handleMontoTotalChange}
                  />
                </div>
              )}

              {/* Información del cliente seleccionado */}
              {selCli && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-900">Información del Cliente y Cálculo Automático</h4>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">Cliente seleccionado</span>
                    </div>
                  </div>
                  {(() => {
                    const clienteSeleccionado = clientes.find(c => c.id.toString() === selCli);
                    if (clienteSeleccionado) {
                      // Usar los campos correctos del cliente
                      const precioPorMes = clienteSeleccionado.precio_plan_actual || clienteSeleccionado.precio_plan || 0;
                      const tipoPlan = clienteSeleccionado.tipo_plan_actual || clienteSeleccionado.tipo_plan || 'Sin plan asignado';
                      
                      // Validar que el precio sea válido
                      if (precioPorMes <= 0) {
                        return (
                          <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                              <div className="flex items-center">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                                <span className="text-yellow-800 text-sm">
                                  Este cliente no tiene un plan válido asignado. Contacte al administrador.
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      const totalCalculado = precioPorMes * meses_pagar;
                      const ahorro = meses_pagar > 1 ? (precioPorMes * meses_pagar) - (precioPorMes * meses_pagar) : 0; // Por ahora sin descuento
                      
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Nombre:</span> {clienteSeleccionado.nombres} {clienteSeleccionado.apellidos}
                            </div>
                            <div>
                              <span className="font-medium">Cédula:</span> {clienteSeleccionado.cedula}
                            </div>
                            <div>
                              <span className="font-medium">Plan:</span> {tipoPlan}
                            </div>
                            <div>
                              <span className="font-medium">Precio por Mes:</span> ${precioPorMes.toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="border-t border-blue-200 pt-4">
                            <h5 className="font-medium text-blue-800 mb-2">Cálculo del Pago</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="bg-white p-3 rounded border">
                                <div className="font-medium text-gray-700">Meses a Pagar</div>
                                <div className="text-lg font-bold text-blue-600">{meses_pagar}</div>
                              </div>
                              <div className="bg-white p-3 rounded border">
                                <div className="font-medium text-gray-700">Precio por Mes</div>
                                <div className="text-lg font-bold text-green-600">${precioPorMes.toLocaleString()}</div>
                              </div>
                              <div className="bg-white p-3 rounded border">
                                <div className="font-medium text-gray-700">Total a Pagar</div>
                                <div className="text-lg font-bold text-purple-600">${totalCalculado.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                          
                          {meses_pagar > 1 && (
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <div className="flex items-center">
                                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                <span className="text-green-800 text-sm">
                                  Pago por {meses_pagar} meses - Total: ${totalCalculado.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return <p className="text-blue-700">Cliente no encontrado</p>;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial de Pagos */}
        <TabsContent value="historial">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Historial de Pagos</CardTitle>
                <CardDescription>Gestión y visualización de todos los pagos registrados</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setImportPagosModalOpen(true)} variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Importar Pagos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Búsqueda y Filtros */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por cliente, comprobante o concepto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                </div>
                
                <Select value={filterMetodo} onValueChange={setFilterMetodo}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los métodos</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabla de Pagos */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPagos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">No se encontraron pagos</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPagos.map((pago) => (
                        <TableRow key={pago.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{pago.cliente_nombre || 'Cliente no encontrado'}</div>
                              <div className="text-sm text-gray-500">{pago.concepto || 'Sin concepto'}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm">{pago.numero_comprobante || 'Sin comprobante'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">${(pago.monto || 0).toLocaleString()}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {pago.metodo_pago || 'No especificado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : 'Fecha no disponible'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={pago.comprobante_enviado ? "default" : "secondary"}>
                              {pago.comprobante_enviado ? "Enviado" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDescargarComprobante(pago.id)}
                                disabled={downloading === pago.id}
                                className="flex items-center gap-1"
                              >
                                {downloading === pago.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                Imprimir
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEnviarComprobante(pago.id)}
                                disabled={sendingEmail === pago.id}
                                className="flex items-center gap-1"
                              >
                                {sendingEmail === pago.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Mail className="w-3 h-3" />
                                )}
                                Enviar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Paginación */}
              {pagination.total_pages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.total_pages}
                    totalCount={pagination.total_count}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    showPageSizeSelector={true}
                  />
                </div>
              )}
              
              {/* Botones de Exportación */}
              <div className="mt-6 flex justify-end">
                <ExportButtons
                  tipo="pagos"
                  filtros={filtrosExportacion}
                  className="ml-auto"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

                {/* Tab: Estadísticas */}
        <TabsContent value="estadisticas">
          <div className="space-y-8">
            {/* Header con Diseño Moderno */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
              
              <div className="relative z-10 text-center">
                <h3 className="text-4xl font-bold mb-2">📊 Dashboard Analytics</h3>
                <p className="text-blue-100 text-lg">Análisis completo del sistema de gestión</p>
                <div className="mt-4 flex justify-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{clientes.length}</div>
                    <div className="text-blue-200 text-sm">Clientes Activos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.totalTransacciones}</div>
                    <div className="text-blue-200 text-sm">Transacciones</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">${stats.totalRecaudado.toLocaleString()}</div>
                    <div className="text-blue-200 text-sm">Total Recaudado</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estado del Sistema con Diseño Mejorado */}
            {stats.totalTransacciones === 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full mr-3 animate-pulse"></div>
                  <span className="text-xl font-semibold text-emerald-800">Sistema Listo</span>
                </div>
                <div className="text-center">
                  <div className="text-6xl mb-4">🚀</div>
                  <p className="text-emerald-700 text-lg mb-2">
                    El sistema está completamente limpio y optimizado
                  </p>
                  <p className="text-emerald-600">
                    <strong>{clientes.length} clientes</strong> registrados • 
                    <strong> 0 pagos</strong> en el sistema • 
                    <strong> Base de datos optimizada</strong>
                  </p>
                </div>
              </div>
            )}

            {/* KPIs Principales con Diseño de Tarjetas Modernas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Tarjeta de Clientes */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <Card className="relative bg-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">{clientes.length}</div>
                    <div className="text-blue-800 font-medium">Total Clientes</div>
                    <div className="text-blue-500 text-sm mt-1">Registrados en el sistema</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tarjeta de Transacciones */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <Card className="relative bg-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalTransacciones}</div>
                    <div className="text-green-800 font-medium">Transacciones</div>
                    <div className="text-green-500 text-sm mt-1">Pagos realizados</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tarjeta de Recaudación */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <Card className="relative bg-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-2">${stats.totalRecaudado.toLocaleString()}</div>
                    <div className="text-purple-800 font-medium">Total Recaudado</div>
                    <div className="text-purple-500 text-sm mt-1">Ingresos históricos</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tarjeta de Ticket Promedio */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <Card className="relative bg-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {stats.totalTransacciones > 0 ? `$${stats.promedioTicket.toFixed(0)}` : 'N/A'}
                    </div>
                    <div className="text-orange-800 font-medium">Ticket Promedio</div>
                    <div className="text-orange-500 text-sm mt-1">
                      {stats.totalTransacciones > 0 ? 'Por transacción' : 'Sin transacciones'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Sección de Análisis con Diseño de Grid Moderno */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Análisis del Mes Actual */}
              <div className="space-y-6">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-indigo-800">
                      <Calendar className="w-6 h-6 mr-3 text-indigo-600" />
                      Análisis del Mes Actual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
                        <div className="text-2xl font-bold text-indigo-600">{stats.pagosMesActual}</div>
                        <div className="text-indigo-700 font-medium">Pagos del Mes</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                        <div className="text-2xl font-bold text-purple-600">${stats.recaudacionMesActual.toLocaleString()}</div>
                        <div className="text-purple-700 font-medium">Recaudado</div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-medium">Pagos Hoy</span>
                        <span className="text-2xl font-bold text-green-600">{stats.pagosHoy}</span>
                      </div>
                    </div>
                    {stats.pagosMesActual === 0 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                        <div className="text-indigo-600 text-sm">📅 Sin actividad este mes</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Estado de Deudas */}
              <div className="space-y-6">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-red-800">
                      <AlertTriangle className="w-6 h-6 mr-3 text-red-600" />
                      Estado de Deudas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
                        <div className="text-2xl font-bold text-red-600">{stats.clientesConDeuda}</div>
                        <div className="text-red-700 font-medium">Con Deuda</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                        <div className="text-2xl font-bold text-orange-600">${stats.totalDeudaPendiente.toLocaleString()}</div>
                        <div className="text-orange-700 font-medium">Por Cobrar</div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-medium">Clientes al Día</span>
                        <span className="text-2xl font-bold text-green-600">{clientes.length - stats.clientesConDeuda}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Métodos de Pago con Diseño Mejorado */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-blue-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-gray-800">
                  <BarChart3 className="w-6 h-6 mr-3 text-gray-600" />
                  Distribución por Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.totalTransacciones > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {['efectivo', 'transferencia', 'tarjeta', 'cheque'].map((metodo) => {
                      const count = pagos.filter(p => p.metodo_pago === metodo).length;
                      const percentage = stats.totalTransacciones > 0 ? (count / stats.totalTransacciones) * 100 : 0;
                      
                      return (
                        <div key={metodo} className="group relative">
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                            <div className="text-center">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
                                <CreditCard className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="text-2xl font-bold text-blue-600 mb-1">{count}</div>
                              <div className="text-blue-800 font-medium capitalize mb-1">{metodo}</div>
                              <div className="text-blue-500 text-sm">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-300 text-8xl mb-6">📊</div>
                    <h3 className="text-2xl font-bold text-gray-600 mb-2">Sin Datos de Pagos</h3>
                    <p className="text-gray-500 text-lg mb-4">El sistema está listo para registrar transacciones</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 inline-block">
                      <p className="text-blue-700 text-sm">Los métodos de pago se mostrarán automáticamente cuando se registren pagos</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Panel de Control con Botones Modernos */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 border border-gray-200">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Panel de Control</h3>
                <p className="text-gray-600">Gestiona y actualiza las estadísticas del sistema</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <Button 
                  onClick={handleUpdateStats} 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <RefreshCw className="w-5 h-5 mr-3" />
                  Actualizar Estadísticas
                </Button>
                
                <Button 
                  onClick={handleUpdateDeudas} 
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <AlertTriangle className="w-5 h-5 mr-3" />
                  Actualizar Deudas
                </Button>
              </div>
            </div>
          </div>
          </TabsContent>
        </Tabs>

        {/* Modal de Importación de Pagos */}
        <Dialog open={importPagosModalOpen} onOpenChange={setImportPagosModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Importar Pagos desde CSV o Excel</DialogTitle>
              <DialogDescription>
                Carga un archivo CSV o Excel (.xlsx) con los pagos a importar. El archivo debe contener las columnas: cedula, monto, fecha_pago, metodo_pago, concepto.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Área de selección de archivo */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportingPagosFile(file);
                      setImportPagosResults(null);
                      setImportPagosPreviewData([]);
                    }
                  }}
                  className="hidden"
                  id="pagos-file-input"
                />
                <label htmlFor="pagos-file-input" className="cursor-pointer">
                  <Download className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {importingPagosFile ? importingPagosFile.name : "Haz clic para seleccionar un archivo CSV o Excel"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Máximo 10MB</p>
                </label>
              </div>

              {/* Vista previa */}
              {importPagosPreviewData.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <h4 className="font-medium text-sm">Vista Previa (primeros 5 registros)</h4>
                  </div>
                  <div className="overflow-x-auto max-h-60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {importPagosPreviewData[0]?.map((header, idx) => (
                            <TableHead key={idx} className="text-xs">{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPagosPreviewData.slice(1, 6).map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            {row.map((cell, cellIdx) => (
                              <TableCell key={cellIdx} className="text-xs">{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Resultados de importación */}
              {importPagosResults && (
                <div className={`border rounded-lg p-4 ${importPagosResults.errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {importPagosResults.errors.length > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <h4 className="font-medium">
                      {importPagosResults.errors.length > 0 
                        ? `Importación completada con errores` 
                        : `Importación exitosa`}
                    </h4>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">{importPagosResults.success}</span> pagos importados correctamente
                    {importPagosResults.errors.length > 0 && (
                      <span className="text-red-600">. {importPagosResults.errors.length} errores</span>
                    )}
                  </p>
                  
                  {importPagosResults.errors.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Fila</TableHead>
                            <TableHead className="text-xs">Datos</TableHead>
                            <TableHead className="text-xs">Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPagosResults.errors.slice(0, 10).map((err, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">{err.row}</TableCell>
                              <TableCell className="text-xs">{JSON.stringify(err.data).substring(0, 50)}...</TableCell>
                              <TableCell className="text-xs text-red-600">{err.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {importPagosResults.errors.length > 10 && (
                        <p className="text-xs text-gray-500 mt-2">...y {importPagosResults.errors.length - 10} errores más</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setImportPagosModalOpen(false);
                setImportingPagosFile(null);
                setImportPagosResults(null);
                setImportPagosPreviewData([]);
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleExecutePagosImport} 
                disabled={!importingPagosFile || importingPagos}
              >
                {importingPagos ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importar Pagos
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
