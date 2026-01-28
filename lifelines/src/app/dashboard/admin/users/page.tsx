import { redirect } from 'next/navigation'

export default function AdminUsersPage() {
  // Redirect to admin dashboard - User Management is a tab there
  redirect('/dashboard/admin')
}
