const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://panel-aurora-sdr-backend.vercel.app';

/**
 * Normaliza la URL base y el endpoint para evitar doble slash (causa redirect y fallo CORS en preflight).
 */
function buildApiUrl(base: string, endpoint: string): string {
  const baseNormalized = (base || '').replace(/\/+$/, ''); // quitar trailing slashes
  const path = (endpoint || '').replace(/^\/+/, '/'); // asegurar un solo slash al inicio
  return `${baseNormalized}${path}`;
}

/**
 * Helper para construir URLs de API
 * Si VITE_API_URL está definida, usa esa URL directamente (útil para desarrollo con backend remoto)
 * Si no está definida, en desarrollo usa el proxy de Vite, en producción usa la URL por defecto
 */
export function getApiUrl(endpoint: string): string {
  // Si VITE_API_URL está definida, usar esa URL directamente (tanto en dev como en prod)
  if (import.meta.env.VITE_API_URL) {
    return buildApiUrl(API_BASE_URL, endpoint);
  }
  // En producción sin VITE_API_URL, usar la URL por defecto
  if (import.meta.env.PROD) {
    return buildApiUrl(API_BASE_URL, endpoint);
  }
  // En desarrollo sin VITE_API_URL, usar el proxy de Vite (localhost:3001)
  return endpoint;
}

/**
 * Helper para obtener headers de autenticación desde localStorage
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  
  const customerId = localStorage.getItem('customerId');
  const userId = localStorage.getItem('userId');
  const email = localStorage.getItem('email');
  
  if (customerId) {
    headers['x-customer-id'] = customerId;
  }
  if (userId) {
    headers['x-user-id'] = userId;
  }
  if (email) {
    headers['x-user-email'] = email;
  }
  
  return headers;
}

/**
 * Wrapper de fetch que automáticamente agrega headers de autenticación
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  
  const headers: HeadersInit = {
    ...authHeaders,
    ...options.headers,
  };
  
  // Si no se especifica Content-Type y hay body, agregarlo
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Para incluir cookies (si funcionan)
  });
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = getApiUrl(endpoint);
    
    // Obtener customerId de localStorage para enviarlo en headers
    const customerId = localStorage.getItem('customerId');
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('email');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Enviar información del usuario en headers (más confiable que cookies en Vercel)
    if (customerId) {
      headers['x-customer-id'] = customerId;
    }
    if (userId) {
      headers['x-user-id'] = userId;
    }
    if (email) {
      headers['x-user-email'] = email;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Para incluir cookies (si funcionan)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
