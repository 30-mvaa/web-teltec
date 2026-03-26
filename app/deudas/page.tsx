'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { ExportButtons } from '@/components/ui/export-buttons';
import { 
  Search, DollarSign, AlertTriangle, CheckCircle, Clock, Users, RefreshCw,
  TrendingUp, TrendingDown, Calendar, Filter, Download, Eye, CalendarDays, ArrowLeft,
  Mail, MessageSquare, ChevronUp, ChevronDown, Loader2, FileText, PieChart,
  BarChart3, CreditCard, Send, Printer
} from 'lucide-react';
import { useToast } from "@/app/components/shared/Toast";

// Interfaces
interface Cliente {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  sector_nombre: string;
  fecha_registro: string;
  estado: string;
  tipo_plan: string;
  precio_plan: string;
}

interface Pago {
  id: number;
  cliente_id: number;
  fecha_pago: string;
  monto: number;
  concepto: string;
  metodo_pago: string;
  estado: string;
  numero_comprobante: string;
}

interface MesDeuda {
  mes: string; // Formato: "2026-01"
  fecha_limite: string;
  monto: number;
  pagado: boolean;
  fecha_pago?: string;
  monto_pagado?: number;
}

interface DeudaCalculada {
  cliente: Cliente;
  monto_mensual: number;
  fecha_registro: string;
  meses_desde_registro: number;
  total_debe: number;
  total_pagado: number;
  deuda_actual: number;
  meses_impagos: MesDeuda[];
  todos_los_meses: MesDeuda[];
  ultimo_pago: string | null;
  proximo_vencimiento: string;
  estado: string;
  dias_vencimiento: number;
}

