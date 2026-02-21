'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { CoachHistoryPanel, type ConversationSummary } from './CoachHistoryPanel'
import { CoachMessageList, type ChatMessage } from './CoachMessageList'
import { CoachUpgradeCard } from './CoachUpgradeCard'
import { analytics } from '@/lib/analytics'
import styles from './coach.module.css'

/* ─── Suggested prompts shown in the welcome state ──────── */
const SUGGESTED_PROMPTS = [
  'How do I reduce owner dependence?',
  'Explain my valuation gap',
  'Am I ready to retire?',
  'What should I do before selling?',
]

/* ─── Static history groups for display ─────────────────── */
const HISTORY_GROUPS = [
  {
    label: 'Today',
    items: [
      { title: 'Owner dependence strategies', date: 'Just now' },
      { title: 'Valuation multiple explained', date: '2 hours ago' },
    ],
  },
  {
    label: 'Yesterday',
    items: [
      { title: 'Customer concentration risk', date: 'Yesterday' },
      { title: 'SBA loan implications', date: 'Yesterday' },
    ],
  },
  {
    label: 'This Week',
    items: [
      { title: 'Retirement gap analysis', date: 'Feb 14' },
      { title: 'ServiceMaster PE LOI review', date: 'Feb 13' },
      { title: 'HVAC industry multiples', date: 'Feb 12' },
    ],
  },
]

