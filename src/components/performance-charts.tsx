import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { DashboardMetrics } from "@/lib/dashboard-types"
import { getApiUrl } from "@/lib/api-client"

// Datos eliminados - se mostrará mensaje de "Aún no tenemos datos"

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${
              entry.dataKey === "consultas"
                ? "Consultas"
                : entry.dataKey === "usos"
                  ? "Usos"
                  : entry.dataKey === "agents"
                    ? "Agentes"
                    : entry.dataKey === "performance"
                      ? "Rendimiento"
                      : ""
            }: ${entry.value}${entry.dataKey === "performance" ? "%" : entry.dataKey === "porcentaje" ? "%" : ""}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function PerformanceCharts() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(getApiUrl('/api/metrics?days=7'), {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          // Validar que la respuesta tenga la estructura esperada
          if (data && data.porPeriodo && Array.isArray(data.porPeriodo)) {
            setMetrics(data)
          } else {
            console.warn('Respuesta de métricas con estructura inesperada:', data)
            setMetrics(null)
          }
        } else {
          console.warn('Error al cargar métricas:', response.status)
          setMetrics(null)
        }
      } catch (error) {
        console.error('Error al cargar métricas:', error)
        setMetrics(null)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="h-3 sm:h-4 bg-muted/50 rounded w-2/3 mb-2 animate-pulse" />
              <div className="h-2 sm:h-3 bg-muted/30 rounded w-3/4 animate-pulse" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="h-[160px] sm:h-[200px] space-y-2">
                <div className="h-3 sm:h-4 bg-muted/40 rounded w-full animate-pulse" />
                <div className="h-3 sm:h-4 bg-muted/30 rounded w-5/6 animate-pulse" />
                <div className="h-3 sm:h-4 bg-muted/40 rounded w-4/6 animate-pulse" />
                <div className="h-3 sm:h-4 bg-muted/30 rounded w-full animate-pulse" />
                <div className="h-3 sm:h-4 bg-muted/40 rounded w-3/6 animate-pulse" />
                <div className="h-3 sm:h-4 bg-muted/30 rounded w-5/6 animate-pulse" />
                <div className="h-3 sm:h-4 bg-muted/40 rounded w-4/6 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Formatear datos para el gráfico de consultas
  const consultasData = (() => {
    // Validar que metrics y porPeriodo existan y sean arrays
    if (metrics?.porPeriodo && Array.isArray(metrics.porPeriodo) && metrics.porPeriodo.length > 0) {
      try {
        return metrics.porPeriodo.slice(0, 7).reverse().map((item) => {
          const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
          const fecha = new Date(item.fecha)
          return {
            periodo: dias[fecha.getDay()] || 'N/A',
            consultas: item.respuestas || 0,
            label: `${item.respuestas || 0} consultas`
          }
        })
      } catch (error) {
        console.error('Error al formatear datos de consultas:', error)
        // Retornar datos por defecto si hay error
      }
    }
    // Datos por defecto si no hay métricas o hay error
    return [
      { periodo: "Lun", consultas: 0, label: "0 consultas" },
      { periodo: "Mar", consultas: 0, label: "0 consultas" },
      { periodo: "Mié", consultas: 0, label: "0 consultas" },
      { periodo: "Jue", consultas: 0, label: "0 consultas" },
      { periodo: "Vie", consultas: 0, label: "0 consultas" },
      { periodo: "Sáb", consultas: 0, label: "0 consultas" },
      { periodo: "Dom", consultas: 0, label: "0 consultas" },
    ]
  })()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Consultas Atendidas</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">
            {loading ? 'Cargando datos...' : 'Consultas procesadas en la última semana'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <ResponsiveContainer width="100%" height={160} className="sm:h-[200px]">
            <BarChart data={consultasData}>
              <XAxis dataKey="periodo" stroke="hsl(var(--muted-foreground))" fontSize={10} className="sm:text-xs" />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} className="sm:text-xs" />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="consultas"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
                className="transition-all duration-300 hover:opacity-80"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Interacciones por Día</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">
            {loading ? 'Cargando...' : 'Actividad diaria del último período'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {!loading && (!metrics || !metrics.porPeriodo || !Array.isArray(metrics.porPeriodo) || metrics.porPeriodo.length === 0) ? (
            <div className="h-[160px] sm:h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground text-xs sm:text-sm">¡Aún no tenemos datos!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160} className="sm:h-[200px]">
              <BarChart data={consultasData}>
                <XAxis dataKey="periodo" stroke="hsl(var(--muted-foreground))" fontSize={10} className="sm:text-xs" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} className="sm:text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="consultas"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                  className="transition-all duration-300 hover:opacity-80"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Análisis Adicional</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">Próximamente más métricas</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="h-[160px] sm:h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground text-xs sm:text-sm">¡Aún no tenemos datos!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
