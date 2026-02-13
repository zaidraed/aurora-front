
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { RefreshCw, Users, TrendingUp, TrendingDown, MessageSquare, BarChart3, Database, CheckCircle2, XCircle, Clock, Activity, Filter, Calendar, User, Search, ChevronLeft, ChevronRight, FileDown, Tag } from "lucide-react"
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
import { getApiUrl, fetchWithAuth } from "@/lib/api-client"

interface KommoStats {
  totals: {
    total: number
    won: number
    lost: number
    active: number
  }
  /** Total de leads en BD incluyendo eliminados (solo informativo). */
  totalsIncludingDeleted?: number
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
  is_deleted?: boolean
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

interface KommoStatus {
  id: number
  name: string
  sort?: number
  type?: number // 0=open, 1=won, 2=lost
}

interface KommoPipeline {
  id: number
  name: string
  _embedded?: {
    statuses?: KommoStatus[]
  }
}

/** Obtiene el nombre de la etapa del lead según pipeline y status (para listar por etapa en el panel). */
function getStageName(lead: KommoLead, pipelines: KommoPipeline[]): string {
  const pipeline = pipelines.find((p) => p.id === lead.pipeline_id)
  const status = pipeline?._embedded?.statuses?.find((s) => s.id === lead.status_id)
  return status?.name ?? `Etapa ${lead.status_id}`
}

interface KommoTag {
  id: number
  name: string
}

export default function KommoPage() {
  const { accountIndex: accountIndexParam } = useParams()
  // URL es 1-based (Kommo 1, Kommo 2); API usa 0-based
  const accountIndex = Math.max(0, (parseInt(accountIndexParam || '1', 10) || 1) - 1)

  const [kommoStats, setKommoStats] = useState<KommoStats | null>(null)
  const [loadingKommo, setLoadingKommo] = useState(false)
  const [leads, setLeads] = useState<KommoLead[]>([])
  const [allLeads, setAllLeads] = useState<KommoLead[]>([]) // Todos los leads precargados
  const [users, setUsers] = useState<KommoUser[]>([])
  const [pipelines, setPipelines] = useState<KommoPipeline[]>([])
  const [tags, setTags] = useState<KommoTag[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [loadingAllLeads, setLoadingAllLeads] = useState(false) // Estado para carga inicial
  const [filteredStats, setFilteredStats] = useState<KommoStats | null>(null)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [syncInProgress, setSyncInProgress] = useState(false) // Flag para evitar múltiples sincronizaciones
  
  // Filtros
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [dateField, setDateField] = useState<'created_at' | 'closed_at'>('created_at')
  const [selectedUserId, setSelectedUserId] = useState<string>("all")
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("all")
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  
  // Paginación y búsqueda
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [leadsPerPage] = useState<number>(50)

  // Al cambiar de cuenta (Kommo 1 <-> Kommo 2), limpiar datos anteriores para no mostrar la cuenta equivocada
  useEffect(() => {
    setKommoStats(null)
    setLeads([])
    setAllLeads([])
    setUsers([])
    setPipelines([])
    setTags([])
    setFilteredStats(null)
    setCurrentPage(1)

    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchKommoStats(),
          fetchUsers(),
          fetchPipelines(),
          fetchTags(),
        ])
        await fetchAllLeads(1, 50)
      } catch (error) {
        console.error('Error al cargar datos iniciales de Kommo:', error)
      }
    }
    loadInitialData()
  }, [accountIndex])

  useEffect(() => {
    const hasFilters = !!(dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all") || (selectedTagIds && selectedTagIds.length > 0));
    // Siempre desde API: con filtros pedir al backend; sin filtros aplicar filtros locales sobre lo ya cargado
    if (hasFilters) {
      fetchLeads()
      setCurrentPage(1)
      return
    }
    if (allLeads && allLeads.length > 0) {
      applyLocalFilters()
      setCurrentPage(1)
    }
  }, [dateFrom, dateTo, dateField, selectedUserId, selectedPipelineId, selectedTagIds, allLeads?.length])
  
  // Resetear a la primera página cuando cambia el término de búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const fetchKommoStats = async (forceRefresh: boolean = false) => {
    setLoadingKommo(true)
    try {
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
        return
      }

      // Cliente: siempre cargar estadísticas desde la API de Kommo (tiempo real)
      const url = `/api/metrics/kommo?customerId=${encodeURIComponent(customerId)}&accountIndex=${accountIndex}&refresh=true`
      
      const response = await fetchWithAuth(getApiUrl(url))
      
      // Verificar si la respuesta tiene contenido antes de parsear JSON
      const contentType = response.headers.get('content-type')
      let data: any = {}
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error('[KOMMO] Error al parsear JSON:', jsonError)
          const text = await response.text()
          console.error('[KOMMO] Respuesta del servidor (texto):', text)
          throw new Error(`Error del servidor (${response.status}): ${text || 'Respuesta vacía'}`)
        }
      } else {
        const text = await response.text()
        console.error('[KOMMO] Respuesta no es JSON:', text)
        throw new Error(`Error del servidor (${response.status}): ${text || 'Respuesta no válida'}`)
      }
      
      if (response.ok && data.success && data.data) {
        setKommoStats(data.data)
      } else {
        console.error('[KOMMO] Error en la respuesta:', {
          status: response.status,
          ok: response.ok,
          success: data.success,
          hasData: !!data.data,
          error: data.error
        })
        
        if (response.status === 401) {
          toast.error('Error de autenticación con Kommo. Verifica las credenciales de esta cuenta.')
        } else if (response.status === 404) {
          toast.error('Cliente no encontrado o no tiene credenciales de Kommo configuradas.')
        } else if (response.status === 500) {
          toast.error('Error interno del servidor. Verifica los logs del backend.')
        } else {
          toast.error(data.error || `Error al obtener estadísticas (${response.status})`)
        }
      }
    } catch (error: any) {
      console.error('Error al cargar estadísticas de Kommo:', error)
      if (error.message && !error.message.includes('Error del servidor')) {
        toast.error(error.message || 'Error al cargar estadísticas de Kommo')
      }
    } finally {
      setLoadingKommo(false)
    }
  }

  const fetchUsers = async () => {
    try {
      // Obtener customerId de localStorage primero, luego de cookies como fallback
      let customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) return

      const response = await fetchWithAuth(getApiUrl(`/api/metrics/kommo/users?customerId=${encodeURIComponent(customerId)}&accountIndex=${accountIndex}`))
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.users) {
          setUsers(Array.isArray(data.data.users) ? data.data.users : [])
        } else {
          console.error('[KOMMO] Error al cargar usuarios:', data.error || 'Error desconocido')
          setUsers([])
        }
      } else {
        const data = await response.json().catch(() => ({}))
        console.error('[KOMMO] Error al cargar usuarios:', data.error || 'Error desconocido')
        if (response.status === 401) {
          console.error('[KOMMO] Error de autenticación: Verifica las credenciales de Kommo en la configuración del cliente')
        }
        setUsers([])
      }
    } catch (error) {
      console.error('Error al cargar usuarios de Kommo:', error)
      setUsers([])
    }
  }

  const fetchPipelines = async () => {
    try {
      // Obtener customerId de localStorage primero, luego de cookies como fallback
      let customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) return

      const response = await fetchWithAuth(getApiUrl(`/api/metrics/kommo/pipelines?customerId=${encodeURIComponent(customerId)}&accountIndex=${accountIndex}`))
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.pipelines) {
          setPipelines(Array.isArray(data.data.pipelines) ? data.data.pipelines : [])
        } else {
          console.error('[KOMMO] Error al cargar pipelines:', data.error || 'Error desconocido')
          setPipelines([])
        }
      } else {
        const data = await response.json().catch(() => ({}))
        console.error('[KOMMO] Error al cargar pipelines:', data.error || 'Error desconocido')
        if (response.status === 401) {
          console.error('[KOMMO] Error de autenticación: Verifica las credenciales de Kommo en la configuración del cliente')
        }
        setPipelines([])
      }
    } catch (error) {
      console.error('Error al cargar pipelines de Kommo:', error)
      setPipelines([])
    }
  }

  const fetchTags = async () => {
    try {
      // Obtener customerId de localStorage primero, luego de cookies como fallback
      let customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) return

      const response = await fetchWithAuth(getApiUrl(`/api/metrics/kommo/tags?customerId=${encodeURIComponent(customerId)}&accountIndex=${accountIndex}`))
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.tags) {
          setTags(Array.isArray(data.data.tags) ? data.data.tags : [])
        } else {
          console.error('[KOMMO] Error al cargar etiquetas:', data.error || 'Error desconocido')
          setTags([])
        }
      } else {
        const data = await response.json().catch(() => ({}))
        console.error('[KOMMO] Error al cargar etiquetas:', data.error || 'Error desconocido')
        if (response.status === 401) {
          console.error('[KOMMO] Error de autenticación: Verifica las credenciales de Kommo en la configuración del cliente')
        }
        setTags([])
      }
    } catch (error) {
      console.error('[KOMMO] Error al cargar etiquetas:', error)
      setTags([])
    }
  }

  // Cargar leads con paginación (mucho más rápido)
  const fetchAllLeads = async (page: number = 1, limit: number = 50) => {
    // Obtener customerId de localStorage primero, luego de cookies como fallback
    let customerId = localStorage.getItem('customerId') || 
      document.cookie
        .split('; ')
        .find(row => row.startsWith('customerId='))
        ?.split('=')[1]
        ?.trim()

    if (!customerId) {
      console.error('No se encontró customerId en localStorage ni en cookies')
      return
    }

    setLoadingAllLeads(true)
    try {
      const startTime = performance.now()
      
      // Construir query params con paginación (cliente: siempre desde API de Kommo)
      const params = new URLSearchParams({
        customerId,
        page: page.toString(),
        limit: limit.toString(),
        accountIndex: accountIndex.toString(),
        refresh: 'true',
      })
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      if (dateField) params.append('dateField', dateField)
      if (selectedUserId && selectedUserId !== "all") params.append('responsibleUserId', selectedUserId)
      if (selectedPipelineId && selectedPipelineId !== "all") params.append('pipelineId', selectedPipelineId)
      if (selectedTagIds.length > 0) params.append('tagIds', selectedTagIds.join(','))

      const response = await fetchWithAuth(getApiUrl(`/api/metrics/kommo/leads?${params.toString()}`))
      const data = await response.json()
      const loadTime = ((performance.now() - startTime) / 1000).toFixed(2)
      
      if (response.ok && data.success && data.data) {
        const leadsArray = Array.isArray(data.data.leads) ? data.data.leads : []
        const total = data.data.total || 0
        const totalPages = data.data.totalPages || 1
        const needsSync = data.data.needsSync === true
        
        console.log(`[KOMMO] Página ${page}/${totalPages}: ${leadsArray.length} leads cargados en ${loadTime}s (Total: ${total}) [API]`)
        
        if (needsSync && page === 1) {
          toast.info('No hay leads en esta cuenta Kommo o no se pudo conectar. Verifica las credenciales.', { duration: 5000 })
        }
        
        // Si es la primera página, reemplazar; si no, agregar
        if (page === 1) {
          setAllLeads(leadsArray)
          setLeads(leadsArray)
        } else {
          setAllLeads(prev => [...prev, ...leadsArray])
          setLeads(prev => [...prev, ...leadsArray])
        }
        
        // NO cargar más páginas automáticamente - dejar que el usuario vea los primeros 50 leads inmediatamente
        // Si quiere ver más, puede usar paginación o scroll infinito más adelante
      } else {
        console.error('[KOMMO] Error al cargar leads:', data.error || 'Error desconocido')
        if (page === 1) {
          setAllLeads([])
          setLeads([])
        }
      }
    } catch (error) {
      console.error('Error al cargar leads:', error)
      if (page === 1) {
        setAllLeads([])
        setLeads([])
      }
    } finally {
      // Siempre desactivar loading después de la primera página
      if (page === 1) {
        setLoadingAllLeads(false)
      }
    }
  }
  
  // Función para cargar más leads cuando el usuario lo necesite (scroll infinito o botón)
  const loadMoreLeads = async () => {
    if (loadingAllLeads) return // Evitar cargas múltiples
    
    const currentPage = Math.floor(allLeads.length / 50) + 1
    await fetchAllLeads(currentPage, 50)
  }

  // Aplicar filtros localmente sobre los leads precargados
  const applyLocalFilters = () => {
    if (!allLeads || allLeads.length === 0) {
      console.warn('[KOMMO] applyLocalFilters: allLeads está vacío o undefined')
      setLeads([])
      return
    }

    let filtered = [...allLeads]

    // Filtrar por fecha (creación o cierre según dateField)
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

    // Filtrar por usuario responsable
    if (selectedUserId && selectedUserId !== "all") {
      filtered = filtered.filter(lead => lead.responsible_user_id === parseInt(selectedUserId))
    }

    // Filtrar por pipeline
    if (selectedPipelineId && selectedPipelineId !== "all") {
      filtered = filtered.filter(lead => lead.pipeline_id === parseInt(selectedPipelineId))
    }

    // Filtrar por etiquetas
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(lead => {
        const leadTagIds = lead._embedded?.tags?.map(tag => tag.id) || []
        // Verificar si el lead tiene al menos una de las etiquetas seleccionadas
        return selectedTagIds.some(tagId => leadTagIds.includes(tagId))
      })
    }

    setLeads(filtered)
    
    // Calcular estadísticas filtradas localmente
    if (filtered.length > 0) {
      calculateFilteredStats(filtered)
    } else {
      setFilteredStats(null)
    }
  }

  // Calcular estadísticas filtradas localmente usando los pipelines ya cargados
  const calculateFilteredStats = async (filteredLeads: KommoLead[]) => {
    try {
      if (!filteredLeads || filteredLeads.length === 0) {
        setFilteredStats(null)
        return
      }

      // Si no hay pipelines cargados, hacer una llamada al backend
      if (!pipelines || pipelines.length === 0) {
        // Obtener customerId de localStorage primero, luego de cookies como fallback
        let customerId = localStorage.getItem('customerId') || 
          document.cookie
            .split('; ')
            .find(row => row.startsWith('customerId='))
            ?.split('=')[1]
            ?.trim()

        if (!customerId) return

        // Construir parámetros para obtener estadísticas
        const params = new URLSearchParams()
        params.append('customerId', customerId)
        params.append('accountIndex', accountIndex.toString())
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

        const response = await fetchWithAuth(getApiUrl(`/api/metrics/kommo/leads?${params.toString()}`))
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

      // Calcular estadísticas localmente usando los pipelines cargados
      // Esto es una aproximación rápida, para cálculos exactos se necesita la API
      // Por ahora, solo mostramos el conteo básico
      const activeLeads = filteredLeads.filter(lead => !(lead as any).is_deleted)
      
      // Identificar statuses ganados/perdidos basado en los pipelines
      // Esto es una aproximación, para cálculos exactos necesitamos los statuses completos
      const stats: KommoStats = {
        totals: {
          total: activeLeads.length,
          won: 0, // Se calculará con la API si es necesario
          lost: 0, // Se calculará con la API si es necesario
          active: activeLeads.length,
        },
        distribution: [],
        lastUpdated: new Date().toISOString(),
      }
      
      // Establecer stats básicos inmediatamente
      setFilteredStats(stats)

      // Si necesitamos estadísticas exactas, hacer una llamada al backend
      // pero solo si hay filtros activos y hay muchos leads (usar los mismos filtros que la lista)
      if (filteredLeads.length > 0 && (dateFrom || dateTo || selectedUserId !== "all" || selectedPipelineId !== "all" || selectedTagIds.length > 0)) {
        // Obtener customerId de localStorage primero, luego de cookies como fallback
        let customerId = localStorage.getItem('customerId') || 
          document.cookie
            .split('; ')
            .find(row => row.startsWith('customerId='))
            ?.split('=')[1]
            ?.trim()

        if (customerId) {
          const params = new URLSearchParams()
          params.append('customerId', customerId)
          params.append('accountIndex', accountIndex.toString())
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

  // Función para sincronización completa por lotes (evita timeout)
  const fullSyncLeads = async () => {
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

    if (syncInProgress) {
      toast.info('Ya hay una sincronización en progreso. Por favor espera...')
      return
    }

    setSyncInProgress(true)
    let totalProcessed = 0
    let page = 1
    let hasMore = true

    try {
      toast.info('Iniciando sincronización completa por lotes...', {
        id: 'kommo-full-sync',
        duration: 2000,
      })

      while (hasMore) {
        toast.info(`Sincronizando página ${page}...`, {
          id: 'kommo-full-sync',
          duration: 2000,
        })

        const res = await fetchWithAuth(
          getApiUrl(`/api/metrics/kommo/leads/sync-chunk?customerId=${encodeURIComponent(customerId)}&accountIndex=${accountIndex}&page=${page}`),
          { method: 'POST' }
        )

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
        id: 'kommo-full-sync',
        duration: 5000,
      })

      await fetchAllLeads(1, 50)
      await fetchKommoStats(true)
    } catch (error: any) {
      console.error('Error en sincronización completa:', error)
      toast.error('Error: ' + (error.message || 'Error desconocido'), {
        id: 'kommo-full-sync',
      })
    } finally {
      setSyncInProgress(false)
    }
  }

  // Función para sincronizar y actualizar todos los leads manualmente (sincronización incremental)
  const refreshAllLeads = async () => {
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

    if (syncInProgress) {
      toast.info('Ya hay una sincronización en progreso. Por favor espera...')
      return
    }

    setLoadingAllLeads(true)
    setSyncInProgress(true)
    try {
      // Iniciar sincronización en background
      toast.info('Sincronizando leads desde Kommo... Esto puede tardar unos minutos.', {
        id: 'kommo-sync-manual',
      })
      
      // Intentar primero con el endpoint de sync
      try {
        const syncResponse = await fetchWithAuth(
          getApiUrl(`/api/metrics/kommo/leads/sync?customerId=${encodeURIComponent(customerId)}&accountIndex=${accountIndex}&forceFullSync=true`)
        )
        
        if (syncResponse.ok) {
          // Esperar un momento para que la sincronización comience
          await new Promise(resolve => setTimeout(resolve, 3000))
          
          // Recargar leads desde BD (ahora será rápido)
          await fetchAllLeads(1, 50)
          toast.success('Leads sincronizados y cargados correctamente', {
            id: 'kommo-sync-manual',
          })
          setSyncInProgress(false)
          return
        } else {
          const errorData = await syncResponse.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${syncResponse.status}`)
        }
      } catch (syncError: any) {
        // Si el endpoint de sync no existe (404), usar refresh en el endpoint de leads
        if (syncError.message?.includes('404') || syncError.message?.includes('Not Found')) {
          console.log('[KOMMO] Endpoint de sync no disponible, usando refresh en endpoint de leads')
          toast.info('Sincronizando leads...', {
            id: 'kommo-sync-manual',
          })
          
          // Usar refresh=true en el endpoint de leads
          const refreshResponse = await fetchWithAuth(
            getApiUrl(`/api/metrics/kommo/leads?customerId=${encodeURIComponent(customerId)}&accountIndex=${accountIndex}&refresh=true`)
          )
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            if (refreshData.success && refreshData.data?.leads) {
              const leadsArray = Array.isArray(refreshData.data.leads) ? refreshData.data.leads : []
              setAllLeads(leadsArray)
              setLeads(leadsArray)
              toast.success(`${leadsArray.length} leads sincronizados y cargados`, {
                id: 'kommo-sync-manual',
              })
            } else {
              throw new Error('Error en la respuesta de sincronización')
            }
          } else {
            throw new Error(`HTTP ${refreshResponse.status}`)
          }
        } else {
          throw syncError
        }
      }
    } catch (error: any) {
      console.error('Error al sincronizar leads:', error)
      toast.error('Error al sincronizar leads: ' + (error.message || 'Error desconocido'), {
        id: 'kommo-sync-manual',
      })
    } finally {
      setLoadingAllLeads(false)
      setSyncInProgress(false)
    }
  }

  const fetchLeads = async () => {
    // Cliente: siempre pedir al backend desde API de Kommo (con filtros si los hay)
    setLoadingLeads(true)
    try {
      const customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('customerId='))
          ?.split('=')[1]
          ?.trim()

      if (!customerId) {
        console.error('No se encontró customerId en localStorage ni en cookies')
        setLeads([])
        setFilteredStats(null)
        return
      }

      const params = new URLSearchParams()
      params.append('customerId', customerId)
      params.append('accountIndex', accountIndex.toString())
      params.append('refresh', 'true')
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

      const response = await fetchWithAuth(getApiUrl(`/api/metrics/kommo/leads?${params.toString()}`))
      const data = await response.json()
      
      if (response.ok && data.success && data.data?.leads) {
        setLeads(data.data.leads)
        // Guardar estadísticas filtradas si están disponibles
        if (data.data?.stats) {
          setFilteredStats(data.data.stats)
        } else {
          setFilteredStats(null)
        }
      } else {
        console.error('Error al obtener leads:', data.error || 'Error desconocido')
        if (response.status === 401) {
          console.error('Error de autenticación: Verifica las credenciales de Kommo en la configuración del cliente')
        }
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
    setFilteredStats(null)
    setSearchTerm("")
    setCurrentPage(1)
    // Recargar desde API sin filtros
    fetchAllLeads(1, 50)
  }
  
  // Filtrar leads por término de búsqueda (ID o nombre)
  const filteredLeads = leads.filter((lead) => {
    if (!searchTerm.trim()) return true
    
    const searchLower = searchTerm.toLowerCase().trim()
    const leadId = lead.id.toString()
    const leadName = (lead.name || '').toLowerCase()
    
    return leadId.includes(searchLower) || leadName.includes(searchLower)
  })
  
  // Calcular paginación
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage)
  const startIndex = (currentPage - 1) * leadsPerPage
  const endIndex = startIndex + leadsPerPage
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex)
  
  // Funciones de navegación
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }
  
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  // Preparar datos para gráficos
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

  // Función para exportar a Excel
  const handleExportToExcel = async () => {
    if (!kommoStats) {
      toast.error('No hay datos disponibles para exportar')
      return
    }

    // Determinar qué leads usar (filtrados o todos)
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
      // Usar las estadísticas filtradas si hay filtros activos, sino usar las generales
      const statsToExport = (filteredStats && (dateFrom || dateTo || selectedUserId !== "all" || selectedPipelineId !== "all"))
        ? filteredStats
        : kommoStats

      // Generar nombre de archivo con información de filtros
      let filename = 'reporte-kommo'
      if (dateFrom || dateTo || selectedUserId !== "all" || selectedPipelineId !== "all") {
        filename = 'reporte-kommo-filtrado'
      }

      // Pequeño delay para que el usuario vea el mensaje
      await new Promise(resolve => setTimeout(resolve, 500))

      // Exportar a Excel
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

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Kommo CRM</h1>
                <p className="text-muted-foreground mt-1">
                  Análisis completo de leads y embudos de ventas
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
              disabled={exportingExcel || !kommoStats || (leads.length === 0 && allLeads.length === 0)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FileDown className={`h-4 w-4 ${exportingExcel ? 'animate-pulse' : ''}`} />
              {exportingExcel ? 'Exportando...' : 'Exportar Excel'}
            </Button>
            <Button 
              onClick={() => fetchKommoStats(true)} 
              disabled={loadingKommo}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingKommo ? 'animate-spin' : ''}`} />
              {loadingKommo ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>

        {loadingKommo && !kommoStats ? (
          <div className="space-y-6">
            {/* Skeleton para Header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
            
            {/* Skeleton para Estadísticas Generales */}
            <div>
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-l-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-4 rounded" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-9 w-24 mb-2" />
                      <Skeleton className="h-3 w-40" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
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
              {/* Gráfico de Distribución */}
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

              {/* Resumen de Rendimiento */}
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
                    {kommoStats.totals && kommoStats.totals.total > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Valor Total Ganado</span>
                          <span className="text-sm font-semibold text-green-600">
                            ${(leads
                              .filter(l => l.closed_at && !(l.is_deleted ?? false))
                              .reduce((sum, l) => sum + (l.price || 0), 0)).toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Ticket Promedio</span>
                          <span className="text-sm font-semibold">
                            {kommoStats.totals.won > 0
                              ? '$' + Math.round((leads
                                  .filter(l => l.closed_at && !(l.is_deleted ?? false))
                                  .reduce((sum, l) => sum + (l.price || 0), 0)) / kommoStats.totals.won).toLocaleString('es-AR')
                              : '$0'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Análisis por Embudo en Estadísticas Generales (siempre visible) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Análisis por Embudo de Venta</CardTitle>
                      <CardDescription className="mt-1">
                        {filteredStats && (dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all"))
                          ? `Distribución detallada de leads en cada embudo (filtrados${dateField === 'closed_at' ? ' por fecha de cierre' : ' por fecha de creación'})`
                          : "Distribución detallada de leads en cada embudo"}
                      </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {(filteredStats && (dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all")))
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
                          {((filteredStats && (dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all")))
                            ? filteredStats.distribution
                            : kommoStats.distribution)?.filter(pipeline => pipeline && pipeline.stages && Array.isArray(pipeline.stages)).map((pipeline) => {
                              const won = pipeline.stages
                                .filter((s) => s.type === 'won')
                                .reduce((sum, s) => sum + s.count, 0)
                              const lost = pipeline.stages
                                .filter((s) => s.type === 'lost')
                                .reduce((sum, s) => sum + s.count, 0)
                              const active = pipeline.stages
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
                      {((filteredStats && (dateFrom || dateTo || (selectedUserId && selectedUserId !== "all") || (selectedPipelineId && selectedPipelineId !== "all")))
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

                        // Preparar datos para gráfico
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
                                {/* Gráfico de Barras */}
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

                                {/* Lista de Etapas */}
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
                        value=""
                        onValueChange={(value) => {
                          if (value && value !== "all") {
                            const tagId = parseInt(value)
                            if (!selectedTagIds.includes(tagId)) {
                              setSelectedTagIds([...selectedTagIds, tagId])
                            }
                          }
                        }}
                      >
                        <SelectTrigger id="tags" className="h-10">
                          <SelectValue placeholder="Seleccionar etiqueta" />
                        </SelectTrigger>
                        <SelectContent>
                          {tags.length === 0 ? (
                            <SelectItem value="all" disabled>
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
                  {/* Métricas Principales Filtradas */}
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
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-medium">Ganados</CardTitle>
                          {dateField === 'created_at' && (dateFrom || dateTo) && (
                            <span className="text-xs text-muted-foreground" title="Los leads ganados se calculan por fecha de cierre, no por fecha de creación">
                              ⓘ
                            </span>
                          )}
                        </div>
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

                  {/* Distribución por Etapa Filtrada */}
                  {filteredStats.distribution && filteredStats.distribution.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Distribución por Etapa</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredStats.distribution.filter(pipeline => pipeline && pipeline.stages && Array.isArray(pipeline.stages)).map((pipeline) => {
                          const sortedStages = [...pipeline.stages].sort((a, b) => {
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
                
                {/* Buscador */}
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
                            <TableHead className="font-semibold">Etapa</TableHead>
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
                          const stageName = getStageName(lead, pipelines)

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
                              <TableCell className="text-sm" title={stageName}>
                                <span className="max-w-[140px] truncate block">{stageName}</span>
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
                              <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
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
                    
                    {/* Paginación */}
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
                      Usa los filtros de arriba para buscar leads por fecha y usuario responsable
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
              <h3 className="text-lg font-semibold mb-2">Sin datos de Kommo</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Haz clic en "Actualizar" para cargar las estadísticas de Kommo
              </p>
              <Button onClick={() => fetchKommoStats(true)} disabled={loadingKommo}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingKommo ? 'animate-spin' : ''}`} />
                Cargar Estadísticas
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
  )
}
