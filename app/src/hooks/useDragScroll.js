import { useRef, useCallback } from 'react'

/**
 * Returns ref + event handlers that enable click-and-drag horizontal scrolling.
 * Attach `ref` to the scrollable container and spread `handlers` on it.
 */
export function useDragScroll() {
  const ref = useRef(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const onMouseDown = useCallback((e) => {
    dragging.current = true
    startX.current = e.pageX - ref.current.offsetLeft
    scrollLeft.current = ref.current.scrollLeft
    ref.current.style.cursor = 'grabbing'
    ref.current.style.userSelect = 'none'
  }, [])

  const onMouseLeave = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    ref.current.style.cursor = ''
    ref.current.style.userSelect = ''
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
    ref.current.style.cursor = ''
    ref.current.style.userSelect = ''
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return
    e.preventDefault()
    const x = e.pageX - ref.current.offsetLeft
    const walk = (x - startX.current) * 1.2
    ref.current.scrollLeft = scrollLeft.current - walk
  }, [])

  return {
    ref,
    handlers: { onMouseDown, onMouseLeave, onMouseUp, onMouseMove },
  }
}
