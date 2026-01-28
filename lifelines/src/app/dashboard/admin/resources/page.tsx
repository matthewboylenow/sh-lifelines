import { redirect } from 'next/navigation'

export default function AdminResourcesPage() {
  // Redirect to admin dashboard - Resources is a tab there
  redirect('/dashboard/admin')
}
