'use client'

import { useState } from 'react'
import { Globe, Mail, AlertCircle, Info } from 'lucide-react'

export function AdminSettings() {
  const [activeSection, setActiveSection] = useState<'site' | 'about'>('site')

  const sections = [
    { id: 'site', label: 'Contact Information', icon: Mail },
    { id: 'about', label: 'About', icon: Info }
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Settings Navigation */}
      <div className="lg:w-64">
        <div className="dashboard-card">
          <nav className="space-y-1">
            {sections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1">
        {/* Contact Information */}
        {activeSection === 'site' && (
          <div className="dashboard-card">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
              <p className="text-sm text-gray-600 mt-1">Key contact details for LifeLines administration</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">General Inquiries</h3>
                  <a href="mailto:lifelines@sainthelen.org" className="text-primary-600 hover:text-primary-700 font-medium">
                    lifelines@sainthelen.org
                  </a>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Support</h3>
                  <a href="mailto:support@sainthelen.org" className="text-primary-600 hover:text-primary-700 font-medium">
                    support@sainthelen.org
                  </a>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Need to update contact information?</p>
                    <p className="mt-1">Contact your system administrator to update email addresses or other configuration settings.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About */}
        {activeSection === 'about' && (
          <div className="dashboard-card">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">About LifeLines</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Globe className="h-8 w-8 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">LifeLines - Saint Helen Parish</h3>
                  <p className="text-sm text-gray-600">Small Groups Management System</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <dl className="grid grid-cols-1 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Version</dt>
                    <dd className="text-sm text-gray-900 mt-1">1.0.0</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Organization</dt>
                    <dd className="text-sm text-gray-900 mt-1">Saint Helen Parish</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Website</dt>
                    <dd className="text-sm mt-1">
                      <a
                        href="https://sainthelen.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        sainthelen.org
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  LifeLines helps Saint Helen Parish manage small faith-sharing groups,
                  connecting parishioners with meaningful community experiences and
                  supporting group leaders in their ministry.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}