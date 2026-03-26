"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Bell, CheckCircle, Clock, XCircle } from "lucide-react"
import type { Estadisticas } from "../hooks/useNotificaciones"

interface StatsCardsProps {
  estadisticas: Estadisticas | null
  loading?: boolean
}

export function StatsCards({ estadisticas, loading }: StatsCardsProps) {
  if (loading || !estadisticas) {
    return (
      <div className="flex flex-row gap-6 mb-8 overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-sm min-w-[200px] flex-shrink-0 animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = [
    { label: "Total", value: estadisticas.total, icon: Bell, color: "blue" },
    { label: "Enviadas", value: estadisticas.enviadas, icon: CheckCircle, color: "green" },
    { label: "Pendientes", value: estadisticas.pendientes, icon: Clock, color: "purple" },
    { label: "Fallidas", value: estadisticas.fallidas, icon: XCircle, color: "orange" },
  ]

  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "text-blue-600" },
    green: { bg: "bg-green-50", text: "text-green-600", icon: "text-green-600" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "text-purple-600" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", icon: "text-orange-600" },
  }

  return (
    <div className="flex flex-row gap-6 mb-8 overflow-x-auto">
      {stats.map((stat) => {
        const colors = colorMap[stat.color]
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="border-0 shadow-sm min-w-[200px] flex-shrink-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className={`text-3xl font-bold ${colors.text}`}>{stat.value}</p>
                </div>
                <div className={`p-3 ${colors.bg} rounded-lg`}>
                  <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
