'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Settings as SettingsIcon,
  Bell,
  Mail,
  Shield,
  Eye,
  Moon,
  Globe,
  ArrowLeft,
  Save,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [settings, setSettings] = useState({
    emailNotifications: {
      inquiries: true,
      formationUpdates: true,
      supportTickets: true,
      systemUpdates: false,
    },
    privacy: {
      showEmailToLeaders: false,
      allowDirectContact: true,
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'America/New_York',
    }
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (status === 'authenticated') {
      // For now, just set loading to false
      // In a real implementation, you'd fetch user settings from an API
      setLoading(false)
    }
  }, [status, router])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real implementation, you'd save to an API:
      // const response = await fetch('/api/users/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // })

      setSuccess('Settings saved successfully')
    } catch (error) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/profile" className="flex items-center text-primary hover:text-primary-dark">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Profile
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="h-8 w-8 mr-3" />
            Settings & Preferences
          </h1>
          <p className="text-gray-600">Customize your LifeLines experience</p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center mb-4">
              <Bell className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Email Notifications</h2>
            </div>
            <p className="text-gray-600 mb-6">Choose what email notifications you'd like to receive</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">New Inquiries</Label>
                  <p className="text-sm text-gray-600">Get notified when someone expresses interest in your LifeLine</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.emailNotifications.inquiries}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        inquiries: e.target.checked
                      }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Formation Updates</Label>
                  <p className="text-sm text-gray-600">Updates about your formation requests and approvals</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.emailNotifications.formationUpdates}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        formationUpdates: e.target.checked
                      }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Support Tickets</Label>
                  <p className="text-sm text-gray-600">Responses to your support requests</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.emailNotifications.supportTickets}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        supportTickets: e.target.checked
                      }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">System Updates</Label>
                  <p className="text-sm text-gray-600">Important system announcements and maintenance notices</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.emailNotifications.systemUpdates}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        systemUpdates: e.target.checked
                      }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Privacy Settings</h2>
            </div>
            <p className="text-gray-600 mb-6">Control how your information is shared</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Show Email to LifeLine Leaders</Label>
                  <p className="text-sm text-gray-600">Allow LifeLine leaders to see your email address when you express interest</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.privacy.showEmailToLeaders}
                    onChange={(e) => setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        showEmailToLeaders: e.target.checked
                      }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Allow Direct Contact</Label>
                  <p className="text-sm text-gray-600">Let LifeLine leaders contact you directly about opportunities</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.privacy.allowDirectContact}
                    onChange={(e) => setSettings({
                      ...settings,
                      privacy: {
                        ...settings.privacy,
                        allowDirectContact: e.target.checked
                      }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* General Preferences */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center mb-4">
              <Globe className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">General Preferences</h2>
            </div>
            <p className="text-gray-600 mb-6">Customize your interface and regional settings</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  value={settings.preferences.language}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: {
                      ...settings.preferences,
                      language: e.target.value
                    }
                  })}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <div>
                <Label htmlFor="timezone">Time Zone</Label>
                <select
                  id="timezone"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  value={settings.preferences.timezone}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: {
                      ...settings.preferences,
                      timezone: e.target.value
                    }
                  })}
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Coming Soon Features */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center mb-4">
              <Info className="h-6 w-6 text-gray-400 mr-3" />
              <h2 className="text-xl font-semibold text-gray-500">Coming Soon</h2>
            </div>
            <p className="text-gray-500 mb-4">These features will be available in future updates</p>
            
            <div className="space-y-3 opacity-50">
              <div className="flex items-center">
                <Moon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-500">Dark Mode Theme</span>
              </div>
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-500">Push Notifications</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-500">Email Digest Options</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-2"
          >
            {saving ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}