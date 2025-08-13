import { MainLayout } from '@/components/layout/main-layout'
import { LifeLinesGrid } from '@/components/lifelines/lifelines-grid'
import { HomeHero } from '@/components/home/hero'
import { FiltersSection } from '@/components/home/filters-section'

export default function HomePage() {
  return (
    <MainLayout>
      <HomeHero />
      <FiltersSection />
      <div className="container-responsive py-12">
        <LifeLinesGrid />
      </div>
    </MainLayout>
  )
}