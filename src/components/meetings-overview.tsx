
import { Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"

export function MeetingsOverview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
          <span>Reuniones Acordadas</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Seguimiento de reuniones programadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="text-center space-y-2">
            <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-muted-foreground text-xs sm:text-sm">¡Aún no tenemos datos!</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground max-w-xs px-4">
              Configure el registro de reuniones para ver esta información.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  )
}
