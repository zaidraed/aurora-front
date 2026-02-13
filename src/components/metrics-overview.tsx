
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Package
} from "lucide-react"
import { DashboardMetrics } from "@/lib/dashboard-types"
import { motion } from "framer-motion"
import { getApiUrl } from "@/lib/api-client"

interface MetricsOverviewProps {
  onCredentialsStatus?: (hasCredentials: boolean) => void
}

export function MetricsOverview({ onCredentialsStatus }: MetricsOverviewProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasCredentials, setHasCredentials] = useState<boolean>(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        const response = await fetch(getApiUrl('/api/metrics?days=30'), {
          credentials: 'include'
        })
        const data = await response.json()
        
        // Si la respuesta indica que requiere configuración, manejar como error especial
        if (!response.ok && data.requiresSetup) {
          setError('Credenciales de PostgreSQL no configuradas')
          setMetrics(null)
          setHasCredentials(false)
          onCredentialsStatus?.(false)
          return
        }
        
        // Si hay métricas válidas, indicar que hay credenciales
        if (response.ok && data) {
          setHasCredentials(true)
          onCredentialsStatus?.(true)
        }
        
        if (!response.ok) {
          throw new Error(data.error || data.details || 'Error al cargar métricas')
        }
        
        setMetrics(data)
        setError(null)
        setHasCredentials(true)
        onCredentialsStatus?.(true)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        setError(errorMessage)
        setMetrics(null)
        
        // Si el error es por falta de credenciales, actualizar estado
        if (errorMessage.includes('Credenciales de PostgreSQL no configuradas')) {
          setHasCredentials(false)
          onCredentialsStatus?.(false)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    // Actualizar cada 5 minutos solo si hay métricas válidas
    const interval = setInterval(() => {
      if (!error || !error.includes('Credenciales')) {
        fetchMetrics()
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [error])

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        {/* Skeleton para métricas principales */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="h-3 bg-muted/50 rounded w-2/3 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-6 sm:h-8 bg-muted/50 rounded w-1/2 mb-2 animate-pulse" />
                <div className="h-2 bg-muted/30 rounded w-3/4 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Skeleton para métricas secundarias */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="transition-all duration-300">
              <CardHeader>
                <div className="h-4 bg-muted/50 rounded w-2/3 mb-2 animate-pulse" />
                <div className="h-3 bg-muted/30 rounded w-1/2 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-9 bg-muted/50 rounded w-1/3 animate-pulse" />
                <div className="h-2 bg-muted/40 rounded w-full animate-pulse" />
                <div className="h-6 bg-muted/30 rounded w-1/4 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    // Si el error es por falta de credenciales, mostrar mensaje de bienvenida profesional
    if (error?.includes('Credenciales de PostgreSQL no configuradas') || 
        error?.includes('requiresSetup')) {
      return (
        <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
          {/* Imagen de fondo difuminada */}
          <div className="absolute inset-0">
            <img
              src="/BG_HERO_NEW.png"
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay con blur */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />
          </div>
          
          {/* Contenido centrado - Solo logo */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full p-8">
            {/* Logo */}
            <div>
              <img
                src="/Logotipo_Aurora.svg"
                alt="Aurora SDR"
                className="w-auto h-16 md:h-20"
              />
            </div>
          </div>
        </div>
      )
    }

    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">
            {error || 'No se pudieron cargar las métricas'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const { generales, comunicacion } = metrics

  // Validaciones defensivas para evitar errores si faltan datos
  const generalesData = generales || {
    leadsGenerados: 0,
    reunionesAgendadas: null,
    respuestasAutomaticasCorrectas: 0,
    porcentajeRespuestasCorrectas: 0,
    tiempoPromedioRespuesta: 0,
    cierresEfectivos: 0,
    porcentajeCierresEfectivos: 0
  }

  const comunicacionData = comunicacion || {
    adecuacionMarca: 0,
    conocimientoProductos: 0,
    satisfaccionGeneral: 0
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1]
      }
    })
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Métricas principales en grid - responsive */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Leads Totales */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Leads Totales
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{generalesData.leadsGenerados}</div>
              <p className="text-xs text-muted-foreground">
                Leads únicos registrados
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Respuestas Exitosas */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Respuestas Exitosas
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{generalesData.respuestasAutomaticasCorrectas}</div>
              <p className="text-xs text-muted-foreground">
                Ejecuciones completadas
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reuniones Agendadas */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={2}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Reuniones Agendadas
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            {generalesData.reunionesAgendadas === null || generalesData.reunionesAgendadas === 0 ? (
              <>
                <div className="text-lg font-medium text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground">
                  ¡Aún no tenemos datos!
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{generalesData.reunionesAgendadas}</div>
                <p className="text-xs text-muted-foreground">
                  {generalesData.leadsGenerados > 0 
                    ? `${Math.round((generalesData.reunionesAgendadas / generalesData.leadsGenerados) * 100)}% de conversión`
                    : 'Reuniones agendadas'}
                </p>
              </>
            )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasa de Éxito */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={3}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tasa de Éxito
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {generalesData.porcentajeRespuestasCorrectas}%
              </div>
              <p className="text-xs text-muted-foreground">
                {generalesData.respuestasAutomaticasCorrectas} respuestas correctas
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tiempo Promedio */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={4}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tiempo Promedio
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(generalesData.tiempoPromedioRespuesta)}s
              </div>
              <p className="text-xs text-muted-foreground">
                Tiempo de respuesta
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Métricas secundarias - responsive */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Cierres Efectivos */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={5}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cierres Efectivos</CardTitle>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>Sin seguimiento manual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold">
                {generalesData.porcentajeCierresEfectivos}%
              </div>
              <Progress 
                value={generalesData.porcentajeCierresEfectivos} 
                className="h-2"
              />
              <p className="text-sm text-muted-foreground">
                {generalesData.cierresEfectivos} cierres sin intervención
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conocimiento de Productos */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={6}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Conocimiento de Productos</CardTitle>
                <Package className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>Precisión en detalles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold">
                {comunicacionData.conocimientoProductos}%
              </div>
              <Progress 
                value={comunicacionData.conocimientoProductos} 
                className="h-2"
              />
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant={comunicacionData.conocimientoProductos >= 90 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {comunicacionData.conocimientoProductos >= 90 ? "Excelente" : 
                   comunicacionData.conocimientoProductos >= 75 ? "Bueno" : "Mejorable"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Última actualización */}
      <motion.div 
        className="flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p className="text-xs text-muted-foreground">
          Última actualización: {metrics.ultimaActualizacion 
            ? new Date(metrics.ultimaActualizacion).toLocaleString('es-AR')
            : 'No disponible'}
        </p>
      </motion.div>
    </div>
  )
}

