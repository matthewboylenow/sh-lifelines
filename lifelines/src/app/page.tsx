import { Suspense } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { LifeLinesGrid } from '@/components/lifelines/lifelines-grid'
import { HomeHero } from '@/components/home/hero'
import { FiltersSection } from '@/components/home/filters-section'
import { LifeLinesSearchProvider } from '@/components/home/lifelines-search-context'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

function HomeContent() {
  return (
    <LifeLinesSearchProvider>
      <HomeHero />
      <FiltersSection />
      <div className="container-responsive py-12">
        <LifeLinesGrid />
      </div>

      {/* Start Your Own LifeLine CTA */}
      <div className="container-responsive pb-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-800 p-8 md:p-12 text-center">
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Don't see a LifeLine you're interested in?
            </h2>
            <p className="text-lg text-primary-100 mb-6 max-w-2xl mx-auto">
              Start your own LifeLine! Share your passion and connect with others in our community.
            </p>
            <Link
              href="/start-a-lifeline"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-primary-700 bg-white rounded-lg hover:bg-primary-50 transition-colors shadow-lg"
            >
              Start a LifeLine
            </Link>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
        </div>
      </div>
    </LifeLinesSearchProvider>
  )
}

export default function HomePage() {
  return (
    <MainLayout noPadding>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      }>
        <HomeContent />
      </Suspense>
    </MainLayout>
  )
}
