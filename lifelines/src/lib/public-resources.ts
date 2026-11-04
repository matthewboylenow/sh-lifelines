import { prisma } from './prisma'

/**
 * Resources anyone can open from the Resources page without signing in: the
 * season's discussion guide and a few online resources. An admin chooses which
 * by ticking "Show on the public Resources page" on the resource.
 */
export interface PublicResource {
  id: string
  title: string
  description: string | null
  websiteUrl: string | null
  fileName: string | null
  hasFile: boolean
}

export async function getPublicResources(): Promise<PublicResource[]> {
  try {
    const resources = await prisma.resource.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        websiteUrl: true,
        fileUrl: true,
        fileName: true,
      },
    })
    return resources.map(({ fileUrl, ...resource }) => ({
      ...resource,
      hasFile: Boolean(fileUrl),
    }))
  } catch (error) {
    // The page must still load if this fails; it falls back to the contact card.
    console.error('Could not load public resources:', error)
    return []
  }
}
