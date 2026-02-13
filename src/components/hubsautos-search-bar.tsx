
import { useState, useEffect, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, X, Car, Phone, Filter } from "lucide-react"
import { FormEntry } from "@/lib/api-hubsautos"

interface SearchBarProps {
  entries: FormEntry[]
  onFilteredEntries: (filteredEntries: FormEntry[]) => void
  onSearch?: (searchTerm: string, searchType: "vehicle" | "phone") => Promise<FormEntry[]>
  onSearchActiveChange?: (isActive: boolean) => void
  loading?: boolean
}

export default function HubsAutosSearchBar({ entries, onFilteredEntries, onSearch, onSearchActiveChange, loading = false }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState<"vehicle" | "phone">("vehicle")
  const [hasActiveFilters, setHasActiveFilters] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Función para filtrar entradas
  const filterEntries = useCallback((allEntries: FormEntry[], term: string, type: "vehicle" | "phone") => {
    return allEntries.filter(entry => {
      const searchTermLower = term.toLowerCase().trim()
      
      if (type === "vehicle") {
        // Buscar en marca, modelo, año, versión
        const vehicleInfo = `${entry.marca} ${entry.modelo} ${entry.ano} ${entry.version}`.toLowerCase()
        return vehicleInfo.includes(searchTermLower)
      } else {
        // Buscar en celular y teléfono
        const phoneInfo = `${entry.celular || ''} ${entry.telefono || ''}`.toLowerCase()
        return phoneInfo.includes(searchTermLower)
      }
    })
  }, [])

  // Función para realizar la búsqueda
  const performSearch = useCallback((term: string, type: "vehicle" | "phone") => {
    if (!term.trim()) {
      setSearching(false)
      onFilteredEntries(entries)
      setHasActiveFilters(false)
      onSearchActiveChange?.(false)
      return
    }

    // Si hay una función onSearch, usarla para buscar en todos los registros
    if (onSearch) {
      setSearching(true)
      
      // Timeout de seguridad para evitar que se quede girando indefinidamente
      const timeoutId = setTimeout(() => {
        console.warn('Búsqueda tardó demasiado, usando fallback')
        setSearching(false)
        const filtered = filterEntries(entries, term, type)
        onFilteredEntries(filtered)
        setHasActiveFilters(true)
        onSearchActiveChange?.(true)
      }, 30000) // 30 segundos de timeout
      
      onSearch(term, type)
        .then((allEntries) => {
          clearTimeout(timeoutId)
          const filtered = filterEntries(allEntries || [], term, type)
          onFilteredEntries(filtered)
          setHasActiveFilters(true)
          onSearchActiveChange?.(true)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          console.error('Error en búsqueda:', error)
          // Fallback: filtrar solo las entradas actuales
          const filtered = filterEntries(entries, term, type)
          onFilteredEntries(filtered)
          setHasActiveFilters(true)
          onSearchActiveChange?.(true)
        })
        .finally(() => {
          clearTimeout(timeoutId)
          setSearching(false)
        })
    } else {
      // Si no hay función onSearch, filtrar solo las entradas actuales (comportamiento anterior)
      setSearching(false)
      const filtered = filterEntries(entries, term, type)
      onFilteredEntries(filtered)
      setHasActiveFilters(true)
      onSearchActiveChange?.(true)
    }
  }, [entries, onFilteredEntries, onSearch, onSearchActiveChange, filterEntries])

  // Filtrar entradas basado en el término de búsqueda y tipo con debounce
  useEffect(() => {
    // Limpiar timer anterior si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!searchTerm.trim()) {
      setSearching(false)
      onFilteredEntries(entries)
      setHasActiveFilters(false)
      onSearchActiveChange?.(false)
      return
    }

    // Si hay una función onSearch, usar debounce para evitar búsquedas excesivas
    // Si no hay onSearch, filtrar inmediatamente (solo en entradas actuales)
    if (onSearch) {
      // Debounce de 500ms para búsquedas en todos los registros
      debounceTimerRef.current = setTimeout(() => {
        performSearch(searchTerm, searchType)
      }, 500)
    } else {
      // Sin debounce para búsquedas locales (rápidas)
      performSearch(searchTerm, searchType)
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchTerm, searchType, entries, performSearch, onFilteredEntries, onSearch, onSearchActiveChange])

  const clearSearch = () => {
    // Limpiar timer de debounce si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    setSearchTerm("")
    setHasActiveFilters(false)
    setSearching(false)
    onSearchActiveChange?.(false)
  }

  const handleSearchTypeChange = (type: "vehicle" | "phone") => {
    setSearchType(type)
    // El efecto se encargará de re-filtrar cuando cambie searchType
  }

  return (
    <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-white to-gray-50">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Header del buscador */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#5F378D]/10 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-[#5F378D]" />
              </div>
              <h3 className="text-lg font-semibold text-[#353331]">Buscador</h3>
              {hasActiveFilters && (
                <Badge variant="secondary" className="bg-[#5F378D]/10 text-[#5F378D] border-[#5F378D]/20">
                  <Filter className="w-3 h-3 mr-1" />
                  Filtros activos
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button
                onClick={clearSearch}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Selector de tipo de búsqueda */}
          <div className="flex space-x-2">
            <Button
              onClick={() => handleSearchTypeChange("vehicle")}
              variant={searchType === "vehicle" ? "default" : "outline"}
              size="sm"
              className={`flex items-center space-x-2 ${
                searchType === "vehicle" 
                  ? "bg-[#5F378D] hover:bg-[#4a2d71] text-white" 
                  : "border-[#5F378D] text-[#5F378D] hover:bg-[#5F378D]/10"
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Vehículo</span>
            </Button>
            <Button
              onClick={() => handleSearchTypeChange("phone")}
              variant={searchType === "phone" ? "default" : "outline"}
              size="sm"
              className={`flex items-center space-x-2 ${
                searchType === "phone" 
                  ? "bg-[#5F378D] hover:bg-[#4a2d71] text-white" 
                  : "border-[#5F378D] text-[#5F378D] hover:bg-[#5F378D]/10"
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Teléfono</span>
            </Button>
          </div>

          {/* Campo de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={
                searchType === "vehicle" 
                  ? "Buscar por marca, modelo, año o versión..." 
                  : "Buscar por número de teléfono o celular..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 border-gray-200 focus:border-[#5F378D] focus:ring-[#5F378D]/20 text-sm"
              disabled={loading || searching}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#5F378D] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  )
}

