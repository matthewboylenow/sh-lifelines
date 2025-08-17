'use client'

import React from 'react'
import { Search, Home, ArrowLeft, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NotFoundSearchForm } from '@/components/ui/NotFoundSearchForm'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          {/* 404 Visual */}
          <div className="mb-8">
            <div className="text-8xl font-bold text-primary-200 mb-4">404</div>
            <div className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</div>
          </div>
          
          {/* Main Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Oops! We can't find that page
          </h1>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            The page you're looking for doesn't exist or may have been moved. 
            Don't worry – let's help you find what you're looking for!
          </p>
        </div>

        {/* Quick Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Quick Search
          </h2>
          
          <NotFoundSearchForm />
        </div>

        {/* Navigation Options */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Popular Destinations
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link 
              href="/" 
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Home className="w-5 h-5 mr-3 text-primary-600" />
              <div>
                <div className="font-medium text-gray-900">Homepage</div>
                <div className="text-sm text-gray-500">Browse all LifeLines</div>
              </div>
            </Link>
            
            <Link 
              href="/dashboard" 
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5 mr-3 text-primary-600" />
              <div>
                <div className="font-medium text-gray-900">Dashboard</div>
                <div className="text-sm text-gray-500">Your account area</div>
              </div>
            </Link>
            
            <Link 
              href="/resources" 
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Search className="w-5 h-5 mr-3 text-primary-600" />
              <div>
                <div className="font-medium text-gray-900">Resources</div>
                <div className="text-sm text-gray-500">Leader materials</div>
              </div>
            </Link>
            
            <Link 
              href="/login" 
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-3 text-primary-600" />
              <div>
                <div className="font-medium text-gray-900">Sign In</div>
                <div className="text-sm text-gray-500">Access your account</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            className="flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          
          <Link href="/">
            <Button className="flex items-center justify-center w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>

        {/* Contact Support */}
        <div className="text-center bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Still need help?</h3>
          <p className="text-sm text-gray-600 mb-4">
            If you believe this page should exist, please let us know.
          </p>
          <a 
            href="mailto:support@sainthelen.org?subject=404 Error - Page Not Found"
            className="text-primary-600 hover:text-primary-800 underline font-medium"
          >
            Contact Support Team
          </a>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 LifeLines at Saint Helen Church</p>
        </div>
      </div>
    </div>
  )
}