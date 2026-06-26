'use client'
import { ReactNode, useEffect } from 'react'

interface ModalProps {
  children: ReactNode
  onClose: () => void
}

export function Modal({ children, onClose }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-noir-2/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-noir border border-cotton/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fade-in">
        {children}
      </div>
    </div>
  )
}
