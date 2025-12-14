import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/use-debounce'

// Mock timers
jest.useFakeTimers()

describe('useDebounce', () => {
  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 300))
    expect(result.current).toBe('test')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    )

    expect(result.current).toBe('initial')

    // Change value
    rerender({ value: 'updated', delay: 300 })
    
    // Should still be initial value before delay
    expect(result.current).toBe('initial')

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Now should be updated
    expect(result.current).toBe('updated')
  })

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    )

    rerender({ value: 'updated', delay: 500 })

    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(result.current).toBe('initial')

    act(() => {
      jest.advanceTimersByTime(200)
    })
    expect(result.current).toBe('updated')
  })

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: 'initial' },
      }
    )

    rerender({ value: 'change1' })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    rerender({ value: 'change2' })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Should still be initial (300ms not passed yet)
    expect(result.current).toBe('initial')

    act(() => {
      jest.advanceTimersByTime(100)
    })

    // Now should be change2
    expect(result.current).toBe('change2')
  })
})





