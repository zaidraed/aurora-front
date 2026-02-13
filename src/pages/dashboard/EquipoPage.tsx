
import { Users, Crown, Mail, Calendar, Bot, Building2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const teamStats = [
  {
    title: "Total Miembros",
    value: "2",
    change: "1 Owner + 1 Cliente",
    icon: Users,
    trend: "up",
  },
  {
    title: "Propietarios",
    value: "1",
    change: "Aurora SDR IA",
    icon: Crown,
    trend: "neutral",
  },
  {
    title: "Clientes",
    value: "1",
    change: "Academia MAV",
    icon: Building2,
    trend: "up",
  },
  {
    title: "Estado",
    value: "Activo",
    change: "100% operativo",
    icon: Calendar,
    trend: "up",
  },
]

const teamMembers = [
  {
    id: 1,
    name: "Aurora SDR IA",
    email: "admin@aurorasdr.ai",
    role: "Owner",
    type: "Sistema",
    avatar: "/isotipo-aurora-profile.png",
    lastAccess: "Activo ahora",
    status: "Activo",
    joinDate: "2024",
    permissions: ["Gestión completa", "Configuración global", "Administración de clientes", "Reportes avanzados", "Analíticas completas", "Control total"],
    description: "Sistema propietario de gestión y monitoreo integral de IA"
  },
  {
    id: 2,
    name: "Academia MAV",
    email: "contacto@academiamav.com",
    role: "Cliente",
    type: "Cliente",
    avatar: "/favicon-32x32.png",
    lastAccess: "Activo ahora",
    status: "Activo",
    joinDate: "2024",
    iaName: "Academia MAV IA",
    permissions: ["Dashboard de métricas", "Visualización de leads", "Reportes de rendimiento", "Gestión de ubicaciones"],
    description: "Cliente de Aurora SDR. Su agente IA 'Academia MAV IA' está integrado con Kommo CRM y gestiona leads automáticamente"
  },
]

const getRoleColor = (role: string) => {
  switch (role) {
    case "Owner":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "Cliente":
      return "bg-blue-100 text-blue-800 border-blue-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Activo":
      return "bg-green-100 text-green-800 border-green-200"
    case "Inactivo":
      return "bg-gray-100 text-gray-800 border-gray-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export default function EquipoPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">Gestión de Equipo</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">Propietarios y clientes de Aurora SDR IA</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        {teamStats.map((stat, index) => (
          <Card key={index} className="transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-1">{stat.change}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Members List */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Miembros</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Propietario y clientes del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 p-4 sm:p-6 rounded-lg border bg-card text-card-foreground hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-3 sm:gap-4 md:gap-6 min-w-0">
                  <div className="relative flex-shrink-0">
                    {member.role === "Owner" ? (
                      <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center p-2 sm:p-3 overflow-hidden">
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 sm:h-20 sm:w-20 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3">
                      <h3 className="font-semibold text-base sm:text-lg md:text-xl truncate">{member.name}</h3>
                      <Badge className={getRoleColor(member.role) + " text-xs flex-shrink-0"}>
                        {member.role === "Owner" && <Crown className="h-3 w-3 mr-1" />}
                        {member.role === "Cliente" && <Building2 className="h-3 w-3 mr-1" />}
                        {member.role}
                      </Badge>
                      <Badge className={getStatusColor(member.status) + " text-xs flex-shrink-0"}>{member.status}</Badge>
                      {member.iaName && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs flex-shrink-0">
                          <Bot className="h-3 w-3 mr-1" />
                          IA: {member.iaName}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {member.description}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 min-w-0">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <span className="hidden sm:inline">•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">Último acceso: {member.lastAccess}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-left lg:text-right">
                    <p className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                      {member.role === "Owner" ? "Capacidades" : "Acceso"}
                    </p>
                    <div className="flex flex-wrap gap-1 max-w-full lg:max-w-64 lg:justify-end">
                      {member.permissions.slice(0, 3).map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-[10px] sm:text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {member.permissions.length > 3 && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          +{member.permissions.length - 3} más
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Info */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="transition-all duration-300 hover:shadow-lg border-yellow-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" />
              <span>Aurora SDR IA</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Propietario del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Rol</span>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs flex-shrink-0">
                  <Crown className="h-3 w-3 mr-1" />
                  Owner
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Tipo</span>
                <span className="text-xs sm:text-sm font-medium text-right">Sistema de Control</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Estado</span>
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs flex-shrink-0">
                  Operativo
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Clientes activos</span>
                <span className="text-xs sm:text-sm font-medium">1</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span>Academia MAV</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Cliente con agente IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Rol</span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs flex-shrink-0">
                  <Building2 className="h-3 w-3 mr-1" />
                  Cliente
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Agente IA</span>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs flex-shrink-0">
                  <Bot className="h-3 w-3 mr-1" />
                  Academia MAV IA
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Estado</span>
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs flex-shrink-0">
                  Activo 24/7
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Integraciones</span>
                <span className="text-xs sm:text-sm font-medium text-right">Kommo CRM + WhatsApp</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
