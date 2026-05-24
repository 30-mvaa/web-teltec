"use client"

import React, { useState, useEffect } from 'react'
import { API_ENDPOINTS } from "@/lib/config/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface MesDisponible {
  año: number
  mes: number
  nombre_mes: string
  ya_pagado: boolean
  monto: number
  fecha_limite: string
}

interface Cliente {
  id: number
  nombres: string
  apellidos: string
  cedula: string
  tipo_plan: string
  precio_plan: number
}

interface MonthSelectorProps {
  clienteId: number | null
  onMesesSeleccionados: (meses: MesDisponible[]) => void
  onMontoTotalChange: (monto: number) => void
}

export function MonthSelector({ clienteId, onMesesSeleccionados, onMontoTotalChange }: MonthSelectorProps) {
  const [mesesDisponibles, setMesesDisponibles] = useState<MesDisponible[]>([])
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [mesesSeleccionados, setMesesSeleccionados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [añoSeleccionado, setAñoSeleccionado] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    if (clienteId) {
      cargarMesesDisponibles()
    }
  }, [clienteId])

  useEffect(() => {
    // Actualizar año seleccionado cuando cambien los meses disponibles
    if (mesesDisponibles.length > 0) {
      const añosDisponibles = [...new Set(mesesDisponibles.map(mes => mes.año))].sort()
      if (!añosDisponibles.includes(añoSeleccionado)) {
        setAñoSeleccionado(añosDisponibles[0] || new Date().getFullYear())
      }
    }
  }, [mesesDisponibles, añoSeleccionado])

  useEffect(() => {
    // Calcular monto total y notificar cambios
    const montoTotal = Array.from(mesesSeleccionados).reduce((total, mesKey) => {
      const mes = mesesDisponibles.find(m => `${m.año}-${m.mes}` === mesKey)
      return total + (mes?.monto || 0)
    }, 0)
    
    onMontoTotalChange(montoTotal)
    
    // Notificar meses seleccionados
    const mesesSeleccionadosArray = Array.from(mesesSeleccionados).map(mesKey => {
      return mesesDisponibles.find(m => `${m.año}-${m.mes}` === mesKey)!
    }).filter(Boolean)
    
    onMesesSeleccionados(mesesSeleccionadosArray)
  }, [mesesSeleccionados, mesesDisponibles])

  const cargarMesesDisponibles = async () => {
    if (!clienteId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/pagos/cliente/${clienteId}/meses/`)
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCliente(data.data.cliente)
        setMesesDisponibles(data.data.meses_disponibles)
      } else {
        setError(data.message || 'Error al cargar meses disponibles')
      }
    } catch (error) {
      console.error('Error cargando meses disponibles:', error)
      setError('Error de conexión al cargar meses disponibles')
    } finally {
      setLoading(false)
    }
  }

  const toggleMes = (mesKey: string) => {
    const newSeleccionados = new Set(mesesSeleccionados)
    
    if (newSeleccionados.has(mesKey)) {
      newSeleccionados.delete(mesKey)
    } else {
      newSeleccionados.add(mesKey)
    }
    
    setMesesSeleccionados(newSeleccionados)
  }

  const seleccionarTodosDisponibles = () => {
    const disponibles = mesesDisponibles
      .filter(mes => !mes.ya_pagado)
      .map(mes => `${mes.año}-${mes.mes}`)
    
    setMesesSeleccionados(new Set(disponibles))
  }

  const limpiarSeleccion = () => {
    setMesesSeleccionados(new Set())
  }

  const getEstadoMes = (mes: MesDisponible) => {
    if (mes.ya_pagado) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        label: 'Pagado',
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 border-green-200'
      }
    }
    
    const fechaLimite = new Date(mes.fecha_limite)
    const hoy = new Date()
    
    if (fechaLimite < hoy) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        label: 'Vencido',
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 border-red-200'
      }
    }
    
    return {
      icon: <Calendar className="h-4 w-4 text-blue-500" />,
      label: 'Disponible',
      variant: 'secondary' as const,
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Selección de Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Cargando meses disponibles...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Selección de Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <XCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!cliente) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Selección de Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Selecciona un cliente para ver los meses disponibles
          </div>
        </CardContent>
      </Card>
    )
  }

  // Obtener años únicos disponibles
  const añosDisponibles = [...new Set(mesesDisponibles.map(mes => mes.año))].sort()

  // Filtrar meses por año seleccionado
  const mesesFiltrados = mesesDisponibles.filter(mes => mes.año === añoSeleccionado)

  // Ordenar meses cronológicamente
  const mesesOrdenados = [...mesesFiltrados].sort((a, b) => a.mes - b.mes)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Selección de Meses - {cliente.nombres} {cliente.apellidos}
        </CardTitle>
        <div className="text-sm text-gray-600">
          Plan: {cliente.tipo_plan} - ${cliente.precio_plan}/mes
        </div>
        
        {/* Selector de Año */}
        <div className="flex items-center gap-2 mt-2">
          <Label htmlFor="año" className="text-sm font-medium">Año:</Label>
          <Select value={añoSeleccionado.toString()} onValueChange={(value) => setAñoSeleccionado(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {añosDisponibles.map((año) => (
                <SelectItem key={año} value={año.toString()}>
                  {año}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controles */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={seleccionarTodosDisponibles}
            disabled={mesesDisponibles.filter(mes => !mes.ya_pagado).length === 0}
          >
            Seleccionar Todos Disponibles
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={limpiarSeleccion}
          >
            Limpiar Selección
          </Button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-semibold text-blue-600">{mesesFiltrados.filter(mes => !mes.ya_pagado).length}</div>
            <div className="text-blue-500">Disponibles {añoSeleccionado}</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-semibold text-green-600">{mesesFiltrados.filter(mes => mes.ya_pagado).length}</div>
            <div className="text-green-500">Pagados {añoSeleccionado}</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="font-semibold text-orange-600">{mesesSeleccionados.size}</div>
            <div className="text-orange-500">Seleccionados</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className="font-semibold text-purple-600">{añosDisponibles.length}</div>
            <div className="text-purple-500">Años Totales</div>
          </div>
        </div>

        {/* Todos los Meses */}
        <div>
          <h4 className="font-semibold mb-2 text-gray-700">Meses del Año {añoSeleccionado}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {mesesOrdenados.map((mes) => {
              const mesKey = `${mes.año}-${mes.mes}`
              const estado = getEstadoMes(mes)
              const seleccionado = mesesSeleccionados.has(mesKey)
              const yaPagado = mes.ya_pagado
              
              return (
                <div
                  key={mesKey}
                  className={`p-3 border rounded-lg transition-all ${
                    yaPagado 
                      ? 'bg-gray-50 border-gray-200' // Ya pagado
                      : seleccionado 
                        ? 'border-blue-500 bg-blue-50 cursor-pointer' // Seleccionado
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer' // Disponible
                  }`}
                  onClick={yaPagado ? undefined : () => toggleMes(mesKey)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {yaPagado ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Checkbox 
                        checked={seleccionado}
                        onChange={() => toggleMes(mesKey)}
                      />
                    )}
                    <span className="font-medium">{mes.nombre_mes}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>{mes.año}</div>
                    <div className="font-semibold text-green-600">${mes.monto}</div>
                    <div className="text-xs">Vence: {new Date(mes.fecha_limite).toLocaleDateString()}</div>
                  </div>
                  <div className="mt-2">
                    <Badge variant={estado.variant} className={estado.className}>
                      {estado.icon}
                      <span className="ml-1">{estado.label}</span>
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mensaje si no hay meses */}
        {mesesDisponibles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay meses disponibles para este cliente
          </div>
        )}
      </CardContent>
    </Card>
  )
}
