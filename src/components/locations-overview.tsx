
import { useEffect, useState } from "react"
import { MapPin, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import { getApiUrl } from "@/lib/api-client"

interface Location {
  pais: string
  leads: number
  porcentaje: number
}

interface LocationsData {
  total: number
  locations: Location[]
}

export function LocationsOverview() {
  const [locationsData, setLocationsData] = useState<LocationsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(getApiUrl('/api/metrics/locations?days=30'), {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setLocationsData(data)
        }
      } catch (error) {
        console.error('Error al cargar ubicaciones:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLocations()
  }, [])

  if (loading) {
    return (
      <Card className="transition-all duration-300">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-4 sm:h-5 sm:w-5 bg-muted/50 rounded animate-pulse flex-shrink-0" />
            <div className="h-4 sm:h-5 bg-muted/50 rounded w-20 sm:w-24 animate-pulse" />
          </div>
          <div className="h-3 bg-muted/30 rounded w-40 sm:w-48 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-3 sm:h-4 bg-muted/50 rounded w-16 sm:w-20 animate-pulse" />
                    <div className="h-2 sm:h-3 bg-muted/30 rounded w-12 sm:w-16 animate-pulse" />
                  </div>
                  <div className="text-right space-y-1">
                    <div className="h-2 sm:h-3 bg-muted/30 rounded w-10 sm:w-12 animate-pulse" />
                    <div className="h-2 sm:h-3 bg-muted/30 rounded w-12 sm:w-16 animate-pulse" />
                  </div>
                </div>
                <div className="h-1.5 bg-muted/40 rounded w-full animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!locationsData || locationsData.locations.length === 0) {
    return (
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Ubicaciones</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Sin datos de ubicación disponibles</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Ubicaciones</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Leads por país (últimos 30 días)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {locationsData.locations.slice(0, 5).map((location, index) => (
              <motion.div 
                key={location.pais} 
                className="space-y-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <h4 className="font-medium text-xs sm:text-sm truncate">{location.pais}</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{location.leads} leads</p>
                </div>
                <div className="text-right space-y-0.5 sm:space-y-1 flex-shrink-0">
                  <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground">
                    <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                    {location.porcentaje}%
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium">del total</p>
                </div>
              </div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5, ease: "easeOut" }}
                >
                  <Progress value={location.porcentaje} className="h-1.5 transition-all duration-500" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

