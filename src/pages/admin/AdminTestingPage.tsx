import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Key, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export default function AdminTestingPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<{
    passwordReset: boolean;
    welcome: boolean;
    twoFA: boolean;
  }>({
    passwordReset: false,
    welcome: false,
    twoFA: false,
  });

  const [lastSent, setLastSent] = useState<{
    passwordReset: boolean;
    welcome: boolean;
    twoFA: boolean;
  }>({
    passwordReset: false,
    welcome: false,
    twoFA: false,
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleTestEmail = async (type: 'passwordReset' | 'welcome' | 'twoFA') => {
    if (!email) {
      toast.error('Por favor ingresa un email');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    setLoading((prev) => ({ ...prev, [type]: true }));
    setLastSent((prev) => ({ ...prev, [type]: false }));

    try {
      const response = await apiClient.post<{
        success: boolean;
        message?: string;
        error?: string;
      }>(`/api/admin/test-email/${type}`, { email });

      if (response.success) {
        toast.success(response.message || 'Email enviado exitosamente');
        setLastSent((prev) => ({ ...prev, [type]: true }));
      } else {
        toast.error(response.error || 'Error al enviar el email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el email');
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Testing de Emails</h1>
        <p className="text-muted-foreground mt-1">
          Prueba los diferentes tipos de emails del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>
            Ingresa el email donde quieres recibir los emails de prueba
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="test-email">Email de Prueba</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Todos los emails de prueba se enviarán a esta dirección
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Recuperar Contraseña */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              <CardTitle>Recuperar Contraseña</CardTitle>
            </div>
            <CardDescription>
              Envía un email de recuperación de contraseña con enlace de reset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastSent.passwordReset && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Email enviado</span>
              </div>
            )}
            <Button
              onClick={() => handleTestEmail('passwordReset')}
              disabled={loading.passwordReset || !email}
              className="w-full"
              variant="outline"
            >
              {loading.passwordReset ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Bienvenido a Aurora */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              <CardTitle>Bienvenido a Aurora</CardTitle>
            </div>
            <CardDescription>
              Envía un email de bienvenida a nuevos usuarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastSent.welcome && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Email enviado</span>
              </div>
            )}
            <Button
              onClick={() => handleTestEmail('welcome')}
              disabled={loading.welcome || !email}
              className="w-full"
              variant="outline"
            >
              {loading.welcome ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 2FA */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <CardTitle>2FA - Código de Verificación</CardTitle>
            </div>
            <CardDescription>
              Envía un código de verificación de dos factores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastSent.twoFA && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Email enviado</span>
              </div>
            )}
            <Button
              onClick={() => handleTestEmail('twoFA')}
              disabled={loading.twoFA || !email}
              className="w-full"
              variant="outline"
            >
              {loading.twoFA ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Enviar Código
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Recuperar Contraseña:</strong> Envía un email con un enlace para restablecer la contraseña.
            El enlace expira en 1 hora.
          </p>
          <p>
            • <strong>Bienvenido a Aurora:</strong> Email de bienvenida que se envía a nuevos usuarios
            cuando se crea su cuenta.
          </p>
          <p>
            • <strong>2FA:</strong> Envía un código de verificación de 6 dígitos para autenticación de dos factores.
            El código expira en 10 minutos.
          </p>
          <p className="pt-2 text-xs">
            <strong>Nota:</strong> Asegúrate de tener configurado SendGrid correctamente en las variables de entorno del backend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
