import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { CompanyProvider, useCompany } from '@/contexts/CompanyContext'
import { ReactNode } from 'react'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const wrapper = ({ children }: { children: ReactNode }) => (
  <CompanyProvider>{children}</CompanyProvider>
)

describe('useCompany Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial state', () => {
    it('should start with loading true', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: [] }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })
      expect(result.current.isLoading).toBe(true)
    })

    it('should start with empty companies array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: [] }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.companies).toEqual([])
    })

    it('should start with null selectedCompanyId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: [] }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.selectedCompanyId).toBeNull()
    })
  })

  describe('Loading companies', () => {
    it('should load companies from API', async () => {
      const mockCompanies = [
        { id: '1', name: 'Company A' },
        { id: '2', name: 'Company B' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: mockCompanies }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.companies).toEqual(mockCompanies)
    })

    it('should sort companies by name', async () => {
      const mockCompanies = [
        { id: '2', name: 'Zebra Inc' },
        { id: '1', name: 'Alpha Corp' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: mockCompanies }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.companies[0].name).toBe('Alpha Corp')
      expect(result.current.companies[1].name).toBe('Zebra Inc')
    })

    it('should auto-select first company when no stored selection', async () => {
      const mockCompanies = [
        { id: '1', name: 'First Company' },
        { id: '2', name: 'Second Company' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: mockCompanies }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.selectedCompanyId).toBe('1')
      })
    })

    it('should restore selection from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('2')

      const mockCompanies = [
        { id: '1', name: 'First Company' },
        { id: '2', name: 'Second Company' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: mockCompanies }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.selectedCompanyId).toBe('2')
      })
    })

    it('should handle API error gracefully', async () => {
      // Must reject all calls to cover retry attempts
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 10000 })

      expect(result.current.companies).toEqual([])
    })
  })

  describe('setSelectedCompanyId', () => {
    it('should update selected company', async () => {
      const mockCompanies = [
        { id: '1', name: 'First Company' },
        { id: '2', name: 'Second Company' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: mockCompanies }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setSelectedCompanyId('2')
      })

      expect(result.current.selectedCompanyId).toBe('2')
    })

    it('should save selection to localStorage', async () => {
      const mockCompanies = [{ id: '1', name: 'Company' }]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: mockCompanies }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setSelectedCompanyId('1')
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith('selectedCompanyId', '1')
    })

    it('should remove from localStorage when set to null', async () => {
      const mockCompanies = [{ id: '1', name: 'Company' }]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: mockCompanies }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setSelectedCompanyId(null)
      })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('selectedCompanyId')
    })
  })

  describe('selectedCompany', () => {
    it('should return the selected company object', async () => {
      const mockCompanies = [
        { id: '1', name: 'First Company' },
        { id: '2', name: 'Second Company' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: mockCompanies }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setSelectedCompanyId('2')
      })

      expect(result.current.selectedCompany).toEqual({ id: '2', name: 'Second Company' })
    })

    it('should return null if no company is selected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ companies: [] }),
      })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.selectedCompany).toBeNull()
    })
  })

  describe('refreshCompanies', () => {
    it('should reload companies from API', async () => {
      const initialCompanies = [{ id: '1', name: 'Initial' }]
      const updatedCompanies = [
        { id: '1', name: 'Initial' },
        { id: '2', name: 'New Company' },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ companies: initialCompanies }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ companies: updatedCompanies }),
        })

      const { result } = renderHook(() => useCompany(), { wrapper })

      await waitFor(() => {
        expect(result.current.companies).toHaveLength(1)
      })

      await act(async () => {
        await result.current.refreshCompanies()
      })

      expect(result.current.companies).toHaveLength(2)
    })
  })

  describe('useCompany outside provider', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useCompany())
      }).toThrow('useCompany must be used within a CompanyProvider')

      spy.mockRestore()
    })
  })
})
