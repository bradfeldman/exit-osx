'use client'

import { useRef, useEffect } from 'react'
import { Sparkles, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  contextSources?: string[] | null
  createdAt?: string
}

interface CoachMessageListProps {
  messages: ChatMessage[]
  streamingContent: string
  isStreaming: boolean
}

export function CoachMessageList({ messages, streamingContent, isStreaming }: CoachMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 space-y-6">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Streaming response */}
      {isStreaming && (
        <div className="flex gap-3">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-relaxed">
            {streamingContent ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
                <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 -mb-0.5" />
              </div>
            ) : (
              <div className="flex gap-1 py-1">
                <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-relaxed">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
