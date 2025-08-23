import React from "react"

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
  )
}
