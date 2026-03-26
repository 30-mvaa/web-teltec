'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler,
  ArcElement,
  ChartData,
} from 'chart.js'
import { Bar, Line, Radar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler,
  ArcElement
)

interface FinancialChartProps {
  data: {
    datos_mensuales: Array<{
      mes: number
      nombre_mes: string
      nombre_mes_corto: string
      total_recaudado: number
      total_pagos: number
      es_mayor_recaudacion: boolean
      es_menor_recaudacion: boolean
    }>
    estadisticas: {
      total_anual: number
      total_pagos_anual: number
      promedio_mensual: number
    }
    anio: number
  }
  chartType?: 'bar' | 'line' | 'area' | 'radar' | 'doughnut'
}

export function FinancialChart({ data, chartType = 'bar' }: FinancialChartProps) {
  // Validación de datos
  if (!data || !data.datos_mensuales || data.datos_mensuales.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg shadow-lg p-3 sm:p-4">
        <div className="h-48 sm:h-56 md:h-64 mb-3 sm:mb-4 relative flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">No hay datos disponibles</div>
            <div className="text-sm">Cargando información del gráfico...</div>
          </div>
        </div>
      </div>
    )
  }
  const chartData: ChartData<'bar'> = {
    labels: data.datos_mensuales.map(item => item.nombre_mes_corto),
    datasets: [
      {
        label: 'Recaudación Mensual ($)',
        data: data.datos_mensuales.map(item => item.total_recaudado),
        backgroundColor: data.datos_mensuales.map(item => {
          if (item.es_mayor_recaudacion) return 'rgba(34, 197, 94, 0.8)' // Verde para mayor
          if (item.es_menor_recaudacion) return 'rgba(239, 68, 68, 0.8)' // Rojo para menor
          return 'rgba(59, 130, 246, 0.8)' // Azul para normal
        }),
        borderColor: data.datos_mensuales.map(item => {
          if (item.es_mayor_recaudacion) return 'rgba(34, 197, 94, 1)'
          if (item.es_menor_recaudacion) return 'rgba(239, 68, 68, 1)'
          return 'rgba(59, 130, 246, 1)'
        }),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }
    ]
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151'
        }
      },
      title: {
        display: true,
        text: `Recaudación Mensual - ${data.anio}`,
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 20
        },
        color: '#1f2937'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          title: function(context: any) {
            const monthIndex = context[0].dataIndex
            const monthData = data.datos_mensuales[monthIndex]
            return `${monthData.nombre_mes} ${data.anio}`
          },
          label: function(context: any) {
            const value = context.parsed.y
            const monthIndex = context.dataIndex
            const monthData = data.datos_mensuales[monthIndex]
            
            return [
              `Recaudación: $${value.toLocaleString()}`,
              `Pagos: ${monthData.total_pagos}`,
              `Estado: ${monthData.es_mayor_recaudacion ? 'Mayor Recaudación' : monthData.es_menor_recaudacion ? 'Menor Recaudación' : 'Normal'}`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Meses del Año',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#374151',
          padding: 10
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.08)',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151',
          maxRotation: 0,
          padding: 8
        }
      },
      y: {
        title: {
          display: true,
          text: 'Recaudación ($)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#374151',
          padding: 10
        },
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.08)',
          lineWidth: 1
        },
        ticks: {
          callback: function(value: any) {
            if (value >= 1000000) {
              return '$' + (value / 1000000).toFixed(1) + 'M'
            } else if (value >= 1000) {
              return '$' + (value / 1000).toFixed(0) + 'k'
            }
            return '$' + value.toLocaleString()
          },
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          color: '#374151',
          maxTicksLimit: 8,
          padding: 8
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    elements: {
      bar: {
        borderRadius: 8,
        borderSkipped: false,
      },
      point: {
        radius: 6,
        hoverRadius: 8,
      }
    }
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151'
        }
      },
      title: {
        display: true,
        text: `Recaudación Mensual - ${data.anio}`,
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 20
        },
        color: '#1f2937'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          title: function(context: any) {
            const monthIndex = context[0].dataIndex
            const monthData = data.datos_mensuales[monthIndex]
            return `${monthData.nombre_mes} ${data.anio}`
          },
          label: function(context: any) {
            const value = context.parsed.y
            const monthIndex = context.dataIndex
            const monthData = data.datos_mensuales[monthIndex]
            
            return [
              `Recaudación: $${value.toLocaleString()}`,
              `Pagos: ${monthData.total_pagos}`,
              `Estado: ${monthData.es_mayor_recaudacion ? 'Mayor Recaudación' : monthData.es_menor_recaudacion ? 'Menor Recaudación' : 'Normal'}`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Meses del Año',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#374151',
          padding: 10
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.08)',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151',
          maxRotation: 0,
          padding: 8
        }
      },
      y: {
        title: {
          display: true,
          text: 'Recaudación ($)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#374151',
          padding: 10
        },
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.08)',
          lineWidth: 1
        },
        ticks: {
          callback: function(value: any) {
            if (value >= 1000000) {
              return '$' + (value / 1000000).toFixed(1) + 'M'
            } else if (value >= 1000) {
              return '$' + (value / 1000).toFixed(0) + 'k'
            }
            return '$' + value.toLocaleString()
          },
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          color: '#374151',
          maxTicksLimit: 8,
          padding: 8
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    elements: {
      point: {
        radius: 6,
        hoverRadius: 8,
      }
    }
  }

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151'
        }
      },
      title: {
        display: true,
        text: `Recaudación Mensual - ${data.anio} (Vista Radar)`,
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 20
        },
        color: '#1f2937'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          title: function(context: any) {
            const monthIndex = context[0].dataIndex
            const monthData = data.datos_mensuales[monthIndex]
            return `${monthData.nombre_mes} ${data.anio}`
          },
          label: function(context: any) {
            const value = context.parsed
            const monthIndex = context.dataIndex
            const monthData = data.datos_mensuales[monthIndex]
            
            return [
              `Recaudación: $${value.toLocaleString()}`,
              `Pagos: ${monthData.total_pagos}`,
              `Estado: ${monthData.es_mayor_recaudacion ? 'Mayor Recaudación' : monthData.es_menor_recaudacion ? 'Menor Recaudación' : 'Normal'}`
            ]
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: Math.max(...data.datos_mensuales.map(item => item.total_recaudado)) * 1.2,
        title: {
          display: true,
          text: 'Recaudación ($)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#374151',
          padding: 10
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1,
          circular: true
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#374151',
          padding: 8
        },
        ticks: {
          callback: function(value: any) {
            if (value >= 1000000) {
              return '$' + (value / 1000000).toFixed(1) + 'M'
            } else if (value >= 1000) {
              return '$' + (value / 1000).toFixed(0) + 'k'
            }
            return '$' + value.toLocaleString()
          },
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          color: '#374151',
          maxTicksLimit: 6,
          padding: 8,
          backdropColor: 'rgba(255, 255, 255, 0.8)',
          backdropPadding: 4
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    elements: {
      point: {
        radius: 6,
        hoverRadius: 8,
      }
    }
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          color: '#374151',
          generateLabels: function(chart: any) {
            const data = chart.data
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i]
                const total = data.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0)
                const porcentaje = ((value / total) * 100).toFixed(1)
                return {
                  text: `${label}: ${porcentaje}%`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: 2,
                  pointStyle: 'circle',
                  hidden: false,
                  index: i
                }
              })
            }
            return []
          }
        }
      },
      title: {
        display: true,
        text: `Recaudación Mensual - ${data.anio} (Vista Circular)`,
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 20
        },
        color: '#1f2937'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          title: function(context: any) {
            const monthIndex = context[0].dataIndex
            const monthData = data.datos_mensuales[monthIndex]
            return `${monthData.nombre_mes} ${data.anio}`
          },
          label: function(context: any) {
            const value = context.parsed
            const monthIndex = context.dataIndex
            const monthData = data.datos_mensuales[monthIndex]
            const total = data.datos_mensuales.reduce((sum, mes) => sum + mes.total_recaudado, 0)
            const porcentaje = ((value / total) * 100).toFixed(1)
            
            return [
              `Recaudación: $${value.toLocaleString()}`,
              `Porcentaje: ${porcentaje}%`,
              `Pagos: ${monthData.total_pagos}`,
              `Estado: ${monthData.es_mayor_recaudacion ? 'Mayor Recaudación' : monthData.es_menor_recaudacion ? 'Menor Recaudación' : 'Normal'}`
            ]
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    elements: {
      arc: {
        borderWidth: 3,
        hoverBorderWidth: 4,
      }
    },
    cutout: '60%'
  }

  const lineData: ChartData<'line'> = {
    labels: data.datos_mensuales.map(item => item.nombre_mes_corto),
    datasets: [
      {
        type: 'line',
        label: 'Recaudación Mensual ($)',
        data: data.datos_mensuales.map(item => item.total_recaudado),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderWidth: 4,
        fill: true,
        tension: 0.6,
        pointBackgroundColor: data.datos_mensuales.map(item => {
          if (item.es_mayor_recaudacion) return 'rgba(34, 197, 94, 1)'
          if (item.es_menor_recaudacion) return 'rgba(239, 68, 68, 1)'
          return 'rgba(59, 130, 246, 1)'
        }),
        pointBorderColor: 'white',
        pointBorderWidth: 3,
        pointRadius: 8,
        pointHoverRadius: 8,
      },
      {
        type: 'line',
        label: 'Promedio Mensual',
        data: Array(12).fill(data.estadisticas.promedio_mensual),
        borderColor: 'rgba(156, 163, 175, 0.8)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        tension: 0,
      }
    ]
  }

  const areaData: ChartData<'line'> = {
    labels: data.datos_mensuales.map(item => item.nombre_mes_corto),
    datasets: [
      {
        type: 'line',
        label: 'Recaudación Mensual ($)',
        data: data.datos_mensuales.map(item => item.total_recaudado),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: data.datos_mensuales.map(item => {
          if (item.es_mayor_recaudacion) return 'rgba(34, 197, 94, 1)'
          if (item.es_menor_recaudacion) return 'rgba(239, 68, 68, 1)'
          return 'rgba(59, 130, 246, 1)'
        }),
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ]
  }

  const radarData: ChartData<'radar'> = {
    labels: data.datos_mensuales.map(item => item.nombre_mes_corto),
    datasets: [
      {
        label: 'Recaudación Mensual ($)',
        data: data.datos_mensuales.map(item => item.total_recaudado),
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 3,
        fill: true,
        pointBackgroundColor: data.datos_mensuales.map(item => {
          if (item.es_mayor_recaudacion) return 'rgba(34, 197, 94, 1)'
          if (item.es_menor_recaudacion) return 'rgba(239, 68, 68, 1)'
          return 'rgba(59, 130, 246, 1)'
        }),
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
      },
    ]
  }

  const doughnutData: ChartData<'doughnut'> = {
    labels: data.datos_mensuales.map(item => item.nombre_mes_corto),
    datasets: [
      {
        label: 'Recaudación Mensual ($)',
        data: data.datos_mensuales.map(item => item.total_recaudado),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // Azul
          'rgba(34, 197, 94, 0.8)',    // Verde
          'rgba(239, 68, 68, 0.8)',    // Rojo
          'rgba(168, 85, 247, 0.8)',   // Púrpura
          'rgba(245, 158, 11, 0.8)',   // Amarillo
          'rgba(236, 72, 153, 0.8)',   // Rosa
          'rgba(16, 185, 129, 0.8)',   // Verde esmeralda
          'rgba(249, 115, 22, 0.8)',   // Naranja
          'rgba(139, 92, 246, 0.8)',   // Violeta
          'rgba(14, 165, 233, 0.8)',   // Azul cielo
          'rgba(20, 184, 166, 0.8)',   // Verde azulado
          'rgba(244, 63, 94, 0.8)',    // Rojo rosa
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',     // Azul
          'rgba(34, 197, 94, 1)',      // Verde
          'rgba(239, 68, 68, 1)',      // Rojo
          'rgba(168, 85, 247, 1)',     // Púrpura
          'rgba(245, 158, 11, 1)',     // Amarillo
          'rgba(236, 72, 153, 1)',     // Rosa
          'rgba(16, 185, 129, 1)',     // Verde esmeralda
          'rgba(249, 115, 22, 1)',     // Naranja
          'rgba(139, 92, 246, 1)',     // Violeta
          'rgba(14, 165, 233, 1)',     // Azul cielo
          'rgba(20, 184, 166, 1)',     // Verde azulado
          'rgba(244, 63, 94, 1)',      // Rojo rosa
        ],
        borderWidth: 3,
        hoverOffset: 8,
      },
    ]
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-3 sm:p-4">
      <div className="h-48 sm:h-56 md:h-64 mb-3 sm:mb-4 relative">
        {(() => {
          try {
            console.log('Renderizando gráfico tipo:', chartType)
            console.log('Datos disponibles:', data)
            
            switch (chartType) {
              case 'bar':
                console.log('Renderizando gráfico de barras')
                return <Bar data={chartData} options={barOptions} />
              case 'line':
                console.log('Renderizando gráfico de líneas')
                return <Line data={lineData} options={lineOptions} />
              case 'area':
                console.log('Renderizando gráfico de área')
                return <Line data={areaData} options={lineOptions} />
              case 'radar':
                console.log('Renderizando gráfico radar')
                console.log('Datos radar:', radarData)
                console.log('Opciones radar:', radarOptions)
                return <Radar data={radarData} options={radarOptions} />
              case 'doughnut':
                console.log('Renderizando gráfico dona')
                console.log('Datos dona:', doughnutData)
                console.log('Opciones dona:', doughnutOptions)
                return <Doughnut data={doughnutData} options={doughnutOptions} />
              default:
                console.log('Tipo no reconocido, usando barras por defecto')
                return <Bar data={chartData} options={barOptions} />
            }
          } catch (error) {
            console.error('Error renderizando gráfico:', error)
            console.error('Tipo de gráfico:', chartType)
            console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
            return (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-500">
                  <div className="text-lg font-medium mb-2">Error al renderizar gráfico</div>
                  <div className="text-sm">Tipo: {chartType}</div>
                  <div className="text-xs mt-2">Revisa la consola para más detalles</div>
                </div>
              </div>
            )
          }
        })()}
      </div>
      
      {/* Leyenda compacta */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded"></div>
          <span className="text-xs font-medium text-gray-700">Normal</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded"></div>
          <span className="text-xs font-medium text-gray-700">Mayor</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded"></div>
          <span className="text-xs font-medium text-gray-700">Menor</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 border border-gray-400 border-dashed"></div>
          <span className="text-xs font-medium text-gray-700">Promedio</span>
        </div>
      </div>
    </div>
  )
} 