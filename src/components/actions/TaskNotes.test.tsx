import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskNotes } from './TaskNotes'

// Mock fetch globally
global.fetch = vi.fn()

describe('TaskNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show empty state when no notes exist', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [] }),
    } as Response)

    render(<TaskNotes taskId="task_123" taskTitle="Test Task" />)

    await waitFor(() => {
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
    })
  })

  it('should display notes when they exist', async () => {
    const mockNotes = [
      {
        id: 'note_1',
        content: 'Test note content',
        noteType: 'GENERAL',
        createdAt: new Date().toISOString(),
        user: {
          id: 'user_1',
          name: 'Test User',
          email: 'test@example.com',
          avatarUrl: null,
        },
      },
    ]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ notes: mockNotes }),
    } as Response)

    render(<TaskNotes taskId="task_123" taskTitle="Test Task" />)

    await waitFor(() => {
      expect(screen.getByText('Test note content')).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  it('should show "Add Note" button when not disabled', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [] }),
    } as Response)

    render(<TaskNotes taskId="task_123" taskTitle="Test Task" disabled={false} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument()
    })
  })

  it('should not show "Add Note" button when disabled', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ notes: [] }),
    } as Response)

    render(<TaskNotes taskId="task_123" taskTitle="Test Task" disabled={true} />)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add note/i })).not.toBeInTheDocument()
    })
  })

  it('should show "Show more" button when there are more than 3 notes', async () => {
    const mockNotes = Array.from({ length: 5 }, (_, i) => ({
      id: `note_${i}`,
      content: `Note ${i}`,
      noteType: 'GENERAL',
      createdAt: new Date().toISOString(),
      user: {
        id: 'user_1',
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
      },
    }))

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ notes: mockNotes }),
    } as Response)

    render(<TaskNotes taskId="task_123" taskTitle="Test Task" />)

    await waitFor(() => {
      expect(screen.getByText(/show 2 more/i)).toBeInTheDocument()
    })
  })

  it('should expand to show all notes when "Show more" is clicked', async () => {
    const user = userEvent.setup()
    const mockNotes = Array.from({ length: 5 }, (_, i) => ({
      id: `note_${i}`,
      content: `Note ${i}`,
      noteType: 'GENERAL',
      createdAt: new Date().toISOString(),
      user: {
        id: 'user_1',
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
      },
    }))

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ notes: mockNotes }),
    } as Response)

    render(<TaskNotes taskId="task_123" taskTitle="Test Task" />)

    await waitFor(() => {
      expect(screen.getByText(/show 2 more/i)).toBeInTheDocument()
    })

    const showMoreButton = screen.getByText(/show 2 more/i)
    await user.click(showMoreButton)

    await waitFor(() => {
      expect(screen.getByText(/show less/i)).toBeInTheDocument()
      expect(screen.getByText('Note 4')).toBeInTheDocument()
    })
  })

  it('should display correct badge for different note types', async () => {
    const mockNotes = [
      {
        id: 'note_1',
        content: 'Completion note',
        noteType: 'COMPLETION',
        createdAt: new Date().toISOString(),
        user: { id: 'user_1', name: 'User', email: 'test@example.com', avatarUrl: null },
      },
      {
        id: 'note_2',
        content: 'Blocker note',
        noteType: 'BLOCKER',
        createdAt: new Date().toISOString(),
        user: { id: 'user_1', name: 'User', email: 'test@example.com', avatarUrl: null },
      },
    ]

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ notes: mockNotes }),
    } as Response)

    render(<TaskNotes taskId="task_123" taskTitle="Test Task" />)

    await waitFor(() => {
      expect(screen.getByText('Completion')).toBeInTheDocument()
      expect(screen.getByText('Blocker')).toBeInTheDocument()
    })
  })
})
