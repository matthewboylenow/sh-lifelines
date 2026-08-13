/**
 * Recognise common video URLs so a resource can be played inline rather than
 * sending people off-site.
 *
 * Supports YouTube (watch, youtu.be, /embed, /shorts, /live), Vimeo, and files
 * served directly (mp4/webm/ogg/mov). Anything else is treated as a plain link.
 */

export type VideoKind = 'youtube' | 'vimeo' | 'file' | null

export interface VideoEmbed {
  kind: VideoKind
  /** URL suitable for an <iframe src>; null for direct files. */
  embedUrl: string | null
  /** URL suitable for a <video src>; null for iframe providers. */
  fileUrl: string | null
  /** Poster image where the provider offers one. */
  thumbnailUrl: string | null
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    return YOUTUBE_ID.test(id) ? id : null
  }

  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const v = u.searchParams.get('v')
    if (v && YOUTUBE_ID.test(v)) return v

    // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
      return YOUTUBE_ID.test(parts[1]) ? parts[1] : null
    }
  }

  return null
}

function vimeoId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '')
  if (!host.endsWith('vimeo.com')) return null
  // https://vimeo.com/123456789  or  https://player.vimeo.com/video/123456789
  const parts = u.pathname.split('/').filter(Boolean)
  const candidate = parts[0] === 'video' ? parts[1] : parts[0]
  return candidate && /^\d+$/.test(candidate) ? candidate : null
}

export function parseVideoUrl(raw: string | null | undefined): VideoEmbed {
  const empty: VideoEmbed = { kind: null, embedUrl: null, fileUrl: null, thumbnailUrl: null }
  if (!raw || !raw.trim()) return empty

  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return empty
  }

  // Only ever embed over https — an http iframe is blocked as mixed content.
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return empty

  const yt = youtubeId(u)
  if (yt) {
    return {
      kind: 'youtube',
      // nocookie host avoids setting tracking cookies for viewers who only watch
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
      fileUrl: null,
      thumbnailUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    }
  }

  const vm = vimeoId(u)
  if (vm) {
    return {
      kind: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vm}`,
      fileUrl: null,
      thumbnailUrl: null,
    }
  }

  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(u.pathname + u.search)) {
    return { kind: 'file', embedUrl: null, fileUrl: u.toString(), thumbnailUrl: null }
  }

  return empty
}

/** True when the URL is something we can actually play inline. */
export function isPlayableVideo(raw: string | null | undefined): boolean {
  return parseVideoUrl(raw).kind !== null
}
