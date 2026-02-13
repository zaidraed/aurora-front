
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, Trash2, Search, Building2, Mail, Phone, Globe, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Customer } from "@/lib/customer-types"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-client"

export default function AdminClientsPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const res = await fetch(getApiUrl('/api/customers'))
      const data = await res.json()

      if (data.success) {
        // Filtrar clientes con rol 'Owner' - no deben aparecer en la lista
        const filteredData = data.data.filter((c: any) => c.rol !== 'Owner')
        
        setCustomers(
          filteredData.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
            fechaInicio: new Date(c.fechaInicio),
            hasPostgresCredentials: c.hasPostgresCredentials || false,
            hasKommoCredentials: c.hasKommoCredentials || false,
          })),
        )
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    navigate("/admin/clients/new")
  }

  const handleEdit = (customer: Customer) => {
    navigate(`/admin/clients/${customer._id}`)
  }

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedCustomer?._id) return

    try {
      // Eliminar usuario asociado si existe
      const usersRes = await fetch(getApiUrl('/api/users'))
      const usersData = await usersRes.json()
      if (usersData.success) {
        const user = usersData.data.find(
          (u: any) => u.customerId === selectedCustomer._id?.toString()
        )
        if (user?._id) {
          await fetch(getApiUrl(`/api/users/${user._id}`), {
            method: "DELETE",
          })
        }
      }

      // Eliminar cliente
      const res = await fetch(getApiUrl(`/api/customers/${selectedCustomer._id}`), {
        method: "DELETE",
      })

      const data = await res.json()

      if (data.success) {
        setIsDeleteDialogOpen(false)
        setSelectedCustomer(null)
        loadCustomers()
        toast.success("Cliente eliminado exitosamente")
      } else {
        toast.error(data.error || "Error al eliminar cliente")
      }
    } catch (error) {
      console.error("Error al eliminar cliente:", error)
      toast.error("Error al eliminar cliente")
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.pais.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "Básico":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      case "Profesional":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      case "Enterprise":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      case "Custom":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getRoleColor = (rol: string) => {
    return rol === "Owner"
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Administra todos los clientes, sus datos y usuarios de acceso
            </p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Clientes Registrados</CardTitle>
              <CardDescription>
                {filteredCustomers.length} cliente(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando clientes...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron clientes
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer._id?.toString()}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {customer.nombre} {customer.apellido}
                        </h3>
                        <Badge className={getRoleColor(customer.rol)}>
                          {customer.rol}
                        </Badge>
                        <Badge className={getPlanColor(customer.planContratado)}>
                          {customer.planContratado}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                        {customer.telefono && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{customer.telefono}</span>
                          </div>
                        )}
                        {customer.pais && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span>{customer.pais}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(customer)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmación de Eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              cliente{" "}
              <strong>
                {selectedCustomer?.nombre} {selectedCustomer?.apellido}
              </strong>
              {" "}y su usuario de acceso asociado (si existe).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
