import { Download, ExternalLink, Mail, Phone } from 'lucide-react'
import type { PublicResource } from '@/lib/public-resources'

/**
 * Small group resources, open to everyone at the top of the home page.
 *
 * Which resources appear is chosen in the admin Resources screen ("Show on the
 * public LifeLines page"), so the guide can change each season without a
 * deploy. Files are listed first as the season's guide; links follow.
 */

const CONTACT = {
  name: 'Maria Auricchio',
  email: 'mauricchio@sainthelen.org',
  phone: '908-873-1981',
}

function fileKind(fileName: string | null): string {
  const extension = fileName?.split('.').pop()?.toLowerCase()
  if (extension === 'pdf') return 'PDF'
  if (extension === 'doc' || extension === 'docx') return 'Word document'
  return 'file'
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function PublicResources({ resources }: { resources: PublicResource[] }) {
  const guides = resources.filter(resource => resource.hasFile)
  // Newest guide first, but links alphabetically so the list stays put as
  // links are added.
  const links = resources
    .filter(resource => !resource.hasFile && resource.websiteUrl)
    .sort((a, b) => a.title.localeCompare(b.title))

  if (guides.length === 0 && links.length === 0) return null

  return (
    <section
      aria-labelledby="small-group-resources"
      // Padding sits here: container-responsive sets its own and would
      // override vertical padding on the same element.
      className="border-b border-primary-100 bg-primary-50 py-6 md:py-10"
    >
      <div className="container-responsive">
        <div className="max-w-2xl">
          <h2
            id="small-group-resources"
            className="text-2xl md:text-3xl font-bold text-primary-500"
          >
            Small group resources
          </h2>
          <p className="mt-2 text-base md:text-lg text-gray-700">
            This season&apos;s discussion guide and trusted places to pray and study.
            Open to everyone, no login needed.
          </p>
        </div>

        <div className="mt-5 md:mt-8 grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
          {guides.length > 0 && (
            <div className="rounded-xl bg-white p-5 md:p-6 shadow-sm ring-1 ring-primary-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary-600">
                Weekly resources
              </p>
              <ul className="mt-2 space-y-5">
                {guides.map(guide => (
                  <li key={guide.id}>
                    <h3 className="text-lg font-semibold text-gray-900">{guide.title}</h3>
                    {guide.description && (
                      <p className="mt-1 text-sm text-gray-600">{guide.description}</p>
                    )}
                    <a
                      href={`/api/resources/${guide.id}/download`}
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-secondary-500 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2"
                    >
                      <Download className="h-5 w-5" aria-hidden="true" />
                      Download the guide
                      <span className="font-normal text-white/80">({fileKind(guide.fileName)})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {links.length > 0 && (
            <div className="rounded-xl bg-white p-5 md:p-6 shadow-sm ring-1 ring-primary-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary-600">
                Online resources
              </p>
              <ul className="mt-2 divide-y divide-gray-100">
                {links.map(link => (
                  <li key={link.id}>
                    <a
                      href={link.websiteUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start justify-between gap-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-primary-500 group-hover:underline">
                          {link.title}
                        </span>
                        <span className="block text-sm text-gray-600">
                          {link.description || hostOf(link.websiteUrl!)}
                        </span>
                      </span>
                      <ExternalLink className="mt-1 h-4 w-4 flex-none text-gray-400 group-hover:text-primary-500" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl bg-white p-5 md:p-6 shadow-sm ring-1 ring-primary-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary-600">
              Questions
            </p>
            <p className="mt-2 font-semibold text-gray-900">{CONTACT.name}</p>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="inline-flex items-center gap-2 text-primary-500 hover:underline break-all"
                >
                  <Mail className="h-4 w-4 flex-none" aria-hidden="true" />
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:+1${CONTACT.phone.replace(/\D/g, '')}`}
                  className="inline-flex items-center gap-2 text-primary-500 hover:underline"
                >
                  <Phone className="h-4 w-4 flex-none" aria-hidden="true" />
                  {CONTACT.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
