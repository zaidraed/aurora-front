import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { TwoFactorAuth } from '@/components/TwoFactorAuth';
import { ForgotPassword } from '@/components/ForgotPassword';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFASessionId, setTwoFASessionId] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const canvasLeftRef = useRef<HTMLCanvasElement>(null);
  const canvasRightRef = useRef<HTMLCanvasElement>(null);

  // Sistema de partículas para ambos lados
  useEffect(() => {
    const createParticleSystem = (
      canvas: HTMLCanvasElement,
      particleCount: number,
      particleColor: string,
      lineOpacity: number,
      particleOpacityMultiplier: number
    ) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Configurar tamaño del canvas
      const resizeCanvas = () => {
        if (!canvas) return;
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      };
      resizeCanvas();

      // Partículas
      const canvasWidth = canvas.offsetWidth;
      const canvasHeight = canvas.offsetHeight;
      
      class Particle {
        x: number;
        y: number;
        size: number;
        speedX: number;
        speedY: number;
        opacity: number;

        constructor() {
          this.x = Math.random() * canvasWidth;
          this.y = Math.random() * canvasHeight;
          this.size = Math.random() * 2.5 + 0.5;
          this.speedX = (Math.random() - 0.5) * 0.4;
          this.speedY = (Math.random() - 0.5) * 0.4;
          this.opacity = Math.random() * 0.5 + 0.2;
        }

        update() {
          this.x += this.speedX;
          this.y += this.speedY;

          if (this.x > canvasWidth) this.x = 0;
          if (this.x < 0) this.x = canvasWidth;
          if (this.y > canvasHeight) this.y = 0;
          if (this.y < 0) this.y = canvasHeight;
        }

        draw() {
          if (!ctx) return;
          ctx.fillStyle = particleColor.replace(
            /[\d.]+\)$/,
            `${this.opacity * particleOpacityMultiplier})`
          );
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Crear partículas
      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }

      // Animación
      let animationId: number = 0;
      const animate = () => {
        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
        
        particles.forEach((particle) => {
          particle.update();
          particle.draw();
        });

        // Conectar partículas cercanas
        particles.forEach((p1, i) => {
          particles.slice(i + 1).forEach((p2) => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
              ctx.strokeStyle = particleColor.replace(
                /[\d.]+\)$/,
                `${lineOpacity * (1 - distance / 100)})`
              );
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          });
        });

        animationId = requestAnimationFrame(animate);
      };
      animate();

      return { resizeCanvas, animationId };
    };

    // Sistema izquierdo (más visible)
    const leftCanvas = canvasLeftRef.current;
    const leftSystem = leftCanvas
      ? createParticleSystem(
          leftCanvas,
          50, // más partículas
          'rgba(147, 51, 234, 1)', // púrpura
          0.08,
          0.5
        )
      : null;

    // Sistema derecho (más discreto)
    const rightCanvas = canvasRightRef.current;
    const rightSystem = rightCanvas
      ? createParticleSystem(
          rightCanvas,
          30, // menos partículas
          'rgba(147, 51, 234, 1)', // púrpura
          0.04, // líneas más sutiles
          0.3 // partículas más transparentes
        )
      : null;

    // Event listeners
    const handleResize = () => {
      leftSystem?.resizeCanvas();
      rightSystem?.resizeCanvas();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (leftSystem) cancelAnimationFrame(leftSystem.animationId);
      if (rightSystem) cancelAnimationFrame(rightSystem.animationId);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        success: boolean;
        requires2FA?: boolean;
        sessionId?: string;
        message?: string;
        data?: { 
          redirectUrl: string;
          customerId?: string;
          _id?: string;
          email?: string;
          role?: string;
        };
        error?: string;
      }>('/api/auth/login', {
        email,
        password,
        remember,
      });

      if (response.requires2FA && response.sessionId) {
        // Requiere verificación 2FA
        setRequires2FA(true);
        setTwoFASessionId(response.sessionId);
        toast.info(response.message || 'Código de verificación enviado a tu email');
      } else if (response.success && response.data) {
        // Guardar información del usuario en localStorage (más confiable que cookies en Vercel)
        if (response.data.customerId) {
          localStorage.setItem('customerId', response.data.customerId);
        }
        if (response.data._id) {
          localStorage.setItem('userId', response.data._id);
        }
        if (response.data.email) {
          localStorage.setItem('email', response.data.email);
        }
        // Guardar role si viene en la respuesta
        if (response.data.role) {
          localStorage.setItem('role', response.data.role);
        }
        
        toast.success('Inicio de sesión exitoso');
        // Pequeño delay para asegurar que las cookies se establezcan
        await new Promise(resolve => setTimeout(resolve, 100));
        // Recargar la página para asegurar que todas las cookies se carguen correctamente
        window.location.href = response.data.redirectUrl || '/home';
      } else {
        setError(response.error || 'Error al iniciar sesión');
        toast.error(response.error || 'Error al iniciar sesión');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al iniciar sesión';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handle2FAVerify(code: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: { 
          redirectUrl: string;
          customerId?: string;
          _id?: string;
          email?: string;
          role?: string;
        };
        error?: string;
      }>('/api/auth/login', {
        email,
        password,
        remember,
        twoFactorCode: code,
        sessionId: twoFASessionId,
      });

      if (response.success && response.data) {
        // Guardar información del usuario en localStorage
        if (response.data.customerId) {
          localStorage.setItem('customerId', response.data.customerId);
        }
        if (response.data._id) {
          localStorage.setItem('userId', response.data._id);
        }
        if (response.data.email) {
          localStorage.setItem('email', response.data.email);
        }
        if (response.data.role) {
          localStorage.setItem('role', response.data.role);
        }
        
        toast.success('Inicio de sesión exitoso');
        await new Promise(resolve => setTimeout(resolve, 100));
        window.location.href = response.data.redirectUrl || '/home';
      } else {
        setError(response.error || 'Código de verificación inválido');
        toast.error(response.error || 'Código de verificación inválido');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al verificar código';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel Izquierdo - Logo y Bienvenida con Partículas */}
      <div className="hidden lg:flex lg:w-2/5 relative bg-white dark:bg-gray-900 overflow-hidden">
        {/* Canvas de partículas */}
        <canvas
          ref={canvasLeftRef}
          className="absolute inset-0 w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
        
        {/* Contenido */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Logo */}
          <div className="mb-12">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-3xl p-10 shadow-xl border border-purple-100 dark:border-purple-900/50">
              <img 
                src="/isotipo-aurora-profile.png" 
                alt="Aurora SDR IA" 
                className="w-36 h-36 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/logo-aurora.png";
                }}
              />
            </div>
          </div>

          {/* Texto de bienvenida */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
              Bienvenido a Aurora
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Sistema de gestión de IA
            </p>
          </div>

          {/* Footer */}
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">www.aurorasdr.ai</p>
          </div>
        </div>
      </div>

      {/* Panel Derecho - Formulario de Login con Partículas */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black dark:bg-gray-950 lg:w-3/5 relative overflow-hidden">
        {/* Canvas de partículas discretas */}
        <canvas
          ref={canvasRightRef}
          className="absolute inset-0 w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
        
        <div className="w-full max-w-md relative z-10">
          {/* Logo para móvil */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <div className="inline-block bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-purple-100 dark:border-purple-900/50">
              <img 
                src="/isotipo-aurora-profile.png" 
                alt="Aurora SDR IA" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/logo-aurora.png";
                }}
              />
            </div>
          </div>

          {/* Card de Login / 2FA / Forgot Password */}
          <div className="bg-white/5 dark:bg-white/5 backdrop-blur-3xl rounded-xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 border border-white/10">
            {showForgotPassword ? (
              <ForgotPassword onBack={() => setShowForgotPassword(false)} />
            ) : requires2FA && twoFASessionId ? (
              <TwoFactorAuth
                sessionId={twoFASessionId}
                email={email}
                onVerify={handle2FAVerify}
                onCancel={() => {
                  setRequires2FA(false);
                  setTwoFASessionId(null);
                  setPassword('');
                }}
              />
            ) : (
              <>
                {/* Saludo */}
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    Iniciar Sesión
                  </h2>
                  <p className="text-sm sm:text-base text-gray-300">
                    Ingresa tus credenciales para continuar
                  </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Email */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-9 sm:pl-11 h-10 sm:h-12 text-sm sm:text-base bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/50 backdrop-blur-md disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-9 sm:pl-11 pr-9 sm:pr-11 h-10 sm:h-12 text-sm sm:text-base bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/50 backdrop-blur-md disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked as boolean)}
                  disabled={loading}
                  className="border-white/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 disabled:opacity-50"
                />
                <label
                  htmlFor="remember"
                  className="text-xs sm:text-sm font-medium text-gray-300 cursor-pointer disabled:opacity-50"
                >
                  Recordarme
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="text-xs sm:text-sm text-red-300 text-center p-2.5 sm:p-3 bg-red-500/20 rounded-lg border border-red-400/20 backdrop-blur-md">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    <span className="hidden sm:inline">Iniciando sesión...</span>
                    <span className="sm:hidden">Iniciando...</span>
                  </span>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs sm:text-sm text-gray-400 hover:text-gray-200 underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
