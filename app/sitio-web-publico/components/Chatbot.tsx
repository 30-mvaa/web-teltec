"use client"

import React, { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Bot, User, Minimize2, Maximize2 } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [cedulaSesion, setCedulaSesion] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "¡Hola! Soy el asistente virtual de TelTec Net. Puedo ayudarte con:\n\n• Consultar planes disponibles\n• Ver tu deuda (necesito tu cédula)\n• Información de cobertura\n• Datos de contacto\n• Proceso de registro\n\n¿Eres cliente de TelTec Net? Si no lo eres, puedo ayudarte a convertirte en uno. ¿En qué puedo ayudarte?",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_BASE_URL}/api/chatbot/mensaje/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mensaje: userMessage.content,
          contexto: "sitio_publico",
          cedula_sesion: cedulaSesion
        }),
      })

      if (!response.ok) {
        throw new Error("Error al procesar el mensaje")
      }

      const data = await response.json()
      
      // Guardar cédula de sesión si el usuario es cliente
      if (data.cedula_sesion && data.es_cliente) {
        setCedulaSesion(data.cedula_sesion)
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.respuesta || "Lo siento, no pude procesar tu mensaje. Por favor, intenta de nuevo.",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error al enviar mensaje:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo o contacta directamente a nuestro equipo de soporte.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickActions = [
    { label: "Ver Planes", action: "¿Qué planes tienen disponibles?" },
    { label: "Mi Deuda", action: "Quiero consultar mi deuda" },
    { label: "Cobertura", action: "¿En qué zonas tienen cobertura?" },
    { label: "Contacto", action: "¿Cuál es su información de contacto?" }
  ]

  const handleQuickAction = (action: string) => {
    setInputMessage(action)
    setTimeout(() => {
      handleSendMessage()
    }, 100)
  }

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
          aria-label="Abrir chat de asistente virtual"
        >
          <Bot className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-black"></span>
        </button>
      )}

      {/* Ventana del chat */}
      {isOpen && (
        <div 
          className={`fixed bottom-6 left-6 z-40 bg-white rounded-xl shadow-lg flex flex-col overflow-hidden border border-gray-200 max-w-[calc(100vw-3rem)] transition-all duration-300 ${
            isMinimized ? 'w-72 h-14' : 'w-80 md:w-96 h-[500px] md:h-[600px]'
          }`}
          style={{ zIndex: 40 }}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
              {!isMinimized && (
                <div>
                  <h3 className="text-sm font-semibold">Asistente Virtual</h3>
                  <p className="text-[10px] text-white/80">TelTec Net</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label={isMinimized ? "Expandir chat" : "Minimizar chat"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-5 h-5" />
                ) : (
                  <Minimize2 className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Cerrar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-800 shadow-sm border border-zinc-200"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === "user" ? "text-white/70" : "text-gray-500"
                  }`}>
                    {message.timestamp.toLocaleTimeString("es-EC", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-2 shadow-sm border border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          )}

          {/* Acciones rápidas */}
          {!isMinimized && messages.length === 1 && (
            <div className="px-4 pt-2 pb-2 border-t border-gray-200 bg-white">
              <p className="text-xs text-gray-500 mb-2">Acciones rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.action)}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-700"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          {!isMinimized && (
            <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="w-9 h-9 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Enviar mensaje"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Presiona Enter para enviar
            </p>
          </div>
          )}
        </div>
      )}
    </>
  )
}

