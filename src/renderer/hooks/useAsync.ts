import { useCallback, useState } from 'react'
import { message } from 'antd'

export interface UseAsyncOptions {
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
  showMessage?: boolean
}

export function useAsync<T, E = string>(
  asyncFunction: (...args: any[]) => Promise<T>,
  immediate = true,
  options: UseAsyncOptions = {}
) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>(
    'idle'
  )
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<E | null>(null)

  const execute = useCallback(
    async (...args: any[]) => {
      setStatus('pending')
      setData(null)
      setError(null)
      try {
        const response = await asyncFunction(...args)
        setData(response)
        setStatus('success')
        options.onSuccess?.(response)
        return response
      } catch (err: any) {
        setError(err)
        setStatus('error')
        if (options.showMessage) {
          message.error(err?.message || 'An error occurred')
        }
        options.onError?.(err)
        throw err
      }
    },
    [asyncFunction, options]
  )

  return { execute, status, data, error, isLoading: status === 'pending' }
}
