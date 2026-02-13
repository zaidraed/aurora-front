
import { useState, useEffect, memo } from "react"
import { Bell, Settings, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { getApiUrl, fetchWithAuth } from "@/lib/api-client"
import type { Customer } from "@/lib/customer-types"

interface DashboardHeaderProps {
  children?: React.ReactNode
}

function DashboardHeaderComponent({ children }: DashboardHeaderProps) {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState("usuario@aurorasdr.ai")
  const [userName, setUserName] = useState("Usuario")
  const [userLastName, setUserLastName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('[HEADER] Cargando datos del cliente actual...')
        
        // Intentar primero con el nuevo endpoint
        try {
          const res = await fetchWithAuth(getApiUrl('/api/customers/current'))
          
          if (res.ok) {
            const data = await res.json()
            console.log('[HEADER] Respuesta del backend:', data)
            
            if (data.success && data.data) {
              const customer: Customer = data.data
              console.log('[HEADER] Cliente cargado:', customer.nombre, customer.apellido, customer.email)
              setUserEmail(customer.email || "usuario@aurorasdr.ai")
              setUserName(customer.nombre || "Usuario")
              setUserLastName(customer.apellido || "")
              setLoading(false)
              return
            }
          } else {
            const errorData = await res.json().catch(() => ({}))
            console.warn('[HEADER] Endpoint /current falló:', res.status, errorData)
          }
        } catch (err) {
          console.warn('[HEADER] Error al usar endpoint /current:', err)
        }

        // Fallback: usar método anterior con customerId de localStorage o cookies
        console.log('[HEADER] Intentando fallback con customerId de localStorage o cookies...')
        let customerId = localStorage.getItem('customerId') || 
          document.cookie
            .split('; ')
            .find(row => row.startsWith('customerId='))
            ?.split('=')[1]
            ?.trim()

        // Decodificar customerId si viene URL-encoded
        if (customerId) {
          try {
            customerId = decodeURIComponent(customerId)
          } catch {
            // Si falla la decodificación, usar el valor crudo
          }

          if (customerId) {
            try {
              console.log('[HEADER] Cargando datos del cliente con customerId:', customerId)
              const res = await fetchWithAuth(getApiUrl(`/api/customers/${customerId}`))
              
              if (res.ok) {
                const data = await res.json()
                if (data.success && data.data) {
                  const customer: Customer = data.data
                  console.log('[HEADER] Cliente cargado (fallback):', customer.nombre, customer.apellido, customer.email)
                  setUserEmail(customer.email || "usuario@aurorasdr.ai")
                  setUserName(customer.nombre || "Usuario")
                  setUserLastName(customer.apellido || "")
                  setLoading(false)
                  return
                }
              }
            } catch (err) {
              console.warn('[HEADER] Error en fallback con customerId:', err)
            }
          }
        }

        // Último fallback: usar email de cookies
        const email = document.cookie
          .split('; ')
          .find(row => row.startsWith('email='))
          ?.split('=')[1]

        if (email) {
          try {
            setUserEmail(decodeURIComponent(email))
          } catch {
            setUserEmail(email)
          }
        }
      } catch (error) {
        console.error('[HEADER] Error al cargar datos del usuario:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  const handleLogout = () => {
    // Limpiar todas las cookies de autenticación
    document.cookie = "email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "customerId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    
    // Limpiar localStorage
    localStorage.removeItem('customerId')
    localStorage.removeItem('userId')
    localStorage.removeItem('email')
    
    // Redirigir al login
    navigate("/login")
  }

  const handlePerfil = () => {
    navigate("/configuracion")
  }

  const handleConfiguracion = () => {
    navigate("/configuracion")
  }

  return (
    <motion.header 
      className="sticky top-0 z-40 border-b border-border bg-card backdrop-blur-sm"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2">
          {children}
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Dropdown de notificaciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <motion.span 
                    className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" sideOffset={8}>
              <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Sin notificaciones</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  No hay notificaciones nuevas en este momento
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown de perfil */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt={userName} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {loading 
                        ? "U" 
                        : userLastName 
                          ? `${userName.charAt(0)}${userLastName.charAt(0)}`.toUpperCase()
                          : userName.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {loading ? "Cargando..." : `${userName} ${userLastName}`.trim() || "Usuario"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePerfil} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleConfiguracion} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  )
}

export const DashboardHeader = memo(DashboardHeaderComponent)
