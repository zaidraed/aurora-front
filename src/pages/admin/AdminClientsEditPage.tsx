
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save, User, Database, Eye, EyeOff, Loader2, Layout, CheckSquare, Users, Plus, Trash2, Edit2, Shield, Key, Zap, Share2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import type { Customer, ViewFeature } from "@/lib/customer-types"
import type { User as UserType, CustomerRole } from "@/lib/types"
import { toast } from "sonner"
import { generateSecurePassword } from "@/lib/utils"
import { getApiUrl } from "@/lib/api-client"
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

// Todas las vistas/features disponibles
const ALL_VIEW_FEATURES: Array<{
  value: ViewFeature
  label: string
  description?: string
}> = [
  { value: "dashboard", label: "Dashboard", description: "Vista principal con métricas" },
  { value: "agentes", label: "Agentes", description: "Gestión de agentes IA" },
  { value: "ubicaciones", label: "Ubicaciones", description: "Análisis geográfico" },
  { value: "analiticas", label: "Analíticas", description: "Estadísticas y reportes" },
  { value: "kommo", label: "Kommo", description: "Integración con Kommo CRM" },
  { value: "equipo", label: "Equipo", description: "Gestión del equipo" },
  { value: "configuracion", label: "Configuración", description: "Ajustes del sistema" },
  { value: "consultas", label: "Consultas", description: "Consultas específicas (HubsAutos)" },
  { value: "tokens", label: "Tokens", description: "Gestión de tokens de OpenAI" },
]

// Función para enmascarar credenciales (mostrar últimos caracteres)
function maskCredential(value: string, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars) {
    return "****"
  }
  const masked = "*".repeat(Math.max(8, value.length - visibleChars))
  const visible = value.slice(-visibleChars)
  return masked + visible
}

// Función para obtener vistas por defecto según el plan
function getDefaultViewsForPlan(
  plan: "Básico" | "Profesional" | "Enterprise" | "Custom"
): ViewFeature[] {
  switch (plan) {
    case "Básico":
      return ["dashboard", "agentes", "configuracion"]
    case "Profesional":
      return ["dashboard", "agentes", "ubicaciones", "analiticas", "equipo", "configuracion"]
    case "Enterprise":
      return [
        "dashboard",
        "agentes",
        "ubicaciones",
        "analiticas",
        "kommo",
        "equipo",
        "configuracion",
        "consultas",
      ]
    case "Custom":
      return [
        "dashboard",
        "agentes",
        "ubicaciones",
        "analiticas",
        "kommo",
        "equipo",
        "configuracion",
        "consultas",
      ]
    default:
      return ["dashboard", "configuracion"]
  }
}

