import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, Database, Filter, Search, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { getApiUrl, fetchWithAuth } from "@/lib/api-client"
import { Skeleton } from "@/components/ui/skeleton"

interface WebhookLog {
  _id: string
  logId: string
  customerId: string
  customerName?: string
  customerEmail?: string
  accountId: string | null
  accountIndex?: number
  accountLabel?: string
  success: boolean
  processedLeads: number
  deletedLeads: number
  duration: number
  error?: string
  timestamp: string
  createdAt: string
}

interface Customer {
  _id: string
  nombre: string
  apellido: string
  email: string
}

export default function AdminWebhooksPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 50
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadCustomers()
    loadLogs()
  }, [selectedCustomerId, currentPage])

  const loadCustomers = async () => {
    try {
      const response = await fetch(getApiUrl('/api/customers'))
      const data = await response.json()
      if (data.success) {
        setCustomers(data.data || [])
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error)
    }
  }

  const loadLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: logsPerPage.toString(),
        skip: ((currentPage - 1) * logsPerPage).toString(),
      })
      
      if (selectedCustomerId && selectedCustomerId !== "all") {
        params.append('customerId', selectedCustomerId)
      }

      const response = await fetch(getApiUrl(`/api/metrics/kommo/webhook/logs?${params.toString()}`))
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data || [])
        setTotal(data.total || 0)
      } else {
        toast.error('Error al cargar logs: ' + (data.error || 'Error desconocido'))
      }
    } catch (error: any) {
      console.error('Error al cargar logs:', error)
      toast.error('Error al cargar logs: ' + (error.message || 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const filteredLogs = logs.filter(log => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        log.logId.toLowerCase().includes(searchLower) ||
        log.customerName?.toLowerCase().includes(searchLower) ||
        log.customerEmail?.toLowerCase().includes(searchLower) ||
        log.accountId?.toString().includes(searchLower) ||
        log.error?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const totalPages = Math.ceil(total / logsPerPage)

  const handleSyncAccountIds = async () => {
    try {
      setSyncing(true)
      const res = await fetchWithAuth(getApiUrl('/api/admin/sync-kommo-account-ids'), {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'IDs sincronizados correctamente')
        loadLogs()
      } else {
        toast.error(data.error || 'Error al sincronizar IDs')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error al sincronizar IDs de Kommo')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Logs de Webhooks Kommo</h1>
            <p className="text-muted-foreground">
              Monitoreo de webhooks recibidos de Kommo
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSyncAccountIds}
            disabled={syncing}
            variant="default"
            title="Obtiene el ID de cada cuenta Kommo y lo guarda para que el webhook ligue la data correctamente"
          >
            <Database className={`h-4 w-4 mr-2 ${syncing ? 'animate-pulse' : ''}`} />
            {syncing ? 'Sincronizando IDs...' : 'Sincronizar IDs Kommo'}
          </Button>
          <Button onClick={loadLogs} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                      {customer.nombre} {customer.apellido} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, cliente, email, error..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logs de Webhooks</CardTitle>
              <CardDescription>
                {total} logs encontrados
              </CardDescription>
            </div>
            <Badge variant="outline">
              Página {currentPage} de {totalPages}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No hay logs</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {selectedCustomerId !== "all" || searchTerm
                  ? "No se encontraron logs con los filtros aplicados."
                  : "Los logs aparecerán aquí cuando Kommo envíe webhooks a tu panel. Configura la URL del webhook en Kommo (Configuración → Integraciones → Webhooks) apuntando a: /api/metrics/kommo/webhook"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Account ID</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Leads Procesados</TableHead>
                      <TableHead>Leads Eliminados</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(log.createdAt || log.timestamp)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.customerName || 'Cliente desconocido'}</div>
                            {log.customerEmail && (
                              <div className="text-xs text-muted-foreground">{log.customerEmail}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.accountLabel ? (
                            <Badge variant="secondary">{log.accountLabel}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.accountId ? (
                            <Badge variant="outline">{log.accountId}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Exitoso
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.processedLeads > 0 ? (
                            <Badge variant="outline" className="bg-blue-50">
                              {log.processedLeads}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.deletedLeads > 0 ? (
                            <Badge variant="outline" className="bg-red-50">
                              {log.deletedLeads}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{formatDuration(log.duration)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.error ? (
                            <div className="max-w-xs">
                              <p className="text-sm text-red-600 truncate" title={log.error}>
                                {log.error}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * logsPerPage) + 1} a {Math.min(currentPage * logsPerPage, total)} de {total} logs
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
