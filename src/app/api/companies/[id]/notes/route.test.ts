import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from './route'
import { prisma } from '@/lib/prisma'
import * as checkPermissionModule from '@/lib/auth/check-permission'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    taskNote: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/check-permission', () => ({
  checkPermission: vi.fn(),
  isAuthError: vi.fn(),
}))

describe('/api/companies/[id]/notes', () => {
  const mockCompanyId = 'company_123'
  const mockUserId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all notes for a company', async () => {
      const mockNotes = [
        {
          id: 'note_1',
          content: 'Test note 1',
          noteType: 'GENERAL',
          createdAt: new Date('2024-01-01'),
          user: {
            id: mockUserId,
            name: 'Test User',
            email: 'test@example.com',
            avatarUrl: null,
          },
          task: {
            id: 'task_1',
            title: 'Test Task',
            briCategory: 'FINANCIAL',
            status: 'COMPLETED',
            completedAt: new Date('2024-01-01'),
          },
        },
      ]

      const mockStats = [
        { noteType: 'GENERAL', _count: 5 },
        { noteType: 'COMPLETION', _count: 3 },
      ]

      vi.mocked(checkPermissionModule.checkPermission).mockResolvedValue({
        auth: { user: { id: mockUserId }, organizationUser: { organizationId: 'org_123' } },
      } as never)
      vi.mocked(checkPermissionModule.isAuthError).mockReturnValue(false)
      vi.mocked(prisma.taskNote.findMany).mockResolvedValue(mockNotes as never)
      vi.mocked(prisma.taskNote.groupBy).mockResolvedValue(mockStats as never)

      const request = new Request('http://localhost/api/companies/company_123/notes')
      const params = Promise.resolve({ id: mockCompanyId })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notes).toHaveLength(1)
      expect(data.stats).toHaveLength(2)
      expect(data.total).toBe(1)
    })

    it('should filter notes by search query', async () => {
      vi.mocked(checkPermissionModule.checkPermission).mockResolvedValue({
        auth: { user: { id: mockUserId }, organizationUser: { organizationId: 'org_123' } },
      } as never)
      vi.mocked(checkPermissionModule.isAuthError).mockReturnValue(false)
      vi.mocked(prisma.taskNote.findMany).mockResolvedValue([] as never)
      vi.mocked(prisma.taskNote.groupBy).mockResolvedValue([] as never)

      const request = new Request('http://localhost/api/companies/company_123/notes?search=blocker')
      const params = Promise.resolve({ id: mockCompanyId })
      await GET(request, { params })

      expect(prisma.taskNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: {
              contains: 'blocker',
              mode: 'insensitive',
            },
          }),
        })
      )
    })

    it('should filter notes by noteType', async () => {
      vi.mocked(checkPermissionModule.checkPermission).mockResolvedValue({
        auth: { user: { id: mockUserId }, organizationUser: { organizationId: 'org_123' } },
      } as never)
      vi.mocked(checkPermissionModule.isAuthError).mockReturnValue(false)
      vi.mocked(prisma.taskNote.findMany).mockResolvedValue([] as never)
      vi.mocked(prisma.taskNote.groupBy).mockResolvedValue([] as never)

      const request = new Request('http://localhost/api/companies/company_123/notes?noteType=BLOCKER')
      const params = Promise.resolve({ id: mockCompanyId })
      await GET(request, { params })

      expect(prisma.taskNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            noteType: 'BLOCKER',
          }),
        })
      )
    })

    it('should respect limit parameter', async () => {
      vi.mocked(checkPermissionModule.checkPermission).mockResolvedValue({
        auth: { user: { id: mockUserId }, organizationUser: { organizationId: 'org_123' } },
      } as never)
      vi.mocked(checkPermissionModule.isAuthError).mockReturnValue(false)
      vi.mocked(prisma.taskNote.findMany).mockResolvedValue([] as never)
      vi.mocked(prisma.taskNote.groupBy).mockResolvedValue([] as never)

      const request = new Request('http://localhost/api/companies/company_123/notes?limit=10')
      const params = Promise.resolve({ id: mockCompanyId })
      await GET(request, { params })

      expect(prisma.taskNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      )
    })

    it('should default limit to 50', async () => {
      vi.mocked(checkPermissionModule.checkPermission).mockResolvedValue({
        auth: { user: { id: mockUserId }, organizationUser: { organizationId: 'org_123' } },
      } as never)
      vi.mocked(checkPermissionModule.isAuthError).mockReturnValue(false)
      vi.mocked(prisma.taskNote.findMany).mockResolvedValue([] as never)
      vi.mocked(prisma.taskNote.groupBy).mockResolvedValue([] as never)

      const request = new Request('http://localhost/api/companies/company_123/notes')
      const params = Promise.resolve({ id: mockCompanyId })
      await GET(request, { params })

      expect(prisma.taskNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      )
    })
  })
})
