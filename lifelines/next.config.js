/**
 * Addresses from the old WordPress site whose LifeLine was given a different
 * address here. People still follow these from bookmarks, old emails and the
 * bulletin, and without a redirect they land on "page not found".
 */
const OLD_LIFELINE_SLUGS = {
  'made-for-this-life-lifeline': 'made-for-this-womens-monthly-book-club',
  'wednesday-afternoon-canasta-at-saint-helen': 'canasta-at-saint-helen',
  'here-i-am-god-separated-divorced-and-believer': 'here-i-am-god-separateddivorced-and-believer',
  'walking-in-oak-ridge-park': 'walking-in-oak-ridge-park-60',
  'wednesday-evening-faith-sharing': 'faith-sharing-wednesday-evenings',
  'drop-in-lifeline': 'thursday-morning-faith-sharing',
  'diane-velcovs-lifeline': 'magnificat-meditation-and-merton',
  'ivona-michaleks-lifeline': 'wednesday-morning-virtual-faith-sharing',
  'myriam-gabriels-lifeline': 'morning-faith-sharing-lifeline',
  'lucia-mcgovern-joe-vaszilys-lifeline': 'tuesday-morning-virtual-faith-sharing',
  'dads-of-young-children-5-y-o': 'dads-of-young-children-5-yo',
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'images.unsplash.com',
      'lifelines.sainthelen.org',
      's3.amazonaws.com'
    ],
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  async redirects() {
    return [
      // The old site's sign-in pages, which leaders have bookmarked.
      { source: '/leader-login', destination: '/login', permanent: true },
      { source: '/formation-support-login', destination: '/login', permanent: true },
      ...Object.entries(OLD_LIFELINE_SLUGS).map(([from, to]) => ({
        source: `/lifelines/${from}`,
        destination: `/lifelines/${to}`,
        permanent: true,
      })),
    ]
  },
}

module.exports = nextConfig
