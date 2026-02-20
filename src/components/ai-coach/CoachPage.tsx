'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Sparkles, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Menu, X } from 'lucide-react'
import { CoachHistoryPanel, type ConversationSummary } from './CoachHistoryPanel'
import { CoachMessageList, type ChatMessage } from './CoachMessageList'
import { CoachContextCard } from './CoachContextCard'
import { CoachWelcome } from './CoachWelcome'
import { ExitCoachInput } from './ExitCoachInput'
import { CoachUpgradeCard } from './CoachUpgradeCard'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { analytics } from '@/lib/analytics'

export function CoachPage() {
  const { selectedCompanyId, selectedCompany } = useCompany()
  const { canAccessFeature } = useSubscription()
  const router = useRouter()
  const hasAccess = canAccessFeature('ai-coach')

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [contextSources, setContextSources] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(true)
  const [showContext, setShowContext] = useState(true)
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false)
  const [freeMessageCount, setFreeMessageCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const MAX_FREE_MESSAGES = 3

  // Load conversations
  useEffect(() => {
    if (!selectedCompanyId) return
    fetch(`/api/companies/${selectedCompanyId}/ai-coach/conversations`)
      .then(r => r.json())
      .then(data => {
        if (data.conversations) setConversations(data.conversations)
      })
      .catch(() => {})
  }, [selectedCompanyId])

  // Count free messages for Foundation users
  useEffect(() => {
    if (hasAccess || !selectedCompanyId) return
    // Count from loaded conversations
    const total = conversations.reduce((sum, c) => sum + Math.ceil(c.messageCount / 2), 0)
    setFreeMessageCount(total)
  }, [conversations, hasAccess, selectedCompanyId])

  // Load conversation messages
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!selectedCompanyId) return
    setActiveConversationId(conversationId)
    setMobileHistoryOpen(false)

    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/ai-coach/conversations/${conversationId}`
      )
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])

      // Get context sources from the last assistant message
      const lastAssistant = [...(data.messages || [])].reverse().find(
        (m: ChatMessage) => m.role === 'assistant' && m.contextSources
      )
      if (lastAssistant?.contextSources) {
        setContextSources(lastAssistant.contextSources as string[])
      }
    } catch {
      setError('Failed to load conversation')
    }
  }, [selectedCompanyId])

  // Create new conversation
  const createConversation = useCallback(async () => {
    if (!selectedCompanyId) return null
    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/ai-coach/conversations`,
        { method: 'POST' }
      )
      if (!res.ok) return null
      const data = await res.json()
      const newConvo: ConversationSummary = {
        id: data.id,
        title: data.title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      }
      setConversations(prev => [newConvo, ...prev])
      setActiveConversationId(data.id)
      setMessages([])
      setContextSources([])
      setMobileHistoryOpen(false)
      return data.id as string
    } catch {
      return null
    }
  }, [selectedCompanyId])

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!selectedCompanyId || isStreaming) return
    setError(null)

    // Foundation gating
    if (!hasAccess) {
      const newCount = freeMessageCount + 1
      setFreeMessageCount(newCount)

      analytics.track('ai_coach_gated', {
        question: content.slice(0, 100),
        attemptNumber: newCount,
      })

      if (newCount > MAX_FREE_MESSAGES) return
    }

    // Create conversation if none active
    let convId = activeConversationId
    if (!convId) {
      convId = await createConversation()
      if (!convId) {
        setError('Failed to create conversation')
        return
      }
    }

    // Add optimistic user message
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const abortController = new AbortController()
      abortRef.current = abortController

      const res = await fetch(
        `/api/companies/${selectedCompanyId}/ai-coach/conversations/${convId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
          signal: abortController.signal,
        }
      )

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 403 && !hasAccess) {
          // Free limit hit — don't show error, the upgrade card handles it
          setIsStreaming(false)
          return
        }
        setError(data.error || 'Failed to send message')
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setError('Streaming not supported')
        setIsStreaming(false)
        return
      }

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6)
          try {
            const event = JSON.parse(jsonStr)
            if (event.token) {
              accumulated += event.token
              setStreamingContent(accumulated)
            }
            if (event.done) {
              setContextSources(event.contextSources || [])
            }
            if (event.error) {
              setError(event.error)
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Add complete assistant message
      if (accumulated) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: accumulated,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMsg])

        // Update conversation in sidebar
        setConversations(prev =>
          prev.map(c =>
            c.id === convId
              ? {
                  ...c,
                  messageCount: c.messageCount + 2,
                  updatedAt: new Date().toISOString(),
                  title: c.title === 'New conversation'
                    ? (content.length > 50 ? content.slice(0, 47) + '...' : content)
                    : c.title,
                }
              : c
          )
        )
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('Network error. Please try again.')
      }
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      abortRef.current = null
    }
  }, [selectedCompanyId, isStreaming, activeConversationId, createConversation, hasAccess, freeMessageCount])

  // New conversation
  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
    setMessages([])
    setContextSources([])
    setError(null)
  }, [])

  // Delete conversation
  const handleDeleteConversation = useCallback(async (id: string) => {
    if (!selectedCompanyId) return
    try {
      await fetch(
        `/api/companies/${selectedCompanyId}/ai-coach/conversations/${id}`,
        { method: 'DELETE' }
      )
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
        setContextSources([])
      }
    } catch {}
  }, [selectedCompanyId, activeConversationId])

  // Rename conversation
  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    if (!selectedCompanyId) return
    try {
      await fetch(
        `/api/companies/${selectedCompanyId}/ai-coach/conversations/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        }
      )
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, title } : c)
      )
    } catch {}
  }, [selectedCompanyId])

  // Foundation upgrade CTA
  const showUpgrade = !hasAccess && freeMessageCount >= MAX_FREE_MESSAGES

  return (
    <div className="flex h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
      {/* Mobile history overlay */}
      {mobileHistoryOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileHistoryOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-card border-r shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-semibold">Conversations</span>
              <button onClick={() => setMobileHistoryOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <CoachHistoryPanel
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={loadConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={handleRenameConversation}
            />
          </div>
        </div>
      )}

      {/* Desktop history sidebar */}
      {showHistory && (
        <div className="hidden lg:flex flex-col w-[280px] border-r bg-card/50 flex-shrink-0">
          <CoachHistoryPanel
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={loadConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileHistoryOpen(true)}
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="hidden lg:flex p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
              title={showHistory ? 'Hide history' : 'Show history'}
            >
              {showHistory ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">Exit Coach</h2>
              <p className="text-[11px] text-muted-foreground leading-tight">AI-powered exit advice</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowContext(!showContext)}
              className="hidden lg:flex p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
              title={showContext ? 'Hide context' : 'Show context'}
            >
              {showContext ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Chat content */}
        {activeConversationId && messages.length > 0 ? (
          <CoachMessageList
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
          />
        ) : (
          <CoachWelcome
            companyName={selectedCompany?.name}
            onSelectPrompt={sendMessage}
          />
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-950/20 border-t border-red-100 dark:border-red-900/30">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Input or upgrade CTA */}
        {showUpgrade ? (
          <div className="border-t bg-card px-4 py-4 max-w-xl mx-auto w-full">
            <CoachUpgradeCard variant="final" attemptNumber={freeMessageCount} />
          </div>
        ) : (
          <ExitCoachInput
            onSend={sendMessage}
            disabled={isStreaming}
          />
        )}
      </div>

      {/* Context panel (desktop) */}
      {showContext && (
        <div className="hidden lg:flex flex-col w-[240px] border-l bg-card/50 flex-shrink-0">
          <CoachContextCard activeSources={contextSources} />
        </div>
      )}
    </div>
  )
}
