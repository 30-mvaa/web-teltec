"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, User, Lock, Save, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { apiRequest, API_ENDPOINTS } from "@/lib/config/api"

export default function PerfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [user, setUser] = useState({
    nombre: "",
    email: "",
    rol: "",
    id: null as number | null,
    fecha_registro: "",
  })
  
  const [editForm, setEditForm] = useState({
    nombre: "",
  })
  
  const [passwordForm, setPasswordForm] = useState({
    password_actual: "",
    password_nuevo: "",
    password_confirmar: "",
  })
  
  const [showPasswords, setShowPasswords] = useState({
    actual: false,
    nuevo: false,
    confirmar: false,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail")
    const userName = localStorage.getItem("userName")
    const userRole = localStorage.getItem("userRole")
    const userId = localStorage.getItem("userId")
    
    if (!userEmail) {
      router.push("/")
      return
    }
    
    setUser({
      nombre: userName || "",
      email: userEmail || "",
      rol: userRole || "",
      id: userId ? parseInt(userId) : null,
      fecha_registro: "",
    })
    setEditForm({ nombre: userName || "" })
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => setMessage(null), 4000)
      return () => clearTimeout(timeout)
    }
  }, [message])

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {}
    if (!editForm.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {}
    if (!passwordForm.password_actual) {
      newErrors.password_actual = "La contraseña actual es requerida"
    }
    if (!passwordForm.password_nuevo) {
      newErrors.password_nuevo = "La nueva contraseña es requerida"
    } else if (passwordForm.password_nuevo.length < 6) {
      newErrors.password_nuevo = "La contraseña debe tener al menos 6 caracteres"
    }
    if (!passwordForm.password_confirmar) {
      newErrors.password_confirmar = "Debe confirmar la contraseña"
    } else if (passwordForm.password_nuevo !== passwordForm.password_confirmar) {
      newErrors.password_confirmar = "Las contraseñas no coinciden"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProfile = async () => {
    setMessage(null)
    if (!validateEditForm()) {
      return
    }
    setSaving(true)
    try {
      const response = await apiRequest(API_ENDPOINTS.USUARIO_PERFIL_ACTUALIZAR, {
        method: "PUT",
        body: JSON.stringify({ nombre: editForm.nombre }),
      })
      
      if (response.success) {
        localStorage.setItem("userName", editForm.nombre)
        setUser({ ...user, nombre: editForm.nombre })
        setMessage({ type: "success", text: "Perfil actualizado exitosamente" })
      } else {
        setMessage({ type: "error", text: response.message || "Error al actualizar perfil" })
      }
    } catch (error) {
      console.error("Error guardando perfil:", error)
      setMessage({ type: "error", text: "Error de conexión al guardar" })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setMessage(null)
    if (!validatePasswordForm()) {
      return
    }
    setSaving(true)
    try {
      const response = await apiRequest(API_ENDPOINTS.USUARIO_CAMBIAR_PASSWORD, {
        method: "PUT",
        body: JSON.stringify({
          email: user.email,
          password_actual: passwordForm.password_actual,
          password_nuevo: passwordForm.password_nuevo,
        }),
      })
      
      if (response.success) {
        setMessage({ type: "success", text: "Contraseña cambiada exitosamente" })
        setPasswordForm({
          password_actual: "",
          password_nuevo: "",
          password_confirmar: "",
        })
      } else {
        setMessage({ type: "error", text: response.message || "Error al cambiar contraseña" })
      }
    } catch (error) {
      console.error("Error cambiando contraseña:", error)
      setMessage({ type: "error", text: "Error de conexión al cambiar contraseña" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
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
                  Mi Perfil
                </h1>
                <p className="text-slate-600">Administra tu información personal</p>
              </div>
            </div>
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}>
              {message.type === "error" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Avatar y info básica */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {getInitials(user.nombre)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{user.nombre}</h2>
                  <p className="text-slate-600">{user.email}</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 mt-2">
                    {user.rol === "administrador" ? "Administrador" : user.rol === "cobrador" ? "Cobrador" : "Usuario"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="datos" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-sm">
              <TabsTrigger 
                value="datos" 
                className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Datos Personales
              </TabsTrigger>
              <TabsTrigger 
                value="password" 
                className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Cambiar Contraseña
              </TabsTrigger>
            </TabsList>

            {/* Pestaña de Datos Personales */}
            <TabsContent value="datos">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Información Personal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div>
                    <Label htmlFor="nombre" className="text-slate-700 font-medium">
                      Nombre Completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nombre"
                      value={editForm.nombre}
                      onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      className={`mt-2 border-slate-200 focus:border-indigo-500 ${
                        errors.nombre ? "border-red-500" : ""
                      }`}
                      placeholder="Ingresa tu nombre completo"
                      required
                    />
                    {errors.nombre && (
                      <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-slate-700 font-medium">
                      Correo Electrónico <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      required
                      className="mt-2 border-slate-200 bg-slate-50 text-slate-500"
                    />
                  </div>

                  <Button
                    onClick={handleSaveProfile}
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
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña de Cambiar Contraseña */}
            <TabsContent value="password">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="h-5 w-5" />
                    <span>Cambiar Contraseña</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div>
                    <Label htmlFor="password_actual" className="text-slate-700 font-medium">
                      Contraseña Actual <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="password_actual"
                        type={showPasswords.actual ? "text" : "password"}
                        value={passwordForm.password_actual}
                        onChange={(e) => setPasswordForm({ ...passwordForm, password_actual: e.target.value })}
                        className={`pr-10 border-slate-200 focus:border-cyan-500 ${
                          errors.password_actual ? "border-red-500" : ""
                        }`}
                        placeholder="Ingresa tu contraseña actual"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, actual: !showPasswords.actual })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.actual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password_actual && (
                      <p className="text-red-600 text-sm mt-1">{errors.password_actual}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password_nuevo" className="text-slate-700 font-medium">
                      Nueva Contraseña <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="password_nuevo"
                        type={showPasswords.nuevo ? "text" : "password"}
                        value={passwordForm.password_nuevo}
                        onChange={(e) => setPasswordForm({ ...passwordForm, password_nuevo: e.target.value })}
                        className={`pr-10 border-slate-200 focus:border-cyan-500 ${
                          errors.password_nuevo ? "border-red-500" : ""
                        }`}
                        placeholder="Ingresa la nueva contraseña"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, nuevo: !showPasswords.nuevo })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.nuevo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password_nuevo && (
                      <p className="text-red-600 text-sm mt-1">{errors.password_nuevo}</p>
                    )}
                    <p className="text-slate-500 text-xs mt-1">Mínimo 6 caracteres</p>
                  </div>

                  <div>
                    <Label htmlFor="password_confirmar" className="text-slate-700 font-medium">
                      Confirmar Nueva Contraseña <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="password_confirmar"
                        type={showPasswords.confirmar ? "text" : "password"}
                        value={passwordForm.password_confirmar}
                        onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmar: e.target.value })}
                        className={`pr-10 border-slate-200 focus:border-cyan-500 ${
                          errors.password_confirmar ? "border-red-500" : ""
                        }`}
                        placeholder="Confirma la nueva contraseña"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirmar: !showPasswords.confirmar })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.confirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password_confirmar && (
                      <p className="text-red-600 text-sm mt-1">{errors.password_confirmar}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cambiando...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Cambiar Contraseña
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}