export function CoachPage() {
  const { selectedCompanyId } = useCompany()
  const { canAccessFeature } = useSubscription()
  const hasAccess = canAccessFeature('ai-coach')

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [freeMessageCount, setFreeMessageCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const MAX_FREE_MESSAGES = 3

  /* ── Load conversations ─────────────────────────────── */
  useEffect(() => {
    if (!selectedCompanyId) return
    fetch(`/api/companies/${selectedCompanyId}/ai-coach/conversations`)
      .then(r => r.json())
      .then(data => { if (data.conversations) setConversations(data.conversations) })
      .catch(() => {})
  }, [selectedCompanyId])

  /* ── Count free messages ────────────────────────────── */
  useEffect(() => {
    if (hasAccess || !selectedCompanyId) return
    const total = conversations.reduce((sum, c) => sum + Math.ceil(c.messageCount / 2), 0)
    setFreeMessageCount(total)
  }, [conversations, hasAccess, selectedCompanyId])

  /* ── Scroll to bottom on new message ────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  /* ── Create conversation ────────────────────────────── */
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
      return data.id as string
    } catch { return null }
  }, [selectedCompanyId])

  /* ── Load existing conversation ─────────────────────── */
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!selectedCompanyId) return
    setActiveConversationId(conversationId)
    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/ai-coach/conversations/${conversationId}`
      )
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
    } catch { setError('Failed to load conversation') }
  }, [selectedCompanyId])

  /* ── Send message ───────────────────────────────────── */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !selectedCompanyId || isStreaming) return
    setError(null)

    if (!hasAccess) {
      const newCount = freeMessageCount + 1
      setFreeMessageCount(newCount)
      analytics.track('ai_coach_gated', { question: content.slice(0, 100), attemptNumber: newCount })
      if (newCount > MAX_FREE_MESSAGES) return
    }

    let convId = activeConversationId
    if (!convId) {
      convId = await createConversation()
      if (!convId) { setError('Failed to create conversation'); return }
    }

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    setStreamingContent('')
    setInputValue('')

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
        if (res.status === 403 && !hasAccess) { setIsStreaming(false); return }
        setError(data.error || 'Failed to send message')
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) { setError('Streaming not supported'); setIsStreaming(false); return }

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.token) { accumulated += event.token; setStreamingContent(accumulated) }
            if (event.error) setError(event.error)
          } catch { /* skip malformed */ }
        }
      }

      if (accumulated) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: accumulated,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMsg])
        setConversations(prev =>
          prev.map(c => c.id === convId
            ? { ...c, messageCount: c.messageCount + 2, updatedAt: new Date().toISOString(),
                title: c.title === 'New conversation' ? (content.length > 50 ? content.slice(0, 47) + '...' : content) : c.title }
            : c
          )
        )
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError('Network error. Please try again.')
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      abortRef.current = null
    }
  }, [selectedCompanyId, isStreaming, activeConversationId, createConversation, hasAccess, freeMessageCount])

  /* ── New conversation ───────────────────────────────── */
  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
    setMessages([])
    setError(null)
  }, [])

  /* ── Delete conversation ────────────────────────────── */
  const handleDeleteConversation = useCallback(async (id: string) => {
    if (!selectedCompanyId) return
    try {
      await fetch(`/api/companies/${selectedCompanyId}/ai-coach/conversations/${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeConversationId === id) { setActiveConversationId(null); setMessages([]) }
    } catch {}
  }, [selectedCompanyId, activeConversationId])

  /* ── Rename conversation ────────────────────────────── */
  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    if (!selectedCompanyId) return
    try {
      await fetch(`/api/companies/${selectedCompanyId}/ai-coach/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c))
    } catch {}
  }, [selectedCompanyId])

  /* ── Textarea auto-grow ─────────────────────────────── */
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  const showUpgrade = !hasAccess && freeMessageCount >= MAX_FREE_MESSAGES

  const hasConversations = conversations.length > 0

  return (
    <div className={styles.chatLayout}>

      {/* ── Chat Header ─────────────────────────────────── */}
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <div className={styles.coachAvatar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div className={styles.coachInfo}>
            <h2>Exit AI Coach</h2>
            <p>Your personal exit planning advisor &middot; Knows your business data</p>
          </div>
        </div>
        <div className={styles.chatHeaderRight}>
          <Link href="/dashboard/notifications" className={styles.iconBtn} title="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </Link>
          <button className={styles.iconBtn} title="Export Chat" aria-label="Export chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Chat Body ───────────────────────────────────── */}
      <div className={styles.chatBody}>

        {/* History Panel */}
        <div className={styles.historyPanel}>
          <button className={styles.newChatBtn} onClick={handleNewConversation}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Conversation
          </button>

          {/* Populated conversations from API */}
          {hasConversations ? (
            <CoachHistoryPanel
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={loadConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={handleRenameConversation}
            />
          ) : (
            /* Fallback: static demo history groups */
            HISTORY_GROUPS.map((group) => (
              <div key={group.label}>
                <div className={styles.historyLabel}>{group.label}</div>
                {group.items.map((item) => (
                  <div key={item.title} className={styles.historyItem}>
                    <div className={styles.historyItemTitle}>{item.title}</div>
                    <div className={styles.historyItemDate}>{item.date}</div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Messages + Input */}
        <div className={styles.chatMain}>
          <div className={styles.chatMessages}>

            {messages.length === 0 && !isStreaming ? (
              /* Welcome state */
              <div className={styles.message}>
                <div className={styles.messageAvatarAssistant}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div>
                  <div className={styles.messageBubbleAssistant}>
                    <strong>Good morning.</strong> I&apos;ve been reviewing your latest data and have some thoughts on reducing your owner dependence score. That&apos;s currently your biggest drag on valuation.
                    <br /><br />
                    What would you like to focus on today?
                  </div>
                  <div className={styles.suggestedPrompts}>
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        className={styles.promptChip}
                        onClick={() => sendMessage(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Actual messages */
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={msg.role === 'user' ? styles.messageUser : styles.message}
                  >
                    {msg.role === 'user' ? (
                      <>
                        <div className={styles.messageAvatarUser}>You</div>
                        <div>
                          <div className={styles.messageBubbleUser}>{msg.content}</div>
                          <div className={`${styles.messageMeta} ${styles.messageMetaRight}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.messageAvatarAssistant}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className={styles.messageBubbleAssistant}>
                            {msg.content}
                          </div>
                          <div className={styles.messageMeta}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Streaming / typing indicator */}
                {isStreaming && (
                  <div className={styles.message}>
                    <div className={styles.messageAvatarAssistant}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </div>
                    <div className={styles.messageBubbleAssistant}>
                      {streamingContent || (
                        <div className={styles.typingIndicator}>
                          <div className={styles.typingDot} />
                          <div className={styles.typingDot} />
                          <div className={styles.typingDot} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorBanner}>
              <p>{error}</p>
            </div>
          )}

          {/* Input area or upgrade CTA */}
          {showUpgrade ? (
            <div className={styles.chatInputArea}>
              <CoachUpgradeCard variant="final" attemptNumber={freeMessageCount} />
            </div>
          ) : (
            <div className={styles.chatInputArea}>
              <div className={styles.chatInputWrapper}>
                <textarea
                  ref={textareaRef}
                  className={styles.chatInput}
                  rows={1}
                  placeholder="Ask about your exit plan, valuation, buyers, or anything..."
                  value={inputValue}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  aria-label="Message Exit AI Coach"
                />
                <button
                  className={styles.sendBtn}
                  onClick={() => sendMessage(inputValue)}
                  disabled={isStreaming || !inputValue.trim()}
                  aria-label="Send message"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <div className={styles.inputHint}>
                AI Coach has access to your financials, assessments, and deal data to provide personalized advice.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
