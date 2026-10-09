import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { errorMessage } from '../lib/errors'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Load data on mount / when deps change. Ignores stale responses, so fast
 * typing in a search box never shows an older result on top of a newer one.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const requestId = useRef(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback((silent = false) => {
    const id = ++requestId.current
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    return fnRef
      .current()
      .then((data) => {
        if (id === requestId.current) setState({ data, loading: false, error: null })
      })
      .catch((err) => {
        if (id === requestId.current) setState((s) => ({ data: silent ? s.data : null, loading: false, error: errorMessage(err) }))
      })
  }, [])

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const setData = useCallback((updater: T | null | ((prev: T | null) => T | null)) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? (updater as (p: T | null) => T | null)(s.data) : updater }))
  }, [])

  const reload = useCallback(() => run(false), [run])
  const refresh = useCallback(() => run(true), [run])

  return { ...state, reload, refresh, setData }
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}
