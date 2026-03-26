import type React from "react"
import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-icons/font/bootstrap-icons.css"
import "./globals.css"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ToastProvider } from "@/app/components/shared/Toast"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const poppins = Poppins({ 
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins"
})

export const metadata: Metadata = {
  title: "TelTec Net - Sistema de Gestión",
  description: "Sistema de gestión empresarial para proveedores de internet",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" async></script>
      </head>
      <body className={`${inter.variable} ${poppins.variable} ${inter.className}`}>
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
