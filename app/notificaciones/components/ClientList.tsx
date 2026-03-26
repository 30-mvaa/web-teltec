"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, CheckCircle, DollarSign, RefreshCw, XCircle } from "lucide-react"
import type { ClienteConPago } from "../hooks/useNotificaciones"

interface ClientListProps {
  clientes: ClienteConPago[]
  loading?: boolean
  onReload: () => void
  onCrearNotificacion: (cliente: ClienteConPago) => Promise<{ success: boolean; message?: string }>
}

export function ClientList({ clientes, loading, onReload, onCrearNotificacion }: ClientListProps) {
  const totalRecaudado = clientes.reduce((sum, c) => sum + (c.total_pagado_anual || 0), 0)
  const totalDeuda = clientes.reduce((sum, c) => sum + (c.deuda_actual || 0), 0)
  const clientesActivos = clientes.filter((c) => c.estado === "activo" || !c.estado).length
  const clientesConDeuda = clientes.filter((c) => (c.deuda_actual || 0) > 0).length

  return (
    <div className="mt-8 bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Resumen de Clientes</h2>
            <p className="text-sm text-gray-600 mt-1">Información completa de deudas y recaudación</p>
          </div>
          <div className="text-sm text-gray-600">Total: {clientes.length} clientes</div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Activos</p>
                <p className="text-2xl font-bold text-green-600">{clientesActivos}</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Con Deuda</p>
                <p className="text-2xl font-bold text-red-600">{clientesConDeuda}</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Recaudado 2025</p>
                <p className="text-2xl font-bold text-blue-600">${totalRecaudado.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-900">Deuda Total</p>
                <p className="text-2xl font-bold text-orange-600">${totalDeuda.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {clientes.length > 0 ? (
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {clientes.map((cliente) => (
            <div key={cliente.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {cliente.nombre}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={
                          cliente.estado === "activo" || !cliente.estado
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {cliente.estado === "activo" || !cliente.estado ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          cliente.estado_pago === "al_dia"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : cliente.estado_pago === "proximo_vencimiento"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {cliente.estado_pago === "al_dia"
                          ? "Al día"
                          : cliente.estado_pago === "proximo_vencimiento"
                          ? "Próximo vencimiento"
                          : cliente.estado_pago === "vencido"
                          ? "Vencido"
                          : "Corte pendiente"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                    <div>
                      <p className="font-medium text-gray-900">Plan</p>
                      <p>
                        {cliente.tipo_plan || "Sin plan"} - ${(cliente.precio_plan || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Deuda Actual</p>
                      <p className={(cliente.deuda_actual || 0) > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                        ${(cliente.deuda_actual || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Recaudado 2025</p>
                      <p className="text-blue-600 font-medium">
                        ${(cliente.total_pagado_anual || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Último Pago</p>
                      <p>
                        {cliente.ultimo_pago
                          ? new Date(cliente.ultimo_pago).toLocaleDateString()
                          : "Sin pagos"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    <span>Registrado: {cliente.fecha_registro ? new Date(cliente.fecha_registro).toLocaleDateString() : "N/A"}</span>
                    <span className="mx-2">•</span>
                    <span>Días sin pago: {cliente.dias_sin_pago}</span>
                    {cliente.telefono && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Tel: {cliente.telefono}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  {cliente.telefono ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={async () => {
                        await onCrearNotificacion(cliente)
                      }}
                      disabled={loading}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Crear Notificación
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">Sin teléfono</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500 text-sm">
            {loading ? "Cargando clientes..." : "No hay clientes disponibles."}
          </p>
          {!loading && (
            <Button onClick={onReload} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar Clientes
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
