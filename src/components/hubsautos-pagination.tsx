
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  loading?: boolean;
}

export function HubsAutosPagination({ 
  currentPage, 
  totalPages, 
  total, 
  limit, 
  onPageChange, 
  onLimitChange,
  loading = false 
}: PaginationProps) {
  const startRecord = (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, total);

  // Generar array de páginas a mostrar
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Mostrar todas las páginas si hay pocas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas alrededor de la actual
      const start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Información de registros */}
      <div className="text-sm text-gray-600">
        Mostrando <span className="font-medium">{startRecord}</span> a <span className="font-medium">{endRecord}</span> de <span className="font-medium">{total.toLocaleString('es-AR')}</span> registros
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center gap-2">
        {/* Selector de registros por página */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Por página:</span>
          <Select value={limit.toString()} onValueChange={(value) => onLimitChange(parseInt(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botones de navegación */}
        <div className="flex items-center gap-1">
          {/* Primera página */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            className="px-2"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          {/* Página anterior */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="px-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Números de página */}
          {pageNumbers.map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              disabled={loading}
              className="px-3 min-w-[40px]"
            >
              {page}
            </Button>
          ))}

          {/* Página siguiente */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="px-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Última página */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            className="px-2"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

