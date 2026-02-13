
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Save, User, Key, Database, Eye, EyeOff, Loader2, Layout } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import type { ViewFeature } from "@/lib/customer-types"
import { toast } from "sonner"
import { generateSecurePassword } from "@/lib/utils"
import { getApiUrl } from "@/lib/api-client"

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
]

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

export default function NewClientPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [showUserPassword, setShowUserPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    pais: "",
    cantidadAgentes: 1,
    planContratado: "Básico" as "Básico" | "Profesional" | "Enterprise" | "Custom",
    rol: "Cliente" as "Cliente" | "Owner",
    // Datos del usuario
    userEmail: "",
    userName: "",
    userPassword: "",
    hasUser: false,
    // Credenciales de Kommo
    kommoBaseUrl: "",
    kommoAccessToken: "",
    kommoIntegrationId: "",
    kommoSecretKey: "",
    hasKommoCredentials: false,
    showKommoToken: false,
    showKommoSecret: false,
    // Credenciales de PostgreSQL/n8n
    postgresConnectionString: "",
    hasPostgresCredentials: false,
    showPostgresConnection: false,
    // Vistas/Features habilitadas
    enabledViews: [] as ViewFeature[],
  })

  // Aplicar vistas por defecto cuando cambia el plan
  useEffect(() => {
    if (formData.planContratado) {
      const defaultViews = getDefaultViewsForPlan(formData.planContratado)
      setFormData((prev) => ({ ...prev, enabledViews: defaultViews }))
    }
  }, [formData.planContratado])

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
        fechaInicio: new Date().toISOString(),
        enabledViews: formData.enabledViews.length > 0 
          ? formData.enabledViews 
          : getDefaultViewsForPlan(formData.planContratado),
      }

      // Agregar credenciales de Kommo si se proporcionaron
      if (formData.hasKommoCredentials && formData.kommoBaseUrl && formData.kommoAccessToken) {
        customerBody.kommoCredentials = {
          baseUrl: formData.kommoBaseUrl,
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

      // Crear cliente
      const res = await fetch(getApiUrl('/api/customers'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerBody),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Error al crear cliente")
      }

      const customerId = data.data._id

      // Manejar usuario si está habilitado
      if (formData.hasUser) {
        if (!formData.userPassword) {
          throw new Error("La contraseña es requerida para crear un nuevo usuario")
        }

        const userCreateBody = {
          email: formData.userEmail,
          name: formData.userName,
          password: formData.userPassword,
          role: "Cliente",
          customerId: customerId,
        }

        const userRes = await fetch(getApiUrl('/api/users'), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userCreateBody),
        })

        const userData = await userRes.json()
        if (!userData.success) {
          throw new Error(userData.error || "Error al crear usuario")
        }
      }

      toast.success("Cliente creado exitosamente")
      navigate("/admin/clients")
    } catch (error: any) {
      console.error("Error al guardar:", error)
      toast.error(error.message || "Error al guardar los cambios")
    } finally {
      setSaving(false)
    }
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
            <h1 className="text-3xl font-bold">Nuevo Cliente</h1>
            <p className="text-muted-foreground mt-1">
              Completa los datos para crear un nuevo cliente con todas sus configuraciones
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
              Crear Cliente
            </>
          )}
        </Button>
      </div>

      {/* Tabs - Reutilizando la misma estructura que la página de edición */}
      <Tabs defaultValue="customer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="customer" className="text-sm font-medium">
            Datos del Cliente
          </TabsTrigger>
          <TabsTrigger value="features" className="text-sm font-medium">
            Vistas/Features
          </TabsTrigger>
          <TabsTrigger value="user" className="text-sm font-medium">
            Usuario de Acceso
          </TabsTrigger>
          <TabsTrigger value="kommo" className="text-sm font-medium">
            Credenciales Kommo
          </TabsTrigger>
          <TabsTrigger value="postgres" className="text-sm font-medium">
            Credenciales PostgreSQL
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
                    Plan seleccionado: <span className="text-primary">{formData.planContratado}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Puedes personalizar las vistas o usar las del plan por defecto
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
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Nota:</strong> Si no seleccionas vistas, se aplicarán las vistas por
                    defecto del plan {formData.planContratado} al crear el cliente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Usuario de Acceso */}
        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>Usuario de Acceso</CardTitle>
              <CardDescription>
                Crea el usuario que tendrá acceso al sistema para este cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border">
                <input
                  type="checkbox"
                  id="hasUser"
                  checked={formData.hasUser}
                  onChange={(e) =>
                    setFormData({ ...formData, hasUser: e.target.checked })
                  }
                  className="rounded w-4 h-4"
                />
                <Label htmlFor="hasUser" className="text-base font-medium cursor-pointer">
                  Crear usuario de acceso para este cliente
                </Label>
              </div>

              {formData.hasUser && (
                <div className="space-y-6 border rounded-lg p-6 bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="h-5 w-5 text-primary" />
                    <h4 className="text-lg font-semibold">Datos del Usuario</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="userName" className="text-sm font-medium">
                        Nombre del Usuario *
                      </Label>
                      <Input
                        id="userName"
                        value={formData.userName}
                        onChange={(e) =>
                          setFormData({ ...formData, userName: e.target.value })
                        }
                        placeholder="Nombre completo"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userEmail" className="text-sm font-medium">
                        Email del Usuario *
                      </Label>
                      <Input
                        id="userEmail"
                        type="email"
                        value={formData.userEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, userEmail: e.target.value })
                        }
                        placeholder="usuario@ejemplo.com"
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPassword" className="text-sm font-medium">
                      Contraseña *
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="userPassword"
                          type={showUserPassword ? "text" : "password"}
                          value={formData.userPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, userPassword: e.target.value })
                          }
                          placeholder="Contraseña"
                          className="h-10 pr-10"
                        />
                        {formData.userPassword && (
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
                          setFormData({ ...formData, userPassword: newPassword })
                          setShowUserPassword(true)
                        }}
                        title="Generar contraseña segura"
                        className="h-10"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      La contraseña es requerida para crear un nuevo usuario
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Credenciales Kommo - Mismo código que en [id]/page.tsx */}
        <TabsContent value="kommo">
          <Card>
            <CardHeader>
              <CardTitle>Credenciales Kommo</CardTitle>
              <CardDescription>
                Configura las credenciales de API de Kommo CRM para este cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border">
                <input
                  type="checkbox"
                  id="hasKommoCredentials"
                  checked={formData.hasKommoCredentials}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasKommoCredentials: e.target.checked,
                    })
                  }
                  className="rounded w-4 h-4"
                />
                <Label
                  htmlFor="hasKommoCredentials"
                  className="text-base font-medium cursor-pointer"
                >
                  Configurar credenciales de Kommo para este cliente
                </Label>
              </div>

              {formData.hasKommoCredentials && (
                <div className="space-y-6 border rounded-lg p-6 bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="h-5 w-5 text-primary" />
                    <h4 className="text-lg font-semibold">Credenciales de Kommo CRM</h4>
                  </div>

                  <div className="space-y-3">
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
                      <Label htmlFor="kommoAccessToken" className="text-sm font-medium">
                        Access Token *
                      </Label>
                      <div className="relative">
                        <Input
                          id="kommoAccessToken"
                          type={formData.showKommoToken ? "text" : "password"}
                          value={formData.kommoAccessToken}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              kommoAccessToken: e.target.value,
                            })
                          }
                          placeholder="Token de acceso de Kommo"
                          className="h-10 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              showKommoToken: !formData.showKommoToken,
                            })
                          }
                        >
                          {formData.showKommoToken ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Access Token obtenido desde el panel de integraciones de Kommo
                      </p>
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
                            type={formData.showKommoSecret ? "text" : "password"}
                            value={formData.kommoSecretKey}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                kommoSecretKey: e.target.value,
                              })
                            }
                            placeholder="Secret key"
                            className="h-10 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                showKommoSecret: !formData.showKommoSecret,
                              })
                            }
                          >
                            {formData.showKommoSecret ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Credenciales PostgreSQL - Mismo código que en [id]/page.tsx */}
        <TabsContent value="postgres">
          <Card>
            <CardHeader>
              <CardTitle>Credenciales PostgreSQL</CardTitle>
              <CardDescription>
                Configura las credenciales de PostgreSQL/n8n para este cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border">
                <input
                  type="checkbox"
                  id="hasPostgresCredentials"
                  checked={formData.hasPostgresCredentials}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasPostgresCredentials: e.target.checked,
                    })
                  }
                  className="rounded w-4 h-4"
                />
                <Label
                  htmlFor="hasPostgresCredentials"
                  className="text-base font-medium cursor-pointer"
                >
                  Configurar credenciales de PostgreSQL/n8n para este cliente
                </Label>
              </div>

              {formData.hasPostgresCredentials && (
                <div className="space-y-6 border rounded-lg p-6 bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="h-5 w-5 text-primary" />
                    <h4 className="text-lg font-semibold">
                      Credenciales de PostgreSQL/n8n
                    </h4>
                  </div>

                  <div className="space-y-3">
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
                          type={
                            formData.showPostgresConnection ? "text" : "password"
                          }
                          value={formData.postgresConnectionString}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              postgresConnectionString: e.target.value,
                            })
                          }
                          placeholder="postgresql://user:password@host:port/database"
                          className="h-10 pr-10 font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              showPostgresConnection:
                                !formData.showPostgresConnection,
                            })
                          }
                        >
                          {formData.showPostgresConnection ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Connection string completo de PostgreSQL (ej:
                        postgresql://postgres:password@host:port/database)
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg mt-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Nota de seguridad:</strong> La connection string se
                        encriptará automáticamente antes de guardarse en la base de
                        datos.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

