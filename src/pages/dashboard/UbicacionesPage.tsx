
import { useEffect, useState } from "react"
import { MapPin, MessageSquare, TrendingUp, Users, Globe } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { getApiUrl } from "@/lib/api-client"

interface LocationData {
  total: number
  locations: {
    pais: string
    leads: number
    porcentaje: number
  }[]
  dataSource?: string
}

const COLORS = ['#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff', '#faf5ff']

const getStatusColor = (porcentaje: number) => {
  if (porcentaje >= 30) return "bg-green-100 text-green-800 border-green-200"
  if (porcentaje >= 15) return "bg-blue-100 text-blue-800 border-blue-200"
  if (porcentaje >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200"
  return "bg-gray-100 text-gray-800 border-gray-200"
}

const getStatusLabel = (porcentaje: number) => {
  if (porcentaje >= 30) return "Muy Alto"
  if (porcentaje >= 15) return "Alto"
  if (porcentaje >= 5) return "Medio"
  return "Bajo"
}

export default function UbicacionesPage() {
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(getApiUrl('/api/metrics/locations?days=30'))
        if (response.ok) {
          const data = await response.json()
          setLocationData(data)
        }
      } catch (error) {
        console.error('Error al cargar ubicaciones:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLocations()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-muted/50 rounded w-48 animate-pulse" />
            <div className="h-4 bg-muted/30 rounded w-96 animate-pulse" />
          </div>
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
                <div className="h-3 bg-muted/30 rounded w-24 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* List skeleton */}
          <Card>
            <CardHeader>
              <div className="h-5 bg-muted/50 rounded w-40 mb-2 animate-pulse" />
              <div className="h-4 bg-muted/30 rounded w-56 animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-5 bg-muted/50 rounded w-24 animate-pulse" />
                    <div className="h-6 bg-muted/40 rounded w-16 animate-pulse" />
                  </div>
                  <div className="h-2 bg-muted/40 rounded w-full animate-pulse" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chart skeleton */}
          <Card>
            <CardHeader>
              <div className="h-5 bg-muted/50 rounded w-48 mb-2 animate-pulse" />
              <div className="h-4 bg-muted/30 rounded w-40 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/30 rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!locationData || locationData.locations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ubicaciones</h1>
          <p className="text-muted-foreground mt-1">
            Monitorea el origen geográfico de tus leads
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">¡Aún no tenemos datos!</h3>
            <p className="text-sm text-muted-foreground">
              Los datos de ubicación se mostrarán aquí una vez que comiences a capturar leads.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pieChartData = locationData.locations.map((loc, idx) => ({
    name: loc.pais,
    value: loc.porcentaje,
    leads: loc.leads,
    color: COLORS[idx % COLORS.length]
  }))

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ubicaciones</h1>
          <p className="text-muted-foreground mt-1">
            Monitorea el origen geográfico de tus leads
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{locationData.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Países Activos</p>
                <p className="text-2xl font-bold">{locationData.locations.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Con leads capturados</p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">País Principal</p>
                <p className="text-2xl font-bold">
                  {locationData.locations[0]?.pais || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {locationData.locations[0]?.porcentaje || 0}% del total
                </p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribution Chart */}
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-primary" />
              <span>Distribución por País</span>
            </CardTitle>
            <CardDescription>Porcentaje de leads por país de origen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${props.payload.leads} leads (${value}%)`,
                      props.payload.name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieChartData.map((region, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: region.color }} />
                  <span className="text-sm">
                    {region.name}: {region.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Top Países</span>
            </CardTitle>
            <CardDescription>Países con mayor cantidad de leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locationData.locations.slice(0, 5).map((location, index) => (
                <div key={location.pais} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{location.pais}</h4>
                        <p className="text-xs text-muted-foreground">
                          {location.leads} leads
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold">{location.porcentaje}%</span>
                    </div>
                  </div>
                  <Progress value={location.porcentaje} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Detail Table */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span>Detalle por País</span>
          </CardTitle>
          <CardDescription>
            Métricas detalladas de leads por país de origen
            {locationData.dataSource && (
              <span className="ml-2 text-xs">
                • Fuente: {locationData.dataSource}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locationData.locations.map((location, index) => (
              <div
                key={location.pais}
                className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{location.pais}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{location.leads} leads</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>{location.porcentaje}% del total</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Ranking</p>
                    <p className="text-2xl font-bold">#{index + 1}</p>
                  </div>

                  <div className="text-center min-w-[120px]">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Participación</p>
                    <div className="flex items-center space-x-2">
                      <Progress value={location.porcentaje} className="w-16 h-2" />
                      <span className="text-sm font-medium">{location.porcentaje}%</span>
                    </div>
                  </div>

                  <Badge className={getStatusColor(location.porcentaje)}>
                    {getStatusLabel(location.porcentaje)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
