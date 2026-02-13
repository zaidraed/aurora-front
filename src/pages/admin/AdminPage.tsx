
import { useEffect, useState } from "react"
import { Users, Building2, Shield, TrendingUp, Database, Power, PowerOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getApiUrl } from "@/lib/api-client"
import { toast } from "sonner"

export default function AdminHomePage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCustomers: 0,
    superAdmins: 0,
    clients: 0,
  })
  const [loading, setLoading] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  useEffect(() => {
    loadStats()
    // Cargar estado de mantenimiento
    const stored = localStorage.getItem('maintenanceMode')
    setMaintenanceMode(stored === 'true')
  }, [])

  const toggleMaintenanceMode = () => {
    const newMode = !maintenanceMode
    localStorage.setItem('maintenanceMode', String(newMode))
    setMaintenanceMode(newMode)
    
    toast.warning(
      'Nota: El modo mantenimiento se guarda en localStorage. ' +
      'Para un control más robusto en producción, se recomienda usar una configuración del backend. ' +
      'Por ahora, recarga la página para ver el cambio aplicado.'
    )
    
    // Disparar evento personalizado para que otras pestañas/ventanas se actualicen
    window.dispatchEvent(new Event('storage'))
    
    // También disparar evento personalizado
    window.dispatchEvent(new CustomEvent('maintenanceModeChanged', { 
      detail: { mode: newMode } 
    }))
    
    // Recargar la página para aplicar el cambio
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  const loadStats = async () => {
    try {
      setLoading(true)
      const [usersRes, customersRes] = await Promise.all([
        fetch(getApiUrl('/api/users')),
        fetch(getApiUrl('/api/customers')),
      ])

      const usersData = await usersRes.json()
      const customersData = await customersRes.json()

      if (usersData.success && customersData.success) {
        const users = usersData.data
        const customers = customersData.data

        setStats({
          totalUsers: users.length,
          totalCustomers: customers.length,
          superAdmins: users.filter((u: any) => u.role === "SuperAdmin").length,
          clients: users.filter((u: any) => u.role === "Cliente").length,
        })
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Usuarios",
      value: stats.totalUsers,
      description: "Usuarios con acceso al panel",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Clientes",
      value: stats.totalCustomers,
      description: "Clientes registrados",
      icon: Building2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Super Admins",
      value: stats.superAdmins,
      description: "Administradores del sistema",
      icon: Shield,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Clientes",
      value: stats.clients,
      description: "Usuarios con rol Cliente",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground mt-1">
          Resumen y accesos a gestión de usuarios, clientes y actividades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
            <CardDescription>Gestión del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/users"
              className="block p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">Gestión de Usuarios</div>
              <div className="text-sm text-muted-foreground">
                Administra usuarios y permisos
              </div>
            </a>
            <a
              href="/admin/clients"
              className="block p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">Gestión de Clientes</div>
              <div className="text-sm text-muted-foreground">
                Administra clientes y sus configuraciones
              </div>
            </a>
            <a
              href="/admin/kommo"
              className="block p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">Kommo CRM</div>
              <div className="text-sm text-muted-foreground">
                Visualiza estadísticas de Kommo por cuenta de cliente
              </div>
            </a>
            <a
              href="/admin/webhooks"
              className="block p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">Logs de Webhooks Kommo</div>
              <div className="text-sm text-muted-foreground">
                Monitorea los webhooks recibidos de Kommo
              </div>
            </a>
            <a
              href="/admin/meta-capi"
              className="block p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">Meta CAPI + Kommo</div>
              <div className="text-sm text-muted-foreground">
                Configura Meta Conversions API y conexión con Kommo (empresa y clientes)
              </div>
            </a>
            <a
              href="/admin/tokens"
              className="block p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">Tokens OpenAI</div>
              <div className="text-sm text-muted-foreground">
                Monitorea el uso de tokens de OpenAI
              </div>
            </a>
            <a
              href="/admin/testing"
              className="block p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">Testing</div>
              <div className="text-sm text-muted-foreground">
                Prueba los emails del sistema (SendGrid)
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
            <CardDescription>Estado y configuración</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Control de Modo Mantenimiento */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {maintenanceMode ? (
                    <PowerOff className="h-5 w-5 text-amber-600" />
                  ) : (
                    <Power className="h-5 w-5 text-green-600" />
                  )}
                  <div>
                    <Label htmlFor="maintenance-toggle" className="text-sm font-semibold cursor-pointer">
                      Modo Mantenimiento
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      {maintenanceMode 
                        ? 'Panel pausado - Solo administradores pueden acceder'
                        : 'Panel operativo - Todos los usuarios pueden acceder'}
                    </div>
                  </div>
                </div>
                <Switch
                  id="maintenance-toggle"
                  checked={maintenanceMode}
                  onCheckedChange={toggleMaintenanceMode}
                />
              </div>
              {maintenanceMode && (
                <Alert className="mt-3 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTitle className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Panel en Mantenimiento
                  </AlertTitle>
                  <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                    El panel está pausado. Solo los administradores pueden acceder. Los usuarios regulares verán la pantalla de mantenimiento.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-semibold">Estado</div>
                <div className="text-sm text-muted-foreground">
                  {maintenanceMode ? 'En Mantenimiento' : 'Operativo'}
                </div>
              </div>
              <div className={`h-3 w-3 rounded-full ${maintenanceMode ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-semibold">Base de Datos</div>
                <div className="text-sm text-muted-foreground">MongoDB</div>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
