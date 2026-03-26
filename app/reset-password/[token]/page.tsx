"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { API_ENDPOINTS } from "@/lib/config/api"

export default function ResetPasswordPage() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") || ""
  const [newPassword, setNewPassword] = useState("")
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(API_ENDPOINTS.RESET_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      })
      const j = await res.json()
      setMsg(j.message)
      if (j.success) router.push("/")
    } catch {
      setMsg("Error al restablecer la contraseña")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">Restablecer contraseña</h2>
          {msg && <p className="mb-4 text-center text-sm text-green-400">{msg}</p>}
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <Label htmlFor="newPassword" className="text-slate-300">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Procesando..." : "Restablecer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
