"use client"

import React, { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Bot, User, Minimize2, Maximize2 } from "lucide-react"
import { API_ENDPOINTS } from "@/lib/config/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  quickReplies?: string[]
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "¡Bienvenido al asistente de TelTec Net! 👋\n\nSoy tu asistente virtual. Puedo ayudarte con:\n\n📋 Información de planes y precios\n🌍 Cobertura en tu zona\n💼 Gestión de clientes\n📞 Datos de contacto\n\nSelecciona una opción o escríbeme directamente.",
      quickReplies: ["Ver planes", "Cobertura", "Contacto", "Soy cliente"],
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const getQuickReplies = (stage: string): string[] => {
    switch (stage) {
      case "plans": return ["Residencial", "Empresarial", "Precios", "Volver"]
      case "coverage": return ["Zona urbana", "Zona rural", "Mi zona", "Volver"]
      case "contact": return ["WhatsApp", "Teléfono", "Horario", "Volver"]
      case "customer": return ["Mi deuda", "Estado cuenta", "Soporte", "Volver"]
      default: return ["Ver planes", "Cobertura", "Contacto", "Soy cliente"]
    }
  }

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputMessage.trim()
    if (!messageText || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await fetch(API_ENDPOINTS.CHATBOT_MENSAJE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: messageText, contexto: "sitio_publico" }),
      })

      let responseText = "Gracias por tu mensaje. ¿En qué más puedo ayudarte?"
      let quickReplies = getQuickReplies("initial")
      if (response.ok) {
        const data = await response.json()
        responseText = data.respuesta || responseText
      } else {
        quickReplies = getQuickReplies("initial")
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        quickReplies,
        timestamp: new Date()
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Disculpa, tuve un problema. ¿Puedes intentar de nuevo?",
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickReply = (reply: string) => {
    if (reply === "Volver") {
      handleSendMessage("Volver")
      return
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "user",
      content: reply,
      timestamp: new Date()
    }])
    setIsLoading(true)

    setTimeout(() => {
      let response = ""
      let quickReplies = getQuickReplies("initial")

      const responses: Record<string, { text: string; replies: string[] }> = {
        "Ver planes": {
          text: "🏠 *Planes Residenciales*\n• 40 Mbps - $25/mes\n• 80 Mbps - $35/mes\n• 120 Mbps - $50/mes\n\n🏢 *Planes Empresariales*\n• 100 Mbps - $80/mes\n• 200 Mbps - $150/mes\n\nTodos incluyen instalación gratis y soporte. ¿Cuál te interesa?",
          replies: ["Residencial", "Empresarial", "Contactar", "Volver"]
        },
        "Residencial": {
          text: "📶 *Planes Residenciales*\n\n• 40 Mbps - $25/mes\n• 80 Mbps - $35/mes\n• 120 Mbps - $50/mes\n\nTodos incluyen WiFi de amplio alcance y soporte técnico. ¿Te interesa alguno?",
          replies: ["Solicitar 40Mbps", "Solicitar 80Mbps", "Otros planes", "Volver"]
        },
        "Empresarial": {
          text: "🏢 *Planes Empresariales*\n\n• 100 Mbps - $80/mes\n• 200 Mbps - $150/mes\n• 300 Mbps - $250/mes\n\nIncluyen IP fija, prioridad en soporte y monitoreo. ¿Cuál necesitas?",
          replies: ["Solicitar info", "Contactar", "Volver"]
        },
        "Cobertura": {
          text: "🌍 *Nuestra Cobertura*\n\nProvincia de Cañar y zonas rurales cercanas. Priorizamos barrios donde otros no llegan.\n\n📍 ¿En qué sector vives?",
          replies: ["Zona urbana", "Zona rural", "Consultar", "Volver"]
        },
        "Contacto": {
          text: "📞 *Contacto TelTec Net*\n\n• 📱 WhatsApp: 0984517703\n• 📞 Teléfono: 0984517703\n• 📧 Email: teltecnet@outlook.com\n• 📍 Oficina: Cañar, Ecuador\n\nHorario: Lun-Vie 8am-6pm, Sáb 9am-2pm",
          replies: ["WhatsApp", "Llamar", "Horario", "Volver"]
        },
        "Soy cliente": {
          text: "👤 *Área de Clientes*\n\nPara consultar tu deuda o estado de cuenta, necesito tu número de cédula. ¿Cuál es?",
          replies: ["Mi deuda", "Estado cuenta", "Soporte", "Volver"]
        },
        "WhatsApp": {
          text: "💬 ¡Escríbenos por WhatsApp!\n\nTe redirigiré al chat directo.",
          replies: ["Volver al inicio"]
        },
        "Teléfono": {
          text: "📞 Llámanos: 0984517703\n\nHorario: Lun-Vie 8am-6pm, Sáb 9am-2pm",
          replies: ["Llamar ahora", "WhatsApp", "Volver"]
        }
      }

      const match = responses[reply]
      if (match) {
        response = match.text
        quickReplies = match.replies
      } else {
        response = `¿Te interesa "${reply}"? Puedo darte más información.`
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
        quickReplies
      }])
      setIsLoading(false)
    }, 600)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-teltec-blue to-teltec-blue-dark hover:from-teltec-blue-light hover:to-teltec-blue rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-teltec-green rounded-full animate-pulse border-2 border-white"></span>
        </button>
      )}

      {isOpen && (
        <div 
          className={`fixed z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 transition-all duration-300 ${
            isMinimized ? 'w-72 h-14' : 'w-[350px] md:w-[380px]'
          }`}
          style={{ right: "1.5rem", bottom: isMinimized ? "5.5rem" : "1.5rem", height: isMinimized ? "3.5rem" : "480px" }}
        >
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-teltec-blue to-teltec-blue-dark rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-teltec-green rounded-full border-2 border-slate-900"></span>
              </div>
              {!isMinimized && (
                <div>
                  <h3 className="font-bold text-sm">Asistente Virtual</h3>
                  <p className="text-xs text-slate-300">TelTec Net</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(!isMinimized)} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center">
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-slate-50 to-white h-[320px]">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "assistant" && (
                      <div className="w-7 h-7 bg-gradient-to-br from-teltec-blue to-teltec-blue-dark rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-teltec-blue to-teltec-blue-dark text-white"
                        : "bg-white text-slate-800 shadow-sm border border-slate-100"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${message.role === "user" ? "text-white/70" : "text-slate-400"}`}>
                        {message.timestamp.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {message.role === "user" && (
                      <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-teltec-blue to-teltec-blue-dark rounded-full flex items-center justify-center mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl px-3 py-2 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-teltec-blue rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-teltec-blue rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-teltec-blue rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {messages.length > 0 && messages[messages.length - 1].quickReplies && (
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                  <div className="flex flex-wrap gap-1.5">
                    {messages[messages.length - 1].quickReplies?.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickReply(reply)}
                        className="text-xs px-2.5 py-1 bg-white border border-slate-200 hover:border-teltec-blue hover:text-teltec-blue rounded-full transition-colors text-slate-600 font-medium"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teltec-blue"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    className="w-9 h-9 bg-gradient-to-r from-teltec-blue to-teltec-blue-dark rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
