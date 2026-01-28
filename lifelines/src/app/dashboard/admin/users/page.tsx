import { redirect } from 'next/navigation'

export default function AdminUsersPage() {
  // Redirect to admin dashboard with users tab pre-selected
  redirect('/dashboard/admin?tab=users')
}
