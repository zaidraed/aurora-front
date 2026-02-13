import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface ForgotPasswordProps {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post<{
        success: boolean;
        message?: string;
        error?: string;
      }>('/api/auth/forgot-password', { email });

      if (response.success) {
        setSent(true);
        toast.success('Si el email existe, recibirás un enlace de recuperación');
      } else {
        toast.error(response.error || 'Error al procesar la solicitud');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/30">
          <p className="text-sm text-green-300">
            ✅ Si el email existe, recibirás un enlace de recuperación en tu bandeja de entrada.
          </p>
        </div>
        <Button
          onClick={onBack}
          variant="ghost"
          className="w-full text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al inicio de sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-white">Recuperar Contraseña</h3>
        <p className="text-sm text-gray-300">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="pl-11 h-12 text-base bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/50 backdrop-blur-md disabled:opacity-50"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg disabled:opacity-80 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Enviando...
            </span>
          ) : (
            'Enviar Enlace de Recuperación'
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={loading}
          className="w-full text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al inicio de sesión
        </Button>
      </form>
    </div>
  );
}
