
import { useEffect, useState } from "react"
import { RefreshCw, TrendingUp, Zap, BarChart3, Calendar, Database, Building2, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { getApiUrl } from "@/lib/api-client"

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

interface Customer {
  _id: string
  nombre: string
  apellido: string
  email: string
}

export default function TokensPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly")
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all")
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    loadCustomers()
    loadStats()
  }, [])

  useEffect(() => {
    loadStats()
  }, [period, selectedCustomerId])

  const loadCustomers = async () => {
    try {
      const res = await fetch(getApiUrl('/api/customers'))
      const data = await res.json()
      if (data.success) {
        setCustomers(data.data)
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error)
    }
  }

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // Si hay un cliente seleccionado, intentar obtener datos de OpenAI
      if (selectedCustomerId && selectedCustomerId !== "all") {
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
            // Para mensual, incluir el mes anterior también para capturar datos que puedan estar en el límite
            // OpenAI muestra datos desde el 12 de diciembre, así que vamos a consultar desde hace 30 días
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 30)
            startDate.setHours(0, 0, 0, 0)
            break
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        // Intentar obtener datos de OpenAI
        const openaiParams = new URLSearchParams()
        openaiParams.append("customerId", selectedCustomerId)
        openaiParams.append("startDate", startDate.toISOString())
        openaiParams.append("endDate", now.toISOString())

        const openaiRes = await fetch(getApiUrl(`/api/tokens/openai-usage?${openaiParams.toString()}`))
        const openaiData = await openaiRes.json()

        if (openaiData.success && openaiData.data) {
          // Convertir datos de OpenAI al formato de stats
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
          return
        }
      }

      // Fallback a la API de stats normal
      const params = new URLSearchParams()
      if (selectedCustomerId && selectedCustomerId !== "all") {
        params.append("customerId", selectedCustomerId)
      }
      params.append("period", period)

      const res = await fetch(getApiUrl(`/api/tokens/stats?${params.toString()}`))
      const data = await res.json()

      if (data.success) {
        setStats({
          ...data.data,
          totalCost: 0, // Se calculará si hay datos
        })
      } else {
        toast.error(data.error || "Error al cargar estadísticas")
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
      toast.error("Error al cargar estadísticas de tokens")
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gestión de Tokens OpenAI</h1>
            <p className="text-muted-foreground mt-1">
              Monitorea el uso de tokens de OpenAI en tu cuenta
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer._id} value={customer._id}>
                  {customer.nombre} {customer.apellido}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={async () => {
              if (selectedCustomerId && selectedCustomerId !== "all") {
                try {
                  const res = await fetch(getApiUrl('/api/tokens/sync-openai'), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ customerId: selectedCustomerId }),
                  })
                  const data = await res.json()
                  if (data.success) {
                    if (data.data.apiKeyValid) {
                      toast.info("La API key es válida. OpenAI no expone una API pública para obtener uso histórico. Necesitas rastrear las llamadas cuando se hacen.")
                    } else {
                      toast.error("La API key no es válida o no tiene permisos suficientes.")
                    }
                  }
                } catch (error) {
                  console.error("Error al verificar API key:", error)
                }
              }
              await handleRefresh()
            }}
            disabled={refreshing} 
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${stats.totalCost !== undefined ? stats.totalCost.toFixed(2) : "0.00"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getPeriodLabel()}
                    </p>
                  </CardContent>
                </Card>

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
                    <Database className="h-4 w-4 text-muted-foreground" />
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
                          <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `$${value.toFixed(2)}`} />
                          <Tooltip
                            formatter={(value: number, name: string) => {
                              if (name === "Costo") return `$${value.toFixed(2)}`
                              return formatNumber(value)
                            }}
                            labelFormatter={(label) => formatDate(label)}
                          />
                          <Legend />
                          <Bar yAxisId="left" dataKey="tokens" fill="#8884d8" name="Tokens" />
                          {stats.dailyBreakdown.some(d => d.cost !== undefined) && (
                            <Bar yAxisId="right" dataKey="cost" fill="#82ca9d" name="Costo" />
                          )}
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
                          <Bar dataKey="requests" fill="#ffc658" name="Solicitudes" />
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
                          <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} />
                          {stats.dailyBreakdown.some(d => d.cost !== undefined) && (
                            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `$${value.toFixed(2)}`} />
                          )}
                          <Tooltip
                            formatter={(value: number, name: string) => {
                              if (name === "Costo") return `$${value.toFixed(2)}`
                              return formatNumber(value)
                            }}
                            labelFormatter={(label) => formatDate(label)}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="tokens"
                            stroke="#8884d8"
                            name="Tokens"
                            strokeWidth={2}
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="requests"
                            stroke="#82ca9d"
                            name="Solicitudes"
                            strokeWidth={2}
                          />
                          {stats.dailyBreakdown.some(d => d.cost !== undefined) && (
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="cost"
                              stroke="#ffc658"
                              name="Costo"
                              strokeWidth={2}
                            />
                          )}
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
                            {model.cost !== undefined && (
                              <div className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
                                ${model.cost.toFixed(2)}
                              </div>
                            )}
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
                <div className="text-center text-muted-foreground max-w-md">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold mb-2">No hay datos de tokens disponibles</p>
                  <p className="text-sm mb-4">
                    {selectedCustomerId && selectedCustomerId !== "all" 
                      ? "OpenAI no expone una API pública para obtener uso histórico. Para ver datos, necesitas rastrear las llamadas cuando se hacen usando /api/tokens/track"
                      : "Selecciona un cliente específico para ver sus datos de uso de tokens"}
                  </p>
                  {selectedCustomerId && selectedCustomerId !== "all" && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg mt-4 text-left">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        ¿Cómo rastrear el uso?
                      </p>
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        Cuando hagas llamadas a la API de OpenAI, agrega este código después de cada llamada:
                      </p>
                      <code className="block text-xs bg-blue-100 dark:bg-blue-900 p-2 rounded mt-2 font-mono">
                        {`await fetch(getApiUrl('/api/tokens/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: '${selectedCustomerId}',
    tokensUsed: response.usage.total_tokens,
    model: 'gpt-4',
    operation: 'chat-completion'
  })
})`}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
