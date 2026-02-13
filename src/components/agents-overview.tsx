
import { useEffect, useState } from "react"
import { Bot, Activity, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { getApiUrl } from "@/lib/api-client"

interface AgentStats {
  totalEjecuciones: number
  exitosas: number
  tasaExito: number
  ultimaActividad: string
}

export function AgentsOverview() {
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAgentStats = async () => {
      try {
        const response = await fetch(getApiUrl('/api/metrics?days=30'), {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          const stats: AgentStats = {
            totalEjecuciones: data.generales.respuestasAutomaticasCorrectas || 0,
            exitosas: data.generales.respuestasAutomaticasCorrectas || 0,
            tasaExito: data.generales.porcentajeRespuestasCorrectas || 0,
            ultimaActividad: "Activo ahora"
          }
          setAgentStats(stats)
        }
      } catch (error) {
        console.error('Error al cargar estadísticas del agente:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAgentStats()
  }, [])

  if (loading) {
    return (
      <Card className="col-span-2 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-2">
            <div className="h-5 sm:h-6 bg-muted/50 rounded w-24 sm:w-32 animate-pulse" />
            <div className="h-3 sm:h-4 bg-muted/30 rounded w-36 sm:w-48 animate-pulse" />
          </div>
          <div className="h-6 w-6 sm:h-8 sm:w-8 bg-muted/50 rounded-full animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-4 rounded-lg border border-border bg-card/50">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-muted/50 rounded-full animate-pulse flex-shrink-0" />
              <div className="space-y-2 min-w-0">
                <div className="h-4 sm:h-5 bg-muted/50 rounded w-32 sm:w-36 animate-pulse" />
                <div className="h-3 sm:h-4 bg-muted/30 rounded w-40 sm:w-48 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-6 ml-13 sm:ml-0">
              <div className="text-right space-y-1 sm:space-y-2">
                <div className="h-4 sm:h-5 bg-muted/50 rounded w-12 sm:w-16 animate-pulse" />
                <div className="h-2 sm:h-3 bg-muted/30 rounded w-16 sm:w-20 animate-pulse" />
              </div>
              <div className="text-right space-y-1 sm:space-y-2">
                <div className="h-4 sm:h-5 bg-muted/50 rounded w-10 sm:w-12 animate-pulse" />
                <div className="h-2 sm:h-3 bg-muted/30 rounded w-20 sm:w-24 animate-pulse" />
              </div>
              <div className="h-5 sm:h-6 w-14 sm:w-16 bg-muted/50 rounded animate-pulse flex-shrink-0" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="col-span-2 transition-all duration-300 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="min-w-0">
            <CardTitle className="text-xl sm:text-2xl font-bold truncate">Agente IA</CardTitle>
            <CardDescription className="text-xs sm:text-sm truncate">
              Academia MAV - Agente activo
            </CardDescription>
          </div>
          <motion.div 
            className="flex items-center space-x-2 flex-shrink-0"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
          >
            <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <motion.div 
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-4 rounded-lg border border-border bg-card/50 transition-all duration-200 hover:bg-card hover:shadow-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                <div className="relative flex-shrink-0">
                  <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                  <CheckCircle className="absolute -bottom-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 text-green-500 bg-background rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-base sm:text-lg truncate">Academia MAV IA</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">Integrado con Aurora SDR IA y Kommo CRM</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-6 ml-13 sm:ml-0">
                <div className="text-left sm:text-right">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="font-medium text-base sm:text-lg">{agentStats?.tasaExito || 0}%</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Tasa de éxito</p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-medium text-base sm:text-lg">{agentStats?.exitosas || 0}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Respuestas exitosas</p>
                </div>
                <Badge variant="default" className="transition-all duration-200 text-xs sm:text-sm flex-shrink-0">
                  Activo
                </Badge>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
