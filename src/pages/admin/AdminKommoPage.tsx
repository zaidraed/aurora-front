
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCw, Users, TrendingUp, TrendingDown, MessageSquare, BarChart3, Database, CheckCircle2, XCircle, Clock, Activity, Filter, Calendar, User, Search, ChevronLeft, ChevronRight, FileDown, Tag, Building2, ArrowLeft } from "lucide-react"
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
} from "recharts"
import { exportKommoToExcel } from "@/lib/export-kommo-to-excel"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { getApiUrl } from "@/lib/api-client"

interface KommoStats {
  totals: {
    total: number
    won: number
    lost: number
    active: number
  }
  distribution: Array<{
    pipelineId: number
    pipelineName: string
    stages: Array<{
      statusId: number
      statusName: string
      count: number
      type: 'open' | 'won' | 'lost'
    }>
    total: number
  }>
  lastUpdated: string
}

const chartConfig = {
  won: {
    label: "Ganados",
    color: "hsl(142, 76%, 36%)",
  },
  lost: {
    label: "Perdidos",
    color: "hsl(0, 84%, 60%)",
  },
  active: {
    label: "Activos",
    color: "hsl(221, 83%, 53%)",
  },
} satisfies Record<string, { label: string; color: string }>

interface KommoLead {
  id: number
  name: string
  price: number
  responsible_user_id: number
  status_id: number
  pipeline_id: number
  date_create: number
  date_close: number | null
  created_at: number
  updated_at: number
  closed_at: number | null
  _embedded?: {
    tags?: Array<{ id: number; name: string }>
  }
  custom_fields_values?: Array<{
    field_id: number
    field_name?: string
    field_code?: string | null
    field_type?: string
    values?: Array<{ value?: string; enum_id?: number; enum_code?: string }>
  }>
}

/** Obtiene la fuente/origen del lead desde custom_fields_values (Fuente, Origen, Source, UTM, etc.) */
function getLeadSource(lead: KommoLead): string {
  const vals = lead.custom_fields_values
  if (!vals || !Array.isArray(vals)) return '-'
  const sourceKeys = ['fuente', 'origen', 'source', 'utm_source', 'procedencia', 'de dónde', 'de donde', 'canal', 'campaña', 'campaign']
  const field = vals.find(
    (f) =>
      sourceKeys.some((k) => (f.field_name ?? '').toLowerCase().includes(k)) ||
      sourceKeys.some((k) => (f.field_code ?? '').toLowerCase().includes(k))
  )
  if (!field?.values?.[0]) return '-'
  const v = field.values[0]
  return (v.value ?? v.enum_code ?? String(v.enum_id ?? '-')).trim() || '-'
}

interface KommoUser {
  id: number
  name: string
  email: string
}

interface KommoPipeline {
  id: number
  name: string
}

interface KommoTag {
  id: number
  name: string
}

interface Customer {
  _id: string
  nombre: string
  apellido: string
  email: string
  hasKommoCredentials?: boolean
  kommoCredentials?: {
    baseUrl?: string
    accessToken?: string
    integrationId?: string
    secretKey?: string
  }
  kommoAccounts?: Array<{
    baseUrl?: string
    accessToken?: string
    integrationId?: string
    secretKey?: string
  }>
}

/** Número de cuentas Kommo del cliente (1 = solo kommoCredentials, 2+ = kommoCredentials + kommoAccounts) */
function getKommoAccountsCount(customer: Customer | undefined): number {
  if (!customer) return 0
  const hasFirst = !!(customer.kommoCredentials?.accessToken && customer.kommoCredentials?.baseUrl)
  const extra = customer.kommoAccounts?.length ?? 0
  return (hasFirst ? 1 : 0) + extra
}

