
import { useEffect, useState } from "react"

export default function MaintenanceScreen() {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return ""
        return prev + "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-8 px-4">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src="/Logotipo_Aurora.svg" 
            alt="Aurora SDR" 
            className="h-24 w-auto dark:invert"
            onError={(e) => {
              // Fallback a PNG si SVG no carga
              const target = e.target as HTMLImageElement
              target.src = "/logo-aurora.png"
            }}
          />
        </div>

        {/* Mensaje */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Estamos trabajando en mejoras
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Estamos realizando algunas actualizaciones para brindarte una mejor experiencia.
          </p>
          <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm">Volveremos pronto{dots}</span>
          </div>
        </div>

        {/* Spinner decorativo */}
        <div className="flex justify-center pt-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-primary rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
