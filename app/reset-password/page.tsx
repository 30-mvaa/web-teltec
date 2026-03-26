"use client"

import React, { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { API_ENDPOINTS } from "@/lib/config/api"

function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get("token")
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!token) {
      setMessage({ text: "Token no válido o no proporcionado.", isError: true })
      return
    }

    if (password !== confirmPassword) {
      setMessage({ text: "Las contraseñas no coinciden.", isError: true })
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(API_ENDPOINTS.RESET_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        setMessage({ text: "Contraseña restablecida con éxito.", isError: false })
        setTimeout(() => router.push("/"), 3000)
      } else {
        setMessage({ text: json.message || "Error al restablecer la contraseña.", isError: true })
      }
    } catch (err) {
      setMessage({ text: "Error de red. Intente más tarde.", isError: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      <div className="w-full max-w-md p-6 space-y-6 bg-slate-800 rounded-xl">
        <h1 className="text-2xl font-bold text-center">Restablecer Contraseña</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Nueva Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-slate-700 text-white"
            />
          </div>

          {message && (
            <div className={`text-sm text-center ${message.isError ? "text-red-400" : "text-green-400"}`}>
              {message.text}
            </div>
          )}

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? "Procesando..." : "Restablecer Contraseña"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="w-full max-w-md p-6 space-y-6 bg-slate-800 rounded-xl">
          <h1 className="text-2xl font-bold text-center">Cargando...</h1>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}