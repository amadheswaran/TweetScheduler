import React from "react"

export function Select({ value, onChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {children}
    </select>
  )
}

export function SelectTrigger({ children }) {
  return children // Simplified wrapper
}

export function SelectValue({ children }) {
  return children // Placeholder for Shadcn-style
}

export function SelectContent({ children }) {
  return children // Just render options
}

export function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>
}
