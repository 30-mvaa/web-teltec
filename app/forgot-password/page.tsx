"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"
import { API_ENDPOINTS } from "@/lib/config/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const res = await fetch(API_ENDPOINTS.FORGOT_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessage({ text: json.message, isError: false })
      } else {
        setMessage({ text: json.message || "Error al enviar el email de recuperación", isError: true })
      }
    } catch (err) {
      setMessage({ text: "Error de red. Intenta de nuevo más tarde.", isError: true })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">
            <span className="text-white">Tel</span>
            <span className="text-blue-500">Tec</span>
            <span className="text-green-500"> Net</span>
          </h1>
          <p className="text-slate-400 text-lg">Recuperación de Contraseña</p>
        </div>

        {/* Recovery Form */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-white">¿Olvidó su contraseña?</h2>
              <p className="text-slate-400 mt-2">
                Ingrese su email y le enviaremos un enlace para restablecer su contraseña
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`text-center text-sm ${
                    message.isError ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              >
                {isLoading ? "Enviando..." : "Enviar enlace de recuperación"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver al inicio de sesión</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
