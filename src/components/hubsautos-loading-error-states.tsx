import { Loader2, AlertCircle, RefreshCw, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LoadingStateProps {
  message?: string;
}

export function HubsAutosLoadingState({ message = "Cargando datos..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-12 h-12 text-[#5F378D] animate-spin mb-4" />
      <p className="text-lg text-gray-600">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function HubsAutosErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <p className="text-lg text-gray-600 mb-4 text-center max-w-md">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  message: string;
  description?: string;
}

export function HubsAutosEmptyState({ message, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
      {description && (
        <p className="text-gray-500 text-center max-w-md">{description}</p>
      )}
    </div>
  );
}

