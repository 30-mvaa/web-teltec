"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser, logoutUser, API_ENDPOINTS, apiRequest } from "@/lib/config/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface User {
  id: string | null
  email: string
  rol: string | null
  nombre: string | null
}

interface DashboardStats {
  totalClientes: number
  clientesActivos: number
  recaudacionMensual: number
  pagosPendientes: number
  gastosDelMes: number
  notificacionesPendientes: number
  serviciosActivos: number
  morosidad: number
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    clientesActivos: 0,
    recaudacionMensual: 0,
    pagosPendientes: 0,
    gastosDelMes: 0,
    notificacionesPendientes: 0,
    serviciosActivos: 0,
    morosidad: 0,
  })
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [userInfo, setUserInfo] = useState<{email: string; ultimo_ingreso?: string} | null>(null)
  const router = useRouter()

  // Cargar estadísticas del dashboard
  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Cargar estadísticas en paralelo
      const [clientesStats, pagosStats, notificacionesStats, deudasStats] = await Promise.allSettled([
        apiRequest(API_ENDPOINTS.CLIENTES_ESTADISTICAS),
        apiRequest(API_ENDPOINTS.PAGOS_STATS),
        apiRequest(API_ENDPOINTS.NOTIFICACIONES_ESTADISTICAS),
        apiRequest(API_ENDPOINTS.DEUDAS_STATS).catch(() => ({ success: false, data: {} }))
      ])

      // Procesar estadísticas de clientes
      let totalClientes = 0
      let clientesActivos = 0
      if (clientesStats.status === 'fulfilled' && clientesStats.value.success) {
        const data = clientesStats.value.data
        totalClientes = data.total_clientes || 0
        clientesActivos = data.clientes_activos || 0
      }

      // Procesar estadísticas de pagos
      let recaudacionMensual = 0
      let comprobantesPendientes = 0
      if (pagosStats.status === 'fulfilled' && pagosStats.value.success) {
        const data = pagosStats.value.data
        recaudacionMensual = data.recaudacion_mes_actual || 0
        comprobantesPendientes = data.comprobantes_pendientes || 0
      }

      // Procesar estadísticas de notificaciones
      let notificacionesPendientes = 0
      if (notificacionesStats.status === 'fulfilled' && notificacionesStats.value.success) {
        const data = notificacionesStats.value.data
        notificacionesPendientes = data.pendientes || 0
      }

      // Calcular gastos del mes
      let gastosDelMes = 0
      try {
        const gastosResponse = await fetch(API_ENDPOINTS.GASTOS)
        if (gastosResponse.ok) {
          const gastosData = await gastosResponse.json()
          if (gastosData.success && Array.isArray(gastosData.data)) {
            const mesActual = new Date().getMonth() + 1
            const anioActual = new Date().getFullYear()
            gastosDelMes = gastosData.data
              .filter((gasto: any) => {
                if (!gasto.fecha_gasto) return false
                const fecha = new Date(gasto.fecha_gasto)
                return fecha.getMonth() + 1 === mesActual && fecha.getFullYear() === anioActual
              })
              .reduce((sum: number, gasto: any) => sum + (parseFloat(gasto.monto) || 0), 0)
          }
        }
      } catch (error) {
        console.error('Error cargando gastos:', error)
      }

      // Calcular morosidad (porcentaje de clientes con deuda)
      let morosidad = 0
      if (deudasStats.status === 'fulfilled' && deudasStats.value.success) {
        const data = deudasStats.value.data
        const totalDeudores = data.clientes_por_estado?.find((e: any) => e.estado === 'vencido')?.cantidad || 0
        morosidad = clientesActivos > 0 ? (totalDeudores / clientesActivos) * 100 : 0
      }

      setStats({
        totalClientes,
        clientesActivos,
        recaudacionMensual,
        pagosPendientes: comprobantesPendientes,
        gastosDelMes,
        notificacionesPendientes,
        serviciosActivos: clientesActivos, // Los servicios activos son igual a clientes activos
        morosidad: parseFloat(morosidad.toFixed(2))
      })
    } catch (error) {
      console.error('Error cargando estadísticas del dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push("/")
      return
    }
    setUser(currentUser)
    loadDashboardStats()
  }, [router])

  const handleLogout = () => {
    setShowUserMenu(false)
    setShowLogoutDialog(true)
  }

  const confirmLogout = () => {
    logoutUser()
    router.push("/")
  }

  const handleProfile = () => {
    setShowUserMenu(false)
    router.push("/perfil")
  }

  const handleSettings = () => {
    setShowUserMenu(false)
    router.push("/configuracion")
  }

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [showUserMenu])

  // Heartbeat para mantener la sesión activa (cada 10 minutos)
  useEffect(() => {
    const heartbeat = setInterval(async () => {
      const userEmail = localStorage.getItem('userEmail')
      if (userEmail) {
        try {
          await apiRequest(API_ENDPOINTS.USER_INFO + `?email=${encodeURIComponent(userEmail)}`)
        } catch (error) {
          console.error('Heartbeat error:', error)
        }
      }
    }, 10 * 60 * 1000) // 10 minutos

    return () => clearInterval(heartbeat)
  }, [])

  if (!user) return null

  const getModulesByRole = (rol: string | null) => {
    const baseModules = [
      {
        name: "Clientes",
        href: "/clientes",
        description: "Gestión completa de clientes",
        color: "linear-gradient(135deg, #3b82f6, #06b6d4)",
        stats: `${stats.totalClientes} registrados`,
        icon: "👥",
      },
      {
        name: "Reportes",
        href: "/reportes",
        description: "Reportes y estadísticas",
        color: "linear-gradient(135deg, #8b5cf6, #ec4899)",
        stats: "Análisis completo",
        icon: "📊",
      },
    ]

    switch (rol || "") {
      case "administrador":
        return [
          ...baseModules,
          {
            name: "Usuarios",
            href: "/usuarios",
            description: "Gestión de usuarios del sistema",
            color: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            stats: "3 roles disponibles",
            icon: "👤",
          },
          {
            name: "Recaudación",
            href: "/recaudacion",
            description: "Registro de pagos y comprobantes",
            color: "linear-gradient(135deg, #10b981, #059669)",
            stats: `$${stats.recaudacionMensual.toLocaleString()}`,
            icon: "💰",
          },
          {
            name: "Gestión de Deudas",
            href: "/deudas",
            description: "Control de pagos vencidos y deudas",
            color: "linear-gradient(135deg, #dc2626, #ea580c)",
            stats: `${stats.morosidad}% morosidad`,
            icon: "⚠️",
          },
          {
            name: "Gastos",
            href: "/gastos",
            description: "Control de gastos empresariales",
            color: "linear-gradient(135deg, #ef4444, #ec4899)",
            stats: `$${stats.gastosDelMes.toLocaleString()}`,
            icon: "🧾",
          },
          {
            name: "Notificaciones",
            href: "/notificaciones",
            description: "WhatsApp y alertas automáticas",
            color: "linear-gradient(135deg, #f59e0b, #f97316)",
            stats: `${stats.notificacionesPendientes} pendientes`,
            icon: "💬",
          },
        ]
      case "economia":
        return [
          ...baseModules,
          {
            name: "Recaudación",
            href: "/recaudacion",
            description: "Registro de pagos y comprobantes",
            color: "linear-gradient(135deg, #10b981, #059669)",
            stats: `$${stats.recaudacionMensual.toLocaleString()}`,
            icon: "💰",
          },
          {
            name: "Gestión de Deudas",
            href: "/deudas",
            description: "Control de pagos vencidos y deudas",
            color: "linear-gradient(135deg, #dc2626, #ea580c)",
            stats: `${stats.morosidad}% morosidad`,
            icon: "⚠️",
          },
          {
            name: "Notificaciones",
            href: "/notificaciones",
            description: "WhatsApp y alertas automáticas",
            color: "linear-gradient(135deg, #f59e0b, #f97316)",
            stats: `${stats.notificacionesPendientes} pendientes`,
            icon: "💬",
          },
        ]
      case "atencion_cliente":
        return [
          ...baseModules,
          {
            name: "Recaudación",
            href: "/recaudacion",
            description: "Registro de pagos y comprobantes",
            color: "linear-gradient(135deg, #10b981, #059669)",
            stats: `$${stats.recaudacionMensual.toLocaleString()}`,
            icon: "💰",
          },
          {
            name: "Gestión de Deudas",
            href: "/deudas",
            description: "Control de pagos vencidos y deudas",
            color: "linear-gradient(135deg, #dc2626, #ea580c)",
            stats: `${stats.morosidad}% morosidad`,
            icon: "⚠️",
          },
          {
            name: "Notificaciones",
            href: "/notificaciones",
            description: "Comunicación con clientes",
            color: "linear-gradient(135deg, #f59e0b, #f97316)",
            stats: `${stats.notificacionesPendientes} pendientes`,
            icon: "💬",
          },
        ]
      default:
        return baseModules
    }
  }

  const modules = getModulesByRole(user.rol)

  const headerStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  }

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc 0%, #dbeafe 50%, #e0e7ff 100%)",
  }

  const cardStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "1rem",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    padding: "1.5rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
  }

  const statCardStyle: React.CSSProperties = {
    borderRadius: "1rem",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    color: "white",
    padding: "1.5rem",
    border: "none",
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                    borderRadius: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "0.75rem",
                  }}
                >
                  <span style={{ color: "white", fontSize: "1.25rem" }}>📡</span>
                </div>
                <h1
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    background: "linear-gradient(45deg, #06b6d4, #3b82f6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  TelTec Net
                </h1>
                <span
                  style={{
                    marginLeft: "0.75rem",
                    background: "linear-gradient(45deg, #06b6d4, #3b82f6)",
                    color: "white",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                    border: "none",
                  }}
                >
                  v2.0
                </span>
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative" }}>
              {/* Menú de usuario */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  {/* Avatar con iniciales */}
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}>
                    {user.nombre ? user.nombre.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "U"}
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: "500", color: "#0f172a" }}>{user.nombre || "Usuario"}</p>
                    <p style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "capitalize" }}>
                      {(user.rol || "").replace("_", " ")}
                    </p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: "0.25rem" }}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                {/* Dropdown menu */}
                {showUserMenu && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "0.5rem",
                    background: "white",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    minWidth: "180px",
                    zIndex: 50,
                    overflow: "hidden",
                  }}>
                    <button
                      onClick={handleProfile}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#374151",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#f3f4f6"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <span>👤</span>
                      <span>Mi Perfil</span>
                    </button>
                    <button
                      onClick={handleSettings}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#374151",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#f3f4f6"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <span>⚙️</span>
                      <span>Configuración</span>
                    </button>
                    <div style={{ borderTop: "1px solid #e5e7eb", margin: "0.25rem 0" }}></div>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#dc2626",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#fee2e2"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <span>🚪</span>
                      <span>Salir</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "80rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#0f172a", marginBottom: "0.5rem" }}>
            Bienvenido,{" "}
            <span
              style={{
                background: "linear-gradient(45deg, #06b6d4, #3b82f6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {user.nombre || "Usuario"}
            </span>
          </h2>
          <p style={{ color: "#64748b", fontSize: "1.125rem" }}>
            Panel de control -{" "}
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

        </div>

       

        {/* Modules Grid */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", marginBottom: "1.5rem" }}>
            Servicios
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {modules.map((module) => (
              <div
                key={module.name}
                style={cardStyle}
                onClick={() => router.push(module.href)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)"
                  e.currentTarget.style.boxShadow = "0 32px 64px -12px rgba(0, 0, 0, 0.25)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                }}
              >
                <div
                  style={{
                    height: "0.5rem",
                    background: module.color,
                    borderRadius: "0.5rem 0.5rem 0 0",
                    margin: "-1.5rem -1.5rem 1rem -1.5rem",
                  }}
                ></div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "0.75rem",
                      background: module.color,
                      color: "white",
                      fontSize: "1.5rem",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    {module.icon}
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      background: "#f1f5f9",
                      color: "#64748b",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                    }}
                  >
                    {loading ? "Cargando..." : module.stats}
                  </span>
                </div>
                <h4 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#0f172a", marginBottom: "0.5rem" }}>
                  {module.name}
                </h4>
                <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1rem" }}>{module.description}</p>
                <button
                  style={{
                    width: "100%",
                    background: module.color,
                    color: "white",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "500",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  Acceder al módulo 
                </button>
              </div>
            ))}
          </div>
        </div>
         {/* Quick Actions */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e293b, #0f172a, #312e81)",
            color: "white",
            borderRadius: "1rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            padding: "1.5rem",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>📅</span>
            <span>Acciones Rápidas</span>
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <button
              onClick={() => router.push("/clientes")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              <span>👤</span>
              <span>Nuevo Cliente</span>
            </button>
            <button
              onClick={() => router.push("/recaudacion")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              <span>💳</span>
              <span>Registrar Pago</span>
            </button>
            <button
              onClick={() => router.push("/reportes")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              <span>📄</span>
              <span>Ver Reportes</span>
            </button>
          </div>
        </div>

        {/* Dialog de confirmación de logout */}
        <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-red-600" />
                </div>
                Salir del Sistema
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-600">
                ¿Estás seguro de que quieres cerrar sesión? Tendrás que iniciar sesión nuevamente para acceder al sistema.
              </p>
            </div>
            <DialogFooter className="sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLogoutDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmLogout}
                className="bg-red-600 hover:bg-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
