
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, TrendingUp, CheckCircle, Activity, Building2 } from "lucide-react"
import { getApiUrl, fetchWithAuth } from "@/lib/api-client"
import type { Customer } from "@/lib/customer-types"

interface AgentStats {
  tasaExito: number
  respuestasExitosas: number
  totalLeads: number
}

interface AgentInfo {
  customerId: string
  customerName: string
  agentName: string
  email: string
  stats?: AgentStats
}

export default function AgentesPage() {
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [allAgents, setAllAgents] = useState<AgentInfo[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)

  useEffect(() => {
    // Verificar si el usuario es admin
    const checkAdmin = () => {
      const role = localStorage.getItem('role') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('role='))
          ?.split('=')[1]
      return role === 'SuperAdmin'
    }

    const isAdminUser = checkAdmin()
    setIsAdmin(isAdminUser)

    const fetchAgentStats = async () => {
      try {
        const response = await fetch(getApiUrl('/api/metrics?days=30'))
        if (response.ok) {
          const data = await response.json()
          setAgentStats({
            tasaExito: data.generales.porcentajeRespuestasCorrectas || 0,
            respuestasExitosas: data.generales.respuestasAutomaticasCorrectas || 0,
            totalLeads: data.generales.leadsGenerados || 0
          })
        }
      } catch (error) {
        console.error('Error al cargar estadísticas:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchAllAgents = async () => {
      if (!isAdminUser) return
      
      try {
        setLoadingAgents(true)
        // Obtener todos los clientes
        const customersRes = await fetchWithAuth(getApiUrl('/api/customers'))
        if (!customersRes.ok) return
        
        const customersData = await customersRes.json()
        if (!customersData.success) return

        // Filtrar solo clientes que tienen agentes (no Owner y que tengan la feature 'agentes' o cantidadAgentes > 0)
        const customersWithAgents = customersData.data.filter((customer: Customer) => {
          // Excluir Owner
          if (customer.rol === 'Owner') return false
          // Verificar si tiene la feature 'agentes' habilitada o cantidadAgentes > 0
          const hasAgentesFeature = customer.enabledViews?.includes('agentes') || false
          const hasAgentesCount = (customer.cantidadAgentes || 0) > 0
          return hasAgentesFeature || hasAgentesCount
        })

        // Crear información de agentes para cada cliente
        const agents: AgentInfo[] = customersWithAgents.map((customer: Customer) => {
          const agentName = `${customer.nombre} ${customer.apellido} IA`
          return {
            customerId: customer._id?.toString() || '',
            customerName: `${customer.nombre} ${customer.apellido}`,
            agentName: agentName,
            email: customer.email,
          }
        })

        setAllAgents(agents)
      } catch (error) {
        console.error('Error al cargar agentes de todos los clientes:', error)
      } finally {
        setLoadingAgents(false)
      }
    }

    fetchAgentStats()
    fetchAllAgents()
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
                <div className="h-4 bg-muted/50 rounded w-24 animate-pulse" />
                <div className="h-4 w-4 bg-muted/50 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted/50 rounded w-16 mb-2 animate-pulse" />
                <div className="h-3 bg-muted/30 rounded w-32 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agent details skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted/50 rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-muted/30 rounded w-64 animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-32 bg-muted/40 rounded animate-pulse" />
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">Agentes IA</h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">Gestiona y monitorea tu agente de inteligencia artificial</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Agentes</CardTitle>
            <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {isAdmin ? allAgents.length : 1}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {isAdmin ? `${allAgents.length} agente(s) activo(s)` : 'Academia MAV IA'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Agentes Activos</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">1</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">100% operativo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Tasa de Éxito</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{agentStats?.tasaExito || 0}%</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Últimos 30 días</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Tareas Completadas</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-sm sm:text-lg font-medium text-muted-foreground">Próximamente</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">En desarrollo</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Detail Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            {isAdmin ? 'Agentes de Todos los Clientes' : 'Agente Activo'}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {isAdmin 
              ? 'Información detallada de todos los agentes IA de los clientes'
              : 'Información detallada del agente de IA'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 sm:space-y-6">
            {isAdmin ? (
              loadingAgents ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando agentes...
                </div>
              ) : allAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron agentes activos
                </div>
              ) : (
                allAgents.map((agent) => (
                  <div 
                    key={agent.customerId}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 p-4 sm:p-6 border rounded-lg bg-card hover:shadow-md transition-all"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 md:gap-6 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Bot className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 flex-wrap">
                          <h3 className="text-base sm:text-lg md:text-xl font-semibold truncate">{agent.agentName}</h3>
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs flex-shrink-0">
                            Activo
                          </Badge>
                          <Badge variant="outline" className="text-xs flex-shrink-0 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {agent.customerName}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 line-clamp-1">
                          Asistente de Conversión y Calificación
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                          Cliente: {agent.email}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 text-sm">
                      <div className="text-center">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Tasa de Éxito</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary">{agent.stats?.tasaExito || 0}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Respuestas</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold">{agent.stats?.respuestasExitosas || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Leads</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold">{agent.stats?.totalLeads || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Estado</p>
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                          <p className="text-xs sm:text-sm font-medium whitespace-nowrap">Activo ahora</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* Vista normal para usuarios no-admin */
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 p-4 sm:p-6 border rounded-lg bg-card hover:shadow-md transition-all">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 md:gap-6 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold truncate">Academia MAV IA</h3>
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs flex-shrink-0">
                        Activo
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 line-clamp-1">
                      Asistente de Conversión y Calificación
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                      Integrado con Aurora SDR IA y Kommo CRM
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Tasa de Éxito</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary">{agentStats?.tasaExito || 0}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Respuestas</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">{agentStats?.respuestasExitosas || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Leads</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">{agentStats?.totalLeads || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Estado</p>
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-xs sm:text-sm font-medium whitespace-nowrap">Activo ahora</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Capabilities */}
            <div className="grid gap-3 sm:gap-4 md:grid-cols-3 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm">Capacidades</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs sm:text-sm space-y-1.5 sm:space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span className="line-clamp-1">Responde todos los leads</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span className="line-clamp-1">Deriva leads calificados</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span className="line-clamp-1">Gestión automática 24/7</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm">Integración</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs sm:text-sm space-y-1.5 sm:space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span className="line-clamp-1">Aurora SDR IA</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span className="line-clamp-1">Kommo CRM</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span className="line-clamp-1">WhatsApp Business</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm">Horario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs sm:text-sm space-y-1.5 sm:space-y-2">
                    <p className="font-medium">24/7 Disponible</p>
                    <p className="text-muted-foreground text-[10px] sm:text-xs line-clamp-2">
                      Respuesta automática las 24 horas, los 7 días de la semana
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
