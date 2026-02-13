
import { useState, useEffect, useMemo, memo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import { BarChart3, Bot, Home, MapPin, Settings, Users, ChevronLeft, ChevronRight, Shield, X, MessageSquare, Database, Zap, Layers, ChevronDown, ChevronUp, Globe, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ViewFeature } from "@/lib/customer-types"
import { getApiUrl, fetchWithAuth } from "@/lib/api-client"
import { motion, AnimatePresence } from "framer-motion"

// Mapeo completo de todas las vistas disponibles
const allNavigationItems = [
  { name: "Dashboard", href: "/home", icon: Home, feature: "dashboard" as ViewFeature },
  { name: "Agentes", href: "/agentes", icon: Bot, feature: "agentes" as ViewFeature },
  { name: "Ubicaciones", href: "/ubicaciones", icon: MapPin, feature: "ubicaciones" as ViewFeature },
  { name: "Consultas", href: "/consultas", icon: MessageSquare, feature: "consultas" as ViewFeature },
  { name: "Analíticas", href: "/analiticas", icon: BarChart3, feature: "analiticas" as ViewFeature },
  { name: "Kommo", href: "/kommo", icon: Database, feature: "kommo" as ViewFeature },
  { name: "Meta CAPI", href: "/admin/meta-capi", icon: Share2, feature: "metaCapi" as ViewFeature },
  { name: "HubSpot", href: "/hubspot", icon: Globe, feature: "hubspot" as ViewFeature },
  { name: "Equipo", href: "/equipo", icon: Users, feature: "equipo" as ViewFeature },
  { name: "Configuración", href: "/configuracion", icon: Settings, feature: "configuracion" as ViewFeature },
  { name: "Tokens", href: "/tokens", icon: Zap, feature: "tokens" as ViewFeature },
]

interface DashboardSidebarProps {
  open?: boolean
  onClose?: () => void
}

function DashboardSidebarComponent({ open = false, onClose }: DashboardSidebarProps = {}) {
  const [collapsed, setCollapsed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [enabledViews, setEnabledViews] = useState<ViewFeature[]>([])
  const [kommoAccountsCount, setKommoAccountsCount] = useState(1) // Cuántas cuentas Kommo mostrar (1, 2, ...)
  const [loading, setLoading] = useState(true)
  const [isDesktop, setIsDesktop] = useState(true) // Inicializar como true para evitar flash
  const [featuresExpanded, setFeaturesExpanded] = useState(true) // Por defecto expandido para admin
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()

  console.log('DashboardSidebar render - open:', open)

  // Detectar si estamos en desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    // Verificar inmediatamente
    if (typeof window !== 'undefined') {
      checkDesktop()
      window.addEventListener('resize', checkDesktop)
      return () => window.removeEventListener('resize', checkDesktop)
    }
  }, [])

  useEffect(() => {
    // Verificar si el usuario es admin - primero desde localStorage, luego desde cookies
    let role = localStorage.getItem('role') || 
      document.cookie
        .split('; ')
        .find(row => row.startsWith('role='))
        ?.split('=')[1]
    
    const checkRoleAndSetViews = (userRole: string | null) => {
      if (!userRole) {
        // Si no hay role, intentar obtenerlo del backend
        fetchWithAuth(getApiUrl('/api/auth/me'))
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json()
              if (data.success && data.data?.role) {
                const backendRole = data.data.role
                localStorage.setItem('role', backendRole)
                setIsAdmin(backendRole === 'SuperAdmin')
                
                if (backendRole === 'SuperAdmin') {
                  setEnabledViews(allNavigationItems
                    .filter(item => item.feature !== 'kommo')
                    .map(item => item.feature))
                }
                setLoading(false)
              } else {
                setLoading(false)
              }
            } else {
              setLoading(false)
            }
          })
          .catch(() => {
            // Si falla, continuar con el flujo normal
            setLoading(false)
          })
        return
      }
      
      setIsAdmin(userRole === 'SuperAdmin')

      // Si es SuperAdmin, mostrar todas las vistas excepto Kommo (está en /admin/kommo)
      if (userRole === 'SuperAdmin') {
        setEnabledViews(allNavigationItems
          .filter(item => item.feature !== 'kommo')
          .map(item => item.feature))
        setLoading(false)
        return
      }
      
      // Si no es SuperAdmin, continuar con el flujo normal de cargar features
    }
    
    checkRoleAndSetViews(role)

    // Cargar features del cliente actual (solo si no es SuperAdmin)
    const loadCustomerFeatures = async () => {
      // Si ya es SuperAdmin, no cargar features (ya se establecieron arriba)
      const currentRole = localStorage.getItem('role') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('role='))
          ?.split('=')[1]
      
      if (currentRole === 'SuperAdmin') {
        return
      }
      try {
        // Leer de localStorage primero (más confiable), luego de cookies como fallback
        let email = localStorage.getItem('email') || 
          document.cookie
            .split('; ')
            .find(row => row.startsWith('email='))
            ?.split('=')[1]

        // Decodificar email si viene URL-encoded
        if (email) {
          try {
            email = decodeURIComponent(email)
          } catch {
            // Si falla la decodificación, usar el valor crudo
          }
        }

        let customerId = localStorage.getItem('customerId') || 
          document.cookie
            .split('; ')
            .find(row => row.startsWith('customerId='))
            ?.split('=')[1]
            ?.trim() // Limpiar espacios en blanco

        // Decodificar customerId si viene URL-encoded
        if (customerId) {
          try {
            customerId = decodeURIComponent(customerId)
          } catch {
            // Si falla la decodificación, usar el valor crudo
          }
        }

        console.log('[SIDEBAR] Cargando features - email:', email, 'customerId:', customerId)

        // Si no hay email, obtener los datos del cliente actual del backend
        if (!email) {
          try {
            console.log('[SIDEBAR] Email no encontrado en cookies, obteniendo del backend...')
            const customerRes = await fetchWithAuth(getApiUrl('/api/customers/current'))
            if (customerRes.ok) {
              const customerData = await customerRes.json()
              if (customerData.success && customerData.data) {
                email = customerData.data.email
                // También actualizar customerId si no estaba disponible
                if (!customerId && customerData.data._id) {
                  customerId = customerData.data._id
                }
                console.log('[SIDEBAR] Datos obtenidos del backend - email:', email, 'customerId:', customerId)
              }
            }
          } catch (err) {
            console.warn('[SIDEBAR] No se pudo obtener los datos del backend:', err)
          }
        }

        if (!email && !customerId) {
          // Si no hay email ni customerId, usar vistas por defecto
          console.warn('[SIDEBAR] No hay email ni customerId, usando vistas por defecto')
          setEnabledViews(['dashboard', 'agentes', 'ubicaciones', 'analiticas', 'kommo', 'equipo', 'configuracion'])
          setLoading(false)
          return
        }

        // Función auxiliar para intentar cargar features
        const tryLoadFeatures = async (queryParam: string, method: string) => {
          console.log(`[SIDEBAR] Intentando cargar features con ${method}:`, queryParam)
          const res = await fetchWithAuth(getApiUrl(`/api/customers/features?${queryParam}`))
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP ${res.status}`)
          }
          
          const data = await res.json()
          console.log(`[SIDEBAR] Features response (${method}):`, data)
          
          if (data.success && data.data?.enabledViews) {
            setEnabledViews(data.data.enabledViews)
            const count = typeof data.data.kommoAccountsCount === 'number' && data.data.kommoAccountsCount > 0
              ? data.data.kommoAccountsCount
              : 1
            setKommoAccountsCount(count)
            console.log('[SIDEBAR] ✅ Vistas habilitadas:', data.data.enabledViews, 'kommoAccountsCount:', count)
            return true
          }
          return false
        }

        // Intentar primero con customerId si está disponible
        if (customerId) {
          try {
            const success = await tryLoadFeatures(`customerId=${encodeURIComponent(customerId)}`, 'customerId')
            if (success) {
              setLoading(false)
              return
            }
          } catch (error: any) {
            console.warn(`[SIDEBAR] ⚠️ Error al cargar con customerId:`, error.message)
            // Si el error es "ID de cliente inválido", intentar con email como fallback
            if (error.message?.includes('inválido') || error.message?.includes('400')) {
              console.log('[SIDEBAR] CustomerId inválido, intentando con email como fallback...')
            } else {
              throw error // Re-lanzar si es otro tipo de error
            }
          }
        }

        // Fallback: intentar con email si customerId falló o no está disponible
        if (email) {
          try {
            const success = await tryLoadFeatures(`email=${encodeURIComponent(email)}`, 'email')
            if (success) {
              setLoading(false)
              return
            }
          } catch (error: any) {
            console.warn(`[SIDEBAR] ⚠️ Error al cargar con email:`, error.message)
          }
        }

        // Si ambos métodos fallaron, usar vistas por defecto
        console.warn('[SIDEBAR] ⚠️ No se pudieron cargar features, usando vistas por defecto')
        setEnabledViews(['dashboard', 'agentes', 'ubicaciones', 'analiticas', 'kommo', 'equipo', 'configuracion'])
      } catch (error) {
        console.error('[SIDEBAR] ❌ Error al cargar features del cliente:', error)
        // Vistas por defecto en caso de error
        setEnabledViews(['dashboard', 'agentes', 'ubicaciones', 'analiticas', 'kommo', 'equipo', 'configuracion'])
      } finally {
        setLoading(false)
      }
    }

    // Solo cargar features si no es SuperAdmin
    // Si es SuperAdmin, las vistas ya se establecieron en checkRoleAndSetViews
    const currentRole = localStorage.getItem('role') || 
      document.cookie
        .split('; ')
        .find(row => row.startsWith('role='))
        ?.split('=')[1]
    
    if (currentRole !== 'SuperAdmin') {
      loadCustomerFeatures()
    }
  }, [])

  useEffect(() => {
    if (open && pathname) {
      onClose?.()
    }
  }, [pathname])

  // Para clientes: expandir "Kommo" en Kommo 1, Kommo 2, ... según kommoAccountsCount
  const navItemsForUser = useMemo(() => {
    const base = allNavigationItems.filter(item => enabledViews.includes(item.feature))
    const result: Array<{ name: string; href: string; icon: typeof Database; feature: ViewFeature; key: string }> = []
    for (const item of base) {
      if (item.feature === 'kommo') {
        for (let i = 1; i <= kommoAccountsCount; i++) {
          result.push({
            name: `Kommo ${i}`,
            href: i === 1 ? '/kommo' : `/kommo/${i}`,
            icon: item.icon,
            feature: item.feature,
            key: `kommo-${i}`,
          })
        }
      } else {
        result.push({ ...item, key: item.name })
      }
    }
    return result
  }, [enabledViews, kommoAccountsCount])

  return (
    <>
      {/* Overlay para móvil */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          // Solo animar x en móvil, en desktop siempre visible
          x: isDesktop ? 0 : (open ? 0 : "-100%"),
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className={cn(
          "flex flex-col bg-sidebar border-r border-sidebar-border",
          "fixed lg:static inset-y-0 left-0 z-[70]",
          // Desktop - siempre visible
          "lg:flex lg:translate-x-0",
          // Mobile - controlado por animación
          "w-64",
          // Ancho en desktop controlado por CSS
          collapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
      <div className={cn(
        "flex h-16 items-center border-b border-sidebar-border",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {!collapsed ? (
          <>
            <img 
              src="/Logotipo_Aurora.svg" 
              alt="Aurora SDR" 
              className="h-11 w-auto" 
            />
            <div className="flex items-center gap-1">
              {/* Botón cerrar móvil */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="h-4 w-4" />
              </Button>
              {/* Botón colapsar desktop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="h-8 w-8 hidden lg:flex text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <img 
              src="/favicon-32x32.png" 
              alt="Aurora SDR" 
              className="h-7 w-7" 
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-6 w-6 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {/* Link de Admin primero, solo visible para SuperAdmin */}
        <AnimatePresence>
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-1"
            >
              <Link
                key="Admin"
                to="/admin"
                onClick={() => onClose?.()}
                className={cn(
                  "group flex items-center rounded-md text-sm font-medium transition-all duration-200 ease-in-out",
                  collapsed ? "justify-center px-2 py-3" : "px-2 py-2",
                  pathname?.startsWith("/admin")
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Shield className={cn("h-5 w-5 flex-shrink-0 transition-colors", collapsed ? "mr-0" : "mr-3")} />
                {!collapsed && <span className="truncate">Admin</span>}
              </Link>
              <Link
                key="Configuración"
                to="/configuracion"
                onClick={() => onClose?.()}
                className={cn(
                  "group flex items-center rounded-md text-sm font-medium transition-all duration-200 ease-in-out",
                  collapsed ? "justify-center px-2 py-3" : "px-2 py-2",
                  pathname === "/configuracion"
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Settings className={cn("h-5 w-5 flex-shrink-0 transition-colors", collapsed ? "mr-0" : "mr-3")} />
                {!collapsed && <span className="truncate">Configuración</span>}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && (
          <>
            {/* Si es admin, mostrar menú expandible de Features */}
            {isAdmin ? (
              <div className="space-y-1">
                {/* Botón para expandir/colapsar Features */}
                <button
                  onClick={() => setFeaturesExpanded(!featuresExpanded)}
                  className={cn(
                    "group flex items-center rounded-md text-sm font-medium transition-all duration-200 ease-in-out w-full",
                    collapsed ? "justify-center px-2 py-3" : "px-2 py-2",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Layers className={cn("h-5 w-5 flex-shrink-0 transition-colors", collapsed ? "mr-0" : "mr-3")} />
                  {!collapsed && (
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-between">
                      <span className="truncate">Features</span>
                      {featuresExpanded ? (
                        <ChevronUp className="h-4 w-4 opacity-50" />
                      ) : (
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  )}
                </button>
                
                {/* Lista de features expandible */}
                <AnimatePresence>
                  {featuresExpanded && !collapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 pl-7">
                        {allNavigationItems
                          .filter((item) => item.feature !== "configuracion")
                          .map((item, index) => {
                          const isActive = pathname === item.href
                          const isKommo = item.feature === "kommo"
                          
                          return (
                            <motion.div
                              key={item.name}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ 
                                duration: 0.2,
                                delay: index * 0.03
                              }}
                            >
                              <Link
                                to={item.href}
                                onClick={() => onClose?.()}
                                className={cn(
                                  "group flex items-center rounded-md text-sm font-medium transition-all duration-200 ease-in-out",
                                  "px-2 py-2",
                                  isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                )}
                              >
                                <item.icon
                                  className="h-4 w-4 flex-shrink-0 mr-3 transition-colors"
                                  aria-hidden="true"
                                />
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="truncate">{item.name}</span>
                                  {isKommo && (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[10px] px-1.5 py-0 h-4 font-semibold shrink-0"
                                    >
                                      Beta
                                    </Badge>
                                  )}
                                </div>
                              </Link>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              navItemsForUser.map((item, index) => {
                  const isActive = pathname === item.href
                  const isKommo = item.feature === "kommo"

                  const linkContent = (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        duration: 0.2,
                        delay: index * 0.03
                      }}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        to={item.href}
                        className={cn(
                          "group flex items-center rounded-md text-sm font-medium transition-all duration-200 ease-in-out",
                          collapsed ? "justify-center px-2 py-3" : "px-2 py-2",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon
                          className={cn("h-5 w-5 flex-shrink-0 transition-colors", collapsed ? "mr-0" : "mr-3")}
                          aria-hidden="true"
                        />
                        {!collapsed && (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="truncate">{item.name}</span>
                            {isKommo && (
                              <Badge 
                                variant="secondary" 
                                className="text-[10px] px-1.5 py-0 h-4 font-semibold shrink-0"
                              >
                                Beta
                              </Badge>
                            )}
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  )

                  if (isKommo) {
                    return (
                      <Tooltip key={item.key}>
                        <TooltipTrigger asChild>
                          {linkContent}
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Esta integración aún está en Beta</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return linkContent
                })
            )}
          </>
        )}
      </nav>

      {/* Footer con versión */}
      <motion.div 
        className={cn(
          "border-t border-sidebar-border p-4",
          collapsed ? "text-center" : ""
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {collapsed ? (
          <p className="text-xs text-muted-foreground font-medium">v1.1</p>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Aurora SDR</p>
              <p className="text-xs text-muted-foreground/60">Versión 1.1</p>
            </div>
            <motion.div 
              className="h-2 w-2 rounded-full bg-green-500" 
              title="Sistema operativo"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
            />
          </div>
        )}
      </motion.div>
    </motion.div>
    </>
  )
}

export const DashboardSidebar = memo(DashboardSidebarComponent)
