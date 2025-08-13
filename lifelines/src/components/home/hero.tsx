export function HomeHero() {
  return (
    <section 
      className="relative text-white py-32 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'linear-gradient(rgba(31, 52, 109, 0.7), rgba(1, 158, 124, 0.6)), url(/pictures/nvmfrtbidso-1024x683.jpg)'
      }}
    >
      <div className="container mx-auto px-4 text-center relative z-10">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg leading-tight">
          LifeLines at Saint Helen
        </h1>
        <p className="text-xl md:text-2xl text-white mb-8 max-w-2xl mx-auto drop-shadow-lg font-medium">
          Connect, Grow, and Flourish in Faith Community
        </p>
        <div className="inline-block bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
          <p className="text-white font-medium">
            Explore LifeLines below to find your perfect faith community! ↓
          </p>
        </div>
      </div>
    </section>
  )
}