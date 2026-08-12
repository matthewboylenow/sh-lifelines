import Link from 'next/link'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-responsive py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="text-center text-white">
            &copy; {new Date().getFullYear()} A ministry of Saint Helen Church, Westfield, New Jersey
          </div>
          <Link
            href="/my-lifelines"
            className="text-sm text-white/60 hover:text-white/90 underline underline-offset-4 transition-colors"
          >
            Manage my LifeLines
          </Link>
        </div>
      </div>
    </footer>
  )
}
