
import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Search, User as UserIcon, Mail, Shield, Key, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { useNavigate } from "react-router-dom"
import type { User } from "@/lib/types"
import { generateSecurePassword } from "@/lib/utils"
import { getApiUrl } from "@/lib/api-client"

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordField, setShowPasswordField] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const usersRes = await fetch(getApiUrl('/api/users'))
      const usersData = await usersRes.json()

      if (usersData.success) {
        // Filtrar solo usuarios SuperAdmin (sin customerId)
        const adminUsers = usersData.data.filter(
          (user: User) => user.role === "SuperAdmin"
        )
        setUsers(adminUsers)
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setFormData({
      email: "",
      name: "",
      password: "",
    })
    setShowPassword(true)
    setIsDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    // No permitir editar el usuario del owner
    if (isOwnerUser(user)) {
      return
    }
    setSelectedUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
    })
    setShowPassword(false)
    setIsDialogOpen(true)
  }

  const handleDelete = (user: User) => {
    // No permitir eliminar el usuario del owner
    if (isOwnerUser(user)) {
      return
    }
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    // No permitir guardar cambios al usuario del owner
    if (selectedUser && isOwnerUser(selectedUser)) {
      alert("No se puede editar el usuario del sistema")
      return
    }

    try {
      const url = selectedUser ? getApiUrl(`/api/users/${selectedUser._id}`) : getApiUrl("/api/users")
      const method = selectedUser ? "PUT" : "POST"

      const body: any = {
        email: formData.email,
        name: formData.name,
        role: "SuperAdmin", // Siempre SuperAdmin para usuarios del admin
      }

      // Solo incluir password si es nuevo usuario o si se está cambiando
      if (!selectedUser || formData.password) {
        if (!formData.password) {
          alert("La contraseña es requerida")
          return
        }
        body.password = formData.password
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success) {
        setIsDialogOpen(false)
        loadUsers()
      } else {
        alert(data.error || "Error al guardar usuario")
      }
    } catch (error) {
      console.error("Error al guardar usuario:", error)
      alert("Error al guardar usuario")
    }
  }

  const confirmDelete = async () => {
    if (!selectedUser?._id) return

    try {
      const res = await fetch(getApiUrl(`/api/users/${selectedUser._id}`), {
        method: "DELETE",
      })

      const data = await res.json()

      if (data.success) {
        setIsDeleteDialogOpen(false)
        setSelectedUser(null)
        loadUsers()
      } else {
        alert(data.error || "Error al eliminar usuario")
      }
    } catch (error) {
      console.error("Error al eliminar usuario:", error)
      alert("Error al eliminar usuario")
    }
  }

  // Función para identificar si un usuario es el owner del sistema
  const isOwnerUser = (user: User): boolean => {
    return user.email === 'admin@aurorasdr.ai' || user.name === 'Aurora SDR IA'
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
            <h1 className="text-3xl font-bold">Gestión de Usuarios Admin</h1>
            <p className="text-muted-foreground mt-1">
              Administra los usuarios con acceso al panel de administración (SuperAdmin)
            </p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuarios Administradores</CardTitle>
              <CardDescription>
                {filteredUsers.length} usuario(s) administrador(es) encontrado(s)
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
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
              Cargando usuarios...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron usuarios administradores
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{user.name}</h3>
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <Shield className="h-3 w-3 mr-1" />
                          SuperAdmin
                        </Badge>
                        {isOwnerUser(user) && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            Owner
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                      disabled={isOwnerUser(user)}
                      title={isOwnerUser(user) ? "No se puede editar el usuario del sistema" : "Editar usuario"}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(user)}
                      disabled={isOwnerUser(user)}
                      title={isOwnerUser(user) ? "No se puede eliminar el usuario del sistema" : "Eliminar usuario"}
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

      {/* Dialog de Crear/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Editar Usuario Admin" : "Nuevo Usuario Admin"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? "Modifica la información del usuario administrador"
                : "Completa los datos para crear un nuevo usuario administrador"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedUser && isOwnerUser(selectedUser) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Nota:</strong> Este es el usuario del sistema y no se puede editar.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={selectedUser ? isOwnerUser(selectedUser) : false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={selectedUser ? isOwnerUser(selectedUser) : false}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña {selectedUser ? "(dejar vacío para no cambiar)" : "*"}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPasswordField ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={selectedUser ? "Nueva contraseña..." : "Contraseña"}
                    className="pr-10"
                    disabled={selectedUser ? isOwnerUser(selectedUser) : false}
                  />
                  {formData.password && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPasswordField(!showPasswordField)}
                    >
                      {showPasswordField ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newPassword = generateSecurePassword(16)
                    setFormData({ ...formData, password: newPassword })
                    setShowPasswordField(true)
                  }}
                  title="Generar contraseña segura"
                >
                  <Key className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> Este usuario tendrá acceso completo al panel de administración con rol <strong>SuperAdmin</strong>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={selectedUser ? isOwnerUser(selectedUser) : false}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmación de Eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              usuario administrador <strong>{selectedUser?.name}</strong> ({selectedUser?.email}
              ).
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
