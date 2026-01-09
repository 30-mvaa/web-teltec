// Paleta de colores eléctricos: Verde eléctrico, Azul eléctrico, Negro y Blanco

export const brandColors = {
  // Colores principales - Esquema eléctrico moderno
  green: {
    primary: '#00FF41', // Verde eléctrico
    bright: '#39FF14', // Verde brillante
    light: '#66FF66', // Verde claro
    dark: '#00CC33', // Verde oscuro
    hover: '#00FF66', // Verde hover eléctrico
    electric: '#00FF41', // Verde eléctrico puro
    vibrant: '#00FF41', // Verde eléctrico
  },
  blue: {
    primary: '#0066FF', // Azul eléctrico
    bright: '#0099FF', // Azul brillante
    light: '#00BFFF', // Azul claro
    dark: '#0052CC', // Azul oscuro
    hover: '#0080FF', // Azul hover eléctrico
    electric: '#0066FF', // Azul eléctrico puro
    vibrant: '#0066FF', // Azul eléctrico
  },
  black: {
    primary: '#000000', // Negro puro
    dark: '#0A0A0A', // Negro oscuro
    light: '#1A1A1A', // Negro claro
    softer: '#2A2A2A', // Negro más suave
  },
  orange: {
    primary: '#FF8C00', // Naranja de las antenas
    bright: '#FFA500', // Naranja brillante
    light: '#FFB347', // Naranja claro
    dark: '#FF7F00', // Naranja oscuro
  },
  yellow: {
    primary: '#FFD700', // Amarillo dorado
    bright: '#FFFF00', // Amarillo brillante
    light: '#FFEB3B', // Amarillo claro
  },
  red: {
    primary: '#FF0000', // Rojo
    bright: '#FF3333', // Rojo brillante
    dark: '#CC0000', // Rojo oscuro
  },
  white: '#FFFFFF',
  lightBlue: '#60A5FA', // Azul claro para enlaces (Forgot password)
  gray: {
    50: '#F9FAFB', // Fondo muy claro del login
    100: '#F3F4F6', // Fondo claro
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  }
}

// Gradientes basados en colores eléctricos
export const gradients = {
  primary: 'linear-gradient(135deg, #0066FF 0%, #00FF41 100%)', // Azul eléctrico a Verde eléctrico
  secondary: 'linear-gradient(135deg, #000000 0%, #0066FF 100%)', // Negro a Azul eléctrico
  tertiary: 'linear-gradient(135deg, #00FF41 0%, #0066FF 100%)', // Verde eléctrico a Azul eléctrico
  hero: 'linear-gradient(135deg, #000000 0%, #0066FF 50%, #00FF41 100%)', // Negro-Azul-Verde eléctrico
  dark: 'linear-gradient(135deg, #0A0A0A 0%, #000000 100%)', // Negro degradado
  electric: 'linear-gradient(135deg, #0066FF 0%, #00FF41 100%)', // Gradiente eléctrico
  blackBlue: 'linear-gradient(135deg, #000000 0%, #0066FF 100%)', // Negro a Azul
  blueGreen: 'linear-gradient(135deg, #0066FF 0%, #00FF41 100%)', // Azul a Verde
}

// Clases de Tailwind personalizadas - Colores eléctricos
export const colorClasses = {
  text: {
    primary: 'text-[#00FF41]', // Verde eléctrico
    secondary: 'text-[#0066FF]', // Azul eléctrico
    black: 'text-[#000000]', // Negro
    white: 'text-white', // Blanco
    dark: 'text-gray-800',
    light: 'text-gray-600',
    electric: {
      blue: 'text-[#0066FF]',
      green: 'text-[#00FF41]',
    }
  },
  bg: {
    primary: 'bg-[#00FF41]', // Verde eléctrico
    secondary: 'bg-[#0066FF]', // Azul eléctrico
    black: 'bg-[#000000]', // Negro
    white: 'bg-white', // Blanco
    dark: 'bg-gray-900',
    light: 'bg-gray-50',
    electric: {
      blue: 'bg-[#0066FF]',
      green: 'bg-[#00FF41]',
    }
  },
  gradient: {
    primary: 'bg-gradient-to-r from-[#0066FF] to-[#00FF41]', // Azul a Verde eléctrico
    secondary: 'bg-gradient-to-r from-[#000000] to-[#0066FF]', // Negro a Azul eléctrico
    tertiary: 'bg-gradient-to-r from-[#00FF41] to-[#0066FF]', // Verde a Azul eléctrico
    hero: 'bg-gradient-to-r from-[#000000] via-[#0066FF] to-[#00FF41]', // Negro-Azul-Verde
    electric: 'bg-gradient-to-r from-[#0066FF] to-[#00FF41]',
    blackBlue: 'bg-gradient-to-r from-[#000000] to-[#0066FF]',
    blueGreen: 'bg-gradient-to-r from-[#0066FF] to-[#00FF41]',
  },
  border: {
    primary: 'border-[#00FF41]', // Verde eléctrico
    secondary: 'border-[#0066FF]', // Azul eléctrico
    black: 'border-[#000000]', // Negro
    white: 'border-white', // Blanco
    electric: {
      blue: 'border-[#0066FF]',
      green: 'border-[#00FF41]',
    }
  }
}

