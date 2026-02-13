import { useState, useEffect } from "react"
import { AgentsOverview } from "@/components/agents-overview"
import { LocationsOverview } from "@/components/locations-overview"
import { MeetingsOverview } from "@/components/meetings-overview"
import { PerformanceCharts } from "@/components/performance-charts"
import { MetricsOverview } from "@/components/metrics-overview"
import { PageTransition } from "@/components/page-transition"
import { fetchWithAuth } from "@/lib/api-client"
import { getApiUrl } from "@/lib/api-client"
import { ViewFeature } from "@/lib/customer-types"

export default function HomePage() {
  const [hasSqlCredentials, setHasSqlCredentials] = useState<boolean>(true)
  const [enabledViews, setEnabledViews] = useState<ViewFeature[]>([])
  const [loadingFeatures, setLoadingFeatures] = useState(true)

  useEffect(() => {
    const loadCustomerFeatures = async () => {
      try {
        // Verificar si es SuperAdmin (no necesita cargar features)
        const role = localStorage.getItem('role') || 
          document.cookie
            .split('; ')
            .find(row => row.startsWith('role='))
            ?.split('=')[1]
        
        if (role === 'SuperAdmin') {
          // SuperAdmin ve todo, así que no limitamos
          setEnabledViews(['dashboard', 'agentes', 'ubicaciones', 'analiticas', 'kommo', 'equipo', 'configuracion', 'consultas'])
          setLoadingFeatures(false)
          return
        }

        // Obtener customerId y email
        const customerId = localStorage.getItem('customerId') || 
          document.cookie
            .split('; ')
            .find(row => row.startsWith('customerId='))
            ?.split('=')[1]
            ?.trim()

        const email = localStorage.getItem('email') || 
          document.cookie
            .split('; ')
            .find(row => row.startsWith('email='))
            ?.split('=')[1]

        // Intentar cargar features
        let queryParam = ''
        if (customerId) {
          queryParam = `customerId=${encodeURIComponent(customerId)}`
        } else if (email) {
          queryParam = `email=${encodeURIComponent(email)}`
        }

        if (queryParam) {
          const res = await fetchWithAuth(getApiUrl(`/api/customers/features?${queryParam}`))
          
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.data?.enabledViews) {
              setEnabledViews(data.data.enabledViews)
              setLoadingFeatures(false)
              return
            }
          }
        }

        // Fallback: usar vistas por defecto
        setEnabledViews(['dashboard', 'agentes', 'ubicaciones', 'analiticas', 'kommo', 'equipo', 'configuracion'])
      } catch (error) {
        console.error('[HOMEPAGE] Error al cargar features:', error)
        // Fallback: usar vistas por defecto
        setEnabledViews(['dashboard', 'agentes', 'ubicaciones', 'analiticas', 'kommo', 'equipo', 'configuracion'])
      } finally {
        setLoadingFeatures(false)
      }
    }

    loadCustomerFeatures()
  }, [])

  // Verificar si solo tiene kommo (y posiblemente dashboard/configuracion que son básicas)
  // Features "reales" que muestran contenido: agentes, ubicaciones, analiticas, consultas, hubspot, equipo, tokens
  const realFeatures = enabledViews.filter(view => 
    view !== 'kommo' && 
    view !== 'dashboard' && 
    view !== 'configuracion'
  )
  
  const hasOnlyKommo = !loadingFeatures && 
    enabledViews.length > 0 && 
    realFeatures.length === 0 &&
    enabledViews.includes('kommo')

  // Si solo tiene kommo (sin otras features reales), mostrar solo el logo de Aurora
  if (hasOnlyKommo) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <img 
              src="/Logotipo_Aurora.svg" 
              alt="Aurora SDR" 
              className="h-32 w-auto mx-auto dark:invert opacity-50"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/logo-aurora.png"
              }}
            />
          </div>
        </div>
      </PageTransition>
    )
  }

  // Si tiene otras features además de kommo, mostrar widgets según las features habilitadas
  const hasAgentes = enabledViews.includes('agentes')
  const hasUbicaciones = enabledViews.includes('ubicaciones')
  const hasConsultas = enabledViews.includes('consultas')
  const hasAnaliticas = enabledViews.includes('analiticas')
  const hasDashboard = enabledViews.includes('dashboard')

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Métricas principales - solo si tiene dashboard */}
        {hasDashboard && (
          <MetricsOverview onCredentialsStatus={setHasSqlCredentials} />
        )}

        {/* Solo mostrar otras secciones si hay credenciales de SQL configuradas y tiene las features correspondientes */}
        {hasSqlCredentials && (
          <>
            {/* Top section - Agents IA full width - solo si tiene 'agentes' */}
            {hasAgentes && <AgentsOverview />}

            {/* Middle section - Ubicaciones and Reuniones side by side */}
            {(hasUbicaciones || hasConsultas) && (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {hasUbicaciones && <LocationsOverview />}
                {hasConsultas && <MeetingsOverview />}
                {/* Si solo tiene una de las dos, ocupar todo el ancho */}
                {hasUbicaciones && !hasConsultas && <div />}
                {!hasUbicaciones && hasConsultas && <div />}
              </div>
            )}

            {/* Bottom section - Performance charts full width - solo si tiene 'analiticas' */}
            {hasAnaliticas && <PerformanceCharts />}
          </>
        )}
      </div>
    </PageTransition>
  )
}

