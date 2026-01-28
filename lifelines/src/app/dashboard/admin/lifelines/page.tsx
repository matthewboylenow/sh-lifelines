import { redirect } from 'next/navigation'

export default function AdminLifeLinesPage() {
  // Redirect to admin dashboard - LifeLines Management is a tab there
  redirect('/dashboard/admin')
}
