import { redirect } from 'next/navigation'

export default function SettingsPage() {
  // Redirect to profile page - settings are managed there
  redirect('/profile')
}
