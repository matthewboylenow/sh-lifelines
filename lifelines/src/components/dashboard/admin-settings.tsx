'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Mail, Globe, Database, Shield, Zap, Save, AlertCircle } from 'lucide-react'

export function AdminSettings() {
  const [activeSection, setActiveSection] = useState<'email' | 'site' | 'integrations' | 'security'>('email')
  const [saving, setSaving] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    email: {
      smtpHost: process.env.NEXT_PUBLIC_SMTP_HOST || '',
      smtpPort: process.env.NEXT_PUBLIC_SMTP_PORT || '587',
      smtpUser: process.env.NEXT_PUBLIC_SMTP_USER || '',
      fromEmail: 'noreply@sainthelen.org',
      replyToEmail: 'support@sainthelen.org'
    },
    site: {
      siteName: 'LifeLines - Saint Helen Church',
      siteDescription: 'Small Groups Management System',
      contactEmail: 'lifelines@sainthelen.org',
      adminEmail: 'admin@sainthelen.org',
      supportEmail: 'support@sainthelen.org'
    },
    integrations: {
      typeformWebhookUrl: process.env.NEXT_PUBLIC_TYPEFORM_WEBHOOK_URL || '',
      typeformSecret: '',
      sendgridApiKey: '',
      unsplashAccessKey: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || ''
    },
    security: {
      sessionTimeout: '24',
      maxLoginAttempts: '5',
      passwordMinLength: '8',
      requireStrongPasswords: true,
      enableTwoFactor: false
    }
  })

  const handleSave = async (section: string) => {
    setSaving(section)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real implementation, you would save to the database
      console.log(`Saving ${section} settings:`, settings[section as keyof typeof settings])
      
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }))
  }

  const sections = [
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'site', label: 'Site Configuration', icon: Globe },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'security', label: 'Security', icon: Shield }
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
        {/* Email Settings */}
        {activeSection === 'email' && (
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Email Settings</h2>
              <Button 
                onClick={() => handleSave('email')}
                disabled={saving === 'email'}
              >
                {saving === 'email' ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host
                  </label>
                  <Input
                    value={settings.email.smtpHost}
                    onChange={(e) => updateSetting('email', 'smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <Input
                    value={settings.email.smtpPort}
                    onChange={(e) => updateSetting('email', 'smtpPort', e.target.value)}
                    placeholder="587"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username
                </label>
                <Input
                  value={settings.email.smtpUser}
                  onChange={(e) => updateSetting('email', 'smtpUser', e.target.value)}
                  placeholder="your-email@gmail.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Email Address
                  </label>
                  <Input
                    value={settings.email.fromEmail}
                    onChange={(e) => updateSetting('email', 'fromEmail', e.target.value)}
                    placeholder="noreply@sainthelen.org"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reply-To Email Address
                  </label>
                  <Input
                    value={settings.email.replyToEmail}
                    onChange={(e) => updateSetting('email', 'replyToEmail', e.target.value)}
                    placeholder="support@sainthelen.org"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Email Configuration</p>
                    <p className="mt-1">Configure your SMTP settings for sending emails. For production, consider using a service like SendGrid or Amazon SES.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Site Configuration */}
        {activeSection === 'site' && (
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Site Configuration</h2>
              <Button 
                onClick={() => handleSave('site')}
                disabled={saving === 'site'}
              >
                {saving === 'site' ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <Input
                  value={settings.site.siteName}
                  onChange={(e) => updateSetting('site', 'siteName', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Description
                </label>
                <Input
                  value={settings.site.siteDescription}
                  onChange={(e) => updateSetting('site', 'siteDescription', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <Input
                    value={settings.site.contactEmail}
                    onChange={(e) => updateSetting('site', 'contactEmail', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Email
                  </label>
                  <Input
                    value={settings.site.adminEmail}
                    onChange={(e) => updateSetting('site', 'adminEmail', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <Input
                  value={settings.site.supportEmail}
                  onChange={(e) => updateSetting('site', 'supportEmail', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Integrations */}
        {activeSection === 'integrations' && (
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
              <Button 
                onClick={() => handleSave('integrations')}
                disabled={saving === 'integrations'}
              >
                {saving === 'integrations' ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typeform Webhook URL
                </label>
                <Input
                  value={settings.integrations.typeformWebhookUrl}
                  onChange={(e) => updateSetting('integrations', 'typeformWebhookUrl', e.target.value)}
                  placeholder="https://yoursite.com/api/webhooks/typeform"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SendGrid API Key
                </label>
                <Input
                  type="password"
                  value={settings.integrations.sendgridApiKey}
                  onChange={(e) => updateSetting('integrations', 'sendgridApiKey', e.target.value)}
                  placeholder="SG...."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unsplash Access Key
                </label>
                <Input
                  type="password"
                  value={settings.integrations.unsplashAccessKey}
                  onChange={(e) => updateSetting('integrations', 'unsplashAccessKey', e.target.value)}
                  placeholder="Your Unsplash API key"
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium">Security Notice</p>
                    <p className="mt-1">API keys and secrets should be stored as environment variables in production. These settings are for display purposes only.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeSection === 'security' && (
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
              <Button 
                onClick={() => handleSave('security')}
                disabled={saving === 'security'}
              >
                {saving === 'security' ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (hours)
                  </label>
                  <Input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSetting('security', 'sessionTimeout', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Login Attempts
                  </label>
                  <Input
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => updateSetting('security', 'maxLoginAttempts', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Password Length
                </label>
                <Input
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => updateSetting('security', 'passwordMinLength', e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.security.requireStrongPasswords}
                    onChange={(e) => updateSetting('security', 'requireStrongPasswords', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Require strong passwords (uppercase, lowercase, numbers)</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.security.enableTwoFactor}
                    onChange={(e) => updateSetting('security', 'enableTwoFactor', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable two-factor authentication (future feature)</span>
                </label>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium">Security Configuration</p>
                    <p className="mt-1">These settings affect user security and session management. Changes take effect immediately for new sessions.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}