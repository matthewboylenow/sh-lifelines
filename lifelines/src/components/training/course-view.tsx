'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, PlayCircle, ArrowLeft, ArrowRight, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface LessonSummary {
  id: string
  title: string
  position: number
  completed: boolean
}

interface CourseData {
  slug: string
  title: string
  description: string | null
  lessons: (LessonSummary & { hasVideo: boolean; lastPosition: number })[]
  progress: { completed: number; total: number; percent: number; nextLessonId: string | null }
}

interface LessonData {
  id: string
  title: string
  description: string | null
  position: number
  videoKind: string | null
  playbackUrl: string | null
  embedUrl: string | null
  completed: boolean
  lastPosition: number
  course: { slug: string; title: string }
  lessons: LessonSummary[]
  previousLessonId: string | null
  nextLessonId: string | null
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
      <div
        className="h-full rounded-full bg-secondary-500 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function LessonList({
  lessons,
  currentId,
  onSelect,
}: {
  lessons: LessonSummary[]
  currentId?: string
  onSelect: (id: string) => void
}) {
  return (
    <ol className="divide-y divide-gray-100">
      {lessons.map(l => {
        const isCurrent = l.id === currentId
        return (
          <li key={l.id}>
            <button
              onClick={() => onSelect(l.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                isCurrent ? 'bg-primary-50' : 'hover:bg-gray-50'
              }`}
              aria-current={isCurrent ? 'true' : undefined}
            >
              {l.completed ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-secondary-600" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-gray-300" aria-hidden="true" />
              )}
              <span className="text-xs text-gray-400 w-5 flex-shrink-0">{l.position}</span>
              <span className={`text-sm ${isCurrent ? 'font-semibold text-primary-800' : 'text-gray-700'}`}>
                {l.title}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function CourseView({ slug }: { slug: string }) {
  const router = useRouter()
  const [course, setCourse] = useState<CourseData | null>(null)
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${slug}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not load the training'); return }
      setCourse(data.data)
    } catch {
      setError('Could not load the training')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { loadCourse() }, [loadCourse])

  // Load a lesson whenever one is selected.
  useEffect(() => {
    if (!lessonId) { setLesson(null); return }
    let cancelled = false
    setLesson(null)
    fetch(`/api/lessons/${lessonId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d?.data) setLesson(d.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [lessonId])

  const markComplete = async (complete: boolean) => {
    if (!lesson) return
    setSaving(true)
    try {
      await fetch(`/api/lessons/${lesson.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: complete }),
      })
      setLesson({ ...lesson, completed: complete })
      await loadCourse()
    } finally {
      setSaving(false)
    }
  }

  // Remember roughly where the viewer got to, without writing on every tick.
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget
    const secs = Math.floor(el.currentTime)
    if (!lesson || secs === 0 || secs % 15 !== 0) return
    fetch(`/api/lessons/${lesson.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastPosition: secs }),
    }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading training...</span>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="dashboard-card text-center py-12">
        <p className="text-gray-600">{error || 'Training is not available right now.'}</p>
      </div>
    )
  }

  // ---- Lesson view ----
  if (lessonId && lesson) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setLessonId(null)}
          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {lesson.course.title}
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="overflow-hidden rounded-lg bg-black">
              {lesson.embedUrl ? (
                <iframe
                  src={lesson.embedUrl}
                  title={lesson.title}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : lesson.playbackUrl ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  key={lesson.id}
                  src={lesson.playbackUrl}
                  controls
                  preload="metadata"
                  className="w-full aspect-video"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={e => {
                    // Resume where they left off, unless they had finished.
                    if (lesson.lastPosition > 5 && !lesson.completed) {
                      e.currentTarget.currentTime = lesson.lastPosition
                    }
                  }}
                  onEnded={() => { if (!lesson.completed) markComplete(true) }}
                />
              ) : (
                <div className="aspect-video flex items-center justify-center text-white/70 text-sm">
                  This lesson has no video yet.
                </div>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Lesson {lesson.position} of {lesson.lessons.length}
              </p>
              <h2 className="text-2xl font-bold text-gray-900">{lesson.title}</h2>
              {lesson.description && (
                <p className="mt-2 text-gray-600">{lesson.description}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => markComplete(!lesson.completed)}
                disabled={saving}
                variant={lesson.completed ? 'outline' : 'primary'}
              >
                {saving ? (
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {lesson.completed ? 'Mark as not finished' : 'Mark as complete'}
              </Button>

              {lesson.previousLessonId && (
                <Button variant="outline" onClick={() => setLessonId(lesson.previousLessonId)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              {lesson.nextLessonId && (
                <Button variant="outline" onClick={() => setLessonId(lesson.nextLessonId)}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          <aside className="dashboard-card p-0 overflow-hidden self-start">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Sessions</h3>
            </div>
            <LessonList lessons={lesson.lessons} currentId={lesson.id} onSelect={setLessonId} />
          </aside>
        </div>
      </div>
    )
  }

  // ---- Course overview ----
  const { progress } = course
  const finished = progress.completed === progress.total && progress.total > 0

  return (
    <div className="space-y-6">
      <div className="dashboard-card">
        <div className="flex items-start gap-4">
          <div className="bg-primary-50 p-3 rounded-lg">
            <GraduationCap className="h-7 w-7 text-primary-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            {course.description && (
              <p className="mt-2 text-gray-600">{course.description}</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">
              {progress.completed} of {progress.total} complete
            </span>
            <span className="text-gray-500">{progress.percent}%</span>
          </div>
          <ProgressBar percent={progress.percent} />
        </div>

        {progress.nextLessonId && (
          <div className="mt-6">
            <Button onClick={() => setLessonId(progress.nextLessonId)}>
              <PlayCircle className="h-4 w-4 mr-2" />
              {finished ? 'Review the training' : progress.completed > 0 ? 'Continue where you left off' : 'Start the training'}
            </Button>
          </div>
        )}

        {finished && (
          <p className="mt-4 text-sm text-secondary-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            You&rsquo;ve completed the whole series — thank you.
          </p>
        )}
      </div>

      <div className="dashboard-card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Sessions</h2>
        </div>
        <LessonList lessons={course.lessons} onSelect={setLessonId} />
      </div>
    </div>
  )
}
