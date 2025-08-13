import Link from 'next/link'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-responsive py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-600">
            © 2024 A ministry of Saint Helen Church, Westfield, New Jersey
          </div>
          <div>
            <Link 
              href="https://sainthelen.org" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-md hover:bg-primary-600 transition-colors"
            >
              Visit Saint Helen Church
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}