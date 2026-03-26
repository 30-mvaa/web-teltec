"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Settings, Save, Mail, Database, Shield, Package, MapPin, Plus, Edit, Trash2, Check, X } from "lucide-react"
import { apiRequest, API_ENDPOINTS } from "@/lib/config/api"

export default function ConfiguracionPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [config, setConfig] = useState({
    empresa: {
      nombre: "TelTec Net",
      direccion: "Av. Principal 123, Centro",
      telefono: "0999859689",
      whatsapp: "0984517703",
      email: "vangamarca4@gmail.com",
      ruc: "1234567890001",
    },
    email: {
      smtp_server: "smtp.gmail.com",
      smtp_port: "587",
      email_usuario: "vangamarca4@gmail.com",
      email_password: "",
    },
    sistema: {
      dias_aviso_pago: "5",
      dias_corte_servicio: "5",
      backup_automatico: true,
      notificaciones_activas: true,
    },
    database: {
      host: "localhost",
      puerto: "5432",
      nombre_db: "teltec_db",
      usuario: "postgres",
    },
    controlLogin: {
      intentos_maximos: "3",
      minutos_congelacion: "5",
    },
  })
  
  // Estados para planes y sectores
  const [planes, setPlanes] = useState([])
  const [sectores, setSectores] = useState([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showSectorModal, setShowSectorModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [editingSector, setEditingSector] = useState<any>(null)
  const [planForm, setPlanForm] = useState({ nombre: '', precio: '', velocidad: '', descripcion: '' })
  const [sectorForm, setSectorForm] = useState({ nombre: '', descripcion: '' })
  const [showInactivePlanes, setShowInactivePlanes] = useState(false)
  const [showInactiveSectores, setShowInactiveSectores] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<any>({})
  const router = useRouter()
  const [lastFetchedConfig, setLastFetchedConfig] = useState<any>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Detectar cambios locales
  useEffect(() => {
    if (!lastFetchedConfig) return
    setIsDirty(JSON.stringify(config) !== JSON.stringify(lastFetchedConfig))
  }, [config, lastFetchedConfig])

  // Hacer que el mensaje desaparezca automáticamente
  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(timeout)
    }
  }, [message])

  // Mapear claves de la base de datos a estructura local
  const mapConfigFromDB = (items: any[]) => {
    const mapped = { ...config }
    for (const item of items) {
      switch (item.clave) {
        case "empresa_nombre": mapped.empresa.nombre = item.valor; break;
        case "empresa_direccion": mapped.empresa.direccion = item.valor; break;
        case "empresa_telefono": mapped.empresa.telefono = item.valor; break;
        case "empresa_whatsapp": mapped.empresa.whatsapp = item.valor; break;
        case "empresa_email": mapped.empresa.email = item.valor; break;
        case "empresa_ruc": mapped.empresa.ruc = item.valor; break;
        case "email_smtp_server": mapped.email.smtp_server = item.valor; break;
        case "email_smtp_port": mapped.email.smtp_port = item.valor; break;
        case "email_usuario": mapped.email.email_usuario = item.valor; break;
        case "email_password": mapped.email.email_password = item.valor; break;
        case "sistema_dias_aviso_pago": mapped.sistema.dias_aviso_pago = item.valor; break;
        case "sistema_dias_corte_servicio": mapped.sistema.dias_corte_servicio = item.valor; break;
        case "sistema_backup_automatico": mapped.sistema.backup_automatico = item.valor === "true"; break;
        case "sistema_notificaciones_activas": mapped.sistema.notificaciones_activas = item.valor === "true"; break;
        case "db_host": mapped.database.host = item.valor; break;
        case "db_puerto": mapped.database.puerto = item.valor; break;
        case "db_nombre": mapped.database.nombre_db = item.valor; break;
        case "db_usuario": mapped.database.usuario = item.valor; break;
        case "login_intentos_maximos": mapped.controlLogin.intentos_maximos = item.valor; break;
        case "login_minutos_congelacion": mapped.controlLogin.minutos_congelacion = item.valor; break;
        default: break;
      }
    }
    return mapped
  }

  // Mapear estructura local a array para la API
  const mapConfigToDB = () => {
    return [
      { clave: "empresa_nombre", valor: config.empresa.nombre },
      { clave: "empresa_direccion", valor: config.empresa.direccion },
      { clave: "empresa_telefono", valor: config.empresa.telefono },
      { clave: "empresa_whatsapp", valor: config.empresa.whatsapp || '' },
      { clave: "empresa_email", valor: config.empresa.email },
      { clave: "empresa_ruc", valor: config.empresa.ruc },
      { clave: "email_smtp_server", valor: config.email.smtp_server },
      { clave: "email_smtp_port", valor: config.email.smtp_port },
      { clave: "email_usuario", valor: config.email.email_usuario },
      { clave: "email_password", valor: config.email.email_password },
      { clave: "sistema_dias_aviso_pago", valor: config.sistema.dias_aviso_pago },
      { clave: "sistema_dias_corte_servicio", valor: config.sistema.dias_corte_servicio },
      { clave: "sistema_backup_automatico", valor: String(config.sistema.backup_automatico) },
      { clave: "sistema_notificaciones_activas", valor: String(config.sistema.notificaciones_activas) },
      { clave: "db_host", valor: config.database.host },
      { clave: "db_puerto", valor: config.database.puerto },
      { clave: "db_nombre", valor: config.database.nombre_db },
      { clave: "db_usuario", valor: config.database.usuario },
      { clave: "login_intentos_maximos", valor: config.controlLogin.intentos_maximos },
      { clave: "login_minutos_congelacion", valor: config.controlLogin.minutos_congelacion },
    ]
  }

  // Validar campos antes de guardar
  const validateFields = (seccion: string) => {
    const newErrors: any = {}
    
    if (seccion === "empresa") {
      if (!config.empresa.nombre.trim()) newErrors["empresa_nombre"] = "El nombre es requerido"
      if (!config.empresa.ruc.trim()) newErrors["empresa_ruc"] = "El RUC es requerido"
      if (!config.empresa.direccion.trim()) newErrors["empresa_direccion"] = "La dirección es requerida"
      if (!config.empresa.telefono.trim()) newErrors["empresa_telefono"] = "El teléfono es requerido"
      if (!config.empresa.email.trim()) newErrors["empresa_email"] = "El email es requerido"
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(config.empresa.email)) newErrors["empresa_email"] = "Email inválido"
    }
    
    if (seccion === "email") {
      if (!config.email.smtp_server.trim()) newErrors["email_smtp_server"] = "Servidor SMTP requerido"
      if (!config.email.smtp_port.trim()) newErrors["email_smtp_port"] = "Puerto SMTP requerido"
      else if (isNaN(Number(config.email.smtp_port))) newErrors["email_smtp_port"] = "Puerto debe ser numérico"
      if (!config.email.email_usuario.trim()) newErrors["email_usuario"] = "Email usuario requerido"
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(config.email.email_usuario)) newErrors["email_usuario"] = "Email inválido"
      if (!config.email.email_password.trim()) newErrors["email_password"] = "Contraseña requerida"
    }
    
    if (seccion === "sistema") {
      if (!config.sistema.dias_aviso_pago.trim()) newErrors["sistema_dias_aviso_pago"] = "Requerido"
      else if (isNaN(Number(config.sistema.dias_aviso_pago))) newErrors["sistema_dias_aviso_pago"] = "Debe ser numérico"
      if (!config.sistema.dias_corte_servicio.trim()) newErrors["sistema_dias_corte_servicio"] = "Requerido"
      else if (isNaN(Number(config.sistema.dias_corte_servicio))) newErrors["sistema_dias_corte_servicio"] = "Debe ser numérico"
    }
    
    if (seccion === "database") {
      if (!config.database.host.trim()) newErrors["db_host"] = "Host requerido"
      if (!config.database.puerto.trim()) newErrors["db_puerto"] = "Puerto requerido"
      else if (isNaN(Number(config.database.puerto))) newErrors["db_puerto"] = "Puerto debe ser numérico"
      if (!config.database.nombre_db.trim()) newErrors["db_nombre"] = "Nombre requerido"
      if (!config.database.usuario.trim()) newErrors["db_usuario"] = "Usuario requerido"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Cargar datos al inicio
  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail")
    const userName = localStorage.getItem("userName")
    const userRole = localStorage.getItem("userRole")
    const userId = localStorage.getItem("userId")
    
    if (!userEmail) {
      router.push("/")
      return
    }
    
    const user = {
      email: userEmail,
      nombre: userName,
      role: userRole,
      id: userId
    }
    setCurrentUser(user)
    
    if (userRole !== "administrador") {
      router.push("/dashboard")
      return
    }

    // Función para cargar configuración
    const fetchConfig = async () => {
      try {
        const response = await apiRequest(API_ENDPOINTS.CONFIGURACION)
        if (response.success) {
          const mappedConfig = mapConfigFromDB(Object.values(response.data))
          setConfig(mappedConfig)
          setLastFetchedConfig(mappedConfig)
        }
      } catch (error) {
        console.error("Error cargando configuración:", error)
        setMessage("Error al cargar la configuración")
      } finally {
        setLoading(false)
      }
    }

    // Función para cargar planes desde la base de datos
    const fetchPlanes = async () => {
      try {
        const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES)
        if (response.success) {
          setPlanes(response.data)
        }
      } catch (error) {
        console.error("Error cargando planes:", error)
        setMessage("Error al cargar los planes")
      }
    }

    // Función para cargar sectores desde la base de datos
    const fetchSectores = async () => {
      try {
        const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES)
        if (response.success) {
          setSectores(response.data)
        }
      } catch (error) {
        console.error("Error cargando sectores:", error)
        setMessage("Error al cargar los sectores")
      }
    }

    fetchConfig()
    fetchPlanes()
    fetchSectores()
  }, [router])

  // Al guardar configuración
  const handleSave = async (seccion: string) => {
    setMessage(null)
    if (!validateFields(seccion)) {
      setMessage("Corrige los errores antes de guardar.")
      return
    }
    setSaving(true)
    try {
      const data = await apiRequest(API_ENDPOINTS.CONFIGURACION_GUARDAR, {
        method: "POST",
        body: JSON.stringify(config),
      })
      if (data.success) {
        setMessage(`Configuración de ${seccion} guardada exitosamente`)
        setErrors({})
        setLastFetchedConfig(config)
        setIsDirty(false)
      } else {
        setMessage(`Error al guardar configuración: ${data.message || ""}`)
      }
    } catch (err) {
      console.error('Error guardando configuración:', err)
      setMessage("Error de red al guardar configuración")
    } finally {
      setSaving(false)
    }
  }

  // Funciones para gestión de planes
  const handleCrearPlan = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES_CREAR, {
        method: 'POST',
        body: JSON.stringify(planForm)
      })
      if (response.success) {
        setMessage('Plan creado exitosamente')
        setShowPlanModal(false)
        setPlanForm({ nombre: '', precio: '', velocidad: '', descripcion: '' })
        // Recargar planes desde la base de datos
        const planesResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES)
        if (planesResponse.success) {
          setPlanes(planesResponse.data)
        }
      } else {
        setMessage(`Error: ${response.message}`)
      }
    } catch (error) {
      setMessage('Error al crear el plan')
    }
  }

  const handleActualizarPlan = async () => {
    if (!editingPlan) return
    try {
      const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES_ACTUALIZAR(editingPlan.id), {
        method: 'PUT',
        body: JSON.stringify(planForm)
      })
      if (response.success) {
        setMessage('Plan actualizado exitosamente')
        setShowPlanModal(false)
        setEditingPlan(null)
        setPlanForm({ nombre: '', precio: '', velocidad: '', descripcion: '' })
        // Recargar planes desde la base de datos
        const planesResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES)
        if (planesResponse.success) {
          setPlanes(planesResponse.data)
        }
      } else {
        setMessage(`Error: ${response.message}`)
      }
    } catch (error) {
      setMessage('Error al actualizar el plan')
    }
  }

  const handleEliminarPlan = async (planId: number) => {
    if (confirm('¿Estás seguro de que quieres ELIMINAR FÍSICAMENTE este plan de la base de datos? Esta acción no se puede deshacer.')) {
      try {
        const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES_ELIMINAR(planId), {
          method: 'DELETE'
        })
        if (response.success) {
          setMessage('Plan eliminado físicamente de la base de datos')
          // Recargar planes desde la base de datos
          const planesResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES)
          if (planesResponse.success) {
            setPlanes(planesResponse.data)
          }
        } else {
          setMessage(`Error: ${response.message}`)
        }
      } catch (error) {
        setMessage('Error al eliminar el plan')
      }
    }
  }

  const handleDesactivarPlan = async (planId: number) => {
    if (confirm('¿Estás seguro de que quieres desactivar este plan? El plan se marcará como inactivo pero permanecerá en la base de datos.')) {
      try {
        const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES_DESACTIVAR(planId), {
          method: 'PUT'
        })
        if (response.success) {
          setMessage('Plan desactivado exitosamente')
          // Recargar planes desde la base de datos
          const planesResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES)
          if (planesResponse.success) {
            setPlanes(planesResponse.data)
          }
        } else {
          setMessage(`Error: ${response.message}`)
        }
      } catch (error) {
        setMessage('Error al desactivar el plan')
      }
    }
  }

  const handleActivarPlan = async (planId: number) => {
    if (confirm('¿Estás seguro de que quieres activar este plan? El plan estará disponible para los clientes.')) {
      try {
        const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES_ACTIVAR(planId), {
          method: 'PUT'
        })
        if (response.success) {
          setMessage('Plan activado exitosamente')
          // Recargar planes desde la base de datos
          const planesResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_PLANES)
          if (planesResponse.success) {
            setPlanes(planesResponse.data)
          }
        } else {
          setMessage(`Error: ${response.message}`)
        }
      } catch (error) {
        setMessage('Error al activar el plan')
      }
    }
  }

  // Funciones para gestión de sectores
  const handleCrearSector = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES_CREAR, {
        method: 'POST',
        body: JSON.stringify(sectorForm)
      })
      if (response.success) {
        setMessage('Sector creado exitosamente')
        setShowSectorModal(false)
        setSectorForm({ nombre: '', descripcion: '' })
        // Recargar sectores desde la base de datos
        const sectoresResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES)
        if (sectoresResponse.success) {
          setSectores(sectoresResponse.data)
        }
      } else {
        setMessage(`Error: ${response.message}`)
      }
    } catch (error) {
      setMessage('Error al crear el sector')
    }
  }

  const handleActualizarSector = async () => {
    if (!editingSector) return
    try {
      const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES_ACTUALIZAR(editingSector.id), {
        method: 'PUT',
        body: JSON.stringify(sectorForm)
      })
      if (response.success) {
        setMessage('Sector actualizado exitosamente')
        setShowSectorModal(false)
        setEditingSector(null)
        setSectorForm({ nombre: '', descripcion: '' })
        // Recargar sectores desde la base de datos
        const sectoresResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES)
        if (sectoresResponse.success) {
          setSectores(sectoresResponse.data)
        }
      } else {
        setMessage(`Error: ${response.message}`)
      }
    } catch (error) {
      setMessage('Error al actualizar el sector')
    }
  }

  const handleEliminarSector = async (sectorId: number) => {
    if (confirm('¿Estás seguro de que quieres ELIMINAR FÍSICAMENTE este sector de la base de datos? Esta acción no se puede deshacer.')) {
      try {
        const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES_ELIMINAR(sectorId), {
          method: 'DELETE'
        })
        if (response.success) {
          setMessage('Sector eliminado físicamente de la base de datos')
          // Recargar sectores desde la base de datos
          const sectoresResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES)
          if (sectoresResponse.success) {
            setSectores(sectoresResponse.data)
          }
        } else {
          setMessage(`Error: ${response.message}`)
        }
      } catch (error) {
        setMessage('Error al eliminar el sector')
      }
    }
  }

  const handleDesactivarSector = async (sectorId: number) => {
    if (confirm('¿Estás seguro de que quieres desactivar este sector? El sector se marcará como inactivo pero permanecerá en la base de datos.')) {
      try {
        const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES_DESACTIVAR(sectorId), {
          method: 'PUT'
        })
        if (response.success) {
          setMessage('Sector desactivado exitosamente')
          // Recargar sectores desde la base de datos
          const sectoresResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES)
          if (sectoresResponse.success) {
            setSectores(sectoresResponse.data)
          }
        } else {
          setMessage(`Error: ${response.message}`)
        }
      } catch (error) {
        setMessage('Error al desactivar el sector')
      }
    }
  }

  const handleActivarSector = async (sectorId: number) => {
    if (confirm('¿Estás seguro de que quieres activar este sector? El sector estará disponible para los clientes.')) {
      try {
        const response = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES_ACTIVAR(sectorId), {
          method: 'PUT'
        })
        if (response.success) {
          setMessage('Sector activado exitosamente')
          // Recargar sectores desde la base de datos
          const sectoresResponse = await apiRequest(API_ENDPOINTS.CONFIGURACION_SECTORES)
          if (sectoresResponse.success) {
            setSectores(sectoresResponse.data)
          }
        } else {
          setMessage(`Error: ${response.message}`)
        }
      } catch (error) {
        setMessage('Error al activar el sector')
      }
    }
  }

  if (loading) return <div className="p-8 text-center">Cargando configuración...</div>
  if (!currentUser || currentUser.role !== "administrador") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="flex items-center space-x-2 hover:bg-indigo-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  Configuración del Sistema
                </h1>
                <p className="text-slate-600">Administración y configuración general</p>
              </div>
            </div>
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}

          <Tabs defaultValue="empresa" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 bg-white/50 backdrop-blur-sm">
              <TabsTrigger value="empresa" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                Empresa
              </TabsTrigger>
              <TabsTrigger value="email" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                Email
              </TabsTrigger>
              <TabsTrigger value="sistema" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                Sistema
              </TabsTrigger>
              <TabsTrigger value="database" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                Base de Datos
              </TabsTrigger>
              <TabsTrigger value="planes" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Planes
              </TabsTrigger>
              <TabsTrigger value="sectores" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Sectores
              </TabsTrigger>
            </TabsList>

            {/* Pestaña de Empresa */}
            <TabsContent value="empresa" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Información de la Empresa</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="nombre_empresa" className="text-slate-700 font-medium">
                        Nombre de la Empresa
                      </Label>
                      <Input
                        id="nombre_empresa"
                        value={config.empresa.nombre}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            empresa: { ...config.empresa, nombre: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-indigo-500 ${errors['empresa_nombre'] ? 'border-red-500' : ''}`}
                      />
                      {errors['empresa_nombre'] && <div className="text-red-600 text-xs mt-1">{errors['empresa_nombre']}</div>}
                    </div>
                    <div>
                      <Label htmlFor="ruc" className="text-slate-700 font-medium">
                        RUC
                      </Label>
                      <Input
                        id="ruc"
                        value={config.empresa.ruc}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            empresa: { ...config.empresa, ruc: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-indigo-500 ${errors['empresa_ruc'] ? 'border-red-500' : ''}`}
                      />
                      {errors['empresa_ruc'] && <div className="text-red-600 text-xs mt-1">{errors['empresa_ruc']}</div>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="direccion" className="text-slate-700 font-medium">
                      Dirección
                    </Label>
                    <Input
                      id="direccion"
                      value={config.empresa.direccion}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          empresa: { ...config.empresa, direccion: e.target.value },
                        })
                      }
                      className={`mt-2 border-slate-200 focus:border-indigo-500 ${errors['empresa_direccion'] ? 'border-red-500' : ''}`}
                    />
                    {errors['empresa_direccion'] && <div className="text-red-600 text-xs mt-1">{errors['empresa_direccion']}</div>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="telefono_empresa" className="text-slate-700 font-medium">
                        Teléfono
                      </Label>
                      <Input
                        id="telefono_empresa"
                        value={config.empresa.telefono}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            empresa: { ...config.empresa, telefono: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-indigo-500 ${errors['empresa_telefono'] ? 'border-red-500' : ''}`}
                      />
                      {errors['empresa_telefono'] && <div className="text-red-600 text-xs mt-1">{errors['empresa_telefono']}</div>}
                    </div>
                    <div>
                      <Label htmlFor="whatsapp_empresa" className="text-slate-700 font-medium">
                        WhatsApp (Número de envío)
                      </Label>
                      <Input
                        id="whatsapp_empresa"
                        value={config.empresa.whatsapp || ''}
                        placeholder="0984517703"
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            empresa: { ...config.empresa, whatsapp: e.target.value.replace(/\D/g, '') },
                          })
                        }
                        className="mt-2 border-slate-200 focus:border-indigo-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Número desde el cual se envían los mensajes a los clientes</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="email_empresa" className="text-slate-700 font-medium">
                        Email
                      </Label>
                      <Input
                        id="email_empresa"
                        value={config.empresa.email}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            empresa: { ...config.empresa, email: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-indigo-500 ${errors['empresa_email'] ? 'border-red-500' : ''}`}
                      />
                      {errors['empresa_email'] && <div className="text-red-600 text-xs mt-1">{errors['empresa_email']}</div>}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSave("empresa")}
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Configuración
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña de Email */}
            <TabsContent value="email" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="h-5 w-5" />
                    <span>Configuración de Email</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="smtp_server" className="text-slate-700 font-medium">
                        Servidor SMTP
                      </Label>
                      <Input
                        id="smtp_server"
                        value={config.email.smtp_server}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            email: { ...config.email, smtp_server: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-blue-500 ${errors['email_smtp_server'] ? 'border-red-500' : ''}`}
                        placeholder="smtp.gmail.com"
                      />
                      {errors['email_smtp_server'] && <div className="text-red-600 text-xs mt-1">{errors['email_smtp_server']}</div>}
                    </div>
                    <div>
                      <Label htmlFor="smtp_port" className="text-slate-700 font-medium">
                        Puerto SMTP
                      </Label>
                      <Input
                        id="smtp_port"
                        value={config.email.smtp_port}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            email: { ...config.email, smtp_port: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-blue-500 ${errors['email_smtp_port'] ? 'border-red-500' : ''}`}
                        placeholder="587"
                      />
                      {errors['email_smtp_port'] && <div className="text-red-600 text-xs mt-1">{errors['email_smtp_port']}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email_usuario" className="text-slate-700 font-medium">
                        Email de Usuario
                    </Label>
                    <Input
                      id="email_usuario"
                      value={config.email.email_usuario}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          email: { ...config.email, email_usuario: e.target.value },
                        })
                      }
                      className={`mt-2 border-slate-200 focus:border-blue-500 ${errors['email_usuario'] ? 'border-red-500' : ''}`}
                        placeholder="usuario@gmail.com"
                    />
                    {errors['email_usuario'] && <div className="text-red-600 text-xs mt-1">{errors['email_usuario']}</div>}
                  </div>
                  <div>
                    <Label htmlFor="email_password" className="text-slate-700 font-medium">
                        Contraseña de Aplicación
                    </Label>
                    <Input
                      id="email_password"
                      type="password"
                      value={config.email.email_password}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          email: { ...config.email, email_password: e.target.value },
                        })
                      }
                      className={`mt-2 border-slate-200 focus:border-blue-500 ${errors['email_password'] ? 'border-red-500' : ''}`}
                        placeholder="Contraseña de aplicación"
                    />
                    {errors['email_password'] && <div className="text-red-600 text-xs mt-1">{errors['email_password']}</div>}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Nota Importante:</h4>
                    <p className="text-blue-700 text-sm">
                      Para Gmail, debes usar una <strong>contraseña de aplicación</strong> en lugar de tu contraseña normal. 
                      Puedes generarla en la configuración de seguridad de tu cuenta de Google.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleSave("email")}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Configuración de Email
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña de Sistema */}
            <TabsContent value="sistema" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Configuración del Sistema</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="dias_aviso_pago" className="text-slate-700 font-medium">
                        Días de Aviso de Pago
                      </Label>
                      <Input
                        id="dias_aviso_pago"
                        type="number"
                        value={config.sistema.dias_aviso_pago}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            sistema: { ...config.sistema, dias_aviso_pago: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-purple-500 ${errors['sistema_dias_aviso_pago'] ? 'border-red-500' : ''}`}
                        placeholder="5"
                      />
                      {errors['sistema_dias_aviso_pago'] && <div className="text-red-600 text-xs mt-1">{errors['sistema_dias_aviso_pago']}</div>}
                      <p className="text-slate-500 text-xs mt-1">Días antes del vencimiento para enviar avisos</p>
                    </div>
                    <div>
                      <Label htmlFor="dias_corte_servicio" className="text-slate-700 font-medium">
                        Días para Corte de Servicio
                      </Label>
                      <Input
                        id="dias_corte_servicio"
                        type="number"
                        value={config.sistema.dias_corte_servicio}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            sistema: { ...config.sistema, dias_corte_servicio: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-purple-500 ${errors['sistema_dias_corte_servicio'] ? 'border-red-500' : ''}`}
                        placeholder="5"
                      />
                      {errors['sistema_dias_corte_servicio'] && <div className="text-red-600 text-xs mt-1">{errors['sistema_dias_corte_servicio']}</div>}
                      <p className="text-slate-500 text-xs mt-1">Días después del vencimiento para cortar servicio</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <h4 className="font-semibold text-slate-900">Backup Automático</h4>
                        <p className="text-slate-600 text-sm">Realizar copias de seguridad automáticas de la base de datos</p>
                      </div>
                      <Switch
                        checked={config.sistema.backup_automatico}
                        onCheckedChange={(checked) =>
                          setConfig({
                            ...config,
                            sistema: { ...config.sistema, backup_automatico: checked },
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <h4 className="font-semibold text-slate-900">Notificaciones Activas</h4>
                        <p className="text-slate-600 text-sm">Enviar notificaciones automáticas a los clientes</p>
                      </div>
                      <Switch
                        checked={config.sistema.notificaciones_activas}
                        onCheckedChange={(checked) =>
                          setConfig({
                            ...config,
                            sistema: { ...config.sistema, notificaciones_activas: checked },
                          })
                        }
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSave("sistema")}
                    disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Configuración del Sistema
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña de Base de Datos */}
            <TabsContent value="database" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Configuración de Base de Datos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="db_host" className="text-slate-700 font-medium">
                        Host de Base de Datos
                      </Label>
                      <Input
                        id="db_host"
                        value={config.database.host}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            database: { ...config.database, host: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-cyan-500 ${errors['db_host'] ? 'border-red-500' : ''}`}
                        placeholder="localhost"
                      />
                      {errors['db_host'] && <div className="text-red-600 text-xs mt-1">{errors['db_host']}</div>}
                    </div>
                    <div>
                      <Label htmlFor="db_puerto" className="text-slate-700 font-medium">
                        Puerto de Base de Datos
                      </Label>
                      <Input
                        id="db_puerto"
                        value={config.database.puerto}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            database: { ...config.database, puerto: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-cyan-500 ${errors['db_puerto'] ? 'border-red-500' : ''}`}
                        placeholder="5432"
                      />
                      {errors['db_puerto'] && <div className="text-red-600 text-xs mt-1">{errors['db_puerto']}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="db_nombre" className="text-slate-700 font-medium">
                        Nombre de Base de Datos
                      </Label>
                      <Input
                        id="db_nombre"
                        value={config.database.nombre_db}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            database: { ...config.database, nombre_db: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-cyan-500 ${errors['db_nombre'] ? 'border-red-500' : ''}`}
                        placeholder="teltec_db"
                      />
                      {errors['db_nombre'] && <div className="text-red-600 text-xs mt-1">{errors['db_nombre']}</div>}
                    </div>
                    <div>
                      <Label htmlFor="db_usuario" className="text-slate-700 font-medium">
                        Usuario de Base de Datos
                      </Label>
                      <Input
                        id="db_usuario"
                        value={config.database.usuario}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            database: { ...config.database, usuario: e.target.value },
                          })
                        }
                        className={`mt-2 border-slate-200 focus:border-cyan-500 ${errors['db_usuario'] ? 'border-red-500' : ''}`}
                        placeholder="postgres"
                      />
                      {errors['db_usuario'] && <div className="text-red-600 text-xs mt-1">{errors['db_usuario']}</div>}
                    </div>
                  </div>

                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <h4 className="font-semibold text-cyan-800 mb-2">Información de Conexión:</h4>
                    <div className="text-cyan-700 text-sm space-y-1">
                      <p><strong>Host:</strong> {config.database.host}</p>
                      <p><strong>Puerto:</strong> {config.database.puerto}</p>
                      <p><strong>Base de Datos:</strong> {config.database.nombre_db}</p>
                      <p><strong>Usuario:</strong> {config.database.usuario}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSave("database")}
                    disabled={saving}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Configuración de Base de Datos
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña de Planes */}
            <TabsContent value="planes" className="space-y-6">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Gestión de Planes de Internet</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Filtro para mostrar planes inactivos */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-inactive-planes"
                        checked={showInactivePlanes}
                        onCheckedChange={setShowInactivePlanes}
                      />
                      <Label htmlFor="show-inactive-planes">Mostrar planes inactivos</Label>
                    </div>
                    
                    {/* Lista de planes desde la base de datos */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {planes
                        .filter((plan: any) => showInactivePlanes || plan.activo)
                        .map((plan: any) => (
                        <div key={plan.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                          plan.activo 
                            ? 'bg-slate-50 border-slate-200' 
                            : 'bg-red-50 border-red-200 opacity-75'
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className={`font-semibold ${plan.activo ? 'text-slate-900' : 'text-red-700'}`}>
                                {plan.nombre}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                plan.activo 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {plan.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <span>{plan.velocidad}</span>
                              <span className="font-medium text-emerald-600">${plan.precio}</span>
                            </div>
                            {plan.descripcion && (
                              <p className="text-sm text-slate-500 mt-1">{plan.descripcion}</p>
                            )}
                          </div>
                                                      <div className="flex items-center space-x-2">
                              <Button
                                onClick={() => {
                                  setEditingPlan(plan)
                                  setPlanForm({
                                    nombre: plan.nombre,
                                    precio: plan.precio.toString(),
                                    velocidad: plan.velocidad || '',
                                    descripcion: plan.descripcion || ''
                                  })
                                  setShowPlanModal(true)
                                }}
                                size="sm"
                                variant="outline"
                                className="border-slate-300 text-slate-600 hover:bg-slate-50"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                onClick={() => plan.activo ? handleDesactivarPlan(plan.id) : handleActivarPlan(plan.id)}
                                size="sm"
                                variant="outline"
                                className={plan.activo 
                                  ? "border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                                  : "border-green-300 text-green-600 hover:bg-green-50"
                                }
                              >
                                {plan.activo ? (
                                  <>
                                    <X className="h-4 w-4 mr-1" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Activar
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => handleEliminarPlan(plan.id)}
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                        </div>
                      ))}
                    </div>

                    {/* Botón para agregar plan */}
                    <Button
                      onClick={() => {
                        setEditingPlan(null)
                        setPlanForm({ nombre: '', precio: '', velocidad: '', descripcion: '' })
                        setShowPlanModal(true)
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña de Sectores */}
            <TabsContent value="sectores" className="space-y-6">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Gestión de Sectores de Cobertura</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Filtro para mostrar sectores inactivos */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-inactive-sectores"
                        checked={showInactiveSectores}
                        onCheckedChange={setShowInactiveSectores}
                      />
                      <Label htmlFor="show-inactive-sectores">Mostrar sectores inactivos</Label>
                    </div>
                    
                    {/* Lista de sectores desde la base de datos */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {sectores
                        .filter((sector: any) => showInactiveSectores || sector.activo)
                        .map((sector: any) => (
                        <div key={sector.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                          sector.activo 
                            ? 'bg-slate-50 border-slate-200' 
                            : 'bg-red-50 border-red-200 opacity-75'
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className={`font-semibold ${sector.activo ? 'text-slate-900' : 'text-red-700'}`}>
                                {sector.nombre}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                sector.activo 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {sector.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            {sector.descripcion && (
                              <p className="text-sm text-slate-500 mt-1">{sector.descripcion}</p>
                            )}
                          </div>
                                                      <div className="flex items-center space-x-2">
                              <Button
                                onClick={() => {
                                  setEditingSector(sector)
                                  setSectorForm({
                                    nombre: sector.nombre,
                                    descripcion: sector.descripcion || ''
                                  })
                                  setShowSectorModal(true)
                                }}
                                size="sm"
                                variant="outline"
                                className="border-slate-300 text-slate-600 hover:bg-slate-50"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                onClick={() => sector.activo ? handleDesactivarSector(sector.id) : handleActivarSector(sector.id)}
                                size="sm"
                                variant="outline"
                                className={sector.activo 
                                  ? "border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                                  : "border-green-300 text-green-600 hover:bg-green-50"
                                }
                              >
                                {sector.activo ? (
                                  <>
                                    <X className="h-4 w-4 mr-1" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Activar
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => handleEliminarSector(sector.id)}
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                        </div>
                      ))}
                    </div>

                    {/* Botón para agregar sector */}
                    <Button
                      onClick={() => {
                        setEditingSector(null)
                        setSectorForm({ nombre: '', descripcion: '' })
                        setShowSectorModal(true)
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Sector
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Modal para Planes */}
            {showPlanModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingPlan ? 'Editar Plan' : 'Crear Plan'}
                  </h3>
                  <div className="space-y-4">
    <div>
                      <Label htmlFor="plan-nombre">Nombre del Plan</Label>
                      <Input
                        id="plan-nombre"
                        value={planForm.nombre}
                        onChange={(e) => setPlanForm({...planForm, nombre: e.target.value})}
                        placeholder="Ej: Plan Básico"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan-precio">Precio</Label>
                      <Input
                        id="plan-precio"
                        type="number"
                        value={planForm.precio}
                        onChange={(e) => setPlanForm({...planForm, precio: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan-velocidad">Velocidad</Label>
                      <Input
                        id="plan-velocidad"
                        value={planForm.velocidad}
                        onChange={(e) => setPlanForm({...planForm, velocidad: e.target.value})}
                        placeholder="Ej: 15 Mbps"
                      />
                    </div>
                    <div>
                      <Label htmlFor="plan-descripcion">Descripción</Label>
                      <Input
                        id="plan-descripcion"
                        value={planForm.descripcion}
                        onChange={(e) => setPlanForm({...planForm, descripcion: e.target.value})}
                        placeholder="Descripción opcional"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-6">
                    <Button
                      onClick={editingPlan ? handleActualizarPlan : handleCrearPlan}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {editingPlan ? 'Actualizar' : 'Crear'}
                    </Button>
                    <Button
                      onClick={() => setShowPlanModal(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para Sectores */}
            {showSectorModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingSector ? 'Editar Sector' : 'Crear Sector'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sector-nombre">Nombre del Sector</Label>
                      <Input
                        id="sector-nombre"
                        value={sectorForm.nombre}
                        onChange={(e) => setSectorForm({...sectorForm, nombre: e.target.value})}
                        placeholder="Ej: Centro"
                      />
          </div>
                    <div>
                      <Label htmlFor="sector-descripcion">Descripción</Label>
                      <Input
                        id="sector-descripcion"
                        value={sectorForm.descripcion}
                        onChange={(e) => setSectorForm({...sectorForm, descripcion: e.target.value})}
                        placeholder="Descripción opcional"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-6">
                    <Button
                      onClick={editingSector ? handleActualizarSector : handleCrearSector}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {editingSector ? 'Actualizar' : 'Crear'}
                    </Button>
                    <Button
                      onClick={() => setShowSectorModal(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
