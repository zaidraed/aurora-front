
import { useEffect, useState } from "react"
import { Brain, MessageSquare, Clock, TrendingUp, Target, Zap, BarChart3, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { getApiUrl, fetchWithAuth } from "@/lib/api-client"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  Cell
} from "recharts"

interface AnalyticsData {
  generales: {
    leadsGenerados: number
    respuestasAutomaticasCorrectas: number
    porcentajeRespuestasCorrectas: number
    tiempoPromedioRespuesta: number
    cierresEfectivos: number
    porcentajeCierresEfectivos: number
  }
  porPeriodo: Array<{
    fecha: string
    leads: number
    respuestas: number
    tiempoPromedio: number
  }>
}

export default function AnaliticasPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetchWithAuth(getApiUrl('/api/metrics?days=30'))
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setAnalytics(data.data)
          } else {
            console.error('Error en la respuesta de analíticas:', data.error)
            toast.error(data.error || 'Error al cargar analíticas')
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Error HTTP al cargar analíticas:', response.status, errorData)
          toast.error(errorData.error || 'Error al cargar analíticas')
        }
      } catch (error: any) {
        console.error('Error al cargar analíticas:', error)
        toast.error(error.message || 'Error al cargar analíticas')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 bg-muted/50 rounded w-48 animate-pulse" />
          <div className="h-4 bg-muted/30 rounded w-96 animate-pulse" />
        </div>

        {/* Stats Cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted/50 rounded w-28 animate-pulse" />
                <div className="h-4 w-4 bg-muted/50 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted/50 rounded w-20 mb-2 animate-pulse" />
                <div className="h-3 bg-muted/30 rounded w-32 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 bg-muted/50 rounded w-48 mb-2 animate-pulse" />
                <div className="h-4 bg-muted/30 rounded w-64 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted/30 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional sections skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 bg-muted/50 rounded w-40 mb-2 animate-pulse" />
                <div className="h-4 bg-muted/30 rounded w-56 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-48 bg-muted/30 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!loading && !analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analíticas IA</h1>
          <p className="text-muted-foreground mt-1">
            No se pudieron cargar los datos de analíticas
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Sin datos disponibles</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No se pudieron cargar las analíticas. Por favor, intenta recargar la página.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { generales, porPeriodo } = analytics

  // Preparar datos para gráficos
  const responseTimeData = porPeriodo.slice(0, 7).reverse().map(item => {
    const fecha = new Date(item.fecha)
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    return {
      day: dias[fecha.getDay()],
      avgTime: Math.round(item.tiempoPromedio),
      target: 5 // 5 segundos como objetivo
    }
  })

  const activityData = porPeriodo.slice(0, 7).reverse().map(item => {
    const fecha = new Date(item.fecha)
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    return {
      day: dias[fecha.getDay()],
      leads: item.leads,
      respuestas: item.respuestas
    }
  })

  const analyticsStats = [
    {
      title: "Tiempo Promedio Respuesta",
      value: `${generales.tiempoPromedioRespuesta}s`,
      change: generales.tiempoPromedioRespuesta < 5 ? "Óptimo" : "Mejorable",
      icon: Clock,
      trend: generales.tiempoPromedioRespuesta < 5 ? "up" : "down",
    },
    {
      title: "Tasa de Éxito",
      value: `${generales.porcentajeRespuestasCorrectas}%`,
      change: `${generales.respuestasAutomaticasCorrectas} respuestas`,
      icon: CheckCircle,
      trend: "up",
    },
    {
      title: "Efectividad de Cierre",
      value: `${generales.porcentajeCierresEfectivos}%`,
      change: `${generales.cierresEfectivos} cierres`,
      icon: Target,
      trend: "up",
    },
    {
      title: "Total Leads",
      value: generales.leadsGenerados.toString(),
      change: "Últimos 30 días",
      icon: MessageSquare,
      trend: "up",
    },
  ]

  return (
    <div className="space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analíticas IA</h1>
          <p className="text-muted-foreground mt-1">
            Análisis completo del rendimiento de Aurora SDR IA
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          Últimos 30 días
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {analyticsStats.map((stat, index) => (
          <Card key={index} className="transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div
                    className={`flex items-center text-xs mt-1 ${
                      stat.trend === "up" ? "text-green-600" : "text-blue-600"
                    }`}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stat.change}
                  </div>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Chart */}
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span>Actividad Semanal</span>
            </CardTitle>
            <CardDescription>Leads y respuestas de los últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#8b5cf6" name="Leads" />
                  <Bar dataKey="respuestas" fill="#c084fc" name="Respuestas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Response Time Trend */}
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>Tiempo de Respuesta</span>
            </CardTitle>
            <CardDescription>Evolución semanal del tiempo promedio (segundos)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgTime" stroke="#8b5cf6" strokeWidth={3} name="Tiempo Real" />
                  <Line type="monotone" dataKey="target" stroke="#d8b4fe" strokeDasharray="5 5" name="Objetivo (5s)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Respuestas Exitosas</CardTitle>
            <CardDescription className="text-xs">
              Ejecuciones completadas correctamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{generales.respuestasAutomaticasCorrectas}</div>
            <Progress value={generales.porcentajeRespuestasCorrectas} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {generales.porcentajeRespuestasCorrectas}% de tasa de éxito
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cierres Efectivos</CardTitle>
            <CardDescription className="text-xs">
              Conversaciones finalizadas sin seguimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{generales.cierresEfectivos}</div>
            <Progress value={generales.porcentajeCierresEfectivos} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {generales.porcentajeCierresEfectivos}% de efectividad
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tiempo Promedio</CardTitle>
            <CardDescription className="text-xs">
              Velocidad de respuesta del agente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{generales.tiempoPromedioRespuesta}s</div>
            <Progress 
              value={Math.min(100, (5 / Math.max(generales.tiempoPromedioRespuesta, 1)) * 100)} 
              className="h-2 mb-2" 
            />
            <p className="text-xs text-muted-foreground">
              {generales.tiempoPromedioRespuesta < 5 ? "Por debajo del objetivo (5s)" : "Por encima del objetivo (5s)"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Keywords Analysis - Placeholder for Future Implementation */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>Análisis de Palabras Clave</span>
          </CardTitle>
          <CardDescription>Términos más frecuentes en conversaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Brain className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-sm text-center">
              Próximamente: Análisis avanzado de palabras clave y sentimiento
            </p>
            <p className="text-xs text-center mt-2">
              Se requiere configurar almacenamiento de historial de chat en la base de datos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Query Types - Placeholder */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>Tipos de Consulta</span>
          </CardTitle>
          <CardDescription>Categorías de interacciones más frecuentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-sm text-center">
              Próximamente: Análisis de tipos de consulta
            </p>
            <p className="text-xs text-center mt-2">
              Se requiere categorización de consultas en los workflows
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
