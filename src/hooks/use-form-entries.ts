import { useState, useEffect, useCallback } from 'react';
import { apiService, FormEntry, DashboardStats, PaginatedResponse } from '@/lib/api-hubsautos';

export function useFormEntries() {
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    brand: 'all',
  });

  // Cargar datos iniciales
  const loadInitialData = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      // Cargar estadísticas y registros en paralelo
      const [statsResponse, entriesResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getFormEntries(page, pagination.limit),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (entriesResponse.success && entriesResponse.data) {
        setEntries(entriesResponse.data);
        if (entriesResponse.pagination) {
          setPagination(entriesResponse.pagination);
        }
      }

      // Verificar errores
      if (!statsResponse.success) {
        setError(statsResponse.message || 'Error al cargar estadísticas');
      }
      if (!entriesResponse.success) {
        setError(entriesResponse.message || 'Error al cargar registros');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  // Filtrar por rango de fechas
  const filterByDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
      await loadInitialData();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getFormEntriesByDateRange(startDate, endDate);
      
      if (response.success && response.data) {
        setEntries(response.data);
        setFilters(prev => ({ ...prev, startDate, endDate }));
      } else {
        setError(response.message || 'Error al filtrar por fechas');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [loadInitialData]);

  // Filtrar por marca
  const filterByBrand = useCallback(async (brand: string) => {
    if (!brand || brand === "all") {
      await loadInitialData();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getFormEntriesByBrand(brand);
      
      if (response.success && response.data) {
        setEntries(response.data);
        setFilters(prev => ({ ...prev, brand }));
      } else {
        setError(response.message || 'Error al filtrar por marca');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [loadInitialData]);

  // Limpiar filtros
  const clearFilters = useCallback(async () => {
    setFilters({ startDate: '', endDate: '', brand: 'all' });
    await loadInitialData();
  }, [loadInitialData]);

  // Cambiar de página
  const changePage = useCallback(async (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      await loadInitialData(newPage);
    }
  }, [loadInitialData, pagination.totalPages]);

  // Cambiar límite de registros por página
  const changeLimit = useCallback(async (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    await loadInitialData(1);
  }, [loadInitialData]);

  // Recargar datos
  const refreshData = useCallback(async () => {
    await loadInitialData(pagination.page);
  }, [loadInitialData, pagination.page]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    entries,
    stats,
    loading,
    error,
    pagination,
    filters,
    filterByDateRange,
    filterByBrand,
    clearFilters,
    refreshData,
    changePage,
    changeLimit,
  };
}

