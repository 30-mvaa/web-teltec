import { useState, useEffect } from "react"
import { API_ENDPOINTS } from "@/lib/config/api"

interface SitioWebData {
  informacion?: any
  empresa?: any
  servicios?: any[]
  planes?: any[]
  sectores?: any[]
  coberturas?: any[]
  contactos?: any[]
  carrusel?: any[]
  header?: any
  footer?: any
  redesSociales?: any
  configuracion?: any
}

export function useSitioWebData() {
  const [data, setData] = useState<SitioWebData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(API_ENDPOINTS.SITIO_WEB_PUBLICO)
        
        if (response.ok) {
          const result = await response.json()
          console.log('📡 Datos recibidos de la API:', result)
          if (result.success && result.data) {
            console.log('✅ Datos válidos:', {
              planes: result.data.planes?.length || 0,
              sectores: result.data.sectores?.length || 0,
              servicios: result.data.servicios?.length || 0
            })
            setData(result.data)
          } else {
            console.warn('⚠️ Respuesta sin success o sin data:', result)
            // Si no hay datos de la API, usar datos por defecto
            setData({
              servicios: [],
              planes: [],
              sectores: [],
              coberturas: [],
              contactos: []
            })
          }
        } else {
          console.error('❌ Error en la respuesta:', response.status, response.statusText)
          const errorText = await response.text()
          console.error('Error detallado:', errorText)
          // Si hay error, usar datos por defecto
          setData({
            servicios: [],
            planes: [],
            sectores: [],
            coberturas: [],
            contactos: []
          })
        }
      } catch (err) {
        console.error('Error al cargar datos del sitio web:', err)
        // En caso de error, usar datos por defecto
        setData({
          servicios: [],
          planes: [],
          sectores: [],
          coberturas: [],
          contactos: []
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}

