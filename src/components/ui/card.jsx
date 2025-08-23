import React from "react"

export function Card({ children, className = "" }) {
  return <div className={`rounded-xl shadow p-4 bg-white ${className}`}>{children}</div>
}

export function CardHeader({ children }) {
  return <div className="mb-2">{children}</div>
}

export function CardTitle({ children }) {
  return <h2 className="text-xl font-semibold">{children}</h2>
}

export function CardContent({ children }) {
  return <div>{children}</div>
}
