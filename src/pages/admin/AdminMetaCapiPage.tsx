import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Share2, Save, Loader2, Building2, Eye, EyeOff, ExternalLink, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { getApiUrl, fetchWithAuth } from "@/lib/api-client"

interface CompanyMetaCapiConfig {
  configured: boolean
  pixelId: string
  hasAccessToken: boolean
  adAccountId: string
}

interface CustomerMeta {
  _id: string
  nombre: string
  apellido: string
  email: string
  metaCapiCredentials?: { pixelId: string; adAccountId?: string }
}

export default function AdminMetaCapiPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyConfig, setCompanyConfig] = useState<CompanyMetaCapiConfig | null>(null)
  const [clientsWithMetaCapi, setClientsWithMetaCapi] = useState<CustomerMeta[]>([])
  const [form, setForm] = useState({
    pixelId: "",
    accessToken: "",
    adAccountId: "",
    showToken: false,
  })

  const loadCompanyConfig = async () => {
    try {
      const res = await fetchWithAuth(getApiUrl("/api/admin/company-settings/meta-capi"))
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success && data.data) {
        setCompanyConfig(data.data)
        setForm((f) => ({
          ...f,
          pixelId: data.data.pixelId || "",
          adAccountId: data.data.adAccountId || "",
        }))
      }
    } catch (e) {
      console.error("Error loading company Meta CAPI config:", e)
      toast.error("Error al cargar configuración de la empresa")
    }
  }

  const loadCustomers = async () => {
    try {
      const res = await fetch(getApiUrl("/api/customers"))
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        const withMeta = data.data.filter((c: CustomerMeta) => c.metaCapiCredentials)
        setClientsWithMetaCapi(withMeta)
      }
    } catch (e) {
      console.error("Error loading customers:", e)
    }
  }

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      await Promise.all([loadCompanyConfig(), loadCustomers()])
      setLoading(false)
    }
    run()
  }, [])

  const handleSaveCompany = async () => {
    if (!form.pixelId.trim() || !form.accessToken.trim()) {
      toast.error("Pixel ID y Access Token son requeridos")
      return
    }
    setSaving(true)
    try {
      const res = await fetchWithAuth(getApiUrl("/api/admin/company-settings/meta-capi"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixelId: form.pixelId.trim(),
          accessToken: form.accessToken.trim(),
          adAccountId: form.adAccountId.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        toast.success("Configuración de la empresa guardada")
        setForm((f) => ({ ...f, accessToken: "" }))
        loadCompanyConfig()
      } else {
        toast.error(data.error || "Error al guardar")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al guardar configuración")
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
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Meta CAPI + Kommo</h1>
            <p className="text-muted-foreground mt-1">
              Configuración de Meta Conversions API y conexión con Kommo
            </p>
          </div>
        </div>
      </div>

      {/* Configuración de la empresa (nuestras muestras) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Configuración de la empresa (nuestras muestras)
          </CardTitle>
          <CardDescription>
            Pixel ID y Access Token de Meta para la cuenta de la empresa. Se usan para enviar eventos CAPI (Lead, Purchase) desde Kommo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-pixel">Pixel ID *</Label>
              <Input
                id="company-pixel"
                value={form.pixelId}
                onChange={(e) => setForm((f) => ({ ...f, pixelId: e.target.value }))}
                placeholder="Ej: 1234567890123456"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-ad">Ad Account ID (opcional)</Label>
              <Input
                id="company-ad"
                value={form.adAccountId}
                onChange={(e) => setForm((f) => ({ ...f, adAccountId: e.target.value }))}
                placeholder="act_1234567890"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-token">Access Token (CAPI) *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="company-token"
                  type={form.showToken ? "text" : "password"}
                  value={form.accessToken}
                  onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                  placeholder={companyConfig?.hasAccessToken ? "Dejar en blanco para mantener" : "Token de CAPI"}
                  className="font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setForm((f) => ({ ...f, showToken: !f.showToken }))}
                >
                  {form.showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={handleSaveCompany} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </Button>
            </div>
            {companyConfig?.hasAccessToken && !form.accessToken && (
              <p className="text-xs text-muted-foreground">Token ya configurado. Escribe uno nuevo solo si quieres reemplazarlo.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clientes con Meta CAPI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Clientes con Meta CAPI
          </CardTitle>
          <CardDescription>
            Clientes que tienen Pixel ID y token configurados en Gestión de Clientes. Edita cada uno para modificar sus credenciales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientsWithMetaCapi.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ningún cliente tiene Meta CAPI configurado. Ve a{" "}
              <a href="/admin/clients" className="text-primary underline">Gestión de Clientes</a>, edita un cliente y usa la pestaña &quot;Meta CAPI&quot;.
            </p>
          ) : (
            <ul className="space-y-2">
              {clientsWithMetaCapi.map((c) => (
                <li
                  key={c._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <span className="font-medium">{c.nombre} {c.apellido}</span>
                    <span className="text-muted-foreground text-sm ml-2">({c.email})</span>
                    {c.metaCapiCredentials?.pixelId && (
                      <span className="text-xs text-muted-foreground ml-2 font-mono">Pixel: {c.metaCapiCredentials.pixelId}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/admin/clients/${c._id}`} className="gap-1">
                      <ExternalLink className="h-4 w-4" />
                      Editar
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Alcance con Kommo y límites */}
      <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle>Alcance con Kommo y límites de conexión</AlertTitle>
        <AlertDescription asChild>
          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Alcance Kommo + Meta CAPI:</strong> La integración permite sincronizar eventos de conversión (Lead, Purchase) desde Kommo hacia Meta. 
              Cuando se crea o actualiza un lead en Kommo (por ejemplo vía Click to Message de Meta/Instagram/WhatsApp), se puede enviar el evento correspondiente 
              a la Conversions API de Meta para mejorar el atribución y el optimización de anuncios.
            </p>
            <p>
              <strong>Límites Kommo API:</strong> Máximo 7 peticiones por segundo; hasta 250 entidades por petición (recomendado ≤50 para evitar 504). 
              Máximo 100 &quot;sources&quot; por integración. Si se superan los límites, Kommo devuelve HTTP 429 y bloqueos temporales (403).
            </p>
            <p>
              <strong>Meta CAPI:</strong> Requiere Pixel ID y Access Token generado en Events Manager → Pixel → Configuración → Conversions API. 
              Los eventos se envían por servidor para mayor precisión y control.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
