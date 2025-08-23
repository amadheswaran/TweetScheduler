import { useState, useCallback } from "react"

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = "info") => {
    setToasts((prev) => [...prev, { id: Date.now(), message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, 3000)
  }, [])

  return {
    toast: addToast,
    toasts,
  }
}
