
import { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLocation } from "react-router-dom"

interface PageTransitionProps {
  children: ReactNode
}

const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.1,
      ease: [0.4, 0, 1, 1] // más rápido y directo
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.05,
      ease: [0.4, 0, 1, 1]
    }
  }
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

