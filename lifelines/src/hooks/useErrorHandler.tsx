'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface ApiError {
  message: string
  status?: number
  code?: string
}

interface ErrorHandlerOptions {
  showErrorMessage?: boolean
  redirectToLogin?: boolean
  logError?: boolean
}

export function useErrorHandler() {
  const router = useRouter()

  const handleError = useCallback(async (
    error: Error | ApiError | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showErrorMessage = true,
      redirectToLogin = false,
      logError = true
    } = options

    let errorMessage = 'An unexpected error occurred'
    let statusCode: number | undefined
    let shouldRedirectToLogin = redirectToLogin

    // Parse different error types
    if (error instanceof Error) {
      errorMessage = error.message
      logError && console.error('Application Error:', error)
    } else if (typeof error === 'object' && error !== null) {
      const apiError = error as ApiError
      errorMessage = apiError.message || errorMessage
      statusCode = apiError.status
      
      // Auto-redirect on authentication errors
      if (statusCode === 401 || statusCode === 403) {
        shouldRedirectToLogin = true
      }
      
      logError && console.error('API Error:', apiError)
    } else {
      logError && console.error('Unknown Error:', error)
    }

    // Handle authentication errors
    if (shouldRedirectToLogin || statusCode === 401) {
      try {
        await signOut({ redirect: false })
        router.push('/login?error=session-expired')
      } catch (signOutError) {
        console.error('Error signing out:', signOutError)
        router.push('/login')
      }
      return
    }

    // Handle authorization errors
    if (statusCode === 403) {
      router.push('/?error=access-denied')
      return
    }

    // Handle not found errors
    if (statusCode === 404) {
      router.push('/404')
      return
    }

    // Handle server errors
    if (statusCode && statusCode >= 500) {
      if (showErrorMessage && typeof window !== 'undefined') {
        // You could use a toast library here instead of alert
        alert(`Server error: ${errorMessage}. Please try again later.`)
      }
      return
    }

    // Handle client errors
    if (statusCode && statusCode >= 400) {
      if (showErrorMessage && typeof window !== 'undefined') {
        alert(`Error: ${errorMessage}`)
      }
      return
    }

    // Handle generic errors
    if (showErrorMessage && typeof window !== 'undefined') {
      alert(`Error: ${errorMessage}`)
    }

    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, {
      //   user: { id: userId },
      //   extra: { statusCode, errorMessage }
      // })
    }
  }, [router])

  // Specific handler for fetch API errors
  const handleApiError = useCallback(async (response: Response) => {
    let errorData: any = {}
    
    try {
      errorData = await response.json()
    } catch {
      // If JSON parsing fails, use status text
      errorData = { message: response.statusText || 'Request failed' }
    }

    const apiError: ApiError = {
      message: errorData.message || errorData.error || `Request failed with status ${response.status}`,
      status: response.status,
      code: errorData.code
    }

    await handleError(apiError)
  }, [handleError])

  // Helper for handling async operations with error catching
  const withErrorHandling = useCallback(<T,>(
    asyncFn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ) => {
    return async (): Promise<T | null> => {
      try {
        return await asyncFn()
      } catch (error) {
        await handleError(error, options)
        return null
      }
    }
  }, [handleError])

  return {
    handleError,
    handleApiError,
    withErrorHandling
  }
}

// Custom fetch hook with error handling
export function useSafeFetch() {
  const { handleApiError } = useErrorHandler()

  const safeFetch = useCallback(async (
    url: string,
    options?: RequestInit
  ): Promise<Response | null> => {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      if (!response.ok) {
        await handleApiError(response)
        return null
      }

      return response
    } catch (error) {
      console.error('Fetch error:', error)
      return null
    }
  }, [handleApiError])

  return { safeFetch }
}

// Error context for providing error handling throughout the app
export interface ErrorContextValue {
  handleError: (error: unknown, options?: ErrorHandlerOptions) => Promise<void>
  handleApiError: (response: Response) => Promise<void>
}

// You could create a React context here if needed for app-wide error handling
// export const ErrorContext = React.createContext<ErrorContextValue | null>(null)