export default function DeudasPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Estados principales
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [deudas, setDeudas] = useState<DeudaCalculada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterMonto, setFilterMonto] = useState<string>('todos');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Estados de ordenamiento
  const [sortField, setSortField] = useState<string>('deuda_actual');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Estados de modales
  const [modalDetalles, setModalDetalles] = useState(false);
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<DeudaCalculada | null>(null);
  const [sendingReminder, setSendingReminder] = useState<number | null>(null);

    // Cargar datos
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar clientes activos
      const clientesResponse = await fetch(`${API_ENDPOINTS.CLIENTES}?estado=activo&page_size=100`);
      if (clientesResponse.ok) {
        const clientesData = await clientesResponse.json();
        if (clientesData.success && Array.isArray(clientesData.data)) {
          const clientesConPlanes = clientesData.data.map((cliente: any) => ({
            ...cliente,
            tipo_plan: cliente.tipo_plan_actual || 'Sin Plan',
            precio_plan: cliente.precio_plan_actual || 0,
            monto_mensual: parseFloat(cliente.precio_plan_actual) || 0
          }));
          
          setClientes(clientesConPlanes);
        }
      }
      
      // Cargar todos los pagos (múltiples páginas si es necesario)
      let allPagos: Pago[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const pagosResponse = await fetch(`${API_ENDPOINTS.PAGOS}?page=${page}&page_size=200`);
        if (pagosResponse.ok) {
          const pagosData = await pagosResponse.json();
          if (pagosData.success && Array.isArray(pagosData.data)) {
            allPagos = [...allPagos, ...pagosData.data];
            hasMore = pagosData.pagination?.has_next || false;
            page++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      setPagos(allPagos);
      
    } catch (error) {
      toast(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Función para refrescar datos sin mostrar loading
  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Cargar clientes activos
      const clientesResponse = await fetch(`${API_ENDPOINTS.CLIENTES}?estado=activo&page_size=100`);
      if (clientesResponse.ok) {
        const clientesData = await clientesResponse.json();
        if (clientesData.success && Array.isArray(clientesData.data)) {
          const clientesConPlanes = clientesData.data.map((cliente: any) => ({
            ...cliente,
            tipo_plan: cliente.tipo_plan_actual || 'Sin Plan',
            precio_plan: cliente.precio_plan_actual || 0,
            monto_mensual: parseFloat(cliente.precio_plan_actual) || 0
          }));
          setClientes(clientesConPlanes);
        }
      }
      
      // Cargar todos los pagos (múltiples páginas si es necesario)
      let allPagos: Pago[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const pagosResponse = await fetch(`${API_ENDPOINTS.PAGOS}?page=${page}&page_size=200`);
        if (pagosResponse.ok) {
          const pagosData = await pagosResponse.json();
          if (pagosData.success && Array.isArray(pagosData.data)) {
            allPagos = [...allPagos, ...pagosData.data];
            hasMore = pagosData.pagination?.has_next || false;
            page++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      setPagos(allPagos);
      toast("Datos actualizados correctamente", "success");
      
    } catch (error) {
      toast('Error al refrescar los datos. Por favor, intenta de nuevo.', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [toast]);


  // Calcular deudas acumuladas desde la fecha de registro
  const calcularDeudasAcumuladas = useCallback(() => {
    if (clientes.length === 0) return;
    
    // console.log('Calculando deudas para', clientes.length, 'clientes');
    // console.log('Pagos disponibles:', pagos.length);
    
    const deudasCalculadas: DeudaCalculada[] = [];
    const fechaActual = new Date();
    
    clientes.forEach((cliente, index) => {
      // console.log(`Procesando cliente ${index + 1}:`, cliente.nombres, cliente.apellidos);
      // console.log('Plan del cliente:', cliente.tipo_plan, 'Precio:', cliente.precio_plan);
      
      // Obtener pagos del cliente
      const pagosCliente = pagos.filter(p => p.cliente_id === cliente.id && p.estado === 'completado');
      // console.log(`Pagos del cliente ${cliente.nombres}:`, pagosCliente.length);
      
      // Verificar si hay pagos duplicados por ID
      const pagosUnicos = pagosCliente.filter((pago, index, self) => 
        index === self.findIndex(p => p.id === pago.id)
      );
      
      if (pagosUnicos.length !== pagosCliente.length) {
        // console.warn(`⚠️ PAGOS DUPLICADOS detectados para ${cliente.nombres}:`, {
        //   total: pagosCliente.length,
        //   unicos: pagosUnicos.length,
        //   duplicados: pagosCliente.length - pagosUnicos.length
        // });
      }
      
      // Mostrar detalles de cada pago para debugging
      // pagosCliente.forEach((pago, idx) => {
      //   console.log(`  Pago ${idx + 1}: $${pago.monto} el ${pago.fecha_pago} (cliente: ${pago.cliente_id})`);
      // });
      
      // Calcular información básica
      const montoMensual = parseFloat(cliente.precio_plan) || 0;
      const fechaRegistro = new Date(cliente.fecha_registro);
      
      // Calcular meses desde el registro hasta el último mes vencido
      // Ajustar fechaRegistro al primer día del mes para cálculo consistente
      const fechaRegistroInicio = new Date(fechaRegistro.getFullYear(), fechaRegistro.getMonth(), 1);
      const fechaActualInicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
      
      // Calcular diferencia de meses
      // CORRECCIÓN: El problema reportado es que está tomando un mes de más
      // El cálculo debe ser consistente con el backend de Django
      // En Django: meses_desde_registro = (hoy.year - fecha_registro.year) * 12 + (hoy.month - fecha_registro.month)
      // Y luego se ajusta si hoy.day < fecha_registro.day (resta 1)
      // El frontend estaba agregando +1 que no existe en el backend, causando un mes extra
      const añosDiferencia = fechaActualInicio.getFullYear() - fechaRegistroInicio.getFullYear();
      const mesesDiferencia = fechaActualInicio.getMonth() - fechaRegistroInicio.getMonth();
      let mesesDesdeRegistro = añosDiferencia * 12 + mesesDiferencia;
      
      // Ajustar si el día actual es menor que el día de registro (similar a Django)
      if (fechaActual.getDate() < fechaRegistro.getDate()) {
        mesesDesdeRegistro -= 1;
      }
      
      // Asegurar que no sea negativo
      mesesDesdeRegistro = Math.max(0, mesesDesdeRegistro);
      
      // CORRECCIÓN: El +1 original estaba agregando un mes extra
      // Ahora el cálculo es consistente con el backend de Django
      
      // console.log('=== INICIO CÁLCULO DEUDA ===');
      // console.log('Cliente:', cliente.nombres, cliente.apellidos);
      // console.log('Fecha registro:', cliente.fecha_registro);
      // console.log('Fecha registro (local):', fechaRegistro.toLocaleDateString());
      // console.log('Fecha registro inicio:', fechaRegistroInicio.toISOString().split('T')[0]);
      // console.log('Fecha actual:', fechaActual.toISOString().split('T')[0]);
      // console.log('Fecha actual (local):', fechaActual.toLocaleDateString());
      // console.log('Fecha actual inicio:', fechaActualInicio.toISOString().split('T')[0]);
      // console.log('Años diferencia:', añosDiferencia);
      // console.log('Meses diferencia:', mesesDiferencia);
      // console.log('Meses desde registro:', mesesDesdeRegistro);
      // console.log('Monto mensual:', montoMensual);
      
      // Calcular total pagado (usar pagos únicos si hay duplicados)
      const pagosParaCalcular = pagosUnicos.length !== pagosCliente.length ? pagosUnicos : pagosCliente;
      
        // Generar array de meses desde el registro hasta el mes actual
        const mesesDeuda: MesDeuda[] = [];
        
        // Ordenar pagos por fecha para asignación cronológica
        const pagosOrdenados = pagosParaCalcular.sort((a: Pago, b: Pago) => 
          new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime()
        );
        
      // Crear array de meses desde el mes de registro hasta el mes actual
      const mesesVistos = new Set<string>(); // Para evitar duplicados
      
      // console.log(`Generando ${mesesDesdeRegistro} meses desde ${fechaRegistroInicio.toISOString().split('T')[0]} hasta ${fechaActualInicio.toISOString().split('T')[0]}`);
      
        for (let i = 0; i < mesesDesdeRegistro; i++) {
        const añoMes = new Date(fechaRegistroInicio.getFullYear(), fechaRegistroInicio.getMonth() + i, 1);
        const mesKey = `${añoMes.getFullYear()}-${String(añoMes.getMonth() + 1).padStart(2, '0')}`;
        
        // Evitar meses duplicados
        if (mesesVistos.has(mesKey)) {
          // console.warn(`⚠️ Mes duplicado detectado: ${mesKey}, saltando...`);
          continue;
        }
        mesesVistos.add(mesKey);
          
          // Calcular la fecha límite de pago (final del mes)
        const fechaLimite = new Date(añoMes.getFullYear(), añoMes.getMonth() + 1, 0); // Último día del mes
          
          mesesDeuda.push({
            mes: mesKey,
            fecha_limite: fechaLimite.toISOString().split('T')[0],
            monto: montoMensual,
            pagado: false, // Inicialmente no pagado
            fecha_pago: undefined,
            monto_pagado: 0
          });
        }
      
      // console.log(`Meses generados (${mesesDeuda.length}):`, mesesDeuda.map(m => m.mes).join(', '));
        
        // Asignar pagos a meses de forma acumulativa
        let pagoIndex = 0;
        let montoRestante = 0;
        
        for (let i = 0; i < mesesDeuda.length; i++) {
          const mes = mesesDeuda[i];
          const mesFecha = new Date(mes.mes + '-01');
          
          // Si no hay monto restante del pago anterior, tomar el siguiente pago
          if (montoRestante <= 0 && pagoIndex < pagosOrdenados.length) {
            const pago = pagosOrdenados[pagoIndex];
            montoRestante = pago.monto;
            pagoIndex++;
            // console.log(`  💰 Asignando pago $${pago.monto} del ${pago.fecha_pago} a partir del mes ${mes.mes}`);
          }
          
          // Si hay monto restante, asignar al mes actual
          if (montoRestante > 0) {
            const montoAsignado = Math.min(montoRestante, mes.monto);
            montoRestante -= montoAsignado;
            
            mes.pagado = true;
            mes.monto_pagado = montoAsignado;
            mes.fecha_pago = pagosOrdenados[pagoIndex - 1]?.fecha_pago;
            
            // console.log(`  ✅ Mes ${mes.mes}: pagado=true, monto=${mes.monto}, asignado=${montoAsignado}, restante=${montoRestante}`);
          } else {
            // Si no hay monto restante, verificar si el mes ya venció
            const fechaLimite = new Date(mes.fecha_limite);
            fechaLimite.setHours(23, 59, 59, 999); // Final del día límite
            const mesVencido = fechaLimite < fechaActual;
            
            if (!mesVencido) {
              // Mes futuro o mes actual (aún no vencido)
              // El mes actual se considera pagado si no ha pasado el día límite
              const esMesActual = mes.mes === `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
              if (esMesActual) {
                // Mes actual: no se considera impago hasta que pase el día límite
                // console.log(`  ⏰ Mes ${mes.mes}: MES ACTUAL (aún no vencimiento)`);
            } else {
                // Mes futuro: no se considera impago
                mes.pagado = true; // Mes futuro no cuenta como impago
                // console.log(`  ⏰ Mes ${mes.mes}: FUTURO (no vencimiento)`);
              }
            } else {
              // Mes vencido sin pago
              // console.log(`  ❌ Mes ${mes.mes}: IMPAGO (vencido)`);
            }
          }
        }
      
      // Calcular total pagado (usar pagos únicos si hay duplicados)
      const totalPagado = pagosParaCalcular.reduce((sum: number, pago: Pago) => sum + pago.monto, 0);
      
      // console.log(`Pagos para ${cliente.nombres}:`, {
      //   cantidadPagos: pagosCliente.length,
      //   pagosUnicos: pagosUnicos.length,
      //   usandoPagosUnicos: pagosParaCalcular === pagosUnicos,
      //   pagos: pagosParaCalcular.map((p: Pago) => ({ id: p.id, monto: p.monto, fecha: p.fecha_pago })),
      //   totalPagado
      // });
      
      // La deuda actual es: (Plan × Meses desde registro) - Total Pagado
      // CORRECCIÓN: mesesDesdeRegistro ahora se calcula de forma consistente con el backend de Django
      // sin el +1 que estaba agregando un mes extra
      const totalDebeTeorico = mesesDesdeRegistro * montoMensual;
      const deudaActual = Math.max(0, totalDebeTeorico - totalPagado); // No permitir deuda negativa
      
      // Calcular meses impagos vencidos (excluyendo el mes actual si aún no ha vencido)
      const mesesImpagosVencidos = mesesDeuda.filter(m => {
        if (m.pagado) return false;
        // Si el mes ya venció (fecha límite pasó), es impago
        const fechaLimite = new Date(m.fecha_limite);
        fechaLimite.setHours(23, 59, 59, 999);
        return fechaLimite < fechaActual;
      });
      
      // console.log('=== RESUMEN CÁLCULO ===');
      // console.log('Cliente:', cliente.nombres + ' ' + cliente.apellidos);
      // console.log('Meses desde registro:', mesesDesdeRegistro);
      // console.log('Monto mensual:', montoMensual);
      // console.log('Total debe teórico:', totalDebeTeorico);
      // console.log('Total pagado:', totalPagado);
      // console.log('Deuda actual:', deudaActual);
      // console.log('Meses impagos (vencidos):', mesesImpagosVencidos.length);
      // console.log('Todos los meses:', mesesDeuda.length);
      // console.log('=== FIN CÁLCULO ===');
      
      // Calcular próximo vencimiento
      const proximoVencimiento = new Date(fechaRegistro);
      proximoVencimiento.setMonth(fechaRegistro.getMonth() + mesesDesdeRegistro + 1);
      proximoVencimiento.setDate(fechaRegistro.getDate());
      
      // Calcular días de vencimiento
      const diasVencimiento = Math.ceil((proximoVencimiento.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determinar estado basado en meses impagos y pagos con validaciones mejoradas
      let estado = 'al_dia';
      
      if (deudaActual > 0) {
        // Usar mesesImpagosVencidos que ya calculamos arriba (solo meses cuya fecha límite ya pasó)
        const mesesImpagosArray = mesesImpagosVencidos;
        const mesesPagados = mesesDeuda.filter(m => m.pagado);
        const todosLosImpagos = mesesDeuda.filter(m => !m.pagado); // Todos los impagos (incluyendo futuros)
        
        // console.log(`Cliente ${cliente.nombres}:`, {
        //   totalMeses: mesesDeuda.length,
        //   mesesImpagos: mesesImpagosArray.length,
        //   mesesPagados: mesesPagados.length,
        //   deudaActual
        // });
        
        if (mesesImpagosArray.length > 0) {
          // Si hay meses vencidos impagos, el estado es 'vencida'
            estado = 'vencida';
          // console.log(`  → Meses vencidos encontrados: ${mesesImpagosArray.map(m => m.mes).join(', ')}`);
        } else if (todosLosImpagos.length > 0) {
          // Si no hay meses vencidos pero hay meses impagos futuros, verificar si el próximo mes está por vencer
          const mesActual = new Date();
            const proximoMes = new Date(mesActual);
            proximoMes.setMonth(mesActual.getMonth() + 1);
            const proximoMesKey = `${proximoMes.getFullYear()}-${String(proximoMes.getMonth() + 1).padStart(2, '0')}`;
            
          const proximoMesImpago = todosLosImpagos.find(m => m.mes === proximoMesKey);
            if (proximoMesImpago) {
              estado = 'por_vencer';
              // console.log(`  → Próximo mes por vencer: ${proximoMesKey}`);
            } else {
              estado = 'pendiente';
              // console.log(`  → Estado pendiente - meses impagos futuros`);
          }
        }
        
        // Si hay meses pagados, el estado puede ser 'al_dia' si todos los meses están pagados
        if (mesesPagados.length > 0 && mesesImpagosArray.length === 0 && todosLosImpagos.length === 0) {
          estado = 'al_dia';
          // console.log(`  → Todos los meses están pagados → al_dia`);
        }
        
        // Si hay meses pagados pero también impagos vencidos, el estado es 'vencida'
        if (mesesPagados.length > 0 && mesesImpagosArray.length > 0) {
          // console.log(`  → Cliente con ${mesesPagados.length} meses pagados y ${mesesImpagosArray.length} impagos vencidos`);
            estado = 'vencida';
          // console.log(`  → Meses vencidos impagos: ${mesesImpagosArray.map(m => m.mes).join(', ')} → vencida`);
        }
      } else {
        // Si no hay deuda, verificar si es porque todos los meses están pagados
        if (mesesDeuda.length > 0) {
          const todosPagados = mesesDeuda.every(m => m.pagado);
          if (todosPagados) {
            estado = 'al_dia';
            // console.log(`  → Sin deuda porque todos los meses están pagados → al_dia`);
          } else {
            estado = 'al_dia';
            // console.log(`  → Sin deuda → al_dia`);
          }
        } else {
          estado = 'al_dia';
          // console.log(`  → Sin meses de deuda → al_dia`);
        }
      }
      
            // console.log(`Estado final para ${cliente.nombres}: ${estado}`);
      
      // Calcular resumen para el log (usar mesesImpagosVencidos que ya calculamos)
      const mesesPagados = mesesDeuda.filter(m => m.pagado);
      // console.log(`  → Resumen: ${mesesPagados.length} pagados, ${mesesImpagosVencidos.length} impagos (vencidos), Deuda: $${deudaActual}`);
        
        // Último pago
        const ultimoPago = pagosCliente.length > 0 ? 
          pagosCliente[pagosCliente.length - 1].fecha_pago : null;
      
      deudasCalculadas.push({
        cliente,
        monto_mensual: montoMensual,
        fecha_registro: cliente.fecha_registro,
        meses_desde_registro: Math.max(0, mesesDesdeRegistro),
        total_debe: mesesDesdeRegistro * montoMensual,
        total_pagado: totalPagado,
        deuda_actual: deudaActual,
        meses_impagos: mesesImpagosVencidos, // Solo meses vencidos (fecha límite ya pasó)
        todos_los_meses: mesesDeuda,
        ultimo_pago: ultimoPago,
        proximo_vencimiento: proximoVencimiento.toISOString().split('T')[0],
        estado,
        dias_vencimiento: diasVencimiento
      });
    });
     
    setDeudas(deudasCalculadas);
  }, [clientes, pagos]);

  // Filtrar deudas por año seleccionado
  const deudasFiltradasPorAño = useMemo(() => {
    if (filterYear === 'todos') {
      return deudas;
    }
    
    const añoNum = parseInt(filterYear);
    return deudas.filter(deuda => {
      // Filtrar si tiene meses del año seleccionado
      const tieneMesesDelAño = deuda.todos_los_meses.some(m => {
        const mesAño = parseInt(m.mes.split('-')[0]);
        return mesAño === añoNum;
      });
      
      // O si el cliente se registró en ese año
      const añoRegistro = new Date(deuda.cliente.fecha_registro).getFullYear();
      const registroEnAño = añoRegistro === añoNum;
      
      return tieneMesesDelAño || registroEnAño;
    });
  }, [deudas, filterYear]);

  // Aplicar filtros de búsqueda a las deudas filtradas por año
  const deudasFiltradas = useMemo(() => {
    return deudasFiltradasPorAño.filter(deuda => {
      const cumpleBusqueda = `${deuda.cliente.nombres} ${deuda.cliente.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             deuda.cliente.cedula.includes(searchTerm);
      
      const cumpleSector = filterSector === 'todos' || deuda.cliente.sector_nombre === filterSector;
      const cumpleEstado = filterEstado === 'todos' || deuda.estado === filterEstado;
      
      let cumpleMonto = true;
      const deudaActual = deuda.deuda_actual;
      if (filterMonto === 'bajo' && deudaActual >= 50) cumpleMonto = false;
      if (filterMonto === 'medio' && (deudaActual < 50 || deudaActual >= 100)) cumpleMonto = false;
      if (filterMonto === 'alto' && deudaActual < 100) cumpleMonto = false;
      
      return cumpleBusqueda && cumpleSector && cumpleEstado && cumpleMonto;
    });
  }, [deudasFiltradasPorAño, searchTerm, filterSector, filterEstado, filterMonto]);

  // Ordenar deudas
  const deudasOrdenadas = useMemo(() => {
    const sorted = [...deudasFiltradas].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'cliente':
          aVal = `${a.cliente.nombres} ${a.cliente.apellidos}`.toLowerCase();
          bVal = `${b.cliente.nombres} ${b.cliente.apellidos}`.toLowerCase();
          break;
        case 'deuda_actual':
          aVal = a.deuda_actual;
          bVal = b.deuda_actual;
          break;
        case 'total_pagado':
          aVal = a.total_pagado;
          bVal = b.total_pagado;
          break;
        case 'meses_impagos':
          aVal = a.meses_impagos.length;
          bVal = b.meses_impagos.length;
          break;
        case 'estado':
          aVal = a.estado;
          bVal = b.estado;
          break;
        case 'ultimo_pago':
          aVal = a.ultimo_pago || '1900-01-01';
          bVal = b.ultimo_pago || '1900-01-01';
          break;
        default:
          aVal = a.deuda_actual;
          bVal = b.deuda_actual;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return sorted;
  }, [deudasFiltradas, sortField, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(deudasOrdenadas.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const deudasPaginadas = deudasOrdenadas.slice(startIndex, endIndex);

  // Efecto para resetear página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSector, filterEstado, filterMonto, filterYear]);

  // Función para cambiar ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Función para enviar recordatorio de pago
  const handleEnviarRecordatorio = async (deuda: DeudaCalculada) => {
    setSendingReminder(deuda.cliente.id);
    try {
      const mensaje = `Estimado/a ${deuda.cliente.nombres} ${deuda.cliente.apellidos}, le informamos que tiene una deuda pendiente de $${deuda.deuda_actual.toFixed(2)} correspondiente a ${deuda.meses_impagos.length} mes(es). Por favor, regularice su situación.`;
      
      // Intentar enviar por WhatsApp si hay teléfono
      if (deuda.cliente.telefono) {
        const telefonoLimpio = deuda.cliente.telefono.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
        window.open(whatsappUrl, '_blank');
        toast("Redirigiendo a WhatsApp...", "success");
      } else if (deuda.cliente.email) {
        const emailUrl = `mailto:${deuda.cliente.email}?subject=Recordatorio de Pago&body=${encodeURIComponent(mensaje)}`;
        window.location.href = emailUrl;
        toast("Redirigiendo al correo electrónico...", "success");
      } else {
        toast("No hay forma de contactar al cliente. Verifique teléfono o email.", "error");
      }
    } catch (error) {
      toast("Error al enviar el recordatorio", "error");
    } finally {
      setSendingReminder(null);
    }
  };

  // Función para navegar al módulo de recaudación con el cliente seleccionado
  const handleRegistrarPago = (deuda: DeudaCalculada) => {
    router.push(`/recaudacion?cliente=${deuda.cliente.id}`);
  };

  // Función para exportar deudas a CSV
  const handleExport = useCallback(() => {
    if (deudasFiltradas.length === 0) {
      toast('No hay deudas para exportar', 'error');
      return;
    }

    // Preparar datos para CSV
    const headers = [
      'Cédula',
      'Cliente',
      'Sector',
      'Monto Mensual',
      'Fecha Registro',
      'Meses desde Registro',
      'Total Debe',
      'Total Pagado',
      'Deuda Actual',
      'Meses Impagos',
      'Estado',
      'Último Pago',
      'Próximo Vencimiento'
    ];

    const rows = deudasFiltradas.map(deuda => {
      const fechaRegistro = new Date(deuda.fecha_registro).toLocaleDateString('es-ES');
      const ultimoPago = deuda.ultimo_pago ? new Date(deuda.ultimo_pago).toLocaleDateString('es-ES') : 'N/A';
      const proximoVencimiento = new Date(deuda.proximo_vencimiento).toLocaleDateString('es-ES');
      
      return [
        deuda.cliente.cedula || '',
        `${deuda.cliente.nombres} ${deuda.cliente.apellidos}`.trim(),
        deuda.cliente.sector_nombre || '',
        `$${deuda.monto_mensual.toFixed(2)}`,
        fechaRegistro,
        deuda.meses_desde_registro.toString(),
        `$${deuda.total_debe.toFixed(2)}`,
        `$${deuda.total_pagado.toFixed(2)}`,
        `$${deuda.deuda_actual.toFixed(2)}`,
        deuda.meses_impagos.length.toString(),
        deuda.estado === 'vencida' ? 'Vencida' : 
        deuda.estado === 'por_vencer' ? 'Por Vencer' : 
        deuda.estado === 'pendiente' ? 'Pendiente' : 'Al Día',
        ultimoPago,
        proximoVencimiento
      ];
    });

    // Crear contenido CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Crear y descargar archivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `deudas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [deudasFiltradas]);

  // Obtener estadísticas
  const estadisticas = {
    totalClientes: clientes.length,
    clientesConDeuda: deudas.filter(d => d.meses_impagos.length > 0).length,
    clientesAlDia: deudas.filter(d => d.meses_impagos.length === 0).length,
    deudasVencidas: deudas.filter(d => d.estado === 'vencida').length,
    deudasPorVencer: deudas.filter(d => d.estado === 'por_vencer').length,
    montoTotalDeuda: deudas.reduce((sum, d) => sum + d.deuda_actual, 0),
    montoTotalRecaudado: deudas.reduce((sum, d) => sum + d.total_pagado, 0),
    totalMesesImpagos: deudas.reduce((sum, d) => sum + d.meses_impagos.length, 0)
  };

  // Obtener sectores únicos
  const sectores = [...new Set(clientes.map(c => c.sector_nombre))];

  // Obtener años disponibles dinámicamente (año próximo + año actual + 5 años atrás)
  const añosDisponibles = useMemo(() => {
    const añoActual = new Date().getFullYear();
    const años: string[] = [];
    // Incluir el próximo año para planificación
    años.push((añoActual + 1).toString());
    // Incluir año actual y hasta 5 años atrás
    for (let año = añoActual; año >= añoActual - 5; año--) {
      años.push(año.toString());
    }
    return años;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Estadísticas filtradas por año
  const estadisticasAnio = useMemo(() => {
    const yearNum = parseInt(filterYear);
    const clientesFiltrados = filterYear === 'todos' 
      ? clientes 
      : clientes.filter(c => new Date(c.fecha_registro).getFullYear() === yearNum);
    
    return {
      totalClientes: filterYear === 'todos' ? clientes.length : clientesFiltrados.length,
      clientesConDeuda: deudasFiltradasPorAño.filter(d => d.meses_impagos.length > 0).length,
      clientesAlDia: deudasFiltradasPorAño.filter(d => d.meses_impagos.length === 0).length,
      deudasVencidas: deudasFiltradasPorAño.filter(d => d.estado === 'vencida').length,
      deudasPorVencer: deudasFiltradasPorAño.filter(d => d.estado === 'por_vencer').length,
      montoTotalDeuda: deudasFiltradasPorAño.reduce((sum, d) => sum + d.deuda_actual, 0),
      montoTotalRecaudado: deudasFiltradasPorAño.reduce((sum, d) => sum + d.total_pagado, 0),
      totalMesesImpagos: deudasFiltradasPorAño.reduce((sum, d) => sum + d.meses_impagos.length, 0)
    };
  }, [deudasFiltradasPorAño, clientes, filterYear]);

  // Obtener badge de estado
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'al_dia':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Al Día
          </Badge>
        );
      case 'pendiente':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'por_vencer':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Por Vencer
          </Badge>
        );
      case 'vencida':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Vencida
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            {estado}
          </Badge>
        );
    }
  };

  // Handlers
  const handleVerDetalles = (deuda: DeudaCalculada) => {
    setDeudaSeleccionada(deuda);
    setModalDetalles(true);
  };

  // Generar Reporte de Morosidad (CSV)
  const generarReporteMorosidad = () => {
    const deudasVencidas = deudasFiltradasPorAño.filter(d => d.estado === 'vencida');
    
    if (deudasVencidas.length === 0) {
      toast("No hay deudas vencidas para el reporte", "success");
      return;
    }

    const headers = ['Cédula', 'Cliente', 'Teléfono', 'Email', 'Sector', 'Plan', 'Deuda', 'Meses Vencidos', 'Último Pago'];
    const rows = deudasVencidas.map(d => [
      d.cliente.cedula,
      `${d.cliente.nombres} ${d.cliente.apellidos}`,
      d.cliente.telefono || '',
      d.cliente.email || '',
      d.cliente.sector_nombre || '',
      d.cliente.tipo_plan,
      d.deuda_actual.toFixed(2),
      d.meses_impagos.length.toString(),
      d.ultimo_pago ? new Date(d.ultimo_pago).toLocaleDateString() : 'Sin pagos'
    ]);

    descargarCSV([headers, ...rows], `reporte_morosidad_${filterYear}_${new Date().toISOString().split('T')[0]}`);
    toast(`Reporte generado: ${deudasVencidas.length} clientes morosos (${filterYear})`, "success");
  };

  // Generar Reporte de Morosidad (TXT detallado)
  const generarReporteMorosidadDetallado = () => {
    const deudasVencidas = deudasFiltradasPorAño.filter(d => d.estado === 'vencida');
    
    if (deudasVencidas.length === 0) {
      toast("No hay deudas vencidas para el reporte", "success");
      return;
    }

    const contenido = [
      "═══════════════════════════════════════════════════════════════",
      "                    REPORTE DE MOROSIDAD",
      "                    TelTec - Gestión de Deudas",
      `                    Año: ${filterYear}`,
      `                    Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      "═══════════════════════════════════════════════════════════════",
      "",
      "RESUMEN EJECUTIVO",
      "───────────────────────────────────────────────────────────────",
      `Total Clientes con Deuda Vencida: ${deudasVencidas.length}`,
      `Monto Total Vencido: $${deudasVencidas.reduce((sum, d) => sum + d.deuda_actual, 0).toFixed(2)}`,
      `Promedio de Deuda por Cliente: $${(deudasVencidas.reduce((sum, d) => sum + d.deuda_actual, 0) / deudasVencidas.length).toFixed(2)}`,
      "",
      "DETALLE DE CLIENTES MOROSOS",
      "───────────────────────────────────────────────────────────────",
      "",
      ...deudasVencidas.map((d, i) => [
        `${i + 1}. ${d.cliente.nombres} ${d.cliente.apellidos}`,
        `   Cédula: ${d.cliente.cedula}`,
        `   Contacto: ${d.cliente.telefono || 'Sin teléfono'} | ${d.cliente.email || 'Sin email'}`,
        `   Sector: ${d.cliente.sector_nombre || 'No asignado'}`,
        `   Plan: ${d.cliente.tipo_plan} - $${d.monto_mensual}/mes`,
        `   Deuda Actual: $${d.deuda_actual.toFixed(2)}`,
        `   Meses Vencidos: ${d.meses_impagos.length}`,
        `   Meses Pendientes: ${d.meses_impagos.map(m => m.mes).join(', ')}`,
        `   Último Pago: ${d.ultimo_pago ? new Date(d.ultimo_pago).toLocaleDateString() : 'Sin pagos'}`,
        `   Estado: ⚠️ MOROSO`,
        "",
      ]).flat(),
      "═══════════════════════════════════════════════════════════════",
      "Este reporte fue generado automáticamente por TelTec",
      `Hora de generación: ${new Date().toLocaleTimeString('es-ES')}`,
      "═══════════════════════════════════════════════════════════════",
    ].join('\n');

    descargarArchivo(contenido, `reporte_morosidad_detalle_${filterYear}`);
    toast("Reporte detallado de morosidad generado", "success");
  };

  // Generar Reporte Resumen Ejecutivo
  const generarReporteResumen = () => {
    const hoy = new Date();
    
    const contenido = [
      "═══════════════════════════════════════════════════════════════",
      "                  RESUMEN EJECUTIVO DE DEUDAS",
      `                      TelTec - ${filterYear}`,
      `                  Fecha: ${hoy.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      "═══════════════════════════════════════════════════════════════",
      "",
      "INDICADORES GENERALES",
      "───────────────────────────────────────────────────────────────",
      `Año Filtrado: ${filterYear}`,
      `Total Clientes: ${deudasFiltradasPorAño.length}`,
      `Clientes Al Día: ${estadisticasAnio.clientesAlDia}`,
      `Clientes con Deuda: ${estadisticasAnio.clientesConDeuda}`,
      "",
      "ESTADO DE DEUDAS",
      "───────────────────────────────────────────────────────────────",
      `Deuda Total: $${estadisticasAnio.montoTotalDeuda.toFixed(2)}`,
      `Total Recaudado: $${estadisticasAnio.montoTotalRecaudado.toFixed(2)}`,
      `Meses Impagos Totales: ${estadisticasAnio.totalMesesImpagos}`,
      "",
      "CLASIFICACIÓN DE DEUDAS",
      "───────────────────────────────────────────────────────────────",
      `Al Día: ${deudasFiltradasPorAño.filter(d => d.estado === 'al_dia').length} clientes`,
      `Pendiente: ${deudasFiltradasPorAño.filter(d => d.estado === 'pendiente').length} clientes`,
      `Por Vencer: ${deudasFiltradasPorAño.filter(d => d.estado === 'por_vencer').length} clientes`,
      `Vencida: ${deudasFiltradasPorAño.filter(d => d.estado === 'vencida').length} clientes`,
      "",
      "DEUDAS POR SECTOR",
      "───────────────────────────────────────────────────────────────",
      ...sectores.map(sector => {
        const deudasSector = deudasFiltradasPorAño.filter(d => d.cliente.sector_nombre === sector);
        const vencidas = deudasSector.filter(d => d.estado === 'vencida').length;
        const totalDeuda = deudasSector.reduce((sum, d) => sum + d.deuda_actual, 0);
        return `${sector}: ${deudasSector.length} clientes | ${vencidas} vencidas | $${totalDeuda.toFixed(2)}`;
      }),
      "",
      "═══════════════════════════════════════════════════════════════",
      "Este reporte fue generado automáticamente por TelTec",
      `Hora de generación: ${hoy.toLocaleTimeString('es-ES')}`,
      "═══════════════════════════════════════════════════════════════",
    ].join('\n');

    descargarArchivo(contenido, `resumen_ejecutivo_${filterYear}`);
    toast(`Resumen ejecutivo generado (${filterYear})`, "success");
  };

  // Generar Reporte de Deudas por Período
  const generarReportePeriodo = () => {
    const hoy = new Date();
    const añoSeleccionado = parseInt(filterYear);
    const hace3Meses = new Date(añoSeleccionado, hoy.getMonth() - 3, 1);
    
    const deudasPeriodo = deudasFiltradasPorAño.filter(d => {
      const fechaRegistro = new Date(d.fecha_registro);
      return fechaRegistro >= hace3Meses;
    });

    const headers = ['Cédula', 'Cliente', 'Fecha Registro', 'Estado', 'Deuda', 'Meses Impagos'];
    const rows = deudasPeriodo.map(d => [
      d.cliente.cedula,
      `${d.cliente.nombres} ${d.cliente.apellidos}`,
      new Date(d.fecha_registro).toLocaleDateString(),
      d.estado === 'vencida' ? 'Vencida' : d.estado === 'por_vencer' ? 'Por Vencer' : d.estado === 'pendiente' ? 'Pendiente' : 'Al Día',
      d.deuda_actual.toFixed(2),
      d.meses_impagos.length.toString()
    ]);

    descargarCSV([headers, ...rows], `reporte_periodo_${filterYear}_${hace3Meses.toISOString().split('T')[0]}_${hoy.toISOString().split('T')[0]}`);
    toast(`Reporte de período generado: ${deudasPeriodo.length} clientes (${filterYear})`, "success");
  };

  // Generar Reporte de Clientes con Deudas (CSV)
  const generarReporteClientesDeuda = () => {
    const clientesConDeuda = deudasFiltradasPorAño.filter(d => d.deuda_actual > 0);
    
    if (clientesConDeuda.length === 0) {
      toast("No hay clientes con deudas para exportar", "success");
      return;
    }

    const headers = ['Cédula', 'Cliente', 'Teléfono', 'Email', 'Sector', 'Plan', 'Precio Plan', 'Deuda Actual', 'Total Pagado', 'Meses Impagos', 'Último Pago', 'Estado'];
    const rows = clientesConDeuda.map(d => [
      d.cliente.cedula,
      `${d.cliente.nombres} ${d.cliente.apellidos}`,
      d.cliente.telefono || '',
      d.cliente.email || '',
      d.cliente.sector_nombre || '',
      d.cliente.tipo_plan,
      d.monto_mensual.toFixed(2),
      d.deuda_actual.toFixed(2),
      d.total_pagado.toFixed(2),
      d.meses_impagos.length.toString(),
      d.ultimo_pago ? new Date(d.ultimo_pago).toLocaleDateString() : 'Sin pagos',
      d.estado === 'vencida' ? 'Vencida' : d.estado === 'por_vencer' ? 'Por Vencer' : d.estado === 'pendiente' ? 'Pendiente' : 'Al Día'
    ]);

    descargarCSV([headers, ...rows], `reporte_clientes_deuda_${filterYear}_${new Date().toISOString().split('T')[0]}`);
    toast(`Reporte generado: ${clientesConDeuda.length} clientes con deuda (${filterYear})`, "success");
  };

  // Generar Reporte de Deudas por Sector
  const generarReportePorSector = () => {
    const headers = ['Sector', 'Total Clientes', 'Clientes Al Día', 'Clientes con Deuda', 'Deudas Vencidas', 'Deuda Total', 'Meses Impagos'];
    const rows = sectores.map(sector => {
      const deudasSector = deudasFiltradasPorAño.filter(d => d.cliente.sector_nombre === sector);
      const alDia = deudasSector.filter(d => d.estado === 'al_dia').length;
      const conDeuda = deudasSector.filter(d => d.deuda_actual > 0).length;
      const vencidas = deudasSector.filter(d => d.estado === 'vencida').length;
      const totalDeuda = deudasSector.reduce((sum, d) => sum + d.deuda_actual, 0);
      const mesesImpagos = deudasSector.reduce((sum, d) => sum + d.meses_impagos.length, 0);
      return [sector, deudasSector.length.toString(), alDia.toString(), conDeuda.toString(), vencidas.toString(), totalDeuda.toFixed(2), mesesImpagos.toString()];
    });

    descargarCSV([headers, ...rows], `reporte_por_sector_${filterYear}_${new Date().toISOString().split('T')[0]}`);
    toast(`Reporte por sector generado: ${sectores.length} sectores (${filterYear})`, "success");
  };

  // Función auxiliar para descargar archivo TXT
  const descargarArchivo = (contenido: string, nombre: string) => {
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombre}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Función auxiliar para descargar archivo CSV
  const descargarCSV = (data: string[][], filename: string) => {
    const csvContent = data.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Efectos
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    calcularDeudasAcumuladas();
  }, [calcularDeudasAcumuladas]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-slate-600">Cargando módulo de deudas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push('/dashboard')}
                  className="gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </Button>
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-slate-900">Gestión de Deudas</h1>
                  <p className="text-lg text-slate-600">Visualización y control de deudas acumuladas</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" size="lg" className="gap-2" onClick={refreshData} disabled={refreshing}>
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="container mx-auto px-6 py-8">
        {/* Selector de Año */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <Label className="text-sm font-medium">Año:</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los años</SelectItem>
                {añosDisponibles.map(año => (
                  <SelectItem key={año} value={año}>{año}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600">
            Mostrando datos del año: <span className="font-bold text-blue-600">{filterYear === 'todos' ? 'Todos' : filterYear}</span>
            <span className="ml-2 text-xs text-gray-400">
              ({deudasFiltradasPorAño.length} registros)
            </span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium">Total Clientes</p>
                <p className="text-2xl font-bold">{estadisticasAnio.totalClientes}</p>
              </div>
              <div className="p-2 bg-blue-400/20 rounded-full">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs font-medium">Al Día</p>
                <p className="text-2xl font-bold">{estadisticasAnio.clientesAlDia}</p>
              </div>
              <div className="p-2 bg-green-400/20 rounded-full">
                <CheckCircle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs font-medium">Deuda Total</p>
                <p className="text-2xl font-bold">${estadisticasAnio.montoTotalDeuda.toFixed(0)}</p>
              </div>
              <div className="p-2 bg-red-400/20 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs font-medium">Vencidas</p>
                <p className="text-2xl font-bold">{estadisticasAnio.deudasVencidas}</p>
              </div>
              <div className="p-2 bg-orange-400/20 rounded-full">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-xs font-medium">Meses Impagos</p>
                <p className="text-2xl font-bold">{estadisticasAnio.totalMesesImpagos}</p>
              </div>
              <div className="p-2 bg-yellow-400/20 rounded-full">
                <CalendarDays className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg flex-1 min-w-[180px]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs font-medium">Promedio</p>
                <p className="text-2xl font-bold">
                  ${estadisticasAnio.clientesConDeuda > 0 
                    ? (estadisticasAnio.montoTotalDeuda / estadisticasAnio.clientesConDeuda).toFixed(0) 
                    : '0'}
                </p>
              </div>
              <div className="p-2 bg-purple-400/20 rounded-full">
                <BarChart3 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y Búsqueda */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              
              <Select value={filterSector} onValueChange={setFilterSector}>
                <SelectTrigger className="h-10 w-full md:w-[200px]">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los sectores</SelectItem>
                  {sectores.map(sector => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="h-10 w-full md:w-[200px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="al_dia">Al Día</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="por_vencer">Por Vencer</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterMonto} onValueChange={setFilterMonto}>
                <SelectTrigger className="h-10 w-full md:w-[200px]">
                  <SelectValue placeholder="Monto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los montos</SelectItem>
                  <SelectItem value="bajo">Bajo (menos de $50)</SelectItem>
                  <SelectItem value="medio">Medio ($50 - $100)</SelectItem>
                  <SelectItem value="alto">Alto (más de $100)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Contenido */}
        <Tabs defaultValue="deudas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deudas">Lista de Deudas</TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="deudas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Deudas ({deudasFiltradas.length}) - Mostrando {deudasPaginadas.length} de {deudasOrdenadas.length}</span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={refreshData}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      Refrescar
                    </Button>
                    <ExportButtons 
                      tipo="deudas" 
                      filtros={{}} 
                      className="ml-auto" 
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deudasFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No hay deudas para mostrar</p>
                    <p className="text-sm">Todos los clientes están al día con sus pagos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto border rounded-lg">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-48 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('cliente')}>
                              <div className="flex items-center gap-1">
                                Cliente
                                {sortField === 'cliente' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="w-32">Plan</TableHead>
                            <TableHead className="w-32 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('deuda_actual')}>
                              <div className="flex items-center gap-1">
                                Deuda Actual
                                {sortField === 'deuda_actual' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="w-32 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total_pagado')}>
                              <div className="flex items-center gap-1">
                                Total Pagado
                                {sortField === 'total_pagado' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="w-40 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('meses_impagos')}>
                              <div className="flex items-center gap-1">
                                Meses Impagos
                                {sortField === 'meses_impagos' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="w-32 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ultimo_pago')}>
                              <div className="flex items-center gap-1">
                                Último Pago
                                {sortField === 'ultimo_pago' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="w-24 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('estado')}>
                              <div className="flex items-center gap-1">
                                Estado
                                {sortField === 'estado' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="w-48">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deudasPaginadas.map((deuda, index) => (
                            <TableRow key={index} className="hover:bg-gray-50">
                              <TableCell className="py-3">
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {deuda.cliente.nombres} {deuda.cliente.apellidos}
                                  </div>
                                  <div className="text-sm text-gray-500">Cédula: {deuda.cliente.cedula}</div>
                                  <div className="text-sm text-gray-500">{deuda.cliente.sector_nombre}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-gray-900">{deuda.cliente.tipo_plan}</div>
                                  <div className="text-sm text-gray-500">${deuda.monto_mensual.toFixed(2)}/mes</div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-right">
                                  <div className={`font-bold text-lg ${deuda.deuda_actual > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ${deuda.deuda_actual.toFixed(2)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {deuda.meses_impagos.length} meses
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-right">
                                  <div className="font-bold text-green-600">${deuda.total_pagado.toFixed(2)}</div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-sm">
                                  {deuda.meses_impagos.length > 0 ? (
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-600 font-medium">
                                        {deuda.meses_impagos.length} meses sin pagar
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-green-600 font-medium">Al día</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="text-sm">
                                  {deuda.ultimo_pago ? (
                                    <span className="text-green-600 font-medium">
                                      {new Date(deuda.ultimo_pago).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">Sin pagos</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex justify-center">
                                  {getEstadoBadge(deuda.estado)}
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex flex-col gap-1">
                                  <div className="flex gap-1 justify-center">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => handleVerDetalles(deuda)}
                                      className="whitespace-nowrap text-xs"
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Ver
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => handleRegistrarPago(deuda)}
                                      className="whitespace-nowrap text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                    >
                                      <CreditCard className="w-3 h-3 mr-1" />
                                      Cobrar
                                    </Button>
                                  </div>
                                  {deuda.deuda_actual > 0 && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => handleEnviarRecordatorio(deuda)}
                                      disabled={sendingReminder === deuda.cliente.id}
                                      className="whitespace-nowrap text-xs"
                                    >
                                      {sendingReminder === deuda.cliente.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <>
                                          <MessageSquare className="w-3 h-3 mr-1" />
                                          Recordar
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={deudasOrdenadas.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                        showPageSizeSelector={true}
                      />
                    </div>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resumen" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deudas por Sector</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sectores.map(sector => {
                      const deudasSector = deudasFiltradasPorAño.filter(d => d.cliente.sector_nombre === sector);
                      const mesesImpagosSector = deudasSector.reduce((sum, d) => sum + d.meses_impagos.length, 0);
                      const vencidasSector = deudasSector.filter(d => d.estado === 'vencida').length;
                      
                      return (
                        <div key={sector} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{sector}</p>
                            <p className="text-sm text-gray-600">{deudasSector.length} clientes</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{mesesImpagosSector} meses</p>
                            <p className="text-sm text-red-600">{vencidasSector} vencidas</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estado de Deudas - {filterYear}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Al Día</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{deudasFiltradasPorAño.filter(d => d.estado === 'al_dia').length}</p>
                        <p className="text-sm text-gray-600">Sin deuda</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Pendientes</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{deudasFiltradasPorAño.filter(d => d.estado === 'pendiente').length}</p>
                        <p className="text-sm text-gray-600">{deudasFiltradasPorAño.filter(d => d.estado === 'pendiente').reduce((sum, d) => sum + d.meses_impagos.length, 0)} meses</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>Por Vencer</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{deudasFiltradasPorAño.filter(d => d.estado === 'por_vencer').length}</p>
                        <p className="text-sm text-gray-600">{deudasFiltradasPorAño.filter(d => d.estado === 'por_vencer').reduce((sum, d) => sum + d.meses_impagos.length, 0)} meses</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Vencidas</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{deudasFiltradasPorAño.filter(d => d.estado === 'vencida').length}</p>
                        <p className="text-sm text-gray-600">{deudasFiltradasPorAño.filter(d => d.estado === 'vencida').reduce((sum, d) => sum + d.meses_impagos.length, 0)} meses</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reportes" className="space-y-6">
            {/* Resumen Ejecutivo */}
            <Card className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Resumen Ejecutivo - {filterYear}</h3>
                    <p className="text-slate-300 text-sm">Fecha: {new Date().toLocaleDateString('es-ES')}</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="lg"
                    onClick={generarReporteResumen}
                    className="gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Generar Resumen
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-slate-300 text-xs">Total Clientes</p>
                    <p className="text-2xl font-bold">{deudasFiltradasPorAño.length}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-slate-300 text-xs">Deuda Total</p>
                    <p className="text-2xl font-bold">${estadisticasAnio.montoTotalDeuda.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-slate-300 text-xs">Vencidas</p>
                    <p className="text-2xl font-bold text-red-300">{estadisticasAnio.deudasVencidas}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-slate-300 text-xs">Recaudado</p>
                    <p className="text-2xl font-bold text-green-300">${estadisticasAnio.montoTotalRecaudado.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reportes Detallados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Reportes Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Morosidad */}
                  <div className="border rounded-lg p-4 hover:bg-red-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Reporte de Morosidad</h4>
                        <p className="text-xs text-gray-500">{deudasFiltradasPorAño.filter(d => d.estado === 'vencida').length} clientes morosos ({filterYear})</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={generarReporteMorosidad}>
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={generarReporteMorosidadDetallado}>
                        <FileText className="w-4 h-4 mr-1" />
                        Detallado
                      </Button>
                    </div>
                  </div>

                  {/* Clientes con Deuda */}
                  <div className="border rounded-lg p-4 hover:bg-purple-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Clientes con Deudas</h4>
                        <p className="text-xs text-gray-500">{estadisticasAnio.clientesConDeuda} clientes ({filterYear})</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={generarReporteClientesDeuda}>
                      <Download className="w-4 h-4 mr-1" />
                      Descargar CSV
                    </Button>
                  </div>

                  {/* Por Sector */}
                  <div className="border rounded-lg p-4 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <PieChart className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Deudas por Sector</h4>
                        <p className="text-xs text-gray-500">{sectores.length} sectores ({filterYear})</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={generarReportePorSector}>
                      <Download className="w-4 h-4 mr-1" />
                      Descargar CSV
                    </Button>
                  </div>

                  {/* Por Período */}
                  <div className="border rounded-lg p-4 hover:bg-green-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Deudas por Período</h4>
                        <p className="text-xs text-gray-500">Últimos 3 meses ({filterYear})</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={generarReportePeriodo}>
                      <Download className="w-4 h-4 mr-1" />
                      Descargar CSV
                    </Button>
                  </div>

                  {/* Resumen Ejecutivo */}
                  <div className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Resumen Ejecutivo</h4>
                        <p className="text-xs text-gray-500">Informe completo</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={generarReporteResumen}>
                      <Download className="w-4 h-4 mr-1" />
                      Descargar TXT
                    </Button>
                  </div>

                  {/* Exportar a Excel */}
                  <div className="border rounded-lg p-4 hover:bg-orange-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Exportar Todo</h4>
                        <p className="text-xs text-gray-500">Todos los datos</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={generarReporteClientesDeuda}>
                        CSV
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={generarReporteResumen}>
                        TXT
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Indicadores Rápidos */}
            <div className="flex flex-wrap gap-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 flex-1 min-w-[200px]">
                <CardContent className="p-4 flex items-center gap-4">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                  <div>
                    <p className="text-3xl font-bold text-red-700">{estadisticasAnio.deudasVencidas}</p>
                    <p className="text-sm text-red-600">Deudas Vencidas ({filterYear})</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 flex-1 min-w-[200px]">
                <CardContent className="p-4 flex items-center gap-4">
                  <Clock className="w-10 h-10 text-orange-600" />
                  <div>
                    <p className="text-3xl font-bold text-orange-700">{estadisticasAnio.deudasPorVencer}</p>
                    <p className="text-sm text-orange-600">Por Vencer ({filterYear})</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 flex-1 min-w-[200px]">
                <CardContent className="p-4 flex items-center gap-4">
                  <CalendarDays className="w-10 h-10 text-yellow-600" />
                  <div>
                    <p className="text-3xl font-bold text-yellow-700">{estadisticasAnio.totalMesesImpagos}</p>
                    <p className="text-sm text-yellow-600">Meses Impagos ({filterYear})</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 flex-1 min-w-[200px]">
                <CardContent className="p-4 flex items-center gap-4">
                  <DollarSign className="w-10 h-10 text-red-600" />
                  <div>
                    <p className="text-3xl font-bold text-red-700">${estadisticasAnio.montoTotalDeuda.toLocaleString()}</p>
                    <p className="text-sm text-red-600">Total Pendiente ({filterYear})</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Distribución por Estado */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado - {filterYear}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { estado: 'Al Día', count: deudasFiltradasPorAño.filter(d => d.estado === 'al_dia').length, color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
                    { estado: 'Pendiente', count: deudasFiltradasPorAño.filter(d => d.estado === 'pendiente').length, color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
                    { estado: 'Por Vencer', count: deudasFiltradasPorAño.filter(d => d.estado === 'por_vencer').length, color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
                    { estado: 'Vencida', count: deudasFiltradasPorAño.filter(d => d.estado === 'vencida').length, color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
                  ].map(item => {
                    const percentage = deudasFiltradasPorAño.length > 0 ? (item.count / deudasFiltradasPorAño.length) * 100 : 0;
                    return (
                      <div key={item.estado} className={`${item.bgColor} rounded-lg p-3`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium ${item.textColor}`}>{item.estado}</span>
                          <span className={`font-bold ${item.textColor}`}>{item.count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${item.color} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Detalles de Deuda */}
      <Dialog open={modalDetalles} onOpenChange={setModalDetalles}>
        <DialogContent className="sm:max-w-[700px] max-h-[50vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">Deuda - {deudaSeleccionada?.cliente.nombres}</DialogTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setModalDetalles(false)}
                className="gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Cerrar
              </Button>
            </div>
            <DialogDescription>
              Detalles completos de la deuda del cliente incluyendo historial de pagos y meses impagos.
            </DialogDescription>
          </DialogHeader>
          {deudaSeleccionada && (
            <div className="space-y-4">
              {/* Información del Cliente */}
              <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-xs font-medium text-gray-500">Cliente</Label>
                  <p className="text-xs font-medium">{deudaSeleccionada.cliente.nombres}</p>
                  <p className="text-xs text-gray-600">{deudaSeleccionada.cliente.cedula}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Plan</Label>
                  <p className="text-xs font-medium">{deudaSeleccionada.cliente.tipo_plan}</p>
                  <p className="text-xs text-gray-600">${deudaSeleccionada.monto_mensual.toFixed(2)}/mes</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Registro</Label>
                  <p className="text-xs font-medium">{new Date(deudaSeleccionada.fecha_registro).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Meses</Label>
                  <p className="text-xs font-medium">{deudaSeleccionada.meses_desde_registro} meses</p>
                </div>
              </div>

              {/* Resumen de Deudas */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600">Debe</p>
                  <p className="text-sm font-bold text-blue-600">${deudaSeleccionada.total_debe.toFixed(2)}</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600">Pagado</p>
                  <p className="text-sm font-bold text-green-600">${deudaSeleccionada.total_pagado.toFixed(2)}</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-gray-600">Meses Impagos</p>
                  <p className="text-sm font-bold text-red-600">{deudaSeleccionada.meses_impagos.length} meses</p>
                </div>
              </div>

              {/* Tabla de Meses */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Historial de Meses</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Mes</TableHead>
                        <TableHead className="text-xs">Límite</TableHead>
                        <TableHead className="text-xs">Monto</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                        <TableHead className="text-xs">Pagado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deudaSeleccionada.todos_los_meses.sort((a, b) => a.mes.localeCompare(b.mes)).map((mes, index) => (
                        <TableRow key={index} className={mes.pagado ? 'bg-green-50' : 'bg-red-50'}>
                          <TableCell className="text-xs font-medium">{mes.mes}</TableCell>
                          <TableCell className="text-xs">{new Date(mes.fecha_limite).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs">${mes.monto.toFixed(2)}</TableCell>
                          <TableCell>
                            {mes.pagado ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-1 py-0">
                                <CheckCircle className="w-2 h-2 mr-1" />
                                Pagado
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-1 py-0">
                                <AlertTriangle className="w-2 h-2 mr-1" />
                                Impago
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {mes.pagado ? (
                              <div className="text-center">
                                <span className="text-green-600 font-medium">
                                  ${(mes.monto_pagado || 0).toFixed(2)}
                                </span>
                                <div className="text-xs text-gray-500">
                                  {mes.fecha_pago ? new Date(mes.fecha_pago).toLocaleDateString() : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-red-500 font-medium">Pendiente</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Información Adicional */}
              <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-xs font-medium text-gray-500">Último Pago</Label>
                  <p className="text-xs font-medium">
                    {deudaSeleccionada.ultimo_pago ? 
                      new Date(deudaSeleccionada.ultimo_pago).toLocaleDateString() : 
                      'Sin pagos'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Estado</Label>
                  <div className="mt-1">{getEstadoBadge(deudaSeleccionada.estado)}</div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Impagos</Label>
                  <p className="text-xs font-medium">{deudaSeleccionada.meses_impagos.length} meses</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Total</Label>
                  <p className="text-xs font-medium">{deudaSeleccionada.meses_desde_registro} meses</p>
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button 
                  size="sm" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    handleRegistrarPago(deudaSeleccionada);
                    setModalDetalles(false);
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Registrar Pago
                </Button>
                
                {deudaSeleccionada.cliente.telefono && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 bg-green-50 hover:bg-green-100"
                    onClick={() => {
                      const telefonoLimpio = deudaSeleccionada.cliente.telefono.replace(/\D/g, '');
                      const mensaje = `Estimado/a ${deudaSeleccionada.cliente.nombres}, le informamos que tiene una deuda pendiente de $${deudaSeleccionada.deuda_actual.toFixed(2)}. Por favor, regularice su situación.`;
                      window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    WhatsApp
                  </Button>
                )}
                
                {deudaSeleccionada.cliente.email && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 bg-blue-50 hover:bg-blue-100"
                    onClick={() => {
                      const asunto = 'Recordatorio de Pago - TelTec';
                      const mensaje = `Estimado/a ${deudaSeleccionada.cliente.nombres} ${deudaSeleccionada.cliente.apellidos},\n\nLe informamos que tiene una deuda pendiente de $${deudaSeleccionada.deuda_actual.toFixed(2)} correspondiente a ${deudaSeleccionada.meses_impagos.length} mes(es) de su plan ${deudaSeleccionada.cliente.tipo_plan}.\n\nPor favor, regularice su situación a la brevedad.\n\nAtentamente,\nTelTec`;
                      window.location.href = `mailto:${deudaSeleccionada.cliente.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
                    }}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Email
                  </Button>
                )}
              </div>

              {/* Información de Contacto */}
              <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                <p className="font-medium mb-1">Información de Contacto:</p>
                <p>Teléfono: {deudaSeleccionada.cliente.telefono || 'No disponible'}</p>
                <p>Email: {deudaSeleccionada.cliente.email || 'No disponible'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

