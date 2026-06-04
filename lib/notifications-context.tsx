'use client'

import { createContext, useContext, ReactNode } from 'react'

interface NotificationsContextType {
  notifyStatusChange: (lead: { nombre?: string; email?: string }, oldStatus: string, newStatus: string) => void
  notifyNewLead: (lead: { nombre?: string; email?: string }) => void
  markOwnAction: (leadId: string) => void
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifyStatusChange: () => {},
  notifyNewLead: () => {},
  markOwnAction: () => {},
})

export function NotificationsProvider({ children, value }: {
  children: ReactNode
  value: NotificationsContextType
}) {
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotificationsContext = () => useContext(NotificationsContext)
