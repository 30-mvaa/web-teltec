"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { loginUser, isAuthenticated, validateAuthentication, API_ENDPOINTS } from "@/lib/config/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, EyeOff, Mail, Lock, Wifi, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [blockMinutes, setBlockMinutes] = useState(5)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockUntil, setBlockUntil] = useState<Date | null>(null)
  const [remainingTime, setRemainingTime] = useState(0)
  const [configLoaded, setConfigLoaded] = useState(false)

  // Verificar si ya está autenticado
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        // Validar con el servidor antes de redirigir
        const isValid = await validateAuthentication()
        if (isValid) {
          router.push('/dashboard')
        }
      }
    }
    
    checkAuth()
  }, [router])

  // Obtener configuración de login
  useEffect(() => {
    // Limpiar datos de sesión al cargar la página de login
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    
    fetch(API_ENDPOINTS.CONFIGURACION)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const config = data.data
          const max = config.find((c: any) => c.clave === 'login_intentos_maximos')?.valor
          const min = config.find((c: any) => c.clave === 'login_minutos_congelacion')?.valor
          if (max) setMaxAttempts(Number(max))
          if (min) setBlockMinutes(Number(min))
        }
        setConfigLoaded(true)
      })
      .catch(() => { setConfigLoaded(true) })

    // Verificar bloqueo persistente
    const storedBlock = localStorage.getItem("login_block_until")
    if (storedBlock) {
      const until = new Date(storedBlock)
      if (until > new Date()) {
        setIsBlocked(true)
        setBlockUntil(until)
      } else {
        localStorage.removeItem("login_block_until")
      }
    }
  }, [])

  // Manejar desbloqueo automático
  useEffect(() => {
    if (!blockUntil) return
    const now = new Date()
    const ms = blockUntil.getTime() - now.getTime()
    if (ms <= 0) {
      setIsBlocked(false)
      setBlockUntil(null)
      setLoginAttempts(0)
      localStorage.removeItem("login_block_until")
      return
    }
    localStorage.setItem("login_block_until", blockUntil.toISOString())
    const timeout = setTimeout(() => {
      setIsBlocked(false)
      setBlockUntil(null)
      setLoginAttempts(0)
      localStorage.removeItem("login_block_until")
    }, ms)
    return () => clearTimeout(timeout)
  }, [blockUntil])

  // Actualizar contador regresivo
  useEffect(() => {
    if (!isBlocked || !blockUntil) {
      setRemainingTime(0)
      return
    }
    const update = () => {
      const now = new Date()
      const diff = Math.max(0, Math.floor((blockUntil.getTime() - now.getTime()) / 1000))
      setRemainingTime(diff)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [isBlocked, blockUntil])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Verificar que no esté ya autenticado
    if (isAuthenticated()) {
      setError("Ya hay una sesión activa")
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    setError("")

    try {
      // Validaciones
      if (!email.trim()) {
        setError("El email es requerido")
        setIsLoading(false)
        return
      }
      
      if (!password.trim()) {
        setError("La contraseña es requerida")
        setIsLoading(false)
        return
      }
      
      if (!email.includes('@')) {
        setError("Email inválido")
        setIsLoading(false)
        return
      }

      const result = await loginUser(email, password)
      
      if (result.success && result.data) {
        setLoginAttempts(0)
        setIsBlocked(false)
        setBlockUntil(null)
        localStorage.removeItem("login_block_until")
        window.location.href = "/dashboard"
      } else {
        setError(result.message || "Credenciales incorrectas")
        setLoginAttempts((prev) => prev + 1)
      }
    } catch (error: any) {
      console.error("Error en login:", error)
      
      if (error.message.includes("No se puede conectar al servidor")) {
        setError("No se puede conectar al servidor. Verifique que el backend esté ejecutándose.")
      } else if (error.message.includes("Demasiados intentos")) {
        setIsBlocked(true)
        const until = new Date(Date.now() + blockMinutes * 60000)
        setBlockUntil(until)
        localStorage.setItem("login_block_until", until.toISOString())
        setError(`Demasiados intentos fallidos. Intente más tarde (${blockMinutes} min).`)
      } else if (error.message.includes("Credenciales incorrectas")) {
        setError("Email o contraseña incorrectos")
        setLoginAttempts((prev) => prev + 1)
      } else if (error.message.includes("Error del servidor")) {
        setError("Error del servidor. Intente más tarde.")
      } else {
        setError(error.message || "Error al conectar con el servidor")
        setLoginAttempts((prev) => prev + 1)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        {/* Botón volver al inicio */}
        <div className="mb-6">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
        </div>

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Wifi className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <span className="text-blue-600">Tel</span>
            <span className="text-purple-600">Tec</span>
            <span className="text-green-600"> Net</span>
          </h1>
          <p className="text-gray-600">Sistema de Gestión</p>
        </div>

        {/* Formulario de login */}
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Iniciar Sesión
            </h2>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Correo Electrónico
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isBlocked}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Contraseña
                  </Label>
                  <Link 
                    href="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    ¿Olvidó su contraseña?
                  </Link>
                </div>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isBlocked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm font-medium">
                    {error}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || isBlocked}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Iniciando...
                  </div>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>

              {isBlocked && remainingTime > 0 && (
                <div className="text-center text-sm text-gray-600">
                  Intente nuevamente en:{" "}
                  <span className="font-semibold text-blue-600">
                    {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Ingresa con tu email y contraseña registrados en el sistema</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 