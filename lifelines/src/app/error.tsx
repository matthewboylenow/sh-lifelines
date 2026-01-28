'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  React.useEffect(() => {
    // Log the error to the console
    console.error('Global error boundary triggered:', error)
    
    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl shadow-xl border border-red-200 p-8 text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
          </div>
          
          {/* Error Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Something went wrong!
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            We apologize for the inconvenience. An unexpected error occurred while loading this page. 
            Our team has been notified and is working to fix the issue.
          </p>
          
          {/* Development Error Details */}
          {isDevelopment && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-sm font-semibold text-red-800 mb-2">
                🐛 Development Error Details:
              </p>
              <p className="text-sm text-red-700 font-mono break-all mb-3">
                <strong>Message:</strong> {error.message}
              </p>
              {error.digest && (
                <p className="text-sm text-red-700 font-mono break-all mb-3">
                  <strong>Digest:</strong> {error.digest}
                </p>
              )}
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-sm font-medium text-red-700 cursor-pointer hover:text-red-800">
                    View Stack Trace
                  </summary>
                  <pre className="text-xs text-red-600 mt-3 p-3 bg-red-100 rounded border overflow-auto max-h-48 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button 
              onClick={reset} 
              className="flex items-center justify-center min-w-[120px]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Link href="/">
              <Button 
                variant="outline" 
                className="flex items-center justify-center min-w-[120px] w-full sm:w-auto"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>
          
          {/* Support Information */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center text-sm text-gray-600 mb-3">
              <MessageCircle className="w-4 h-4 mr-2" />
              Need help?
            </div>

            <p className="text-sm text-gray-500">
              For general help, contact{' '}
              <a
                href="mailto:lifelines@sainthelen.org"
                className="text-primary-600 hover:text-primary-800 underline font-medium"
              >
                lifelines@sainthelen.org
              </a>
            </p>

            <p className="text-sm text-gray-500 mt-2">
              For technical issues, contact{' '}
              <a
                href="mailto:mboyle@sainthelen.org"
                className="text-primary-600 hover:text-primary-800 underline font-medium"
              >
                mboyle@sainthelen.org
              </a>
            </p>

            <p className="text-xs text-gray-400 mt-3">
              Please include what you were doing when this error occurred.
            </p>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            You can also try these alternatives:
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <Link 
              href="/dashboard" 
              className="text-primary-600 hover:text-primary-800 underline"
            >
              Dashboard
            </Link>
            <span className="text-gray-300">•</span>
            <Link 
              href="/lifelines" 
              className="text-primary-600 hover:text-primary-800 underline"
            >
              Browse LifeLines
            </Link>
            <span className="text-gray-300">•</span>
            <Link 
              href="/resources" 
              className="text-primary-600 hover:text-primary-800 underline"
            >
              Resources
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}