export default function EditClientPage() {
  const navigate = useNavigate()
  const params = useParams()
  const customerId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)
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
  
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    pais: "",
    cantidadAgentes: 1,
    planContratado: "Básico" as "Básico" | "Profesional" | "Enterprise" | "Custom",
    rol: "Cliente" as "Cliente" | "Owner",
    // Credenciales de Kommo
    kommoBaseUrl: "",
    kommoAccessToken: "",
    kommoIntegrationId: "",
    kommoSecretKey: "",
    hasKommoCredentials: false,
    showKommoToken: false,
    showKommoSecret: false,
    adminPassword: "",
    credentialsUnlocked: false,
    loadingCredentials: false,
    // Estados para credenciales enmascaradas
    kommoAccessTokenMasked: "",
    kommoSecretKeyMasked: "",
    /** Account ID que envía Kommo en webhooks (ej. 35875379); si la URL no usa ese número como subdominio */
    kommoAccountId: "",
    /** Cuentas Kommo adicionales (2, 3, ...); la primera se usa con los campos kommo* de arriba */
    kommoAccountsExtra: [] as Array<{ baseUrl: string; accountId: string; accessToken: string; integrationId: string; secretKey: string }>,
    postgresConnectionStringMasked: "",
    // Estados para popup de contraseña
    showPasswordDialog: false,
    passwordDialogType: "" as "kommo" | "postgres" | "openai" | "metaCapi" | "",
    passwordDialogField: "" as "token" | "secret" | "connection" | "apikey" | "metaCapiToken" | "",
    // Credenciales de PostgreSQL/n8n
    postgresConnectionString: "",
    hasPostgresCredentials: false,
    showPostgresConnection: false,
    // Credenciales de OpenAI
    openAIApiKey: "",
    openAIOrganizationId: "",
    openAIProjectId: "",
    hasOpenAICredentials: false,
    showOpenAIApiKey: false,
    openAIApiKeyMasked: "",
    // Meta Conversions API (CAPI) – sincronización con Kommo
    metaCapiPixelId: "",
    metaCapiAccessToken: "",
    metaCapiAdAccountId: "",
    hasMetaCapiCredentials: false,
    showMetaCapiToken: false,
    metaCapiAccessTokenMasked: "",
    // Vistas/Features habilitadas
    enabledViews: [] as ViewFeature[],
  })

  // Cargar datos del cliente al montar el componente
  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/customers/${customerId}`))
        const data = await res.json()

        if (!data.success) {
          throw new Error(data.error || "Error al cargar cliente")
        }

        const customerData = data.data
        setCustomer(customerData)

        // Detectar si hay credenciales configuradas para mostrar versiones enmascaradas
        const hasKommo = !!customerData.hasKommoCredentials || !!customerData.kommoBaseUrl
        const hasPostgres = !!customerData.hasPostgresCredentials
        const hasOpenAI = !!customerData.hasOpenAICredentials
        const hasMetaCapi = !!customerData.metaCapiCredentials
        
        // Cargar credenciales enmascaradas si existen
        let kommoAccessTokenMasked = ""
        let kommoSecretKeyMasked = ""
        let postgresConnectionStringMasked = ""
        let openAIApiKeyMasked = ""
        let kommoIntegrationId = customerData.kommoCredentials?.integrationId || ""
        let metaCapiPixelId = customerData.metaCapiCredentials?.pixelId || ""
        let metaCapiAdAccountId = customerData.metaCapiCredentials?.adAccountId || ""
        let metaCapiAccessTokenMasked = ""
        
        if (hasKommo || hasPostgres || hasOpenAI || hasMetaCapi) {
          try {
            const maskedRes = await fetch(getApiUrl(`/api/customers/${customerId}/credentials/masked`))
            const maskedData = await maskedRes.json()
            
            console.log('[LOAD CUSTOMER] Credenciales enmascaradas recibidas:', maskedData)
            
            if (maskedData.success) {
              kommoAccessTokenMasked = maskedData.data.kommo?.accessTokenMasked || ""
              kommoSecretKeyMasked = maskedData.data.kommo?.secretKeyMasked || ""
              postgresConnectionStringMasked = maskedData.data.postgres?.connectionStringMasked || ""
              openAIApiKeyMasked = maskedData.data.openAI?.apiKeyMasked || maskedData.data.openai?.apiKeyMasked || ""
              if (maskedData.data.metaCapi) {
                metaCapiPixelId = maskedData.data.metaCapi.pixelId || metaCapiPixelId
                metaCapiAdAccountId = maskedData.data.metaCapi.adAccountId || metaCapiAdAccountId
                metaCapiAccessTokenMasked = maskedData.data.metaCapi.hasAccessToken ? "••••••••" : ""
              }
              if (maskedData.data.kommo?.integrationId) {
                kommoIntegrationId = maskedData.data.kommo.integrationId
              }
              
              console.log('[LOAD CUSTOMER] Credenciales enmascaradas procesadas:', {
                kommoAccessTokenMasked,
                kommoSecretKeyMasked,
                postgresConnectionStringMasked,
                kommoIntegrationId,
                metaCapiPixelId,
                metaCapiAccessTokenMasked: !!metaCapiAccessTokenMasked,
              })
            }
          } catch (error) {
            console.error("Error al cargar credenciales enmascaradas:", error)
          }
        }
        
        // Actualizar formData con los datos del cliente
        setFormData({
          nombre: customerData.nombre || "",
          apellido: customerData.apellido || "",
          email: customerData.email || "",
          telefono: customerData.telefono || "",
          pais: customerData.pais || "",
          cantidadAgentes: customerData.cantidadAgentes || 1,
          planContratado: customerData.planContratado || "Básico",
          rol: customerData.rol || "Cliente",
          kommoBaseUrl: customerData.kommoCredentials?.baseUrl || "",
          kommoAccountId: (customerData.kommoCredentials as any)?.accountId || "",
          kommoAccessToken: "",
          kommoIntegrationId: kommoIntegrationId,
          kommoSecretKey: "",
          hasKommoCredentials: hasKommo,
          showKommoToken: false,
          showKommoSecret: false,
          adminPassword: "",
          credentialsUnlocked: false,
          loadingCredentials: false,
          // Credenciales enmascaradas (mostrar si existen pero no están desbloqueadas)
          kommoAccessTokenMasked: kommoAccessTokenMasked,
          kommoSecretKeyMasked: kommoSecretKeyMasked,
          // Primera cuenta = kommoCredentials; el array kommoAccounts son las cuentas 2, 3, ...
          kommoAccountsExtra: (customerData.kommoAccounts && customerData.kommoAccounts.length > 0)
            ? customerData.kommoAccounts.map((a: any) => ({
                baseUrl: a.baseUrl || "",
                accountId: a.accountId || "",
                accessToken: "__KEEP__",
                integrationId: a.integrationId || "",
                secretKey: a.secretKey ? "__KEEP__" : "",
              }))
            : [],
          postgresConnectionStringMasked: postgresConnectionStringMasked,
          postgresConnectionString: "",
          hasPostgresCredentials: hasPostgres,
          showPostgresConnection: false,
          openAIApiKey: "",
          openAIOrganizationId: customerData.openAICredentials?.organizationId || "",
          openAIProjectId: customerData.openAICredentials?.projectId || "",
          hasOpenAICredentials: hasOpenAI,
          showOpenAIApiKey: false,
          openAIApiKeyMasked: openAIApiKeyMasked,
          metaCapiPixelId,
          metaCapiAccessToken: "",
          metaCapiAdAccountId,
          hasMetaCapiCredentials: hasMetaCapi,
          showMetaCapiToken: false,
          metaCapiAccessTokenMasked,
          enabledViews: customerData.enabledViews || [],
        })

      } catch (error) {
        console.error("Error al cargar cliente:", error)
        toast.error("Error al cargar los datos del cliente")
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      loadCustomer()
    }
  }, [customerId])

  const unlockCredentials = async () => {
    if (!formData.adminPassword) {
      toast.error("Por favor ingresa tu contraseña de administrador")
      return
    }

    try {
      setFormData((prev) => ({ ...prev, loadingCredentials: true }))
      const res = await fetch(getApiUrl(`/api/customers/${customerId}/credentials`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: formData.adminPassword }),
      })

      const data = await res.json()

      if (data.success) {
        const credentials = data.data
        setFormData((prev) => ({
          ...prev,
          credentialsUnlocked: true,
          loadingCredentials: false,
          adminPassword: "",
          showPasswordDialog: false,
          // Cargar credenciales de Kommo si existen
          kommoAccessToken: credentials.kommo?.accessToken || "",
          kommoIntegrationId: credentials.kommo?.integrationId || "",
          kommoSecretKey: credentials.kommo?.secretKey || "",
          // Limpiar credenciales enmascaradas cuando se desbloquean
          kommoAccessTokenMasked: "",
          kommoSecretKeyMasked: "",
          postgresConnectionString: credentials.postgres?.connectionString || "",
          postgresConnectionStringMasked: "",
          openAIApiKey: (credentials.openAI || credentials.openai)?.apiKey || "",
          openAIOrganizationId: (credentials.openAI || credentials.openai)?.organizationId || "",
          openAIProjectId: (credentials.openAI || credentials.openai)?.projectId || "",
          openAIApiKeyMasked: "",
          metaCapiPixelId: credentials.metaCapi?.pixelId ?? prev.metaCapiPixelId,
          metaCapiAccessToken: credentials.metaCapi?.accessToken || "",
          metaCapiAdAccountId: credentials.metaCapi?.adAccountId ?? prev.metaCapiAdAccountId ?? "",
          metaCapiAccessTokenMasked: "",
          passwordDialogType: "",
          passwordDialogField: "",
        }))
        toast.success("Credenciales desbloqueadas correctamente")
      } else {
        toast.error(data.error || "Error al desbloquear credenciales")
        setFormData((prev) => ({ ...prev, loadingCredentials: false }))
      }
    } catch (error) {
      console.error("Error al desbloquear credenciales:", error)
      toast.error("Error al desbloquear credenciales")
      setFormData((prev) => ({ ...prev, loadingCredentials: false }))
    }
  }

  // Función para cargar usuarios de la cuenta
  const loadAccountUsers = async () => {
    try {
      setLoadingUsers(true)
      const res = await fetch(getApiUrl(`/api/customers/${customerId}/users`))
      const data = await res.json()

      if (data.success) {
        setAccountUsers(data.data)
      } else {
        toast.error(data.error || "Error al cargar usuarios")
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
      toast.error("Error al cargar usuarios")
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const customerBody: any = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        pais: formData.pais,
        cantidadAgentes: formData.cantidadAgentes,
        planContratado: formData.planContratado,
        rol: formData.rol,
        enabledViews: formData.enabledViews,
      }

      console.log('[SAVE CUSTOMER] Datos a guardar:', {
        ...customerBody,
        enabledViews: formData.enabledViews,
        hasKommoCredentials: formData.hasKommoCredentials,
        hasPostgresCredentials: formData.hasPostgresCredentials,
      })

      // Primera cuenta = kommoCredentials; cuentas 2, 3, ... = kommoAccounts (solo las extra)
      if (formData.kommoAccountsExtra.length > 0) {
        customerBody.kommoAccounts = formData.kommoAccountsExtra
          .filter((acc) => acc.baseUrl && (acc.accessToken === "__KEEP__" || (acc.accessToken && acc.accessToken.length > 0)))
          .map((acc) => ({
            baseUrl: acc.baseUrl,
            accountId: acc.accountId?.trim() || undefined,
            accessToken: acc.accessToken === "__KEEP__" ? "__KEEP__" : (acc.accessToken || ""),
            integrationId: acc.integrationId || undefined,
            secretKey: acc.secretKey === "__KEEP__" ? "__KEEP__" : (acc.secretKey || undefined),
          }))
        // Actualizar primera cuenta solo si el usuario desbloqueó y editó (evitar sobrescribir con vacío)
        if (formData.kommoBaseUrl && formData.credentialsUnlocked && formData.kommoAccessToken) {
          customerBody.kommoCredentials = {
            baseUrl: formData.kommoBaseUrl,
            accountId: formData.kommoAccountId?.trim() || undefined,
            accessToken: formData.kommoAccessToken,
            integrationId: formData.kommoIntegrationId || undefined,
            secretKey: formData.kommoSecretKey || undefined,
          }
        }
      } else if (formData.hasKommoCredentials && formData.kommoBaseUrl && formData.kommoAccessToken) {
        customerBody.kommoCredentials = {
          baseUrl: formData.kommoBaseUrl,
          accountId: formData.kommoAccountId?.trim() || undefined,
          accessToken: formData.kommoAccessToken,
          integrationId: formData.kommoIntegrationId || undefined,
          secretKey: formData.kommoSecretKey || undefined,
        }
      }

      // Agregar credenciales de PostgreSQL si se proporcionaron
      if (formData.hasPostgresCredentials && formData.postgresConnectionString) {
        customerBody.postgresCredentials = {
          connectionString: formData.postgresConnectionString,
        }
      }

      // Meta Conversions API (CAPI) – sincronización con Kommo
      if (formData.metaCapiPixelId?.trim() && formData.metaCapiAccessToken) {
        customerBody.metaCapiCredentials = {
          pixelId: formData.metaCapiPixelId.trim(),
          accessToken: formData.metaCapiAccessToken,
          adAccountId: formData.metaCapiAdAccountId?.trim() || undefined,
        }
      }

      // Agregar credenciales de OpenAI si se proporcionaron
      // Si hay una API key ingresada (ya sea nueva o desbloqueada), guardarla
      if (formData.openAIApiKey && formData.openAIApiKey.trim()) {
        customerBody.openAICredentials = {
          apiKey: formData.openAIApiKey,
          organizationId: formData.openAIOrganizationId?.trim() || undefined,
          projectId: formData.openAIProjectId?.trim() || undefined,
        }
      } else if (formData.openAIOrganizationId || formData.openAIProjectId) {
        // Si solo se actualizan organizationId o projectId sin cambiar la API key
        // Necesitamos obtener la API key existente
        const existingRes = await fetch(getApiUrl(`/api/customers/${customerId}`))
        const existingData = await existingRes.json()
        if (existingData.success && existingData.data.hasOpenAICredentials) {
          // Desbloquear credenciales temporalmente para obtener la API key
          const credsRes = await fetch(getApiUrl(`/api/customers/${customerId}/credentials`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: formData.adminPassword || 'temp' }),
          })
          if (credsRes.ok) {
            const credsData = await credsRes.json()
            if (credsData.success && credsData.data.openai) {
              customerBody.openAICredentials = {
                apiKey: credsData.data.openai.apiKey,
                organizationId: formData.openAIOrganizationId?.trim() || credsData.data.openai.organizationId,
                projectId: formData.openAIProjectId?.trim() || credsData.data.openai.projectId,
              }
            }
          }
        }
      }

      // Actualizar cliente
      const res = await fetch(getApiUrl(`/api/customers/${customerId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerBody),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Error al actualizar cliente")
      }


      toast.success("Cliente actualizado exitosamente")
      navigate("/admin/clients")
    } catch (error: any) {
      console.error("Error al guardar:", error)
      toast.error(error.message || "Error al guardar los cambios")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/clients")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Cliente</h1>
            <p className="text-muted-foreground mt-1">
              Modifica la información del cliente, usuario de acceso y credenciales
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customer" className="space-y-6" onValueChange={(value) => {
        if (value === "account-users") {
          loadAccountUsers()
        }
      }}>
        <TabsList className="grid w-full grid-cols-7 h-12">
          <TabsTrigger value="customer" className="text-sm font-medium">
            Datos del Cliente
          </TabsTrigger>
          <TabsTrigger value="features" className="text-sm font-medium">
            Vistas/Features
          </TabsTrigger>
          <TabsTrigger value="account-users" className="text-sm font-medium">
            Usuarios de la Cuenta
          </TabsTrigger>
          <TabsTrigger value="kommo" className="text-sm font-medium">
            Credenciales Kommo
          </TabsTrigger>
          <TabsTrigger value="postgres" className="text-sm font-medium">
            Credenciales PostgreSQL
          </TabsTrigger>
          <TabsTrigger value="openai" className="text-sm font-medium">
            Credenciales OpenAI
          </TabsTrigger>
          <TabsTrigger value="metaCapi" className="text-sm font-medium">
            Meta CAPI
          </TabsTrigger>
        </TabsList>

        {/* Tab: Datos del Cliente */}
        <TabsContent value="customer">
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
              <CardDescription>
                Datos básicos y configuración del plan del cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información Personal</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-sm font-medium">
                      Nombre *
                    </Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido" className="text-sm font-medium">
                      Apellido *
                    </Label>
                    <Input
                      id="apellido"
                      value={formData.apellido}
                      onChange={(e) =>
                        setFormData({ ...formData, apellido: e.target.value })
                      }
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Información de Contacto</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-sm font-medium">
                      Teléfono
                    </Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData({ ...formData, telefono: e.target.value })
                      }
                      className="h-10"
                      placeholder="+54 11 1234 5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pais" className="text-sm font-medium">
                      País
                    </Label>
                    <Input
                      id="pais"
                      value={formData.pais}
                      onChange={(e) =>
                        setFormData({ ...formData, pais: e.target.value })
                      }
                      className="h-10"
                      placeholder="Argentina"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Configuración del Plan</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="cantidadAgentes" className="text-sm font-medium">
                      Cantidad de Agentes
                    </Label>
                    <Input
                      id="cantidadAgentes"
                      type="number"
                      min="1"
                      value={formData.cantidadAgentes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cantidadAgentes: parseInt(e.target.value) || 1,
                        })
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planContratado" className="text-sm font-medium">
                      Plan Contratado
                    </Label>
                    <Select
                      value={formData.planContratado}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, planContratado: value })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Básico">Básico</SelectItem>
                        <SelectItem value="Profesional">Profesional</SelectItem>
                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rol" className="text-sm font-medium">
                      Rol
                    </Label>
                    <Select
                      value={formData.rol}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, rol: value })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cliente">Cliente</SelectItem>
                        <SelectItem value="Owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Vistas/Features */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Vistas y Features Habilitadas</CardTitle>
              <CardDescription>
                Selecciona qué vistas/features tendrá acceso este cliente en el dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                <Layout className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Plan actual: <span className="text-primary">{formData.planContratado}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Puedes personalizar las vistas independientemente del plan
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Aplicar vistas por defecto según el plan
                    const defaultViews = getDefaultViewsForPlan(formData.planContratado)
                    setFormData({ ...formData, enabledViews: defaultViews })
                    toast.success(`Vistas del plan ${formData.planContratado} aplicadas`)
                  }}
                >
                  Aplicar vistas del plan
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Vistas Disponibles</h3>
                <div className="grid grid-cols-2 gap-4">
                  {ALL_VIEW_FEATURES.map((feature) => (
                    <div
                      key={feature.value}
                      className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={feature.value}
                        checked={formData.enabledViews.includes(feature.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              enabledViews: [...formData.enabledViews, feature.value],
                            })
                          } else {
                            setFormData({
                              ...formData,
                              enabledViews: formData.enabledViews.filter(
                                (v) => v !== feature.value
                              ),
                            })
                          }
                        }}
                      />
                      <Label
                        htmlFor={feature.value}
                        className="flex-1 cursor-pointer font-medium"
                      >
                        {feature.label}
                      </Label>
                      {feature.description && (
                        <p className="text-xs text-muted-foreground">
                          {feature.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {formData.enabledViews.length === 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Advertencia:</strong> No hay vistas habilitadas. El cliente no podrá
                    acceder a ninguna sección del dashboard.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Usuarios de la Cuenta */}
        <TabsContent value="account-users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuarios de la Cuenta</CardTitle>
                  <CardDescription>
                    Gestiona los usuarios y roles dentro de esta cuenta de cliente
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingUser(null)
                  setUserFormData({
                    email: "",
                    name: "",
                    password: "",
                    customerRole: "Employee",
                    isActive: true,
                  })
                  setIsUserDialogOpen(true)
                }} className="gap-2">
                  <Plus className="h-4 w-4" />
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
                  <p>No hay usuarios en esta cuenta</p>
                  <p className="text-sm mt-2">Agrega usuarios para que puedan acceder al sistema</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accountUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{user.name}</p>
                            {user.customerRole && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                {user.customerRole}
                              </Badge>
                            )}
                            {user.isActive === false && (
                              <Badge variant="secondary" className="text-xs">
                                Inactivo
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
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
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingUser(user)
                            setIsDeleteUserDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Credenciales Kommo */}
        <TabsContent value="kommo">
          <Card>
            <CardHeader>
              <CardTitle>Credenciales Kommo</CardTitle>
              <CardDescription>
                Configura las credenciales de API de Kommo CRM para este cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6 border rounded-lg p-6 bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="h-5 w-5 text-primary" />
                    <h4 className="text-lg font-semibold">Credenciales de Kommo CRM</h4>
                  </div>

                  {/* Mostrar URL base siempre */}
                  <div className="space-y-2">
                    <Label htmlFor="kommoBaseUrl" className="text-sm font-medium">
                      URL Base de Kommo *
                    </Label>
                    <Input
                      id="kommoBaseUrl"
                      value={formData.kommoBaseUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, kommoBaseUrl: e.target.value })
                      }
                      placeholder="https://tu-cuenta.kommo.com"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL base de tu cuenta de Kommo (ej:
                      https://dotscomagency.kommo.com)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kommoAccountId" className="text-sm font-medium">
                      Account ID (para webhooks)
                    </Label>
                    <Input
                      id="kommoAccountId"
                      value={formData.kommoAccountId}
                      onChange={(e) =>
                        setFormData({ ...formData, kommoAccountId: e.target.value })
                      }
                      placeholder="35875379"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Número que Kommo envía en los webhooks (account.id). Si tu URL no usa ese número como subdominio, ingresalo acá para que los webhooks identifiquen esta cuenta.
                    </p>
                  </div>

                  {/* Mostrar credenciales enmascaradas por defecto o completas si están desbloqueadas */}
                  <div className="space-y-4">
                    {!formData.hasKommoCredentials && !formData.kommoAccessTokenMasked && (
                      <div className="bg-muted/50 border border-dashed rounded-lg p-4 text-center">
                        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium text-muted-foreground">No se han configurado credenciales aún</p>
                        <p className="text-xs mt-1 text-muted-foreground">Completa los campos para configurar las credenciales de Kommo</p>
                      </div>
                    )}
                      <div className="space-y-2">
                        <Label htmlFor="kommoAccessToken" className="text-sm font-medium">
                          Access Token *
                        </Label>
                        <div className="relative">
                          <Input
                            id="kommoAccessToken"
                            type={formData.credentialsUnlocked && formData.showKommoToken ? "text" : "password"}
                            value={formData.credentialsUnlocked ? formData.kommoAccessToken : (formData.kommoAccessTokenMasked || "")}
                            onChange={(e) => {
                              if (formData.credentialsUnlocked || !formData.kommoAccessTokenMasked) {
                                setFormData({
                                  ...formData,
                                  kommoAccessToken: e.target.value,
                                })
                              }
                            }}
                            disabled={!formData.credentialsUnlocked && !!formData.kommoAccessTokenMasked}
                            placeholder={formData.credentialsUnlocked || !formData.kommoAccessTokenMasked ? "Token de acceso de Kommo" : ""}
                            className="h-10 pr-10 font-mono text-sm"
                          />
                          {(formData.kommoAccessTokenMasked || formData.credentialsUnlocked) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                              onClick={() => {
                                if (!formData.credentialsUnlocked && formData.kommoAccessTokenMasked) {
                                  // Abrir popup para pedir contraseña
                                  setFormData({
                                    ...formData,
                                    showPasswordDialog: true,
                                    passwordDialogType: "kommo",
                                    passwordDialogField: "token",
                                  })
                                } else if (formData.credentialsUnlocked) {
                                  setFormData({
                                    ...formData,
                                    showKommoToken: !formData.showKommoToken,
                                  })
                                }
                              }}
                            >
                              {formData.credentialsUnlocked && formData.showKommoToken ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                        {!formData.credentialsUnlocked && formData.kommoAccessTokenMasked && (
                          <p className="text-xs text-muted-foreground">
                            Credencial configurada. Haz clic en el ojo para ver o editar.
                          </p>
                        )}
                        {(formData.credentialsUnlocked || !formData.kommoAccessTokenMasked) && (
                          <p className="text-xs text-muted-foreground">
                            Access Token obtenido desde el panel de integraciones de Kommo
                          </p>
                        )}
                      </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="kommoIntegrationId"
                          className="text-sm font-medium"
                        >
                          Integration ID (Opcional)
                        </Label>
                        <Input
                          id="kommoIntegrationId"
                          value={formData.kommoIntegrationId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              kommoIntegrationId: e.target.value,
                            })
                          }
                          placeholder="ID de integración"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kommoSecretKey" className="text-sm font-medium">
                          Secret Key (Opcional)
                        </Label>
                        <div className="relative">
                          <Input
                            id="kommoSecretKey"
                            type={formData.credentialsUnlocked && formData.showKommoSecret ? "text" : "password"}
                            value={formData.credentialsUnlocked ? formData.kommoSecretKey : (formData.kommoSecretKeyMasked || "")}
                            onChange={(e) => {
                              if (formData.credentialsUnlocked || !formData.kommoSecretKeyMasked) {
                                setFormData({
                                  ...formData,
                                  kommoSecretKey: e.target.value,
                                })
                              }
                            }}
                            disabled={!formData.credentialsUnlocked && !!formData.kommoSecretKeyMasked}
                            placeholder={formData.credentialsUnlocked || !formData.kommoSecretKeyMasked ? "Secret key" : ""}
                            className="h-10 pr-10 font-mono text-sm"
                          />
                          {(formData.kommoSecretKeyMasked || formData.credentialsUnlocked) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                              onClick={() => {
                                if (!formData.credentialsUnlocked && formData.kommoSecretKeyMasked) {
                                  // Abrir popup para pedir contraseña
                                  setFormData({
                                    ...formData,
                                    showPasswordDialog: true,
                                    passwordDialogType: "kommo",
                                    passwordDialogField: "secret",
                                  })
                                } else if (formData.credentialsUnlocked) {
                                  setFormData({
                                    ...formData,
                                    showKommoSecret: !formData.showKommoSecret,
                                  })
                                }
                              }}
                            >
                              {formData.credentialsUnlocked && formData.showKommoSecret ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg mt-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Nota de seguridad:</strong> Las credenciales se
                      encriptarán automáticamente antes de guardarse en la base de
                      datos.
                    </p>
                  </div>

                  {formData.kommoAccountsExtra.length > 0 && (
                    <div className="space-y-4 mt-8 pt-6 border-t">
                      <h4 className="text-sm font-semibold">Otras cuentas Kommo</h4>
                      {formData.kommoAccountsExtra.map((acc, idx) => (
                        <div key={idx} className="flex flex-col gap-3 p-4 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Kommo {idx + 2}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  kommoAccountsExtra: formData.kommoAccountsExtra.filter((_, i) => i !== idx),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Quitar
                            </Button>
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs">URL base *</Label>
                            <Input
                              value={acc.baseUrl}
                              onChange={(e) => {
                                const next = [...formData.kommoAccountsExtra]
                                next[idx] = { ...next[idx], baseUrl: e.target.value }
                                setFormData({ ...formData, kommoAccountsExtra: next })
                              }}
                              placeholder="https://cuenta2.kommo.com"
                              className="h-9"
                            />
                            <Label className="text-xs">Account ID (para webhooks)</Label>
                            <Input
                              value={acc.accountId ?? ""}
                              onChange={(e) => {
                                const next = [...formData.kommoAccountsExtra]
                                next[idx] = { ...next[idx], accountId: e.target.value }
                                setFormData({ ...formData, kommoAccountsExtra: next })
                              }}
                              placeholder="Ej. 35875379"
                              className="h-9"
                            />
                            <Label className="text-xs">Access Token *</Label>
                            <Input
                              type="password"
                              value={acc.accessToken === "__KEEP__" ? "" : acc.accessToken}
                              onChange={(e) => {
                                const next = [...formData.kommoAccountsExtra]
                                const val = e.target.value
                                next[idx] = { ...next[idx], accessToken: val }
                                setFormData({ ...formData, kommoAccountsExtra: next })
                              }}
                              placeholder={acc.accessToken === "__KEEP__" ? "•••••••• (mantener actual)" : "Token de la segunda cuenta"}
                              className="h-9 font-mono text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Integration ID</Label>
                                <Input
                                  value={acc.integrationId}
                                  onChange={(e) => {
                                    const next = [...formData.kommoAccountsExtra]
                                    next[idx] = { ...next[idx], integrationId: e.target.value }
                                    setFormData({ ...formData, kommoAccountsExtra: next })
                                  }}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Secret Key</Label>
                                <Input
                                  type="password"
                                  value={acc.secretKey === "__KEEP__" ? "" : acc.secretKey}
                                  onChange={(e) => {
                                    const next = [...formData.kommoAccountsExtra]
                                    next[idx] = { ...next[idx], secretKey: e.target.value }
                                    setFormData({ ...formData, kommoAccountsExtra: next })
                                  }}
                                  placeholder={acc.secretKey === "__KEEP__" ? "•••• (mantener)" : "Opcional"}
                                  className="h-9 font-mono text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        kommoAccountsExtra: [
                          ...formData.kommoAccountsExtra,
                          { baseUrl: "", accountId: "", accessToken: "", integrationId: "", secretKey: "" },
                        ],
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar otra cuenta Kommo
                  </Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Credenciales PostgreSQL */}
        <TabsContent value="postgres">
          <Card>
            <CardHeader>
              <CardTitle>Credenciales PostgreSQL</CardTitle>
              <CardDescription>
                Configura las credenciales de PostgreSQL/n8n para este cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6 border rounded-lg p-6 bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="h-5 w-5 text-primary" />
                    <h4 className="text-lg font-semibold">
                      Credenciales de PostgreSQL/n8n
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {!formData.hasPostgresCredentials && !formData.postgresConnectionStringMasked && (
                      <div className="bg-muted/50 border border-dashed rounded-lg p-4 text-center">
                        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium text-muted-foreground">No se han configurado credenciales aún</p>
                        <p className="text-xs mt-1 text-muted-foreground">Completa el campo para configurar las credenciales de PostgreSQL</p>
                      </div>
                    )}
                    {/* Mostrar connection string enmascarado por defecto o completo si está desbloqueado */}
                    <div className="space-y-2">
                        <Label
                          htmlFor="postgresConnectionString"
                          className="text-sm font-medium"
                        >
                          Connection String *
                        </Label>
                        <div className="relative">
                          <Input
                            id="postgresConnectionString"
                            type={formData.credentialsUnlocked && formData.showPostgresConnection ? "text" : "password"}
                            value={formData.credentialsUnlocked ? formData.postgresConnectionString : (formData.postgresConnectionStringMasked || "")}
                            onChange={(e) => {
                              if (formData.credentialsUnlocked || !formData.postgresConnectionStringMasked) {
                                setFormData({
                                  ...formData,
                                  postgresConnectionString: e.target.value,
                                })
                              }
                            }}
                            disabled={!formData.credentialsUnlocked && !!formData.postgresConnectionStringMasked}
                            placeholder={formData.credentialsUnlocked || !formData.postgresConnectionStringMasked ? "postgresql://user:password@host:port/database" : ""}
                            className="h-10 pr-10 font-mono text-sm"
                          />
                          {(formData.postgresConnectionStringMasked || formData.credentialsUnlocked) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                              onClick={() => {
                                if (!formData.credentialsUnlocked && formData.postgresConnectionStringMasked) {
                                  // Abrir popup para pedir contraseña
                                  setFormData({
                                    ...formData,
                                    showPasswordDialog: true,
                                    passwordDialogType: "postgres",
                                    passwordDialogField: "connection",
                                  })
                                } else if (formData.credentialsUnlocked) {
                                  setFormData({
                                    ...formData,
                                    showPostgresConnection: !formData.showPostgresConnection,
                                  })
                                }
                              }}
                            >
                              {formData.credentialsUnlocked && formData.showPostgresConnection ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                        {!formData.credentialsUnlocked && formData.postgresConnectionStringMasked && (
                          <p className="text-xs text-muted-foreground">
                            Credencial configurada. Haz clic en el ojo para ver o editar.
                          </p>
                        )}
                        {formData.credentialsUnlocked && (
                          <p className="text-xs text-muted-foreground">
                            Connection string completo de PostgreSQL (ej:
                            postgresql://postgres:password@host:port/database)
                          </p>
                        )}
                      </div>
                    {formData.hasPostgresCredentials && formData.postgresConnectionStringMasked && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-lg mt-3">
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          <strong>Nota:</strong> Si ya existen credenciales
                          configuradas, deja este campo vacío para mantenerlas. Solo
                          completa el campo si deseas actualizarlas.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg mt-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Nota de seguridad:</strong> La connection string se
                      encriptará automáticamente antes de guardarse en la base de
                      datos.
                    </p>
                  </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Credenciales OpenAI */}
        <TabsContent value="openai">
          <Card>
            <CardHeader>
              <CardTitle>Credenciales OpenAI</CardTitle>
              <CardDescription>
                Configura la API key de OpenAI para este cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6 border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="h-5 w-5 text-primary" />
                  <h4 className="text-lg font-semibold">API Key de OpenAI</h4>
                </div>

                <div className="space-y-4">
                  {!formData.hasOpenAICredentials && !formData.openAIApiKeyMasked && (
                    <div className="bg-muted/50 border border-dashed rounded-lg p-4 text-center">
                      <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium text-muted-foreground">No se ha configurado API key aún</p>
                      <p className="text-xs mt-1 text-muted-foreground">Completa el campo para configurar la API key de OpenAI</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="openAIApiKey" className="text-sm font-medium">
                      API Key de OpenAI *
                    </Label>
                    <div className="relative">
                      <Input
                        id="openAIApiKey"
                        type={formData.credentialsUnlocked && formData.showOpenAIApiKey ? "text" : "password"}
                        value={formData.credentialsUnlocked || !formData.openAIApiKeyMasked ? formData.openAIApiKey : (formData.openAIApiKeyMasked || "")}
                        onChange={(e) => {
                          // Permitir editar si las credenciales están desbloqueadas o si no hay una API key enmascarada (nueva)
                          if (formData.credentialsUnlocked || !formData.openAIApiKeyMasked) {
                            setFormData({
                              ...formData,
                              openAIApiKey: e.target.value,
                            })
                          }
                        }}
                        disabled={!formData.credentialsUnlocked && !!formData.openAIApiKeyMasked}
                        placeholder={formData.credentialsUnlocked || !formData.openAIApiKeyMasked ? "sk-..." : ""}
                        className="h-10 pr-10 font-mono text-sm"
                      />
                      {(formData.openAIApiKeyMasked || formData.credentialsUnlocked) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => {
                            if (!formData.credentialsUnlocked && formData.openAIApiKeyMasked) {
                              // Abrir popup para pedir contraseña
                              setFormData({
                                ...formData,
                                showPasswordDialog: true,
                                passwordDialogType: "openai",
                                passwordDialogField: "apikey",
                              })
                            } else if (formData.credentialsUnlocked) {
                              setFormData({
                                ...formData,
                                showOpenAIApiKey: !formData.showOpenAIApiKey,
                              })
                            }
                          }}
                        >
                          {formData.credentialsUnlocked && formData.showOpenAIApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    {!formData.credentialsUnlocked && formData.openAIApiKeyMasked && (
                      <p className="text-xs text-muted-foreground">
                        API key configurada. Haz clic en el ojo para ver o editar.
                      </p>
                    )}
                    {(formData.credentialsUnlocked || !formData.openAIApiKeyMasked) && (
                      <p className="text-xs text-muted-foreground">
                        API key obtenida desde el panel de OpenAI (https://platform.openai.com/api-keys)
                        <br />
                        <strong>Importante:</strong> Para acceder a datos de usage, necesitas una API key con permisos de administrador (sk-admin-...) o con el scope api.usage.read
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="openAIOrganizationId" className="text-sm font-medium">
                        Organization ID (Opcional)
                      </Label>
                      <Input
                        id="openAIOrganizationId"
                        value={formData.openAIOrganizationId}
                        onChange={(e) =>
                          setFormData({ ...formData, openAIOrganizationId: e.target.value })
                        }
                        placeholder="org-..."
                        className="h-10 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        ID de la organización de OpenAI. Requerido si perteneces a múltiples organizaciones.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="openAIProjectId" className="text-sm font-medium">
                        Project ID (Opcional)
                      </Label>
                      <Input
                        id="openAIProjectId"
                        value={formData.openAIProjectId}
                        onChange={(e) =>
                          setFormData({ ...formData, openAIProjectId: e.target.value })
                        }
                        placeholder="proj_..."
                        className="h-10 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        ID del proyecto específico. Útil para filtrar datos por proyecto.
                      </p>
                    </div>
                  </div>

                  {formData.hasOpenAICredentials && formData.openAIApiKeyMasked && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-lg mt-3">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        <strong>Nota:</strong> Si ya existe una API key configurada, deja este campo vacío para mantenerla. Solo
                        completa el campo si deseas actualizarla.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg mt-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Nota de seguridad:</strong> La API key se
                    encriptará automáticamente antes de guardarse en la base de
                    datos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Meta Conversions API (CAPI) + Kommo */}
        <TabsContent value="metaCapi">
          <Card>
            <CardHeader>
              <CardTitle>Meta Conversions API (CAPI)</CardTitle>
              <CardDescription>
                Configura Pixel ID y Access Token para sincronizar conversiones con Kommo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6 border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <Share2 className="h-5 w-5 text-primary" />
                  <h4 className="text-lg font-semibold">Credenciales Meta CAPI</h4>
                </div>

                {!formData.hasMetaCapiCredentials && !formData.metaCapiPixelId && (
                  <div className="bg-muted/50 border border-dashed rounded-lg p-4 text-center">
                    <Share2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">No hay Meta CAPI configurado</p>
                    <p className="text-xs mt-1 text-muted-foreground">Completa Pixel ID y Access Token para conectar con Kommo</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="metaCapiPixelId" className="text-sm font-medium">Pixel ID *</Label>
                  <Input
                    id="metaCapiPixelId"
                    value={formData.metaCapiPixelId}
                    onChange={(e) => setFormData({ ...formData, metaCapiPixelId: e.target.value })}
                    placeholder="Ej: 1234567890123456"
                    className="h-10 font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Meta Events Manager → Data Sources → Pixel. O en Configuración del Pixel → ID.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaCapiAccessToken" className="text-sm font-medium">Access Token (CAPI) *</Label>
                  <div className="relative">
                    <Input
                      id="metaCapiAccessToken"
                      type={formData.credentialsUnlocked && formData.showMetaCapiToken ? "text" : "password"}
                      value={formData.credentialsUnlocked || !formData.metaCapiAccessTokenMasked ? formData.metaCapiAccessToken : formData.metaCapiAccessTokenMasked}
                      onChange={(e) => {
                        if (formData.credentialsUnlocked || !formData.metaCapiAccessTokenMasked) {
                          setFormData({ ...formData, metaCapiAccessToken: e.target.value })
                        }
                      }}
                      disabled={!formData.credentialsUnlocked && !!formData.metaCapiAccessTokenMasked}
                      placeholder={formData.credentialsUnlocked || !formData.metaCapiAccessTokenMasked ? "Token de CAPI" : ""}
                      className="h-10 pr-10 font-mono text-sm"
                    />
                    {(formData.metaCapiAccessTokenMasked || formData.credentialsUnlocked) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => {
                          if (!formData.credentialsUnlocked && formData.metaCapiAccessTokenMasked) {
                            setFormData({
                              ...formData,
                              showPasswordDialog: true,
                              passwordDialogType: "metaCapi",
                              passwordDialogField: "metaCapiToken",
                            })
                          } else {
                            setFormData({ ...formData, showMetaCapiToken: !formData.showMetaCapiToken })
                          }
                        }}
                      >
                        {formData.credentialsUnlocked && formData.showMetaCapiToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  {!formData.credentialsUnlocked && formData.metaCapiAccessTokenMasked && (
                    <p className="text-xs text-muted-foreground">Token configurado. Haz clic en el ojo para ver o editar.</p>
                  )}
                  {(formData.credentialsUnlocked || !formData.metaCapiAccessTokenMasked) && (
                    <p className="text-xs text-muted-foreground">
                      Genera el token en Meta Events Manager → Pixel → Configuración → Conversions API → Generate access token.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaCapiAdAccountId" className="text-sm font-medium">Ad Account ID (opcional)</Label>
                  <Input
                    id="metaCapiAdAccountId"
                    value={formData.metaCapiAdAccountId}
                    onChange={(e) => setFormData({ ...formData, metaCapiAdAccountId: e.target.value })}
                    placeholder="act_1234567890"
                    className="h-10 font-mono"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg mt-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Seguridad:</strong> El access token se encripta antes de guardarse. Requiere Kommo configurado para sincronizar eventos (Lead, Purchase) con Meta.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para pedir contraseña al ver credenciales */}
      <AlertDialog open={formData.showPasswordDialog} onOpenChange={(open) => {
        setFormData({ ...formData, showPasswordDialog: open, adminPassword: "" })
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Ver credenciales completas</AlertDialogTitle>
            <AlertDialogDescription>
              Ingresa tu contraseña de administrador para ver o editar las credenciales completas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password-dialog-input" className="text-sm">Contraseña de administrador *</Label>
              <Input
                id="password-dialog-input"
                type="password"
                value={formData.adminPassword}
                onChange={(e) =>
                  setFormData({ ...formData, adminPassword: e.target.value })
                }
                placeholder="Contraseña de administrador"
                className="h-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && formData.adminPassword) {
                    unlockCredentials()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setFormData({ ...formData, showPasswordDialog: false, adminPassword: "" })
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!formData.adminPassword) {
                  toast.error("Por favor ingresa tu contraseña de administrador")
                  return
                }
                await unlockCredentials()
              }}
              disabled={formData.loadingCredentials || !formData.adminPassword}
            >
              {formData.loadingCredentials ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                "Verificar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                : "Agrega un nuevo usuario a esta cuenta de cliente"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-form-name">Nombre *</Label>
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
              <Label htmlFor="user-form-email">Email *</Label>
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
              <Label htmlFor="user-form-password">
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
              <Label htmlFor="user-form-role">Rol dentro de la cuenta *</Label>
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
              <Label htmlFor="user-form-active" className="cursor-pointer">
                Usuario activo
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
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
                        credentials: "include",
                      }
                    )

                    const data = await res.json().catch(() => ({ success: false, error: "Respuesta inválida del servidor" }))
                    if (!res.ok) {
                      throw new Error(data?.error || `Error del servidor (${res.status})`)
                    }
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

