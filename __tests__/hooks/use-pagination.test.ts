import { renderHook, act } from '@testing-library/react'
import { usePagination } from '@/hooks/use-pagination'

describe('usePagination', () => {
  const mockItems = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))

  it('should paginate items correctly', () => {
    const { result } = renderHook(() => usePagination(mockItems, 10))

    expect(result.current.paginatedItems).toHaveLength(10)
    expect(result.current.paginatedItems[0].id).toBe(1)
    expect(result.current.totalPages).toBe(3)
    expect(result.current.currentPage).toBe(1)
  })

  it('should navigate to next page', () => {
    const { result } = renderHook(() => usePagination(mockItems, 10))

    act(() => {
      result.current.nextPage()
    })

    expect(result.current.currentPage).toBe(2)
    expect(result.current.paginatedItems[0].id).toBe(11)
  })

  it('should navigate to previous page', () => {
    const { result } = renderHook(() => usePagination(mockItems, 10))

    act(() => {
      result.current.nextPage()
    })

    expect(result.current.currentPage).toBe(2)

    act(() => {
      result.current.previousPage()
    })

    expect(result.current.currentPage).toBe(1)
    expect(result.current.paginatedItems[0].id).toBe(1)
  })

  it('should go to specific page', () => {
    const { result } = renderHook(() => usePagination(mockItems, 10))

    act(() => {
      result.current.goToPage(3)
    })

    expect(result.current.currentPage).toBe(3)
    expect(result.current.paginatedItems).toHaveLength(5) // Last page has 5 items
  })

  it('should not go beyond boundaries', () => {
    const { result } = renderHook(() => usePagination(mockItems, 10))

    act(() => {
      result.current.goToPage(100) // Beyond total pages
    })

    expect(result.current.currentPage).toBe(1) // Should stay at page 1

    act(() => {
      result.current.goToPage(0) // Below minimum
    })

    expect(result.current.currentPage).toBe(1) // Should stay at page 1
  })

  it('should handle empty items', () => {
    const { result } = renderHook(() => usePagination([], 10))

    expect(result.current.paginatedItems).toHaveLength(0)
    expect(result.current.totalPages).toBe(0)
    expect(result.current.totalItems).toBe(0)
  })

  it('should reset pagination', () => {
    const { result } = renderHook(() => usePagination(mockItems, 10))

    act(() => {
      result.current.goToPage(3)
    })

    expect(result.current.currentPage).toBe(3)

    act(() => {
      result.current.resetPagination()
    })

    expect(result.current.currentPage).toBe(1)
  })

  it('should use custom items per page', () => {
    const { result } = renderHook(() => usePagination(mockItems, 5))

    expect(result.current.paginatedItems).toHaveLength(5)
    expect(result.current.totalPages).toBe(5)
    expect(result.current.itemsPerPage).toBe(5)
  })
})

