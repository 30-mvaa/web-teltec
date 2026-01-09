/**
 * Genera un enlace de WhatsApp con un mensaje predefinido
 * @param planName - Nombre del plan (opcional)
 * @param planPrice - Precio del plan (opcional)
 * @returns URL de WhatsApp
 */
export function getWhatsAppLink(planName?: string, planPrice?: string): string {
  const phone = '593984517703'
  let message = 'Hola, estoy interesado en los servicios de T&Tnet'
  
  // Si hay información del plan, agregarla al mensaje
  if (planName) {
    message += `\n\nMe interesa el plan: ${planName}`
    if (planPrice) {
      message += ` (${planPrice})`
    }
  }
  
  // Codificar el mensaje para URL
  const encodedMessage = encodeURIComponent(message)
  
  return `https://api.whatsapp.com/send/?phone=${phone}&text=${encodedMessage}&type=phone_number&app_absent=0`
}

/**
 * Abre WhatsApp en una nueva ventana/pestaña
 */
export function openWhatsApp(planName?: string, planPrice?: string): void {
  const url = getWhatsAppLink(planName, planPrice)
  window.open(url, '_blank')
}

