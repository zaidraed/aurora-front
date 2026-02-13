import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Shield } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface TwoFactorAuthProps {
  sessionId: string;
  email: string;
  onVerify: (code: string) => void;
  onCancel?: () => void;
}

export function TwoFactorAuth({ sessionId, email, onVerify, onCancel }: TwoFactorAuthProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos');
      setLoading(false);
      return;
    }

    try {
      onVerify(code);
    } catch (err: any) {
      const errorMessage = err.message || 'Código inválido';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      // El backend enviará un nuevo código automáticamente cuando se intente hacer login de nuevo
      toast.info('Por favor, intenta iniciar sesión nuevamente para recibir un nuevo código');
    } catch (err: any) {
      toast.error('Error al reenviar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="bg-purple-600/20 p-3 rounded-full">
            <Shield className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-white">Verificación en Dos Pasos</h3>
        <p className="text-sm text-gray-300">
          Hemos enviado un código de verificación a <br />
          <span className="font-medium text-white">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Código de Verificación
          </label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setCode(value);
              setError(null);
            }}
            placeholder="000000"
            disabled={loading}
            className="text-center text-2xl tracking-widest font-mono h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/50 backdrop-blur-md disabled:opacity-50"
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-300 text-center">{error}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full h-12 text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg disabled:opacity-80 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Verificando...
            </span>
          ) : (
            'Verificar Código'
          )}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            className="w-full text-gray-300 hover:text-white"
          >
            Cancelar
          </Button>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-gray-200 underline disabled:opacity-50"
          >
            ¿No recibiste el código? Reenviar
          </button>
        </div>
      </form>
    </div>
  );
}
