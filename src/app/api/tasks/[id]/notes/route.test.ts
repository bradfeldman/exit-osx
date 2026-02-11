import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from './route'
import { prisma } from '@/lib/prisma'
import * as checkPermissionModule from '@/lib/auth/check-permission'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
    },
    taskNote: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/check-permission', () => ({
  checkPermission: vi.fn(),
  isAuthError: vi.fn(),
}))

describe('/api/tasks/[id]/notes', () => {
  const mockTaskId = 'task_123'
  const mockCompanyId = 'company_123'
  const mockUserId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return notes for a task', async () => {
      const mockTask = { companyId: mockCompanyId }
      const mockNotes = [
        {
          id: 'note_1',
          taskId: mockTaskId,
          userId: mockUserId,
          content: 'Test note',
          noteType: 'GENERAL',
          createdAt: new Date('2024-01-01'),
          user: {
            id: mockUserId,
            name: 'Test User',
            email: 'test@example.com',
            avatarUrl: null,
          },
        },
      ]

      vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
      vi.mocked(checkPermissionModule.checkPermission).mockResolvedValue({
        auth: { user: { id: mockUserId }, organizationUser: { organizationId: 'org_123' } },
      } as never)
      vi.mocked(checkPermissionModule.isAuthError).mockReturnValue(false)
      vi.mocked(prisma.taskNote.findMany).mockResolvedValue(mockNotes as never)

      const request = new Request('http://localhost/api/tasks/task_123/notes')
      const params = Promise.resolve({ id: mockTaskId })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notes).toHaveLength(1)
      expect(data.notes[0].content).toBe('Test note')
    })

    it('should return 404 if task not found', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost/api/tasks/task_123/notes')
      const params = Promise.resolve({ id: mockTaskId })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Task not found')
    })
  })

  describe('POST', () => {
    it('should create a new task note', async () => {
      const mockTask = { companyId: mockCompanyId }
      const mockNote = {
        id: 'note_1',
        taskId: mockTaskId,
        userId: mockUserId,
        content: 'New note',
        noteType: 'PROGRESS',
        createdAt: new Date('2024-01-01'),
        user: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
          avatarUrl: null,
        },
      }

      vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
      vi.mocked(checkPermissionModule.checkPermission).mockResolvedValue({
        auth: { user: { id: mockUserId }, organizationUser: { organizationId: 'org_123' } },
      } as never)
      vi.mocked(checkPermissionModule.isAuthError).mockReturnValue(false)
      vi.mocked(prisma.taskNote.create).mockResolvedValue(mockNote as never)

      const request = new Request('http://localhost/api/tasks/task_123/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'New note', noteType: 'PROGRESS' }),
      })
      const params = Promise.resolve({ id: mockTaskId })
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.note.content).toBe('New note')
      expect(data.note.noteType).toBe('PROGRESS')
    })

    it('should return 400 if content is empty', async () => {
      const mockTask = { companyId: mockCompanyId }

      vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
      vi.mocked(checkPermissionModule.checkPermission).mockResolvedValue({
        auth: { user: { id: mockUserId }, organizationUser: { organizationId: 'org_123' } },
      } as never)
      vi.mocked(checkPermissionModule.isAuthError).mockReturnValue(false)

      const request = new Request('http://localhost/api/tasks/task_123/notes', {
        method: 'POST',
        body: JSON.stringify({ content: '   ', noteType: 'GENERAL' }),
      })
      const params = Promise.resolve({ id: mockTaskId })
      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Note content is required')
    })

    it('should default to GENERAL noteType if not provided', async () => {
      const mockTask = { companyId: mockCompanyId }
      const mockNote = {
        id: 'note_1',
        taskId: mockTaskId,
        userId: mockUserId,
        content: 'New note',
        noteType: 'GENERAL',
        createdAt: new Date('2024-01-01'),
        user: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
          avatarUrl: null,
        },
      }

      vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
      vi.mocked(checkPermissionModule.checkPermission).mockResolvedValue({
        auth: { user: { id: mockUserId }, organizationUser: { organizationId: 'org_123' } },
      } as never)
      vi.mocked(checkPermissionModule.isAuthError).mockReturnValue(false)
      vi.mocked(prisma.taskNote.create).mockResolvedValue(mockNote as never)

      const request = new Request('http://localhost/api/tasks/task_123/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'New note' }),
      })
      const params = Promise.resolve({ id: mockTaskId })
      const response = await POST(request, { params })
      void await response.json()

      expect(response.status).toBe(201)
      expect(prisma.taskNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            noteType: 'GENERAL',
          }),
        })
      )
    })
  })
})
