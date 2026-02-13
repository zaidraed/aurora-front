import { useEffect, useState } from "react"
import { 
  RefreshCw, 
  Users, 
  BarChart3, 
  Database, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity, 
  Filter, 
  Calendar, 
  User, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Tag,
  Link2,
  Settings,
  AlertCircle,
  Globe,
  Building2,
  Briefcase,
  Mail,
  History,
  Download,
  CheckCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { getApiUrl } from "@/lib/api-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

// Interfaces
interface HubSpotConnectionStatus {
  connected: boolean
  lastSync?: string
  accessTokenExpires?: string
  accountName?: string
  accountId?: string
}

interface KommoConnectionStatus {
  connected: boolean
  lastSync?: string
  accountName?: string
}

interface SyncStats {
  totalContacts: number
  syncedContacts: number
  totalDeals: number
  syncedDeals: number
  lastSync: string
  syncErrors: number
  syncSuccess: number
}

interface HubSpotContact {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  company?: string
  lifecycleStage?: string
  leadStatus?: string
  syncedToKommo: boolean
  kommoLeadId?: number
  lastSynced?: string
}

interface HubSpotDeal {
  id: string
  dealName: string
  amount: number
  dealStage: string
  pipeline: string
  closeDate?: string
  owner?: string
  syncedToKommo: boolean
  kommoDealId?: number
  lastSynced?: string
}

interface SyncLog {
  id: string
  timestamp: string
  type: 'contact' | 'deal' | 'company'
  action: 'create' | 'update' | 'delete' | 'error'
  hubspotId: string
  kommoId?: number
  status: 'success' | 'error' | 'pending'
  message: string
}

const chartConfig = {
  synced: {
    label: "Sincronizados",
    color: "hsl(142, 76%, 36%)",
  },
  pending: {
    label: "Pendientes",
    color: "hsl(45, 93%, 47%)",
  },
  error: {
    label: "Errores",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies Record<string, { label: string; color: string }>

export default function HubSpotPage() {
  // Estados principales
  const [hubspotStatus, setHubspotStatus] = useState<HubSpotConnectionStatus | null>(null)
  const [kommoStatus, setKommoStatus] = useState<KommoConnectionStatus | null>(null)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  // Estados para datos
  const [contacts, setContacts] = useState<HubSpotContact[]>([])
  const [deals, setDeals] = useState<HubSpotDeal[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<'all' | 'synced' | 'pending' | 'error'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  
  // Estados para sincronización
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  

  useEffect(() => {
    loadConnectionStatus()
    loadSyncStats()
    loadContacts()
    loadDeals()
    loadSyncLogs()
  }, [])

  const loadConnectionStatus = async () => {
    try {
      const customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) return

      // Cargar estado de HubSpot
      const hubspotResponse = await fetch(getApiUrl(`/api/hubspot/status?customerId=${customerId}`))
      if (hubspotResponse.ok) {
        const hubspotData = await hubspotResponse.json()
        if (hubspotData.success) {
          setHubspotStatus(hubspotData.data)
        }
      }

      // Cargar estado de Kommo
      const kommoResponse = await fetch(getApiUrl(`/api/metrics/kommo?customerId=${customerId}`))
      if (kommoResponse.ok) {
        const kommoData = await kommoResponse.json()
        setKommoStatus({
          connected: kommoData.success,
          lastSync: kommoData.data?.lastUpdated,
          accountName: 'Kommo Account'
        })
      }
    } catch (error) {
      console.error('Error al cargar estado de conexión:', error)
    }
  }

  const loadSyncStats = async () => {
    try {
      const customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) return

      const response = await fetch(getApiUrl(`/api/hubspot/sync/stats?customerId=${customerId}`))
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSyncStats(data.data)
        }
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de sincronización:', error)
    }
  }

  const loadContacts = async () => {
    setLoading(true)
    try {
      const customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) return

      const response = await fetch(getApiUrl(`/api/hubspot/contacts?customerId=${customerId}`))
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setContacts(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDeals = async () => {
    try {
      const customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) return

      const response = await fetch(getApiUrl(`/api/hubspot/deals?customerId=${customerId}`))
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDeals(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error al cargar deals:', error)
    }
  }

  const loadSyncLogs = async () => {
    try {
      const customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) return

      const response = await fetch(getApiUrl(`/api/hubspot/sync/logs?customerId=${customerId}&limit=100`))
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSyncLogs(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error al cargar logs:', error)
    }
  }


  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) {
        toast.error('No se encontró información del cliente')
        return
      }

      toast.loading('Iniciando sincronización...', { id: 'sync' })
      
      const response = await fetch(getApiUrl(`/api/hubspot/sync/start?customerId=${customerId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncType: 'hubspot-to-kommo',
          syncContacts: true,
          syncDeals: true,
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Sincronización iniciada', { id: 'sync' })
        // Recargar datos después de un delay
        setTimeout(() => {
          loadSyncStats()
          loadContacts()
          loadDeals()
          loadSyncLogs()
        }, 2000)
      } else {
        toast.error(data.error || 'Error al iniciar sincronización', { id: 'sync' })
      }
    } catch (error) {
      console.error('Error al sincronizar:', error)
      toast.error('Error al sincronizar', { id: 'sync' })
    } finally {
      setSyncing(false)
    }
  }

  // Filtrar contactos
  const filteredContacts = contacts.filter(contact => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      if (!contact.email.toLowerCase().includes(search) &&
          !contact.firstName.toLowerCase().includes(search) &&
          !contact.lastName.toLowerCase().includes(search) &&
          !contact.company?.toLowerCase().includes(search)) {
        return false
      }
    }
    
    if (filterType === 'synced' && !contact.syncedToKommo) return false
    if (filterType === 'pending' && contact.syncedToKommo) return false
    if (filterType === 'error' && contact.syncedToKommo) return false // Ajustar según lógica de errores
    
    return true
  })

  // Paginación
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedContacts = filteredContacts.slice(startIndex, startIndex + itemsPerPage)

  // Datos para gráficos
  const syncChartData = syncStats ? [
    { name: "Sincronizados", value: syncStats.syncedContacts, color: "#22c55e" },
    { name: "Pendientes", value: syncStats.totalContacts - syncStats.syncedContacts, color: "#eab308" },
    { name: "Errores", value: syncStats.syncErrors, color: "#ef4444" },
  ] : []

  const dealsChartData = syncStats ? [
    { name: "Sincronizados", value: syncStats.syncedDeals, color: "#22c55e" },
    { name: "Pendientes", value: syncStats.totalDeals - syncStats.syncedDeals, color: "#eab308" },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">HubSpot</h1>
              <p className="text-muted-foreground mt-1">
                Información y datos de tu cuenta de HubSpot
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => loadConnectionStatus()}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estadísticas de HubSpot */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Estadísticas de HubSpot
        </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contactos Totales</CardTitle>
                  <Users className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{contacts.length.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contactos en HubSpot
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Deals Totales</CardTitle>
                  <Briefcase className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{deals.length.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deals en HubSpot
                  </p>
                </CardContent>
              </Card>

              {autoSyncEnabled && syncStats && (
                <>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Sincronizados</CardTitle>
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {syncStats.syncedContacts.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Contactos sincronizados con Kommo
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Última Sincronización</CardTitle>
                      <Clock className="h-5 w-5 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-bold">
                        {syncStats.lastSync ? new Date(syncStats.lastSync).toLocaleString('es-AR') : 'Nunca'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sincronización con Kommo
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

      {/* Estadísticas de Sincronización (solo si está activada) */}
      {autoSyncEnabled && syncStats && (
        <>
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Estadísticas de Sincronización
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contactos Totales</CardTitle>
                  <Users className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{syncStats.totalContacts.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {syncStats.syncedContacts} sincronizados
                  </p>
                  <Progress 
                    value={(syncStats.syncedContacts / syncStats.totalContacts) * 100} 
                    className="mt-2 h-2"
                  />
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Deals Totales</CardTitle>
                  <Briefcase className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{syncStats.totalDeals.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {syncStats.syncedDeals} sincronizados
                  </p>
                  <Progress 
                    value={(syncStats.syncedDeals / syncStats.totalDeals) * 100} 
                    className="mt-2 h-2"
                  />
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sincronizaciones Exitosas</CardTitle>
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {syncStats.syncSuccess.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Última: {new Date(syncStats.lastSync).toLocaleString('es-AR')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Errores</CardTitle>
                  <XCircle className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {syncStats.syncErrors.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requieren atención
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sincronización de Contactos</CardTitle>
                <CardDescription>
                  Estado de sincronización de contactos entre HubSpot y Kommo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={syncChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {syncChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sincronización de Deals</CardTitle>
                <CardDescription>
                  Estado de sincronización de deals entre HubSpot y Kommo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={dealsChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dealsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contacts">Contactos</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="mapping">Mapeo</TabsTrigger>
        </TabsList>

        {/* Tab de Contactos */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contactos de HubSpot</CardTitle>
                  <CardDescription>
                    Lista de contactos sincronizados con Kommo
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Buscar contactos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="synced">Sincronizados</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                      <SelectItem value="error">Errores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contacto</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Kommo Lead ID</TableHead>
                          <TableHead>Última Sincronización</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedContacts.length > 0 ? (
                          paginatedContacts.map((contact) => (
                            <TableRow key={contact.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                                    {contact.phone && (
                                      <p className="text-xs text-muted-foreground">{contact.phone}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  {contact.email}
                                </div>
                              </TableCell>
                              <TableCell>{contact.company || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={contact.syncedToKommo ? "default" : "secondary"}>
                                  {contact.syncedToKommo ? (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Clock className="h-3 w-3 mr-1" />
                                  )}
                                  {contact.syncedToKommo ? "Sincronizado" : "Pendiente"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {contact.kommoLeadId ? (
                                  <Badge variant="outline">#{contact.kommoLeadId}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {contact.lastSynced ? (
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(contact.lastSynced).toLocaleString('es-AR')}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Lógica para sincronizar contacto individual
                                    toast.info('Sincronizando contacto...')
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12">
                              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                              <p className="text-muted-foreground">No se encontraron contactos</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredContacts.length)} de {filteredContacts.length} contactos
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-10"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Deals */}
        <TabsContent value="deals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deals de HubSpot</CardTitle>
              <CardDescription>
                Lista de deals sincronizados con Kommo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Pipeline</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Kommo Deal ID</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.length > 0 ? (
                      deals.map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell className="font-medium">{deal.dealName}</TableCell>
                          <TableCell>${deal.amount.toLocaleString()}</TableCell>
                          <TableCell>{deal.pipeline}</TableCell>
                          <TableCell>{deal.dealStage}</TableCell>
                          <TableCell>
                            <Badge variant={deal.syncedToKommo ? "default" : "secondary"}>
                              {deal.syncedToKommo ? "Sincronizado" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {deal.kommoDealId ? (
                              <Badge variant="outline">#{deal.kommoDealId}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Sync className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground">No se encontraron deals</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Logs - Solo si la sincronización está activa */}
        <TabsContent value="logs" className="space-y-4">
          {autoSyncEnabled ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Logs de Sincronización</CardTitle>
                    <CardDescription>
                      Historial de todas las operaciones de sincronización con Kommo
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Logs
                  </Button>
                </div>
              </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>HubSpot ID</TableHead>
                      <TableHead>Kommo ID</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Mensaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.length > 0 ? (
                      syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.timestamp).toLocaleString('es-AR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              log.action === 'create' ? 'default' :
                              log.action === 'update' ? 'secondary' :
                              log.action === 'delete' ? 'destructive' : 'outline'
                            }>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.hubspotId}</TableCell>
                          <TableCell>
                            {log.kommoId ? (
                              <Badge variant="outline" className="font-mono">#{log.kommoId}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              log.status === 'success' ? 'default' :
                              log.status === 'error' ? 'destructive' : 'secondary'
                            }>
                              {log.status === 'success' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : log.status === 'error' ? (
                                <XCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground">No hay logs disponibles</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <RefreshCw className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Sincronización no activa</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Activa la sincronización con Kommo para ver los logs de sincronización
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab de Mapeo - Solo lectura */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapeo de Campos</CardTitle>
              <CardDescription>
                Visualización del mapeo de campos entre HubSpot y Kommo (configurado desde administración)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Mapeo de Contactos</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campo HubSpot</TableHead>
                          <TableHead>Campo Kommo</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Email</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>
                            <Badge variant="default">Activo</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">First Name</TableCell>
                          <TableCell>Nombre</TableCell>
                          <TableCell>
                            <Badge variant="default">Activo</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Last Name</TableCell>
                          <TableCell>Apellido</TableCell>
                          <TableCell>
                            <Badge variant="default">Activo</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Company</TableCell>
                          <TableCell>Empresa</TableCell>
                          <TableCell>
                            <Badge variant="default">Activo</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Phone</TableCell>
                          <TableCell>Teléfono</TableCell>
                          <TableCell>
                            <Badge variant="default">Activo</Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Mapeo de Deals</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campo HubSpot</TableHead>
                          <TableHead>Campo Kommo</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Deal Name</TableCell>
                          <TableCell>Nombre</TableCell>
                          <TableCell>
                            <Badge variant="default">Activo</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Amount</TableCell>
                          <TableCell>Precio</TableCell>
                          <TableCell>
                            <Badge variant="default">Activo</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Deal Stage</TableCell>
                          <TableCell>Etapa</TableCell>
                          <TableCell>
                            <Badge variant="default">Activo</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Close Date</TableCell>
                          <TableCell>Fecha de Cierre</TableCell>
                          <TableCell>
                            <Badge variant="default">Activo</Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Información</AlertTitle>
                  <AlertDescription>
                    El mapeo de campos se configura desde el panel de administración. 
                    Contacta a tu administrador si necesitas modificar estos mapeos.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}
