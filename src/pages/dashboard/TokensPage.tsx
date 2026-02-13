
import { useEffect, useState } from "react"
import { RefreshCw, TrendingUp, Zap, BarChart3, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { getApiUrl, fetchWithAuth } from "@/lib/api-client"

function formatModelName(model: string): string {
  if (!model || model.toLowerCase() === 'unknown') return 'Sin especificar'
  return model
}

interface TokenStats {
  period: string
  startDate: string
  endDate: string
  totalTokens: number
  totalRequests: number
  avgTokensPerRequest: number
  totalCost?: number
  models: string[]
  dailyBreakdown: Array<{
    date: string
    tokens: number
    requests: number
    cost?: number
  }>
  modelBreakdown: Array<{
    model: string
    tokens: number
    requests: number
    cost?: number
  }>
}

export default function TokensPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly")
  const [stats, setStats] = useState<TokenStats | null>(null)

  useEffect(() => {
    loadStats()
  }, [period])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // Obtener customerId de localStorage primero, luego de cookies como fallback
      let customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) {
        console.error('No se encontró customerId en localStorage ni en cookies')
        toast.error('No se encontró información del cliente. Por favor, inicia sesión nuevamente.')
        setLoading(false)
        return
      }

      // Calcular fechas según el período
      const now = new Date()
      let startDate: Date
      switch (period) {
        case "daily":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "weekly":
          const dayOfWeek = now.getDay()
          startDate = new Date(now)
          startDate.setDate(now.getDate() - dayOfWeek)
          startDate.setHours(0, 0, 0, 0)
          break
        case "monthly":
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 30)
          startDate.setHours(0, 0, 0, 0)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      // Intentar obtener datos de OpenAI
      const openaiParams = new URLSearchParams()
      openaiParams.append("customerId", customerId)
      openaiParams.append("startDate", startDate.toISOString())
      openaiParams.append("endDate", now.toISOString())

      const openaiRes = await fetchWithAuth(getApiUrl(`/api/tokens/openai-usage?${openaiParams.toString()}`))
      const openaiData = await openaiRes.json()

      if (openaiRes.ok && openaiData.success && openaiData.data) {
        const openaiStats = openaiData.data
        setStats({
          period,
          startDate: openaiStats.period.startDate,
          endDate: openaiStats.period.endDate,
          totalTokens: openaiStats.totals.tokens,
          totalRequests: openaiStats.totals.requests,
          avgTokensPerRequest: openaiStats.totals.requests > 0 
            ? openaiStats.totals.tokens / openaiStats.totals.requests 
            : 0,
          totalCost: openaiStats.totals.cost,
          models: openaiStats.models.map((m: any) => m.model),
          dailyBreakdown: openaiStats.dailyUsage.map((day: any) => ({
            date: day.date,
            tokens: day.tokens,
            requests: day.requests,
            cost: day.cost,
          })),
          modelBreakdown: openaiStats.models.map((m: any) => ({
            model: m.model,
            tokens: m.tokens,
            requests: m.requests,
            cost: m.cost,
          })),
        })
        setLoading(false)
        return
      }

      if (openaiRes.ok && openaiData.success && !openaiData.data && (openaiData.error || openaiData.message)) {
        toast.info(openaiData.error || openaiData.message)
      }

      // Fallback a /api/tokens/stats
      const params = new URLSearchParams()
      params.append("customerId", customerId)
      params.append("period", period)

      const res = await fetchWithAuth(getApiUrl(`/api/tokens/stats?${params.toString()}`))
      const data = await res.json()

      if (res.ok && data.success) {
        setStats({
          ...data.data,
          totalCost: data.data.totalCost || 0,
        })
      } else {
        console.error('Error en la respuesta de tokens:', data.error)
        toast.error(data.error || "Error al cargar estadísticas")
      }
    } catch (error: any) {
      console.error("Error al cargar estadísticas:", error)
      toast.error(error.message || "Error al cargar estadísticas de tokens")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
    toast.success("Estadísticas actualizadas")
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + "K"
    }
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    })
  }

  const getPeriodLabel = () => {
    switch (period) {
      case "daily":
        return "Hoy"
      case "weekly":
        return "Esta Semana"
      case "monthly":
        return "Este Mes"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Tokens OpenAI</h1>
          <p className="text-muted-foreground mt-1">
            Monitorea el uso de tokens de OpenAI en tu cuenta
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={refreshing} 
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList>
          <TabsTrigger value="daily">Diario</TabsTrigger>
          <TabsTrigger value="weekly">Semanal</TabsTrigger>
          <TabsTrigger value="monthly">Mensual</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Tarjetas de resumen */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(stats.totalTokens)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getPeriodLabel()}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Solicitudes</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(stats.totalRequests)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getPeriodLabel()}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Promedio por Solicitud</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(stats.avgTokensPerRequest).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tokens por solicitud
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Modelos Utilizados</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.models.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Modelos diferentes
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Uso Diario de Tokens</CardTitle>
                    <CardDescription>
                      Tokens consumidos por día en {getPeriodLabel().toLowerCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.dailyBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.dailyBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) => formatDate(value)}
                          />
                          <YAxis tickFormatter={(value) => formatNumber(value)} />
                          <Tooltip
                            formatter={(value: number) => formatNumber(value)}
                            labelFormatter={(label) => formatDate(label)}
                          />
                          <Legend />
                          <Bar dataKey="tokens" fill="#8884d8" name="Tokens" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No hay datos disponibles para este período
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribución por Modelo</CardTitle>
                    <CardDescription>
                      Tokens consumidos por modelo de OpenAI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.modelBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.modelBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="model" tickFormatter={(v) => formatModelName(v)} />
                          <YAxis tickFormatter={(value) => formatNumber(value)} />
                          <Tooltip formatter={(value: number) => formatNumber(value)} />
                          <Legend />
                          <Bar dataKey="tokens" fill="#82ca9d" name="Tokens" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No hay datos disponibles para este período
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de línea temporal */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolución Temporal</CardTitle>
                  <CardDescription>
                    Tendencia de uso de tokens a lo largo del tiempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.dailyBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stats.dailyBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) => formatDate(value)}
                          />
                          <YAxis tickFormatter={(value) => formatNumber(value)} />
                          <Tooltip
                            formatter={(value: number) => formatNumber(value)}
                            labelFormatter={(label) => formatDate(label)}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="tokens"
                            stroke="#8884d8"
                            name="Tokens"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="requests"
                            stroke="#82ca9d"
                            name="Solicitudes"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No hay datos disponibles para este período
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabla de modelos */}
              {stats.modelBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Desglose por Modelo</CardTitle>
                    <CardDescription>
                      Detalle de tokens y solicitudes por modelo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.modelBreakdown.map((model, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{formatModelName(model.model)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {model.requests} solicitudes
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatNumber(model.tokens)} tokens
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {model.requests ? Math.round(model.tokens / model.requests).toLocaleString() : 0} avg
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold text-lg">No hay datos de tokens disponibles</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
