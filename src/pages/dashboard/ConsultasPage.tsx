
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, User, Mail, Phone, Gauge, FileDown, ChevronDown } from "lucide-react"
import { useFormEntries } from "@/hooks/use-form-entries"
import { HubsAutosLoadingState, HubsAutosErrorState, HubsAutosEmptyState } from "@/components/hubsautos-loading-error-states"
import { HubsAutosPagination } from "@/components/hubsautos-pagination"
import HubsAutosSearchBar from "@/components/hubsautos-search-bar"
import { FormEntry, apiService } from "@/lib/api-hubsautos"
import { exportToExcel } from "@/lib/export-to-excel"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ConsultasPage() {
  const {
    entries,
    stats,
    loading,
    error,
    pagination,
    refreshData,
    changePage,
    changeLimit,
  } = useFormEntries();

  // Estado para las entradas filtradas por el buscador
  const [filteredEntries, setFilteredEntries] = useState<FormEntry[]>(entries);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Mensajes para los estados de carga
  const loadingMessage = isSearching ? "Buscando en todos los registros..." : "Cargando registros...";

  // Sincronizar las entradas filtradas con las entradas originales
  useEffect(() => {
    setFilteredEntries(entries);
  }, [entries]);

  // Función para buscar en todos los registros
  const handleSearchAllEntries = async (searchTerm: string, searchType: "vehicle" | "phone"): Promise<FormEntry[]> => {
    try {
      setIsSearching(true);
      
      // Obtener todos los registros usando el método de exportación
      const response = await apiService.getAllFormEntriesForExport();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        console.error('Error al obtener todos los registros:', response.message);
        // Fallback: retornar las entradas actuales
        return entries;
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
      // Fallback: retornar las entradas actuales
      return entries;
    } finally {
      // Asegurarse de que el estado se actualice incluso si hay un error
      setTimeout(() => {
        setIsSearching(false);
      }, 100);
    }
  };

  // Función para exportar los datos filtrados actuales a Excel
  const handleExportFilteredToExcel = () => {
    if (filteredEntries.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    setExportingExcel(true);
    toast.loading('Generando archivo Excel...');
    
    try {
      // Exportar los datos filtrados actuales
      const result = exportToExcel(filteredEntries, 'registros-hubsautos-filtrados');
      
      toast.dismiss();
      if (result.success) {
        toast.success(`Excel exportado exitosamente: ${result.filename}`);
      } else {
        toast.error(`Error al exportar: ${result.error}`);
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Error al exportar los datos');
      console.error('Error:', error);
    } finally {
      setExportingExcel(false);
    }
  };

  // Función para exportar TODOS los datos a Excel
  const handleExportAllToExcel = async () => {
    setExportingExcel(true);
    const loadingToast = toast.loading('Obteniendo todos los registros de la base de datos...', {
      description: 'Esto puede tardar unos momentos'
    });
    
    try {
      // Obtener todos los registros haciendo múltiples peticiones paginadas
      const response = await apiService.getAllFormEntriesForExport();
      
      if (response.success && response.data) {
        toast.dismiss(loadingToast);
        
        const totalRecords = response.data.length;
        const generatingToast = toast.loading(`Generando archivo Excel con ${totalRecords} registros...`);
        
        // Pequeño delay para que el usuario vea el mensaje
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Exportar a Excel
        const result = exportToExcel(response.data, 'registros-hubsautos-completo');
        
        toast.dismiss(generatingToast);
        if (result.success) {
          toast.success(`¡Exportación exitosa!`, {
            description: `Se exportaron ${totalRecords} registros a ${result.filename}`
          });
        } else {
          toast.error(`Error al exportar: ${result.error}`);
        }
      } else {
        toast.dismiss(loadingToast);
        toast.error(response.message || 'Error al obtener los registros');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Error al exportar los datos', {
        description: 'Por favor, intenta nuevamente'
      });
      console.error('Error:', error);
    } finally {
      setExportingExcel(false);
    }
  };

  // Función para formatear el promedio de KM
  const formatAverageKm = (km: number) => {
    if (km >= 1000) {
      return `${(km / 1000).toFixed(1)}K`;
    }
    return km.toLocaleString('es-AR');
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consultas de Vehículos</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona y visualiza todos los registros de consultas de vehículos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#5F378D]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Registros</p>
                  <p className="text-3xl font-bold">
                    {loading ? "..." : pagination.total || stats?.totalRegistros || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#5F378D]/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[#5F378D]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#5F378D]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Hoy</p>
                  <p className="text-3xl font-bold">
                    {loading ? "..." : stats?.registrosHoy || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#5F378D]/10 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-[#5F378D]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#5F378D]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Esta Semana</p>
                  <p className="text-3xl font-bold">
                    {loading ? "..." : stats?.registrosEstaSemana || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#5F378D]/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-[#5F378D]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#5F378D]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Promedio KM</p>
                  <p className="text-3xl font-bold text-[#5F378D]">
                    {loading ? "..." : stats?.promedioKm ? formatAverageKm(stats.promedioKm) : "0K"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#5F378D]/10 rounded-xl flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-[#5F378D]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <HubsAutosSearchBar 
          entries={entries} 
          onFilteredEntries={setFilteredEntries} 
          onSearch={handleSearchAllEntries}
          onSearchActiveChange={setIsSearchActive}
          loading={loading || isSearching} 
        />

        {/* Data Table */}
        <Card>
          <div className="bg-gradient-to-r from-[#5F378D] to-[#4a2d71] text-white px-6 pt-6 pb-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-2xl font-bold flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span>Lista de Registros</span>
                </div>
                <p className="text-white/80 text-sm">Gestiona todos los registros de vehículos de forma eficiente</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={exportingExcel || loading}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/40"
                    variant="outline"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Exportar Excel
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={handleExportFilteredToExcel}
                    className="cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    <div className="flex flex-col">
                      <span className="font-medium">Exportar vista actual</span>
                      <span className="text-xs text-gray-500">
                        {filteredEntries.length} {filteredEntries.length === 1 ? 'registro' : 'registros'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleExportAllToExcel}
                    className="cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    <div className="flex flex-col">
                      <span className="font-medium">Exportar todos</span>
                      <span className="text-xs text-gray-500">
                        Todos los registros de la base de datos
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Estados de carga y error */}
          {(loading || isSearching) && (
            <HubsAutosLoadingState message={loadingMessage} />
          )}
          {error && !isSearching && (
            <HubsAutosErrorState message={error} onRetry={refreshData} />
          )}
          {!loading && !error && !isSearching && filteredEntries.length === 0 && (
            <HubsAutosEmptyState 
              message="No hay registros" 
              description={isSearchActive ? "No se encontraron registros que coincidan con la búsqueda" : "No se encontraron registros con los filtros aplicados"}
            />
          )}
          
          {/* Tabla de datos */}
          {!loading && !error && !isSearching && filteredEntries.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableHead className="font-bold">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-[#5F378D]" />
                        <span>Fecha</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-bold">Año</TableHead>
                    <TableHead className="font-bold">Modelo</TableHead>
                    <TableHead className="font-bold">Marca</TableHead>
                    <TableHead className="font-bold">Versión</TableHead>
                    <TableHead className="font-bold">
                      <div className="flex items-center space-x-2">
                        <Gauge className="w-4 h-4 text-[#5F378D]" />
                        <span>KM</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-bold">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-[#5F378D]" />
                        <span>Nombre</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-bold">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-[#5F378D]" />
                        <span>Email</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-bold">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-[#5F378D]" />
                        <span>Celular</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((record, index) => (
                    <TableRow 
                      key={record._id || index} 
                      className="hover:bg-gradient-to-r hover:from-[#5F378D]/5 hover:to-[#4a2d71]/5"
                    >
                      <TableCell className="font-semibold">
                        <div className="bg-gray-100 rounded-lg px-3 py-1 inline-block">
                          {(() => {
                            const fecha = new Date(record.fecha);
                            // Ajustar a la zona horaria argentina (UTC-3)
                            const fechaArgentina = new Date(fecha.getTime() + (3 * 60 * 60 * 1000));
                            return fechaArgentina.toLocaleDateString('es-AR');
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          {record.ano}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold">{record.modelo}</TableCell>
                      <TableCell>
                        <span className="bg-gray-100 text-gray-800 font-medium px-3 py-1 rounded-md">
                          {record.marca}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600 font-medium">{record.version}</TableCell>
                      <TableCell className="font-bold text-[#5F378D]">
                        <div className="bg-[#5F378D]/10 text-[#5F378D] px-3 py-1 rounded-lg font-mono">
                          {record.km.toLocaleString('es-AR')}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{record.nombre}</TableCell>
                      <TableCell>
                        <a href={`mailto:${record.email}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          {record.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        <span className="bg-green-100 text-green-800 font-medium px-3 py-1 rounded-md">
                          {record.celular}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación - Solo mostrar si no hay búsqueda activa */}
          {!loading && !error && filteredEntries.length > 0 && !isSearchActive && (
            <div className="p-4">
              <HubsAutosPagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={changePage}
                onLimitChange={changeLimit}
                loading={loading}
              />
            </div>
          )}
          
          {/* Mensaje cuando hay búsqueda activa */}
          {!loading && !error && isSearchActive && filteredEntries.length > 0 && (
            <div className="p-4 border-t bg-gray-50">
              <p className="text-sm text-muted-foreground text-center">
                Mostrando {filteredEntries.length} {filteredEntries.length === 1 ? 'resultado' : 'resultados'} de la búsqueda
              </p>
            </div>
          )}
        </Card>
      </div>
  )
}

