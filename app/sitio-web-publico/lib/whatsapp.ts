let _whatsappPhone = '593984517703'

export function getWhatsappPhone(): string {
  return _whatsappPhone
}

export function setWhatsappPhone(phone: string): void {
  const cleaned = phone.replace(/[^0-9]/g, '').replace(/^0+/, '')
  if (cleaned) _whatsappPhone = cleaned.startsWith('593') ? cleaned : `593${cleaned}`
}

export function getWhatsAppLink(planName?: string, planPrice?: string, phone?: string): string {
  const effectivePhone = phone || _whatsappPhone
  let message = 'Hola, estoy interesado en los servicios de T&Tnet'
  if (planName) {
    message += `\n\nMe interesa el plan: ${planName}`
    if (planPrice) message += ` (${planPrice})`
  }
  const encodedMessage = encodeURIComponent(message)
  return `https://api.whatsapp.com/send/?phone=${effectivePhone}&text=${encodedMessage}&type=phone_number&app_absent=0`
}

export function openWhatsApp(planName?: string, planPrice?: string): void {
  const url = getWhatsAppLink(planName, planPrice)
  window.open(url, '_blank')
}