export default function AdminKommoPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [kommoStats, setKommoStats] = useState<KommoStats | null>(null)
  const [loadingKommo, setLoadingKommo] = useState(false)
  const [leads, setLeads] = useState<KommoLead[]>([])
  const [allLeads, setAllLeads] = useState<KommoLead[]>([])
  const [users, setUsers] = useState<KommoUser[]>([])
  const [pipelines, setPipelines] = useState<KommoPipeline[]>([])
  const [tags, setTags] = useState<KommoTag[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [loadingAllLeads, setLoadingAllLeads] = useState(false)
  const [filteredStats, setFilteredStats] = useState<KommoStats | null>(null)
  const [exportingExcel, setExportingExcel] = useState(false)
  
  // Filtros
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [dateField, setDateField] = useState<'created_at' | 'closed_at'>('created_at')
  const [selectedUserId, setSelectedUserId] = useState<string>("all")
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("all")
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [tagSelectValue, setTagSelectValue] = useState<string | undefined>(undefined)
  
  // Paginación y búsqueda
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [leadsPerPage] = useState<number>(50)

  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [syncingLeads, setSyncingLeads] = useState(false)
  /** Índice de cuenta Kommo (0-based): 0 = primera, 1 = segunda, ... */
  const [selectedKommoAccountIndex, setSelectedKommoAccountIndex] = useState(0)

  // Cargar clientes con credenciales de Kommo (kommoCredentials o kommoAccounts)
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true)
      try {
        const response = await fetch(getApiUrl('/api/customers'))
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        
        if (data.success && data.data) {
          const customersWithKommo = data.data.filter((customer: Customer) => {
            const hasFirst = !!(customer.kommoCredentials?.accessToken && customer.kommoCredentials?.baseUrl)
            const hasExtra = !!(customer.kommoAccounts && Array.isArray(customer.kommoAccounts) && customer.kommoAccounts.length > 0)
            return customer.hasKommoCredentials === true || hasFirst || hasExtra
          })
          setCustomers(customersWithKommo)
          console.log(`[KOMMO] Total clientes recibidos: ${data.data.length}`)
          console.log(`[KOMMO] Se encontraron ${customersWithKommo.length} clientes con credenciales de Kommo`)
          console.log(`[KOMMO] Clientes con Kommo:`, customersWithKommo.map(c => ({ 
            nombre: c.nombre, 
            email: c.email, 
            hasKommo: c.hasKommoCredentials,
            hasKommoCreds: !!c.kommoCredentials 
          })))
        } else {
          console.error('[KOMMO] Error en la respuesta de la API:', data)
          toast.error(data.error || 'Error al cargar la lista de clientes')
        }
      } catch (error) {
        console.error('[KOMMO] Error al cargar clientes:', error)
        toast.error('Error al cargar la lista de clientes. Verifica tu conexión.')
      } finally {
        setLoadingCustomers(false)
      }
    }
    
    fetchCustomers()
  }, [])

  // Al cambiar de cliente, ajustar selectedKommoAccountIndex si el nuevo tiene menos cuentas
  const selectedCustomerForCount = customers.find(c => c._id === selectedCustomerId)
  const kommoAccountsCount = getKommoAccountsCount(selectedCustomerForCount)
  useEffect(() => {
    if (kommoAccountsCount > 0 && selectedKommoAccountIndex >= kommoAccountsCount) {
      setSelectedKommoAccountIndex(0)
    }
  }, [selectedCustomerId, kommoAccountsCount, selectedKommoAccountIndex])

  // Función para sincronizar leads a la base de datos (sincronización incremental)
  const syncLeadsToDatabase = async () => {
    if (!selectedCustomerId) {
      toast.error('Por favor selecciona una cuenta')
      return
    }

    const selectedCustomer = customers.find(c => c._id === selectedCustomerId)
    if (!selectedCustomer) {
      toast.error('Cliente no encontrado')
      return
    }

    setSyncingLeads(true)
    try {
      console.log('[KOMMO ADMIN] Iniciando sincronización de leads para customerId:', selectedCustomerId)
      
      toast.info(`Sincronizando leads de ${selectedCustomer.nombre} ${selectedCustomer.apellido}... Esto puede tardar varios minutos.`, {
        duration: 5000,
      })

      const response = await fetch(getApiUrl(`/api/metrics/kommo/leads/sync?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}&forceFullSync=true`), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success('Sincronización iniciada correctamente. Los leads se están guardando en la base de datos con el customerId correcto. Esto puede tardar varios minutos. Puedes recargar los datos más tarde.', {
          duration: 10000,
        })
        console.log('[KOMMO ADMIN] Sincronización iniciada:', data)
        
        // NO recargar automáticamente - la sincronización puede tardar varios minutos
        // El usuario puede recargar manualmente cuando quiera
      } else {
        throw new Error(data.error || 'Error desconocido al iniciar sincronización')
      }
    } catch (error: any) {
      console.error('[KOMMO ADMIN] Error al sincronizar leads:', error)
      toast.error(`Error al sincronizar leads: ${error.message || 'Error desconocido'}`)
    } finally {
      setSyncingLeads(false)
    }
  }

  // Función para sincronización completa por lotes (evita timeout)
  const fullSyncLeads = async () => {
    if (!selectedCustomerId) {
      toast.error('Por favor selecciona una cuenta')
      return
    }

    const selectedCustomer = customers.find(c => c._id === selectedCustomerId)
    if (!selectedCustomer) {
      toast.error('Cliente no encontrado')
      return
    }

    if (syncingLeads) {
      toast.info('Ya hay una sincronización en progreso. Por favor espera...')
      return
    }

    setSyncingLeads(true)
    let totalProcessed = 0
    let page = 1
    let hasMore = true

    try {
      toast.info(`Sincronización completa para ${selectedCustomer.nombre}...`, {
        id: 'kommo-full-sync-admin',
        duration: 2000,
      })

      while (hasMore) {
        toast.info(`Sincronizando página ${page}...`, {
          id: 'kommo-full-sync-admin',
          duration: 2000,
        })

        const res = await fetch(getApiUrl(`/api/metrics/kommo/leads/sync-chunk?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}&page=${page}`), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

        totalProcessed += data.totalProcessed || 0
        hasMore = data.hasMore === true
        page++

        if (hasMore) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      toast.success(`Sincronización completada. ${totalProcessed} leads procesados.`, {
        id: 'kommo-full-sync-admin',
        duration: 5000,
      })

      loadCustomerData()
    } catch (error: any) {
      console.error('[KOMMO ADMIN] Error en sincronización completa:', error)
      toast.error('Error: ' + (error.message || 'Error desconocido'), {
        id: 'kommo-full-sync-admin',
      })
    } finally {
      setSyncingLeads(false)
    }
  }

  // Función para cargar datos cuando el usuario selecciona una cuenta
  const loadCustomerData = async () => {
    if (!selectedCustomerId) {
      toast.error('Por favor selecciona una cuenta')
      return
    }

    console.log('[KOMMO ADMIN] Iniciando carga de datos para customerId:', selectedCustomerId)

    // Limpiar datos anteriores
    setKommoStats(null)
    setLeads([])
    setAllLeads([])
    setUsers([])
    setPipelines([])
    setTags([])
    setFilteredStats(null)
    clearFilters()

    // Cargar datos de la cuenta seleccionada
    try {
      await Promise.all([
        fetchKommoStats(),
        fetchUsers(),
        fetchPipelines(),
        fetchTags(),
        fetchAllLeads()
      ])
      toast.success('Datos cargados correctamente')
      console.log('[KOMMO ADMIN] Datos cargados exitosamente')
    } catch (error) {
      console.error('[KOMMO ADMIN] Error al cargar datos de Kommo:', error)
      toast.error('Error al cargar los datos. Verifica las credenciales de Kommo.')
    }
  }

  // Cuando hay filtros, pedir leads y estadísticas al backend. Sin filtros, usar leads en memoria.
  useEffect(() => {
    const hasFilters = !!(dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all") || (selectedTagIds && selectedTagIds.length > 0));
    if (hasFilters && selectedCustomerId) {
      fetchLeads()
      setCurrentPage(1)
      return
    }
    if (allLeads.length > 0 && selectedCustomerId && kommoStats) {
      applyLocalFilters()
      setCurrentPage(1)
    }
  }, [dateFrom, dateTo, dateField, selectedUserId, selectedPipelineId, selectedTagIds, allLeads.length, selectedCustomerId, kommoStats])
  
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const fetchKommoStats = async (forceRefresh: boolean = true) => {
    // En el admin, por defecto cargar desde API (refresh=true)
    // Si forceRefresh=false, cargar desde BD
    if (!selectedCustomerId) {
      console.warn('[KOMMO ADMIN] fetchKommoStats: No hay customerId seleccionado')
      return
    }
    
    console.log('[KOMMO ADMIN] fetchKommoStats llamado para customerId:', selectedCustomerId, 'forceRefresh:', forceRefresh)
    setLoadingKommo(true)
    try {
      // Si forceRefresh=true, cargar desde API. Si false, cargar desde BD
      const url = forceRefresh
        ? `/api/metrics/kommo?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}&refresh=true`
        : `/api/metrics/kommo?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}`
      
      console.log('[KOMMO ADMIN] Obteniendo estadísticas desde API de Kommo para customerId:', selectedCustomerId)
      console.log('[KOMMO ADMIN] URL completa:', getApiUrl(url))
      const response = await fetch(getApiUrl(url), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      // Verificar si la respuesta tiene contenido antes de parsear JSON
      const contentType = response.headers.get('content-type')
      let data: any = {}
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
          console.log('[KOMMO ADMIN] Respuesta recibida:', { 
            status: response.status, 
            success: data.success, 
            hasData: !!data.data,
            error: data.error,
            dataKeys: data.data ? Object.keys(data.data) : null
          })
        } catch (jsonError) {
          console.error('[KOMMO ADMIN] Error al parsear JSON:', jsonError)
          const text = await response.text()
          console.error('[KOMMO ADMIN] Respuesta del servidor (texto):', text)
          throw new Error(`Error del servidor (${response.status}): ${text || 'Respuesta vacía'}`)
        }
      } else {
        const text = await response.text()
        console.error('[KOMMO ADMIN] Respuesta no es JSON:', text)
        throw new Error(`Error del servidor (${response.status}): ${text || 'Respuesta no válida'}`)
      }
      
      if (response.ok && data.success && data.data) {
        setKommoStats(data.data)
        console.log('[KOMMO ADMIN] Estadísticas cargadas correctamente:', data.data)
      } else {
        console.error('[KOMMO ADMIN] Error en la respuesta:', {
          status: response.status,
          ok: response.ok,
          success: data.success,
          hasData: !!data.data,
          error: data.error,
          fullData: data
        })
        
        // Si la respuesta es 200 pero no tiene la estructura esperada, puede ser un problema de formato
        if (response.ok && !data.success) {
          console.warn('[KOMMO ADMIN] Respuesta 200 pero sin success=true. Datos recibidos:', data)
          // Intentar usar los datos directamente si vienen en otro formato
          if (data.totals || data.distribution) {
            console.log('[KOMMO ADMIN] Datos parecen estar en formato directo, usando directamente')
            setKommoStats(data)
          } else {
            toast.error(data.error || 'Error: respuesta del servidor en formato inesperado')
            throw new Error(data.error || 'Formato de respuesta inesperado')
          }
        } else if (response.status === 401) {
          toast.error('Error de autenticación con Kommo. Verifica las credenciales de esta cuenta.')
          throw new Error('Error de autenticación')
        } else if (response.status === 404) {
          toast.error('Endpoint no encontrado. Verifica que el backend esté configurado correctamente.')
          throw new Error('Endpoint no encontrado')
        } else if (response.status === 500) {
          toast.error('Error interno del servidor. Verifica los logs del backend.')
          throw new Error('Error interno del servidor')
        } else {
          toast.error(data.error || `Error al obtener estadísticas (${response.status})`)
          throw new Error(data.error || `Error ${response.status}`)
        }
      }
    } catch (error: any) {
      console.error('[KOMMO ADMIN] Error al cargar estadísticas:', error)
      if (error.message?.includes('401') || error.message?.includes('autenticación')) {
        toast.error('Error de autenticación. Verifica las credenciales de Kommo para esta cuenta.')
      } else if (error.message?.includes('404')) {
        toast.error('Endpoint no encontrado. Verifica la configuración del backend.')
      } else if (error.message?.includes('500')) {
        toast.error('Error interno del servidor. Contacta al administrador.')
      } else {
        toast.error(error.message || 'Error al cargar estadísticas de Kommo')
      }
      throw error
    } finally {
      setLoadingKommo(false)
    }
  }

  const fetchUsers = async () => {
    if (!selectedCustomerId) return
    
    try {
      const response = await fetch(getApiUrl(`/api/metrics/kommo/users?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}`))
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('[KOMMO] Endpoint de usuarios no encontrado (404)')
          return
        }
        const text = await response.text()
        console.error('[KOMMO] Error al cargar usuarios:', response.status, text)
        return
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[KOMMO] Respuesta no es JSON para usuarios')
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.data?.users) {
        setUsers(data.data.users)
      } else {
        console.error('[KOMMO] Error en respuesta de usuarios:', data.error || 'Error desconocido')
      }
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.warn('[KOMMO] Endpoint de usuarios no disponible')
      } else {
        console.error('[KOMMO] Error al cargar usuarios:', error)
      }
    }
  }

  const fetchPipelines = async () => {
    if (!selectedCustomerId) return
    
    try {
      const response = await fetch(getApiUrl(`/api/metrics/kommo/pipelines?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}`))
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('[KOMMO] Endpoint de pipelines no encontrado (404)')
          return
        }
        const text = await response.text()
        console.error('[KOMMO] Error al cargar pipelines:', response.status, text)
        return
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[KOMMO] Respuesta no es JSON para pipelines')
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.data?.pipelines) {
        setPipelines(data.data.pipelines)
      } else {
        console.error('[KOMMO] Error en respuesta de pipelines:', data.error || 'Error desconocido')
      }
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.warn('[KOMMO] Endpoint de pipelines no disponible')
      } else {
        console.error('[KOMMO] Error al cargar pipelines:', error)
      }
    }
  }

  const fetchTags = async () => {
    if (!selectedCustomerId) return
    
    try {
      const response = await fetch(getApiUrl(`/api/metrics/kommo/tags?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}`))
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('[KOMMO] Endpoint de etiquetas no encontrado (404)')
          return
        }
        const text = await response.text()
        console.error('[KOMMO] Error al cargar etiquetas:', response.status, text)
        return
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[KOMMO] Respuesta no es JSON para etiquetas')
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.data?.tags) {
        setTags(data.data.tags)
      } else {
        console.error('[KOMMO] Error en respuesta de etiquetas:', data.error || 'Error desconocido')
      }
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.warn('[KOMMO] Endpoint de etiquetas no disponible')
      } else {
        console.error('[KOMMO] Error al cargar etiquetas:', error)
      }
    }
  }

  const fetchAllLeadsFromDb = async () => {
    if (!selectedCustomerId) return

    setLoadingAllLeads(true)
    
    try {
      const startTime = performance.now()
      // Cargar desde BD (sin refresh)
      const response = await fetch(getApiUrl(`/api/metrics/kommo/leads?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}`))
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('[KOMMO] Endpoint de leads no encontrado (404)')
          setAllLeads([])
          setLeads([])
          return
        }
        const text = await response.text()
        console.error('[KOMMO] Error al cargar leads desde BD:', response.status, text)
        toast.error(`Error al cargar leads desde BD (${response.status})`)
        setAllLeads([])
        setLeads([])
        return
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[KOMMO] Respuesta no es JSON para leads')
        const text = await response.text()
        console.error('[KOMMO] Respuesta del servidor:', text)
        toast.error('Error: respuesta del servidor no válida')
        setAllLeads([])
        setLeads([])
        return
      }
      
      const data = await response.json()
      const loadTime = ((performance.now() - startTime) / 1000).toFixed(2)
      
      if (data.success && data.data?.leads) {
        const leadsArray = Array.isArray(data.data.leads) ? data.data.leads : []
        const total = data.data.total || leadsArray.length
        
        console.log(`[KOMMO ADMIN] ${leadsArray.length} leads cargados desde BD en ${loadTime}s (Total: ${total})`)
        
        setAllLeads(leadsArray)
        
        if (!dateFrom && !dateTo && selectedUserId === "all" && selectedPipelineId === "all" && selectedTagIds.length === 0) {
          setLeads(leadsArray)
        } else {
          applyLocalFilters()
        }
      } else {
        if (response.status === 401) {
          toast.error('Error de autenticación. Verifica las credenciales de Kommo para esta cuenta.')
        } else {
          toast.error(data.error || 'Error al cargar leads desde BD')
        }
        setAllLeads([])
        setLeads([])
      }
    } catch (error: any) {
      console.error('Error al cargar leads desde BD:', error)
      toast.error(error.message || 'Error al cargar leads desde BD')
      setAllLeads([])
      setLeads([])
    } finally {
      setLoadingAllLeads(false)
    }
  }

  const fetchAllLeads = async () => {
    if (!selectedCustomerId) return

    // Mostrar skeleton mientras carga
    setLoadingAllLeads(true)
    
    try {
      const startTime = performance.now()
      // En el admin, SIEMPRE cargar desde la API de Kommo (refresh=true)
      // No especificamos limit para obtener TODOS los leads
      const response = await fetch(getApiUrl(`/api/metrics/kommo/leads?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}&refresh=true`))
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('[KOMMO] Endpoint de leads no encontrado (404)')
          setAllLeads([])
          setLeads([])
          return
        }
        const text = await response.text()
        console.error('[KOMMO] Error al cargar leads:', response.status, text)
        toast.error(`Error al cargar leads (${response.status})`)
        setAllLeads([])
        setLeads([])
        return
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[KOMMO] Respuesta no es JSON para leads')
        const text = await response.text()
        console.error('[KOMMO] Respuesta del servidor:', text)
        toast.error('Error: respuesta del servidor no válida')
        setAllLeads([])
        setLeads([])
        return
      }
      
      const data = await response.json()
      const loadTime = ((performance.now() - startTime) / 1000).toFixed(2)
      
      if (data.success && data.data?.leads) {
        const leadsArray = Array.isArray(data.data.leads) ? data.data.leads : []
        const total = data.data.total || leadsArray.length
        
        console.log(`[KOMMO ADMIN] ${leadsArray.length} leads cargados desde API en ${loadTime}s (Total: ${total})`)
        
        // Si hay más leads de los que se paginaron, necesitamos cargar todos
        // Por ahora, guardamos los que tenemos y aplicamos paginación local
        setAllLeads(leadsArray)
        
        // Si no hay filtros activos, mostrar todos los leads cargados inmediatamente
        if (!dateFrom && !dateTo && selectedUserId === "all" && selectedPipelineId === "all" && selectedTagIds.length === 0) {
          setLeads(leadsArray)
        } else {
          // Aplicar filtros locales
          applyLocalFilters()
        }
        
        // Si el total es mayor que los leads cargados, mostrar advertencia
        if (total > leadsArray.length) {
          console.log(`[KOMMO ADMIN] Nota: Se cargaron ${leadsArray.length} de ${total} leads (paginación aplicada)`)
        }
      } else {
        if (response.status === 401) {
          toast.error('Error de autenticación. Verifica las credenciales de Kommo para esta cuenta.')
        } else {
          toast.error(data.error || 'Error al cargar leads')
        }
        setAllLeads([])
        setLeads([])
      }
    } catch (error: any) {
      console.error('Error al cargar leads:', error)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.warn('[KOMMO] Endpoint de leads no disponible')
        toast.error('Endpoint de leads no disponible')
      } else {
        toast.error(error.message || 'Error al cargar leads')
      }
      setAllLeads([])
      setLeads([])
    } finally {
      setLoadingAllLeads(false)
    }

    // Actualizar silenciosamente en segundo plano si es necesario (sin bloquear UI)
    setTimeout(async () => {
      try {
        const checkResponse = await fetch(getApiUrl(`/api/metrics/kommo?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}`))
        const checkData = await checkResponse.json()
        
        if (checkData.cached && checkData.lastUpdated) {
          const lastUpdate = new Date(checkData.lastUpdated)
          const now = new Date()
          const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)
          
          // Si tiene más de 5 minutos, actualizar silenciosamente
          if (diffMinutes > 5) {
            // Forzar actualización en segundo plano (no bloquea la UI)
            fetch(getApiUrl(`/api/metrics/kommo/leads?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}&refresh=true`)).catch(() => {})
            
            // Recargar los leads actualizados después de un momento
            setTimeout(async () => {
              try {
                const updateResponse = await fetch(getApiUrl(`/api/metrics/kommo/leads?customerId=${selectedCustomerId}&accountIndex=${selectedKommoAccountIndex}`))
                
                if (!updateResponse.ok) {
                  console.warn('[KOMMO] No se pudo actualizar leads en segundo plano')
                  return
                }
                
                const contentType = updateResponse.headers.get('content-type')
                if (!contentType || !contentType.includes('application/json')) {
                  console.warn('[KOMMO] Respuesta de actualización no es JSON')
                  return
                }
                
                const updateData = await updateResponse.json()
                
                if (updateData.success && updateData.data?.leads) {
                  const updatedLeads = Array.isArray(updateData.data.leads) ? updateData.data.leads : []
                  
                  // Solo actualizar si hay cambios
                  if (updatedLeads.length !== allLeads.length || 
                      JSON.stringify(updatedLeads.map((l: any) => l.id).sort()) !== JSON.stringify(allLeads.map((l: any) => l.id).sort())) {
                    setAllLeads(updatedLeads)
                    
                    // Aplicar filtros si están activos
                    if (!dateFrom && !dateTo && selectedUserId === "all" && selectedPipelineId === "all" && selectedTagIds.length === 0) {
                      setLeads(updatedLeads)
                    } else {
                      applyLocalFilters()
                    }
                  }
                }
              } catch (error) {
                // Silenciar errores
              }
            }, 2000)
          }
        }
      } catch (error) {
        // Silenciar errores
      }
    }, 1000)
  }

  const applyLocalFilters = () => {
    if (allLeads.length === 0) return

    let filtered = [...allLeads]

    if (dateFrom) {
      const fromTimestamp = Math.floor(new Date(dateFrom).getTime() / 1000)
      if (dateField === 'closed_at') {
        filtered = filtered.filter(lead => lead.closed_at && lead.closed_at >= fromTimestamp)
      } else {
        filtered = filtered.filter(lead => lead.created_at >= fromTimestamp)
      }
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      const toTimestamp = Math.floor(toDate.getTime() / 1000)
      if (dateField === 'closed_at') {
        filtered = filtered.filter(lead => lead.closed_at && lead.closed_at <= toTimestamp)
      } else {
        filtered = filtered.filter(lead => lead.created_at <= toTimestamp)
      }
    }

    if (selectedUserId && selectedUserId !== "all") {
      filtered = filtered.filter(lead => lead.responsible_user_id === parseInt(selectedUserId))
    }

    if (selectedPipelineId && selectedPipelineId !== "all") {
      filtered = filtered.filter(lead => lead.pipeline_id === parseInt(selectedPipelineId))
    }

    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(lead => {
        const leadTagIds = lead._embedded?.tags?.map(tag => tag.id) || []
        return selectedTagIds.some(tagId => leadTagIds.includes(tagId))
      })
    }

    setLeads(filtered)
    
    if (filtered.length > 0) {
      calculateFilteredStats(filtered)
    } else {
      setFilteredStats(null)
    }
  }

  const calculateFilteredStats = async (filteredLeads: KommoLead[]) => {
    try {
      if (pipelines.length === 0 || !selectedCustomerId) {
        const params = new URLSearchParams()
        params.append('customerId', selectedCustomerId)
        params.append('accountIndex', String(selectedKommoAccountIndex))
        if (dateField === 'closed_at') {
          if (dateFrom) params.append('closedDateFrom', dateFrom)
          if (dateTo) params.append('closedDateTo', dateTo)
        } else {
          if (dateFrom) params.append('dateFrom', dateFrom)
          if (dateTo) params.append('dateTo', dateTo)
        }
        params.append('dateField', dateField)
        if (selectedUserId && selectedUserId !== "all") params.append('responsibleUserId', selectedUserId)
        if (selectedPipelineId && selectedPipelineId !== "all") params.append('pipelineId', selectedPipelineId)
        if (selectedTagIds.length > 0) params.append('tagIds', selectedTagIds.join(','))

        const response = await fetch(getApiUrl(`/api/metrics/kommo/leads?${params.toString()}`))
        const data = await response.json()
        
        if (response.ok && data.success && data.data?.stats && data.data.stats.totals) {
          setFilteredStats(data.data.stats)
        } else {
          // Si no hay stats válidos, establecer un objeto por defecto
          const activeLeads = filteredLeads.filter(lead => !(lead as any).is_deleted)
          setFilteredStats({
            totals: {
              total: activeLeads.length,
              won: 0,
              lost: 0,
              active: activeLeads.length,
            },
            distribution: [],
            lastUpdated: new Date().toISOString(),
          })
        }
        return
      }

      const activeLeads = filteredLeads.filter(lead => !(lead as any).is_deleted)
      
      const stats: KommoStats = {
        totals: {
          total: activeLeads.length,
          won: 0,
          lost: 0,
          active: activeLeads.length,
        },
        distribution: [],
        lastUpdated: new Date().toISOString(),
      }

      // Establecer stats básicos inmediatamente
      setFilteredStats(stats)

      if (filteredLeads.length > 0 && (dateFrom || dateTo || selectedUserId !== "all" || selectedPipelineId !== "all" || selectedTagIds.length > 0)) {
        if (selectedCustomerId) {
          const params = new URLSearchParams()
          params.append('customerId', selectedCustomerId)
          params.append('accountIndex', String(selectedKommoAccountIndex))
          params.append('dateField', dateField)
          if (dateField === 'closed_at') {
            if (dateFrom) params.append('closedDateFrom', dateFrom)
            if (dateTo) params.append('closedDateTo', dateTo)
          } else {
            if (dateFrom) params.append('dateFrom', dateFrom)
            if (dateTo) params.append('dateTo', dateTo)
          }
          if (selectedUserId && selectedUserId !== "all") params.append('responsibleUserId', selectedUserId)
          if (selectedPipelineId && selectedPipelineId !== "all") params.append('pipelineId', selectedPipelineId)
          if (selectedTagIds.length > 0) params.append('tagIds', selectedTagIds.join(','))

          fetch(getApiUrl(`/api/metrics/kommo/leads?${params.toString()}`))
            .then(response => response.json())
            .then(data => {
              if (data.success && data.data?.stats && data.data.stats.totals) {
                setFilteredStats(data.data.stats)
              } else {
                // Si no hay stats válidos, mantener el objeto básico ya establecido
                console.warn('No se recibieron stats válidos del backend')
              }
            })
            .catch(error => {
              console.error('Error al calcular estadísticas filtradas:', error)
              // En caso de error, mantener el objeto básico ya establecido
            })
        }
      }
    } catch (error) {
      console.error('Error al calcular estadísticas filtradas:', error)
    }
  }

  const fetchLeads = async () => {
    if (!selectedCustomerId) return

    setLoadingLeads(true)
    try {
      const params = new URLSearchParams()
      params.append('customerId', selectedCustomerId)
      params.append('accountIndex', String(selectedKommoAccountIndex))
      params.append('page', '1')
      params.append('limit', '50')
      if (dateField === 'closed_at') {
        if (dateFrom) params.append('closedDateFrom', dateFrom)
        if (dateTo) params.append('closedDateTo', dateTo)
      } else {
        if (dateFrom) params.append('dateFrom', dateFrom)
        if (dateTo) params.append('dateTo', dateTo)
      }
      params.append('dateField', dateField)
      if (selectedUserId && selectedUserId !== "all") params.append('responsibleUserId', selectedUserId)
      if (selectedPipelineId && selectedPipelineId !== "all") params.append('pipelineId', selectedPipelineId)
      if (selectedTagIds.length > 0) params.append('tagIds', selectedTagIds.join(','))

      const response = await fetch(getApiUrl(`/api/metrics/kommo/leads?${params.toString()}`), { credentials: 'include' })
      const data = await response.json()
      
      if (response.ok && data.success && data.data?.leads) {
        setLeads(data.data.leads)
        if (data.data?.stats) {
          setFilteredStats(data.data.stats)
        } else {
          setFilteredStats(null)
        }
      } else {
        console.error('Error al obtener leads:', data.error || 'Error desconocido')
        setLeads([])
        setFilteredStats(null)
      }
    } catch (error) {
      console.error('Error al cargar leads de Kommo:', error)
      setLeads([])
      setFilteredStats(null)
    } finally {
      setLoadingLeads(false)
    }
  }

  const clearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setDateField('created_at')
    setSelectedUserId("all")
    setSelectedPipelineId("all")
    setSelectedTagIds([])
    if (allLeads.length > 0) {
      setLeads(allLeads)
    } else {
      setLeads([])
    }
    setFilteredStats(null)
    setSearchTerm("")
    setCurrentPage(1)
  }
  
  const filteredLeads = leads.filter((lead) => {
    if (!searchTerm.trim()) return true
    
    const searchLower = searchTerm.toLowerCase().trim()
    const leadId = lead.id.toString()
    const leadName = (lead.name || '').toLowerCase()
    
    return leadId.includes(searchLower) || leadName.includes(searchLower)
  })
  
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage)
  const startIndex = (currentPage - 1) * leadsPerPage
  const endIndex = startIndex + leadsPerPage
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex)
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }
  
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  const pieData = kommoStats && kommoStats.totals ? [
    { name: "Ganados", value: kommoStats.totals.won || 0, color: "#22c55e" },
    { name: "Perdidos", value: kommoStats.totals.lost || 0, color: "#ef4444" },
    { name: "Activos", value: kommoStats.totals.active || 0, color: "#3b82f6" },
  ] : []

  const winRate = kommoStats && kommoStats.totals && kommoStats.totals.total > 0
    ? ((kommoStats.totals.won || 0) / kommoStats.totals.total * 100).toFixed(1)
    : "0.0"

  const lossRate = kommoStats && kommoStats.totals && kommoStats.totals.total > 0
    ? ((kommoStats.totals.lost || 0) / kommoStats.totals.total * 100).toFixed(1)
    : "0.0"

  const handleExportToExcel = async () => {
    if (!kommoStats || !selectedCustomerId) {
      toast.error('No hay datos disponibles para exportar')
      return
    }

    const leadsToExport = leads.length > 0 ? leads : allLeads
    
    if (leadsToExport.length === 0) {
      toast.error('No hay leads disponibles para exportar')
      return
    }

    setExportingExcel(true)
    const loadingToast = toast.loading('Generando reporte Excel...', {
      description: 'Esto puede tardar unos momentos'
    })

    try {
      const statsToExport = (filteredStats && (dateFrom || dateTo || selectedUserId !== "all" || selectedPipelineId !== "all" || selectedTagIds.length > 0))
        ? filteredStats
        : kommoStats

      let filename = 'reporte-kommo'
      if (dateFrom || dateTo || selectedUserId !== "all" || selectedPipelineId !== "all" || selectedTagIds.length > 0) {
        filename = 'reporte-kommo-filtrado'
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      const result = exportKommoToExcel(
        leadsToExport,
        statsToExport,
        users,
        pipelines,
        filename
      )

      toast.dismiss(loadingToast)
      
      if (result.success && result.filename) {
        toast.success('¡Exportación exitosa!', {
          description: `Se exportaron ${leadsToExport.length} leads a ${result.filename}`
        })
      } else {
        toast.error('Error al exportar', {
          description: result.error || 'Error desconocido'
        })
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Error al exportar los datos', {
        description: 'Por favor, intenta nuevamente'
      })
      console.error('Error al exportar:', error)
    } finally {
      setExportingExcel(false)
    }
  }

  const selectedCustomer = customers.find(c => c._id === selectedCustomerId)

  // Debug: Log del estado actual (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('[KOMMO DEBUG] Estado actual:', {
      customersCount: customers.length,
      selectedCustomerId,
      loadingCustomers,
      kommoStats: !!kommoStats,
      hasSelectedCustomer: !!selectedCustomer
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header con selector de cuenta */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Kommo CRM - Admin</h1>
              <p className="text-muted-foreground mt-1">
                Visualiza estadísticas de Kommo por cuenta de cliente
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {kommoStats && (
            <Badge variant="outline" className="text-sm">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(kommoStats.lastUpdated).toLocaleString('es-AR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Badge>
          )}
          <Button 
            onClick={handleExportToExcel}
            disabled={exportingExcel || !kommoStats || (leads.length === 0 && allLeads.length === 0) || !selectedCustomerId}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <FileDown className={`h-4 w-4 ${exportingExcel ? 'animate-pulse' : ''}`} />
            {exportingExcel ? 'Exportando...' : 'Exportar Excel'}
          </Button>
          <Button 
            onClick={async () => {
              if (!selectedCustomerId) {
                toast.error('Por favor selecciona una cuenta primero')
                return
              }
              await loadCustomerData()
            }} 
            disabled={loadingKommo || loadingAllLeads || !selectedCustomerId}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loadingKommo || loadingAllLeads ? 'animate-spin' : ''}`} />
            {loadingKommo || loadingAllLeads ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Selector de cuenta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seleccionar Cuenta de Kommo
          </CardTitle>
          <CardDescription>
            Elige la cuenta de Kommo de la cual deseas ver las estadísticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-select">Cliente</Label>
              {loadingCustomers ? (
                <div className="flex items-center gap-2 p-3 border rounded-md">
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cargando clientes...</span>
                </div>
              ) : (
                <Select
                  value={selectedCustomerId}
                  onValueChange={(value) => {
                    console.log('[KOMMO ADMIN] Cliente seleccionado:', value)
                    setSelectedCustomerId(value)
                    // Limpiar todos los datos al cambiar de cuenta
                    setKommoStats(null)
                    setLeads([])
                    setAllLeads([])
                    setUsers([])
                    setPipelines([])
                    setTags([])
                    setFilteredStats(null)
                    clearFilters()
                    console.log('[KOMMO ADMIN] Datos limpiados. Esperando click en "Cargar Datos de Kommo"')
                  }}
                >
                  <SelectTrigger id="customer-select">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectItem value="no-customers" disabled>
                        No hay clientes con credenciales de Kommo
                      </SelectItem>
                    ) : (
                      customers.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.nombre} {customer.apellido} ({customer.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {!loadingCustomers && customers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  No se encontraron clientes con credenciales de Kommo configuradas. 
                  Ve a <a href="/admin/clients" className="text-primary underline">Gestión de Clientes</a> para configurar las credenciales.
                </p>
              )}
            </div>
            {selectedCustomer && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Cliente: <strong>{selectedCustomer.nombre} {selectedCustomer.apellido}</strong>
                </p>
                {kommoAccountsCount > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="kommo-account-select">Cuenta Kommo</Label>
                    <Select
                      value={String(selectedKommoAccountIndex)}
                      onValueChange={(value) => {
                        const idx = Number(value)
                        setSelectedKommoAccountIndex(idx)
                        setKommoStats(null)
                        setLeads([])
                        setAllLeads([])
                        setUsers([])
                        setPipelines([])
                        setFilteredStats(null)
                        clearFilters()
                      }}
                    >
                      <SelectTrigger id="kommo-account-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: kommoAccountsCount }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            Kommo {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button 
                      onClick={loadCustomerData}
                      disabled={loadingKommo || loadingAllLeads || syncingLeads}
                      className="flex-1"
                    >
                      {loadingKommo || loadingAllLeads ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Cargando datos...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Cargar desde API
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={async () => {
                        // Cargar desde BD (sin refresh)
                        if (!selectedCustomerId) {
                          toast.error('Por favor selecciona una cuenta')
                          return
                        }
                        setKommoStats(null)
                        setLeads([])
                        setAllLeads([])
                        try {
                          // Cargar desde BD (sin refresh)
                          await Promise.all([
                            fetchKommoStats(false), // false = no refresh, cargar desde BD
                            fetchUsers(),
                            fetchPipelines(),
                            fetchTags(),
                            fetchAllLeadsFromDb()
                          ])
                          toast.success('Datos cargados desde la base de datos')
                        } catch (error) {
                          console.error('[KOMMO ADMIN] Error al cargar desde BD:', error)
                          toast.error('Error al cargar los datos desde la BD')
                        }
                      }}
                      disabled={loadingKommo || loadingAllLeads || syncingLeads}
                      variant="outline"
                      className="flex-1"
                    >
                      {loadingKommo || loadingAllLeads ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Cargar desde BD
                        </>
                      )}
                    </Button>
                  </div>
                  <Button 
                    onClick={syncLeadsToDatabase}
                    disabled={loadingKommo || loadingAllLeads || syncingLeads}
                    variant="outline"
                    className="w-full"
                  >
                    {syncingLeads ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sincronizando leads...
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4 mr-2" />
                        Sincronizar Leads a Base de Datos
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={fullSyncLeads}
                    disabled={loadingKommo || loadingAllLeads || syncingLeads}
                    variant="default"
                    className="w-full"
                    title="Sincronización completa inicial - Trae todos los leads con todos sus campos (etiquetas, contactos, empresas, etc.)"
                  >
                    {syncingLeads ? (
                      <>
                        <Database className="h-4 w-4 mr-2 animate-pulse" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Sincronización Completa
                      </>
                    )}
                  </Button>
                </div>
                {!kommoStats && selectedCustomerId && (
                  <p className="text-xs text-muted-foreground text-center">
                    Haz clic en "Cargar Datos de Kommo" para ver las estadísticas de esta cuenta.
                    <br />
                    Usa "Sincronizar Leads" para guardar todos los leads en MongoDB con el customerId correcto.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedCustomerId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Selecciona una cuenta</h3>
            <p className="text-sm text-muted-foreground">
              Por favor, selecciona un cliente con credenciales de Kommo y luego haz clic en "Cargar Datos de Kommo"
            </p>
          </CardContent>
        </Card>
      ) : !kommoStats ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Listo para cargar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cuenta seleccionada: <strong>{selectedCustomer?.nombre} {selectedCustomer?.apellido}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Haz clic en "Cargar Datos de Kommo" arriba para ver las estadísticas de esta cuenta
            </p>
          </CardContent>
        </Card>
      ) : kommoStats ? (
        <>
          {/* Estadísticas Generales */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Estadísticas Generales
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{(kommoStats.totals?.total || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todos los leads en el sistema
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Ganados</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {(kommoStats.totals?.won || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress 
                      value={parseFloat(winRate)} 
                      className="h-2 flex-1"
                    />
                    <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
                      {winRate}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Perdidos</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {(kommoStats.totals?.lost || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress 
                      value={parseFloat(lossRate)} 
                      className="h-2 flex-1"
                    />
                    <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
                      {lossRate}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Activos</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {(kommoStats.totals?.active || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    En proceso de venta
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Gráficos y Análisis */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Leads</CardTitle>
                <CardDescription>
                  Proporción de leads por estado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
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
                <CardTitle>Resumen de Rendimiento</CardTitle>
                <CardDescription>
                  Métricas clave del embudo de ventas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tasa de Conversión</span>
                    <span className="text-sm font-bold text-green-600">{winRate}%</span>
                  </div>
                  <Progress value={parseFloat(winRate)} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tasa de Pérdida</span>
                    <span className="text-sm font-bold text-red-600">{lossRate}%</span>
                  </div>
                  <Progress value={parseFloat(lossRate)} className="h-2" />
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Leads en Proceso</span>
                    <span className="text-sm font-semibold">
                      {(kommoStats.totals?.active || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total de Embudos</span>
                    <span className="text-sm font-semibold">
                      {kommoStats.distribution?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Promedio por Embudo</span>
                    <span className="text-sm font-semibold">
                      {kommoStats.distribution && kommoStats.distribution.length > 0 && kommoStats.totals
                        ? Math.round((kommoStats.totals.total || 0) / kommoStats.distribution.length)
                        : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Análisis por Embudo */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Análisis por Embudo de Venta</CardTitle>
                  <CardDescription className="mt-1">
                    {filteredStats && (dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all") || selectedTagIds.length > 0)
                      ? `Distribución detallada de leads en cada embudo (filtrados${dateField === 'closed_at' ? ' por fecha de cierre' : ' por fecha de creación'})`
                      : "Distribución detallada de leads en cada embudo"}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  {(filteredStats && (dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all") || selectedTagIds.length > 0))
                    ? (filteredStats.distribution?.length || 0)
                    : (kommoStats.distribution?.length || 0)} embudos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="table" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="table">Vista Tabla</TabsTrigger>
                  <TabsTrigger value="detailed">Vista Detallada</TabsTrigger>
                </TabsList>
                
                <TabsContent value="table" className="mt-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Embudo</TableHead>
                          <TableHead className="text-right">Total Leads</TableHead>
                          <TableHead className="text-right">Ganados</TableHead>
                          <TableHead className="text-right">Perdidos</TableHead>
                          <TableHead className="text-right">Activos</TableHead>
                          <TableHead className="text-right">Tasa Éxito</TableHead>
                        </TableRow>
                      </TableHeader>
                        <TableBody>
                          {((filteredStats && (dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all") || selectedTagIds.length > 0))
                            ? filteredStats.distribution
                            : kommoStats.distribution)?.filter(pipeline => pipeline && pipeline.stages && Array.isArray(pipeline.stages)).map((pipeline) => {
                            const won = (pipeline.stages || [])
                              .filter((s) => s.type === 'won')
                              .reduce((sum, s) => sum + s.count, 0)
                            const lost = (pipeline.stages || [])
                              .filter((s) => s.type === 'lost')
                              .reduce((sum, s) => sum + s.count, 0)
                            const active = (pipeline.stages || [])
                              .filter((s) => s.type === 'open')
                              .reduce((sum, s) => sum + s.count, 0)
                            const successRate = pipeline.total > 0
                              ? ((won / pipeline.total) * 100).toFixed(1)
                              : "0.0"

                            return (
                              <TableRow key={pipeline.pipelineId}>
                                <TableCell className="font-medium">
                                  {pipeline.pipelineName}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {pipeline.total.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-green-600 font-medium">
                                    {won.toLocaleString()}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-red-600 font-medium">
                                    {lost.toLocaleString()}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-blue-600 font-medium">
                                    {active.toLocaleString()}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge
                                    variant={parseFloat(successRate) >= 50 ? "default" : "secondary"}
                                    className="font-medium"
                                  >
                                    {successRate}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="detailed" className="mt-6 space-y-6">
                  {((filteredStats && (dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all") || selectedTagIds.length > 0))
                    ? filteredStats.distribution
                    : kommoStats.distribution)?.filter(pipeline => pipeline && pipeline.stages && Array.isArray(pipeline.stages)).map((pipeline) => {
                      const sortedStages = [...(pipeline.stages || [])].sort((a, b) => {
                        const order = { open: 0, won: 1, lost: 2 }
                        return order[a.type] - order[b.type]
                      })

                      const won = (pipeline.stages || [])
                        .filter((s) => s.type === 'won')
                        .reduce((sum, s) => sum + s.count, 0)
                      const lost = (pipeline.stages || [])
                        .filter((s) => s.type === 'lost')
                        .reduce((sum, s) => sum + s.count, 0)
                      const active = (pipeline.stages || [])
                        .filter((s) => s.type === 'open')
                        .reduce((sum, s) => sum + s.count, 0)

                      const chartData = sortedStages.map((stage) => ({
                        name: stage.statusName.length > 20 
                          ? stage.statusName.substring(0, 20) + '...' 
                          : stage.statusName,
                        fullName: stage.statusName,
                        value: stage.count,
                        type: stage.type,
                      }))

                      return (
                        <Card key={pipeline.pipelineId} className="border-2">
                          <CardHeader className="bg-muted/50 border-b">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <BarChart3 className="h-5 w-5 text-primary" />
                                  {pipeline.pipelineName}
                                </CardTitle>
                                <CardDescription className="mt-2">
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <span>
                                      <span className="font-semibold text-foreground">{pipeline.total}</span> leads totales
                                    </span>
                                    <span>
                                      <span className="font-semibold text-green-600">{won}</span> ganados
                                    </span>
                                    <span>
                                      <span className="font-semibold text-red-600">{lost}</span> perdidos
                                    </span>
                                    <span>
                                      <span className="font-semibold text-blue-600">{active}</span> activos
                                    </span>
                                  </div>
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="grid gap-6 lg:grid-cols-2">
                              <div>
                                <h4 className="text-sm font-semibold mb-4">Distribución por Etapa</h4>
                                <ChartContainer config={chartConfig} className="h-[250px]">
                                  <BarChart data={chartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis
                                      dataKey="name"
                                      type="category"
                                      width={120}
                                      tick={{ fontSize: 11 }}
                                    />
                                    <ChartTooltip
                                      content={<ChartTooltipContent />}
                                      formatter={(value: number, name: string, props: any) => [
                                        `${value} leads`,
                                        props.payload.fullName,
                                      ]}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                      {chartData.map((entry, index) => (
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={
                                            entry.type === 'won'
                                              ? '#22c55e'
                                              : entry.type === 'lost'
                                              ? '#ef4444'
                                              : '#3b82f6'
                                          }
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ChartContainer>
                              </div>

                              <div>
                                <h4 className="text-sm font-semibold mb-4">Detalle de Etapas</h4>
                                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                                  {sortedStages.map((stage) => {
                                    const percentage = pipeline.total > 0
                                      ? ((stage.count / pipeline.total) * 100).toFixed(1)
                                      : '0'

                                    return (
                                      <div
                                        key={stage.statusId}
                                        className={`
                                          border rounded-lg p-3 transition-all
                                          ${
                                            stage.type === 'won'
                                              ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
                                              : stage.type === 'lost'
                                              ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                                              : 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20'
                                          }
                                        `}
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">{stage.statusName}</p>
                                            <Badge
                                              variant={
                                                stage.type === 'won'
                                                  ? 'default'
                                                  : stage.type === 'lost'
                                                  ? 'destructive'
                                                  : 'secondary'
                                              }
                                              className="text-xs mt-1"
                                            >
                                              {stage.type === 'won'
                                                ? 'Ganado'
                                                : stage.type === 'lost'
                                                ? 'Perdido'
                                                : 'Abierto'}
                                            </Badge>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-lg font-bold">{stage.count.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">{percentage}%</p>
                                          </div>
                                        </div>
                                        <Progress
                                          value={parseFloat(percentage)}
                                          className="h-1.5"
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Estadísticas Detalladas */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Filter className="h-6 w-6 text-primary" />
              Estadísticas Detalladas
            </h2>
            
            {/* Filtros */}
            <Card className="mb-6 border shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg mb-2">
                      <Filter className="h-5 w-5 text-primary" />
                      Filtros Avanzados
                    </CardTitle>
                    <CardDescription>
                      Filtra los leads por fecha, usuario responsable, embudo y etiquetas para ver estadísticas detalladas
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    disabled={!dateFrom && !dateTo && selectedUserId === "all" && selectedPipelineId === "all" && selectedTagIds.length === 0}
                    className="gap-2 shrink-0"
                  >
                    <XCircle className="h-4 w-4" />
                    Limpiar Filtros
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <div className="space-y-2">
                    <Label htmlFor="dateField" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Tipo de Fecha
                    </Label>
                    <Select
                      value={dateField}
                      onValueChange={(value: 'created_at' | 'closed_at') => setDateField(value)}
                    >
                      <SelectTrigger id="dateField" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Fecha de Creación</SelectItem>
                        <SelectItem value="closed_at">Fecha de Cierre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFrom" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {dateField === 'closed_at' ? 'Cierre Desde' : 'Fecha Desde'}
                    </Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateTo" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {dateField === 'closed_at' ? 'Cierre Hasta' : 'Fecha Hasta'}
                    </Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={dateFrom || undefined}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsibleUser" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Usuario Responsable
                    </Label>
                    <Select
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                    >
                      <SelectTrigger id="responsibleUser" className="h-10">
                        <SelectValue placeholder="Todos los usuarios" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los usuarios</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} {user.email ? `(${user.email})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pipeline" className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      Embudo
                    </Label>
                    <Select
                      value={selectedPipelineId}
                      onValueChange={setSelectedPipelineId}
                    >
                      <SelectTrigger id="pipeline" className="h-10">
                        <SelectValue placeholder="Todos los embudos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los embudos</SelectItem>
                        {pipelines.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                            {pipeline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Etiquetas
                    </Label>
                    <Select
                      value={tagSelectValue}
                      onValueChange={(value) => {
                        if (value && value !== "all" && value !== "no-tags") {
                          const tagId = parseInt(value)
                          if (!selectedTagIds.includes(tagId)) {
                            setSelectedTagIds([...selectedTagIds, tagId])
                          }
                        }
                        // Resetear el select después de seleccionar
                        setTagSelectValue(undefined)
                      }}
                    >
                      <SelectTrigger id="tags" className="h-10">
                        <SelectValue placeholder="Seleccionar etiqueta" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags.length === 0 ? (
                          <SelectItem value="no-tags" disabled>
                            No hay etiquetas disponibles
                          </SelectItem>
                        ) : (
                          tags
                            .filter(tag => !selectedTagIds.includes(tag.id))
                            .map((tag) => (
                              <SelectItem key={tag.id} value={tag.id.toString()}>
                                {tag.name}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedTagIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedTagIds.map((tagId) => {
                          const tag = tags.find(t => t.id === tagId)
                          return tag ? (
                            <Badge
                              key={tagId}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {tag.name}
                              <button
                                onClick={() => {
                                  setSelectedTagIds(selectedTagIds.filter(id => id !== tagId))
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas Filtradas */}
          {(dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all") || selectedTagIds.length > 0) && (
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg mb-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Estadísticas de Leads Filtrados
                  </CardTitle>
                  <CardDescription>
                    Estadísticas basadas en los filtros aplicados
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLeads ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-9 w-20 mb-2" />
                            <Skeleton className="h-3 w-32" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : filteredStats && filteredStats.totals ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                      <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Filtrado</CardTitle>
                          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{(filteredStats.totals?.total || 0).toLocaleString()}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Leads que coinciden con los filtros
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Ganados</CardTitle>
                          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-green-600">
                            {(filteredStats.totals?.won || 0).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Progress 
                              value={(filteredStats.totals?.total || 0) > 0 ? ((filteredStats.totals?.won || 0) / (filteredStats.totals?.total || 1)) * 100 : 0} 
                              className="h-2 flex-1"
                            />
                            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
                              {(filteredStats.totals?.total || 0) > 0 ? (((filteredStats.totals?.won || 0) / (filteredStats.totals?.total || 1)) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Perdidos</CardTitle>
                          <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-red-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-red-600">
                            {(filteredStats.totals?.lost || 0).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Progress 
                              value={(filteredStats.totals?.total || 0) > 0 ? ((filteredStats.totals?.lost || 0) / (filteredStats.totals?.total || 1)) * 100 : 0} 
                              className="h-2 flex-1"
                            />
                            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
                              {(filteredStats.totals?.total || 0) > 0 ? (((filteredStats.totals?.lost || 0) / (filteredStats.totals?.total || 1)) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Activos</CardTitle>
                          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-purple-600" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-purple-600">
                            {(filteredStats.totals?.active || 0).toLocaleString()}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            En proceso de venta
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {filteredStats.distribution && filteredStats.distribution.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Distribución por Etapa</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {filteredStats.distribution.filter(pipeline => pipeline && pipeline.stages && Array.isArray(pipeline.stages)).map((pipeline) => {
                            const sortedStages = [...(pipeline.stages || [])].sort((a, b) => {
                              const order = { open: 0, won: 1, lost: 2 }
                              return order[a.type] - order[b.type]
                            })

                            const won = (pipeline.stages || [])
                              .filter((s) => s.type === 'won')
                              .reduce((sum, s) => sum + s.count, 0)
                            const lost = (pipeline.stages || [])
                              .filter((s) => s.type === 'lost')
                              .reduce((sum, s) => sum + s.count, 0)
                            const active = (pipeline.stages || [])
                              .filter((s) => s.type === 'open')
                              .reduce((sum, s) => sum + s.count, 0)

                            return (
                              <Card key={pipeline.pipelineId} className="border">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">{pipeline.pipelineName}</CardTitle>
                                  <CardDescription className="text-xs">
                                    {pipeline.total} leads • {won} ganados • {lost} perdidos • {active} activos
                                  </CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {sortedStages.map((stage) => {
                                      const percentage = pipeline.total > 0
                                        ? ((stage.count / pipeline.total) * 100).toFixed(1)
                                        : '0'

                                      return (
                                        <div
                                          key={stage.statusId}
                                          className={`
                                            border rounded-lg p-2 text-sm
                                            ${
                                              stage.type === 'won'
                                                ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
                                                : stage.type === 'lost'
                                                ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                                                : 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20'
                                            }
                                          `}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="flex-1">
                                              <p className="font-medium text-xs">{stage.statusName}</p>
                                              <Badge
                                                variant={
                                                  stage.type === 'won'
                                                    ? 'default'
                                                    : stage.type === 'lost'
                                                    ? 'destructive'
                                                    : 'secondary'
                                                }
                                                className="text-xs mt-1"
                                              >
                                                {stage.type === 'won'
                                                  ? 'Ganado'
                                                  : stage.type === 'lost'
                                                  ? 'Perdido'
                                                  : 'Abierto'}
                                              </Badge>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-base font-bold">{stage.count.toLocaleString()}</p>
                                              <p className="text-xs text-muted-foreground">{percentage}%</p>
                                            </div>
                                          </div>
                                          <Progress
                                            value={parseFloat(percentage)}
                                            className="h-1"
                                          />
                                        </div>
                                      )
                                    })}
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Leads */}
          <Card className="shadow-sm">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  Leads
                </CardTitle>
                <CardDescription>
                  Lista de leads según los filtros aplicados
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {/* Skeleton loader mientras se cargan los leads */}
              {loadingAllLeads && allLeads.length === 0 && (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <div className="p-4 border-b">
                      <div className="grid grid-cols-7 gap-4">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <Skeleton key={i} className="h-4 w-20" />
                        ))}
                      </div>
                    </div>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="p-4 border-b last:border-b-0">
                        <div className="grid grid-cols-7 gap-4">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <Skeleton key={j} className="h-4 w-full" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {leads.length > 0 && (
                <div className="mb-6">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar por ID o Nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                  {searchTerm && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} encontrado{filteredLeads.length !== 1 ? 's' : ''} de {leads.length} total{leads.length !== 1 ? 'es' : ''}
                    </p>
                  )}
                </div>
              )}

              {loadingLeads ? (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <div className="p-4 border-b">
                      <div className="grid grid-cols-7 gap-4">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <Skeleton key={i} className="h-4 w-20" />
                        ))}
                      </div>
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-4 border-b last:border-b-0">
                        <div className="grid grid-cols-7 gap-4">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <Skeleton key={j} className="h-4 w-full" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : leads.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">ID</TableHead>
                          <TableHead className="font-semibold">Nombre</TableHead>
                          <TableHead className="text-right font-semibold">Valor</TableHead>
                          <TableHead className="font-semibold">Usuario Responsable</TableHead>
                          <TableHead className="font-semibold">Fecha Creación</TableHead>
                          <TableHead className="font-semibold">Fecha Cierre</TableHead>
                          <TableHead className="font-semibold">Fuente</TableHead>
                          <TableHead className="font-semibold">Etiquetas</TableHead>
                          <TableHead className="font-semibold">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLeads.length > 0 ? (
                          paginatedLeads.map((lead) => {
                            const responsibleUser = users.find(u => u.id === lead.responsible_user_id)
                            const createdDate = new Date(lead.created_at * 1000)
                            const closedDate = lead.closed_at ? new Date(lead.closed_at * 1000) : null
                            const tagsLabel = (lead._embedded?.tags ?? []).map((t: { id: number; name: string }) => t.name).join(', ') || '-'

                            return (
                              <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="font-mono text-sm">
                                  <Badge variant="outline" className="font-mono">
                                    #{lead.id}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {lead.name || 'Sin nombre'}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  <span className="text-green-600 dark:text-green-400">
                                    ${lead.price?.toLocaleString('es-AR') || '0'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    {responsibleUser?.name || `Usuario ${lead.responsible_user_id}`}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {createdDate.toLocaleDateString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {closedDate
                                    ? closedDate.toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {getLeadSource(lead)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate" title={tagsLabel}>
                                  {tagsLabel}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={lead.closed_at ? "default" : "secondary"}
                                    className={lead.closed_at ? "bg-green-500 hover:bg-green-600" : ""}
                                  >
                                    {lead.closed_at ? 'Cerrado' : 'Abierto'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 opacity-50" />
                                <p>No se encontraron leads que coincidan con la búsqueda</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Mostrando <strong>{startIndex + 1}</strong> a <strong>{Math.min(endIndex, filteredLeads.length)}</strong> de <strong>{filteredLeads.length}</strong> lead{filteredLeads.length !== 1 ? 's' : ''}
                        {searchTerm && ` (${leads.length} total con filtros)`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
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
                                onClick={() => goToPage(pageNum)}
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
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {totalPages === 1 && (
                    <div className="p-4 border-t bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Mostrando <strong>{filteredLeads.length}</strong> lead{filteredLeads.length !== 1 ? 's' : ''} con los filtros aplicados
                        {searchTerm && ` (${leads.length} total con filtros)`}
                      </p>
                    </div>
                  )}
                </>
              ) : (dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all") || selectedTagIds.length > 0) ? (
                <div className="text-center p-12 border rounded-lg">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No se encontraron leads</h3>
                  <p className="text-sm text-muted-foreground">
                    No hay leads que coincidan con los filtros seleccionados
                  </p>
                </div>
              ) : (
                <div className="text-center p-12 border rounded-lg bg-muted/30">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Selecciona filtros para ver leads</h3>
                  <p className="text-sm text-muted-foreground">
                    Usa los filtros de arriba para buscar leads por fecha, usuario responsable, embudo y etiquetas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Cargando estadísticas...</h3>
            <p className="text-sm text-muted-foreground">
              Obteniendo datos de Kommo para {selectedCustomer?.nombre} {selectedCustomer?.apellido}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
