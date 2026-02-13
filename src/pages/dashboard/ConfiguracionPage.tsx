
import { useEffect, useState } from "react"
import { User, CreditCard, Calendar, Bot, Users, Plus, Trash2, Edit2, Shield, Loader2, Key, Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Customer } from "@/lib/customer-types"
import type { User as UserType, CustomerRole } from "@/lib/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { generateSecurePassword } from "@/lib/utils"
import { getApiUrl, fetchWithAuth } from "@/lib/api-client"

export default function ConfiguracionPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Estados para edición
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    pais: '',
    cantidadAgentes: 1,
    planContratado: 'Básico' as 'Básico' | 'Profesional' | 'Enterprise' | 'Custom',
    twoFactorAuth: false
  })

  // Estados para gestión de usuarios de la cuenta
  const [accountUsers, setAccountUsers] = useState<UserType[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [userFormData, setUserFormData] = useState({
    email: "",
    name: "",
    password: "",
    customerRole: "Employee" as CustomerRole,
    isActive: true,
  })

  // Cambiar contraseña
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
    show: false,
  })
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    // Verificar si el usuario es admin
    let role = localStorage.getItem('role') || 
      document.cookie
        .split('; ')
        .find(row => row.startsWith('role='))
        ?.split('=')[1]
    
    setIsAdmin(role === 'SuperAdmin')
    
    loadCustomerData()
    if (!role || role !== 'SuperAdmin') {
      loadAccountUsers()
    }
  }, [])

  // Función para cargar usuarios de la cuenta
  const loadAccountUsers = async () => {
    try {
      // Obtener customerId de localStorage primero, luego de cookies como fallback
      let customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("customerId="))
          ?.split("=")[1]
          ?.trim()

      if (!customerId) {
        console.warn("No se encontró customerId para cargar usuarios")
        return
      }

      setLoadingUsers(true)
      const res = await fetchWithAuth(getApiUrl(`/api/customers/${customerId}/users`))
      const data = await res.json()

      if (res.ok && data.success) {
        setAccountUsers(data.data)
      } else {
        console.error("Error al cargar usuarios:", data.error)
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadCustomerData = async () => {
    try {
      // Intentar primero con el nuevo endpoint usando fetchWithAuth
      console.log("Cargando datos del cliente actual...")
      let res: Response
      let data: any

      try {
        res = await fetchWithAuth(getApiUrl('/api/customers/current'))

        if (res.ok) {
          data = await res.json()
          if (data.success && data.data) {
            // Éxito con el nuevo endpoint
            const customerData: Customer = {
              ...data.data,
              createdAt: new Date(data.data.createdAt),
              updatedAt: new Date(data.data.updatedAt),
              fechaInicio: new Date(data.data.fechaInicio),
            }

            setCustomer(customerData)
            setFormData({
              nombre: customerData.nombre || '',
              apellido: customerData.apellido || '',
              email: customerData.email || '',
              telefono: customerData.telefono || '',
              pais: customerData.pais || '',
              cantidadAgentes: customerData.cantidadAgentes ?? 0,
              planContratado: customerData.planContratado || 'Básico',
              twoFactorAuth: customerData.twoFactorAuth || false
            })
            setLoading(false)
            return
          }
        } else {
          const errorData = await res.json().catch(() => ({}))
          console.warn("Endpoint /current falló:", res.status, errorData)
        }
      } catch (err) {
        console.warn("Error al usar endpoint /current:", err)
      }

      // Fallback: usar método anterior con customerId de localStorage o cookies
      console.log("Intentando fallback con customerId...")
      // Obtener customerId de localStorage primero, luego de cookies como fallback
      let customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("customerId="))
          ?.split("=")[1]
          ?.trim()

      let userEmail = localStorage.getItem('email') || 
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("email="))
          ?.split("=")[1]

      if (!customerId && !userEmail) {
        console.warn("No se encontró customerId ni email")
        setCustomer(null)
        setLoading(false)
        return
      }

      // Priorizar customerId si está disponible
      if (customerId) {
        console.log("Cargando datos del cliente por customerId:", customerId)
        res = await fetchWithAuth(getApiUrl(`/api/customers/${customerId}`))
        data = await res.json()
      } else if (userEmail) {
        // Fallback a email si no hay customerId
        console.log("Cargando datos del cliente por email:", userEmail)
        res = await fetchWithAuth(getApiUrl(`/api/customers/by-email?email=${encodeURIComponent(userEmail)}`))
        data = await res.json()
      } else {
        setCustomer(null)
        setLoading(false)
        return
      }

      if (!res.ok || !data.success) {
        console.error("Error al cargar datos del cliente:", data.error || `HTTP ${res.status}`)
        setCustomer(null)
        setLoading(false)
        return
      }

      const customerData: Customer = {
        ...data.data,
        createdAt: new Date(data.data.createdAt),
        updatedAt: new Date(data.data.updatedAt),
        fechaInicio: new Date(data.data.fechaInicio),
      }

      setCustomer(customerData)
      setFormData({
        nombre: customerData.nombre || '',
        apellido: customerData.apellido || '',
        email: customerData.email || '',
        telefono: customerData.telefono || '',
        pais: customerData.pais || '',
        cantidadAgentes: customerData.cantidadAgentes ?? 0,
        planContratado: customerData.planContratado || 'Básico',
        twoFactorAuth: customerData.twoFactorAuth || false
      })
    } catch (error) {
      console.error('Error al cargar datos del cliente:', error)
      toast.error('Error al cargar datos del cliente')
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres")
      return
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("La nueva contraseña y la confirmación no coinciden")
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetchWithAuth(getApiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        toast.success("Contraseña actualizada correctamente")
        setPasswordForm({ current: "", new: "", confirm: "", show: false })
      } else {
        toast.error(data.error || "Error al cambiar la contraseña")
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al cambiar la contraseña")
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!customer) return

    setSaving(true)
    try {
      // Obtener customerId de localStorage primero, luego de cookies como fallback
      let customerId = localStorage.getItem('customerId') || 
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("customerId="))
          ?.split("=")[1]
          ?.trim()

      if (!customerId) {
        toast.error('No se encontró información del cliente')
        return
      }

      const res = await fetchWithAuth(getApiUrl(`/api/customers/${customerId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          pais: formData.pais,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('Perfil actualizado exitosamente')
        setIsEditing(false)
        // Recargar datos actualizados
        await loadCustomerData()
      } else {
        toast.error(data.error || 'Error al actualizar el perfil')
      }
    } catch (error: any) {
      console.error('Error al guardar perfil:', error)
      toast.error(error.message || 'Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 bg-muted/50 rounded w-48 animate-pulse" />
          <div className="h-4 bg-muted/30 rounded w-96 animate-pulse" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex space-x-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-muted/40 rounded w-32 animate-pulse" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted/50 rounded w-40 mb-2 animate-pulse" />
                <div className="h-4 bg-muted/30 rounded w-56 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 bg-muted/40 rounded w-24 animate-pulse" />
                    <div className="h-10 bg-muted/30 rounded w-full animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">No hay datos disponibles</h3>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Básico': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Profesional': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Enterprise': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Custom': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleColor = (rol: string) => {
    return rol === 'Owner' 
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : 'bg-blue-100 text-blue-800 border-blue-200'
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Configuración</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? 'Cuenta de administrador · Perfil y seguridad' : 'Gestiona tu cuenta, seguridad y preferencias'}
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="shrink-0 gap-2">
            <Edit2 className="h-4 w-4" />
            Editar perfil
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => {
                setIsEditing(false)
                if (customer) {
                  setFormData({
                    nombre: customer.nombre || '',
                    apellido: customer.apellido || '',
                    email: customer.email || '',
                    telefono: customer.telefono || '',
                    pais: customer.pais || '',
                    cantidadAgentes: customer.cantidadAgentes ?? 0,
                    planContratado: customer.planContratado || 'Básico',
                    twoFactorAuth: customer.twoFactorAuth || false
                  })
                }
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} size="sm" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* 1. Cuenta administrador (admin) o Membresía (no admin) */}
        {isAdmin && (
          <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-b from-violet-50/80 to-card dark:from-violet-950/20 dark:to-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Cuenta administrador</CardTitle>
                  <CardDescription className="text-sm">SuperAdmin · Configuración del sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-800 font-medium">
                  SuperAdmin
                </Badge>
                <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/30">2FA Próximamente</Badge>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">País</span>
                  <span className="font-medium">{customer.pais || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inicio</span>
                  <span className="font-medium">
                    {customer.fechaInicio
                      ? new Date(customer.fechaInicio).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última actualización</span>
                  <span className="font-medium">
                    {customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isAdmin && (
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Membresía</CardTitle>
                  <CardDescription className="text-sm">Plan y uso de la cuenta</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getPlanColor(customer.planContratado) + " text-sm font-medium"}>
                  Plan {customer.planContratado}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Bot className="h-4 w-4" />
                  {customer.cantidadAgentes ?? 0} agentes
                </span>
              </div>
              <Separator />
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">2FA</span>
                  <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">Próximamente</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de inicio</span>
                  <span className="font-medium">
                    {customer.fechaInicio
                      ? new Date(customer.fechaInicio).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
                      : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. Información personal */}
        <Card className="overflow-hidden border-0 shadow-sm bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Información personal</CardTitle>
                  <CardDescription className="text-sm mt-0.5">Nombre, contacto y datos de la cuenta</CardDescription>
                </div>
              </div>
              <Badge className={getRoleColor(customer.rol) + " shrink-0 text-xs font-medium"}>
                {customer.rol}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-sm font-medium">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  disabled={!isEditing}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido" className="text-sm font-medium">Apellido</Label>
                <Input
                  id="apellido"
                  value={formData.apellido || ''}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  disabled={!isEditing}
                  className="h-10"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  disabled
                  className="h-10 bg-muted/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">El email no se puede modificar</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono" className="text-sm font-medium">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono || ''}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  disabled={!isEditing}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pais" className="text-sm font-medium">País</Label>
                <Input
                  id="pais"
                  value={formData.pais || ''}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  disabled={!isEditing}
                  className="h-10"
                />
              </div>
              {!isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="cantidadAgentes" className="text-sm font-medium">Cantidad de agentes</Label>
                  <Input
                    id="cantidadAgentes"
                    type="number"
                    value={formData.cantidadAgentes ?? 0}
                    disabled
                    className="h-10 bg-muted/50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Contacta con soporte para modificar</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Cambiar contraseña */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Cambiar contraseña</CardTitle>
                <CardDescription className="text-sm">Actualiza tu contraseña de acceso al panel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pw" className="text-sm font-medium">Contraseña actual</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={passwordForm.show ? 'text' : 'password'}
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                  placeholder="••••••••"
                  className="h-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setPasswordForm((p) => ({ ...p, show: !p.show }))}
                >
                  {passwordForm.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw" className="text-sm font-medium">Nueva contraseña</Label>
              <Input
                id="new-pw"
                type={passwordForm.show ? 'text' : 'password'}
                value={passwordForm.new}
                onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))}
                placeholder="Mín. 8 caracteres"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw" className="text-sm font-medium">Confirmar nueva contraseña</Label>
              <Input
                id="confirm-pw"
                type={passwordForm.show ? 'text' : 'password'}
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Repite la nueva contraseña"
                className="h-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const pwd = generateSecurePassword(16)
                  setPasswordForm((p) => ({ ...p, new: pwd, confirm: pwd, show: true }))
                  toast.success('Contraseña generada. Copia y guarda en un lugar seguro.')
                }}
              >
                <Key className="h-4 w-4" />
                Generar contraseña
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
                className="gap-2"
              >
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                {changingPassword ? 'Actualizando…' : 'Actualizar contraseña'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isAdmin && (
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Usuarios de la cuenta</CardTitle>
                <CardDescription className="text-sm">
                  Gestiona usuarios y roles dentro de tu cuenta
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingUser(null)
                setUserFormData({
                  email: "",
                  name: "",
                  password: "",
                  customerRole: "Employee",
                  isActive: true,
                })
                setIsUserDialogOpen(true)
              }}
              className="gap-2 text-xs sm:text-sm"
              size="sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              Agregar Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : accountUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No hay usuarios en esta cuenta</p>
              <p className="text-xs mt-2">Agrega usuarios para que puedan acceder al sistema</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accountUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm sm:text-base truncate">{user.name}</p>
                        {user.customerRole && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                            {user.customerRole}
                          </Badge>
                        )}
                        {user.isActive === false && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => {
                        setEditingUser(user)
                        setUserFormData({
                          email: user.email || "",
                          name: user.name || "",
                          password: "",
                          customerRole: (user.customerRole || "Employee") as CustomerRole,
                          isActive: user.isActive !== undefined ? user.isActive : true,
                        })
                        setIsUserDialogOpen(true)
                      }}
                    >
                      <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive"
                      onClick={() => {
                        setEditingUser(user)
                        setIsDeleteUserDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Dialog para crear/editar usuario */}
      <AlertDialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingUser ? "Editar Usuario" : "Agregar Usuario"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editingUser
                ? "Modifica la información del usuario de la cuenta"
                : "Agrega un nuevo usuario a esta cuenta"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-form-name" className="text-sm">Nombre *</Label>
              <Input
                id="user-form-name"
                value={userFormData.name}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, name: e.target.value })
                }
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-form-email" className="text-sm">Email *</Label>
              <Input
                id="user-form-email"
                type="email"
                value={userFormData.email}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, email: e.target.value })
                }
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-form-password" className="text-sm">
                Contraseña {editingUser ? "(dejar vacío para no cambiar)" : "*"}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="user-form-password"
                    type={showUserPassword ? "text" : "password"}
                    value={userFormData.password}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, password: e.target.value })
                    }
                    placeholder={editingUser ? "Nueva contraseña..." : "Contraseña"}
                    className="pr-10"
                  />
                  {userFormData.password && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                    >
                      {showUserPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newPassword = generateSecurePassword(16)
                    setUserFormData({ ...userFormData, password: newPassword })
                    setShowUserPassword(true)
                  }}
                  title="Generar contraseña segura"
                >
                  <Key className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-form-role" className="text-sm">Rol dentro de la cuenta *</Label>
              <Select
                value={userFormData.customerRole}
                onValueChange={(value: CustomerRole) =>
                  setUserFormData({ ...userFormData, customerRole: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin - Acceso completo</SelectItem>
                  <SelectItem value="Manager">Manager - Gestión y visualización</SelectItem>
                  <SelectItem value="Employee">Employee - Acceso estándar</SelectItem>
                  <SelectItem value="Viewer">Viewer - Solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="user-form-active"
                checked={userFormData.isActive}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, isActive: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="user-form-active" className="cursor-pointer text-sm">
                Usuario activo
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                // Obtener customerId de localStorage primero, luego de cookies como fallback
                let customerId = localStorage.getItem('customerId') || 
                  document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("customerId="))
                    ?.split("=")[1]
                    ?.trim()

                if (!customerId) {
                  toast.error("No se encontró la información de la cuenta")
                  return
                }

                if (!userFormData.name || !userFormData.email) {
                  toast.error("Nombre y email son requeridos")
                  return
                }
                if (!editingUser && !userFormData.password) {
                  toast.error("La contraseña es requerida para crear un nuevo usuario")
                  return
                }

                try {
                  if (editingUser) {
                    // Actualizar usuario existente
                    const body: any = {
                      name: userFormData.name,
                      email: userFormData.email,
                      customerRole: userFormData.customerRole,
                      isActive: userFormData.isActive,
                    }
                    if (userFormData.password) {
                      body.password = userFormData.password
                    }

                    const res = await fetch(
                      getApiUrl(`/api/customers/${customerId}/users/${editingUser._id}`),
                      {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                      }
                    )

                    const data = await res.json()
                    if (!data.success) {
                      throw new Error(data.error || "Error al actualizar usuario")
                    }

                    toast.success("Usuario actualizado exitosamente")
                  } else {
                    // Crear nuevo usuario
                    const res = await fetch(getApiUrl(`/api/customers/${customerId}/users`), {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: userFormData.name,
                        email: userFormData.email,
                        password: userFormData.password,
                        customerRole: userFormData.customerRole,
                        isActive: userFormData.isActive,
                      }),
                    })

                    const data = await res.json()
                    if (!data.success) {
                      throw new Error(data.error || "Error al crear usuario")
                    }

                    toast.success("Usuario creado exitosamente")
                  }

                  setIsUserDialogOpen(false)
                  setEditingUser(null)
                  loadAccountUsers()
                } catch (error: any) {
                  console.error("Error al guardar usuario:", error)
                  toast.error(error.message || "Error al guardar usuario")
                }
              }}
            >
              {editingUser ? "Guardar Cambios" : "Crear Usuario"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para eliminar usuario */}
      <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{" "}
              <strong>{editingUser?.name}</strong> ({editingUser?.email}) de esta cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!editingUser?._id) return

                // Obtener customerId de localStorage primero, luego de cookies como fallback
                let customerId = localStorage.getItem('customerId') || 
                  document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("customerId="))
                    ?.split("=")[1]
                    ?.trim()

                if (!customerId) {
                  toast.error("No se encontró la información de la cuenta")
                  return
                }

                try {
                  const res = await fetch(
                    getApiUrl(`/api/customers/${customerId}/users/${editingUser._id}`),
                    {
                      method: "DELETE",
                    }
                  )

                  const data = await res.json()
                  if (!data.success) {
                    throw new Error(data.error || "Error al eliminar usuario")
                  }

                  toast.success("Usuario eliminado exitosamente")
                  setIsDeleteUserDialogOpen(false)
                  setEditingUser(null)
                  loadAccountUsers()
                } catch (error: any) {
                  console.error("Error al eliminar usuario:", error)
                  toast.error(error.message || "Error al eliminar usuario")
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
