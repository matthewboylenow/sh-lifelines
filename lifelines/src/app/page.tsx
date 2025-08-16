import { Suspense } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { LifeLinesGrid } from '@/components/lifelines/lifelines-grid'
import { HomeHero } from '@/components/home/hero'
import { FiltersSection } from '@/components/home/filters-section'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

function HomeContent() {
  return (
    <>
      <HomeHero />
      <FiltersSection />
      <div className="container-responsive py-12">
        <LifeLinesGrid />
      </div>
    </>
  )
}

export default function HomePage() {
  return (
    <MainLayout>
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