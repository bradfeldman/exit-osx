'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ExitCoachContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void
}

const ExitCoachContext = createContext<ExitCoachContextType | null>(null)

export function ExitCoachProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message])
  }

  const clearMessages = () => setMessages([])

  return (
    <ExitCoachContext.Provider value={{ isOpen, setIsOpen, messages, addMessage, clearMessages }}>
      {children}
    </ExitCoachContext.Provider>
  )
}

export function useExitCoach() {
  const context = useContext(ExitCoachContext)
  if (!context) throw new Error('useExitCoach must be used within ExitCoachProvider')
  return context
}
