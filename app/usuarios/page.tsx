"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Search, Edit, Trash2, Shield, Eye, EyeOff, RefreshCw, User, X } from "lucide-react"
import { apiRequest, API_ENDPOINTS, isAuthenticated } from "@/lib/config/api"

interface Usuario {
  id: number
  email: string
  nombre: string
  rol: "administrador" | "economia" | "atencion_cliente"
  activo: boolean
  fecha_creacion: string
  fecha_actualizacion: string
}

type FormData = {
  email: string
  nombre: string
  rol: Usuario['rol']
  activo: boolean
  password: string
  confirmPassword: string
}

export default function UsuariosPage() {
  const router = useRouter()
  
  // Estados principales
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [allUsuarios, setAllUsuarios] = useState<Usuario[]>([]) // Todos los usuarios sin filtrar
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados de búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  
  // Estados del modal
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  
  // Estados de confirmación
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, usuario: Usuario | null }>({
    open: false,
    usuario: null
  })
  
  // Estados del formulario
  const [formData, setFormData] = useState<FormData>({
    email: "",
    nombre: "",
    rol: "atencion_cliente",
    activo: true,
    password: "",
    confirmPassword: ""
  })
  
  // Estados de validación
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Verificar autenticación
  const checkAuth = () => {
    if (!isAuthenticated()) {
      router.push("/")
      return false
    }
    return true
  }

  // Cargar datos de usuarios
  async function loadData() {
    if (!checkAuth()) return
    
    setLoading(true)
    setError(null)
    
    try {
      const json = await apiRequest(API_ENDPOINTS.USUARIOS)
      
      if (json.success && Array.isArray(json.data)) {
        setAllUsuarios(json.data) // Guardar todos los usuarios
        setUsuarios(json.data) // Inicialmente mostrar todos
      } else {
        throw new Error(json.message || "Error cargando usuarios")
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error en loadData:", e)
      }
      setError((e as Error).message || "Error cargando usuarios")
    } finally {
      setLoading(false)
    }
  }

  // Filtrar usuarios basado en el término de búsqueda
  const filterUsuarios = (term: string) => {
    if (!term.trim()) {
      setUsuarios(allUsuarios)
      return
    }

    const searchLower = term.toLowerCase()
    const filtered = allUsuarios.filter(usuario =>
      usuario.nombre.toLowerCase().includes(searchLower) ||
      usuario.email.toLowerCase().includes(searchLower) ||
      usuario.rol.toLowerCase().includes(searchLower) ||
      usuario.id.toString().includes(searchLower)
    )
    
    setUsuarios(filtered)
  }

  // Calcular estadísticas
  const getStats = () => {
    const total = allUsuarios.length // Usar todos los usuarios para estadísticas
    const activos = allUsuarios.filter(u => u.activo).length
    const inactivos = allUsuarios.filter(u => !u.activo).length
    const administradores = allUsuarios.filter(u => u.rol === 'administrador').length
    const economia = allUsuarios.filter(u => u.rol === 'economia').length
    const atencionCliente = allUsuarios.filter(u => u.rol === 'atencion_cliente').length

    return {
      total,
      activos,
      inactivos,
      administradores,
      economia,
      atencionCliente,
      porcentajeActivos: total > 0 ? Math.round((activos / total) * 100) : 0,
      porcentajeInactivos: total > 0 ? Math.round((inactivos / total) * 100) : 0
    }
  }

  // Validar email en tiempo real
  const validarEmailEnTiempoReal = (email: string) => {
    if (!email) {
      setEmailError(null)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError("Formato de email inválido")
      return
    }

    // Verificar si el email ya existe (excepto el usuario que se está editando)
    const emailExiste = allUsuarios.some(u => u.email === email && u.id !== editing?.id)
    if (emailExiste) {
      setEmailError("Este email ya está registrado")
      return
    }

    setEmailError(null)
  }

  // Validar contraseña en tiempo real
  const validarPasswordEnTiempoReal = (password: string, confirmPassword: string) => {
    if (!editing) { // Solo validar en creación
      if (password.length < 6) {
        setPasswordError("La contraseña debe tener al menos 6 caracteres")
        return
      }
      
      if (password !== confirmPassword) {
        setPasswordError("Las contraseñas no coinciden")
        return
      }
    }
    
    setPasswordError(null)
  }

  // Abrir modal para nuevo usuario
  const openNew = () => {
    setEditing(null)
    setFormData({
      email: "",
      nombre: "",
      rol: "atencion_cliente",
      activo: true,
      password: "",
      confirmPassword: ""
    })
    setEmailError(null)
    setPasswordError(null)
    setIsDialogOpen(true)
  }

  // Abrir modal de edición
  const handleEdit = (u: Usuario) => {
    setEditing(u)
    setFormData({
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo,
      password: "",
      confirmPassword: ""
    })
    setEmailError(null)
    setPasswordError(null)
    setIsDialogOpen(true)
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkAuth()) return

    // Validaciones
    if (emailError) {
      setError("Por favor, corrija los errores en el email")
      return
    }

    if (!editing && passwordError) {
      setError("Por favor, corrija los errores en la contraseña")
      return
    }

    if (!formData.nombre.trim()) {
      setError("El nombre es obligatorio")
      return
    }

    if (!editing && !formData.email.trim()) {
      setError("El email es obligatorio")
      return
    }

    try {
      let url: string
      let method: string
      let payload: any

      if (editing) {
        // Actualizar usuario existente
        url = `${API_ENDPOINTS.USUARIO_UPDATE}`
        method = 'PUT'
        payload = {
          id: editing.id,
          nombre: formData.nombre,
          rol: formData.rol,
          activo: formData.activo
        }
      } else {
        // Crear nuevo usuario
        url = `${API_ENDPOINTS.USUARIO_CREATE}`
        method = 'POST'
        payload = {
          email: formData.email,
          nombre: formData.nombre,
          rol: formData.rol,
          activo: formData.activo,
          password: formData.password
        }
      }
      
      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(payload)
      })

      if (response.success) {
        setIsDialogOpen(false)
        setSuccess(editing ? "Usuario actualizado exitosamente" : "Usuario creado exitosamente")
        setError(null)
        loadData() // Recargar datos
        setSearchTerm("") // Limpiar búsqueda
        
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || "Error al guardar usuario")
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error en handleSubmit:", e)
      }
      setError((e as Error).message || "Error al guardar usuario")
    }
  }

  // Abrir diálogo de confirmación de eliminación
  const handleDeleteClick = (usuario: Usuario) => {
    // Proteger al administrador principal
    if (usuario.email === "vangamarca4@gmail.com") {
      setError("No se puede eliminar al administrador principal del sistema")
      setTimeout(() => setError(null), 3000)
      return
    }

    // Verificar que no se elimine el último administrador
    const administradores = allUsuarios.filter(u => u.rol === 'administrador' && u.activo)
    if (usuario.rol === 'administrador' && administradores.length <= 1) {
      setError("No se puede eliminar el último administrador activo del sistema")
      setTimeout(() => setError(null), 3000)
      return
    }

    setDeleteDialog({ open: true, usuario })
  }

  // Confirmar eliminación
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.usuario) return
    
    try {
      const url = `${API_ENDPOINTS.USUARIO_DELETE(deleteDialog.usuario.id)}`
      const response = await apiRequest(url, {
        method: 'DELETE'
      })

      if (response.success) {
        setSuccess("Usuario eliminado exitosamente")
        setError(null)
        loadData() // Recargar datos
        setSearchTerm("") // Limpiar búsqueda
        
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || "Error al eliminar usuario")
      }
    } catch (e) {
      console.error("Error en handleDelete:", e)
      setError((e as Error).message || "Error al eliminar usuario")
    } finally {
      setDeleteDialog({ open: false, usuario: null })
    }
  }

  // Refrescar datos
  const handleRefresh = () => {
    setSearchTerm("")
    loadData()
  }

  // Navegar de vuelta al dashboard
  const handleGoBack = () => {
    router.push("/dashboard")
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    if (checkAuth()) {
      loadData()
    }
  }, [])

  // Búsqueda con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearching(true)
      filterUsuarios(searchTerm)
      setTimeout(() => setSearching(false), 300) // Simular tiempo de búsqueda
    }, 300) // Esperar 300ms después de que el usuario deje de escribir

    return () => clearTimeout(timeoutId)
  }, [searchTerm, allUsuarios])

  if (loading) return <div className="p-6 text-center">Cargando usuarios...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
              <p className="text-gray-600">Administra los usuarios del sistema</p>
            </div>
          </div>
          <Button onClick={openNew} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        {/* Mensajes de error y éxito */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Estadísticas - Alineadas horizontalmente */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(() => {
              const stats = getStats()
              return (
                <>
                  <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow transform hover:scale-105">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-xs font-medium">Total</p>
                          <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                        <div className="w-8 h-8 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow transform hover:scale-105">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-xs font-medium">Activos</p>
                          <p className="text-2xl font-bold">{stats.activos}</p>
                          <p className="text-green-200 text-xs">
                            {stats.porcentajeActivos}%
                          </p>
                        </div>
                        <div className="w-8 h-8 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg transition-shadow transform hover:scale-105">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-red-100 text-xs font-medium">Inactivos</p>
                          <p className="text-2xl font-bold">{stats.inactivos}</p>
                          <p className="text-red-200 text-xs">
                            {stats.porcentajeInactivos}%
                          </p>
                        </div>
                        <div className="w-8 h-8 bg-red-400 bg-opacity-30 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow transform hover:scale-105">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-xs font-medium">Administradores</p>
                          <p className="text-2xl font-bold">{stats.administradores}</p>
                        </div>
                        <div className="w-8 h-8 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center">
                          <Shield className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:shadow-lg transition-shadow transform hover:scale-105">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-yellow-100 text-xs font-medium">Economía</p>
                          <p className="text-2xl font-bold">{stats.economia}</p>
                        </div>
                        <div className="w-8 h-8 bg-yellow-400 bg-opacity-30 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:shadow-lg transition-shadow transform hover:scale-105">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-indigo-100 text-xs font-medium">Atención</p>
                          <p className="text-2xl font-bold">{stats.atencionCliente}</p>
                        </div>
                        <div className="w-8 h-8 bg-indigo-400 bg-opacity-30 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )
            })()}
          </div>
        </div>

        {/* Búsqueda */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar por nombre, email, rol, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        filterUsuarios(searchTerm)
                      }
                    }}
                    className={`pl-10 ${searching ? 'pr-10' : ''}`}
                    disabled={searching}
                  />
                  {searching && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {searchTerm && !searching && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("")
                        setUsuarios(allUsuarios)
                      }}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={handleRefresh} variant="outline" className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  Refrescar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle>
              Usuarios ({usuarios.length})
              {searchTerm && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - Resultados para "{searchTerm}" ({usuarios.length} de {allUsuarios.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <User className="h-8 w-8 text-gray-400" />
                          <p className="text-gray-500">
                            {searchTerm ? `No se encontraron usuarios para "${searchTerm}"` : "No hay usuarios registrados"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{usuario.nombre}</p>
                              <p className="text-sm text-gray-500">
                                ID: {usuario.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {usuario.email}
                          </code>
                        </TableCell>
                        <TableCell>
                          {usuario.rol === 'administrador' ? (
                            <Badge className="bg-red-100 text-red-800">
                              {usuario.email === "vangamarca4@gmail.com" ? "Administrador Principal" : "Administrador"}
                            </Badge>
                          ) : usuario.rol === 'economia' ? (
                            <Badge className="bg-blue-100 text-blue-800">Economía</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Atención Cliente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={usuario.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-600">
                            {new Date(usuario.fecha_creacion).toLocaleDateString('es-ES')}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(usuario)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {usuario.email !== "vangamarca4@gmail.com" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteClick(usuario)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de formulario */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Shield className="inline mr-2 h-5 w-5" />
              {editing ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editing && (
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }))
                    validarEmailEnTiempoReal(e.target.value)
                  }}
                  placeholder="usuario@email.com"
                />
                {emailError && (
                  <p className="text-sm text-red-600 mt-1">{emailError}</p>
                )}
              </div>
            )}
            
            <div>
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre Apellido"
              />
            </div>
            
            <div>
              <Label htmlFor="rol">Rol *</Label>
              <Select value={formData.rol} onValueChange={(value) => setFormData(prev => ({ ...prev, rol: value as Usuario['rol'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="economia">Economía</SelectItem>
                  <SelectItem value="atencion_cliente">Atención Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {!editing && (
              <>
                <div>
                  <Label htmlFor="password">Contraseña *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, password: e.target.value }))
                        validarPasswordEnTiempoReal(e.target.value, formData.confirmPassword)
                      }}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="absolute right-2 top-2 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))
                      validarPasswordEnTiempoReal(formData.password, e.target.value)
                    }}
                    placeholder="Repite la contraseña"
                  />
                </div>
                
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
              </>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                id="activo"
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="activo">Usuario Activo</Label>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editing ? "Actualizar" : "Crear"} Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, usuario: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{" "}
              <strong>{deleteDialog.usuario?.nombre}</strong> ({deleteDialog.usuario?.email}).
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
    </div>
  )
}
