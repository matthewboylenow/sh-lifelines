'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, Users, Rocket, AlertTriangle, CheckCircle, History } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/ui/toast'

interface LegacyGroup {
  id: string
  slug: string | null
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'FULL' | 'ARCHIVED'
  groupLeader: string | null
  legacyLeaders: Array<{ name: string; email: string }>
  legacyNotes: string | null
  memberCount: number
  leaders: Array<{ id: string; displayName: string | null; email: string; lastLoginAt: string | null }>
}

interface PushResult {
  published: Array<{ id: string; title: string; leaders: string[] }>
  skipped: Array<{ id: string; title: string; reason: string }>
  accountsCreated: string[]
  accountsGivenLeaderRole: string[]
}

/**
 * Small groups carried over from before LifeLines. They are kept in their own
 * tab, apart from the LifeLines people can find and join, because they are
 * never shown on the public site.
 */
export function LegacySmallGroups() {
  const { toast } = useToast()
  const [groups, setGroups] = useState<LegacyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState<PushResult | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/admin/legacy-groups')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load legacy small groups')
      setGroups(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load legacy small groups')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const drafts = groups.filter(group => group.status === 'DRAFT')
  const live = groups.filter(group => group.status === 'PUBLISHED' || group.status === 'FULL')
  // Imported for the record, but left out of "push live" (the leader said the
  // group has stopped, or it isn't a small group). Set it back to Draft to
  // include it.
  const notMeeting = groups.filter(group => group.status === 'ARCHIVED')
  const draftsWithoutLeader = drafts.filter(group => group.legacyLeaders.length === 0)

  const pushLive = async () => {
    const ready = drafts.length - draftsWithoutLeader.length
    const message =
      `Push ${ready} legacy group${ready === 1 ? '' : 's'} live?\n\n` +
      'Each leader gets an account and sees the group on their dashboard. ' +
      'The groups stay hidden from the public site. No emails are sent.' +
      (draftsWithoutLeader.length > 0
        ? `\n\n${draftsWithoutLeader.length} draft${draftsWithoutLeader.length === 1 ? ' has' : 's have'} no leader email and will stay in draft.`
        : '')
    if (!confirm(message)) return

    setPushing(true)
    try {
      const response = await fetch('/api/admin/legacy-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to push legacy groups live')
      setResult(data.data)
      toast({ title: 'Legacy groups pushed live', description: data.message, type: 'success' })
      await load()
    } catch (err) {
      toast({
        title: 'Push failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        type: 'error',
      })
    } finally {
      setPushing(false)
    }
  }

  const deleteGroup = async (group: LegacyGroup) => {
    if (!confirm(`Delete "${group.title}"? Its ${group.memberCount} member record${group.memberCount === 1 ? '' : 's'} will be removed too.`)) {
      return
    }
    try {
      const response = await fetch(`/api/lifelines/${group.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Could not delete this group.')
      }
      setGroups(prev => prev.filter(g => g.id !== group.id))
      toast({ title: 'Deleted', description: `"${group.title}" has been removed.`, type: 'success' })
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        type: 'error',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-card text-center py-10">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => { setLoading(true); load() }}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" aria-hidden="true" />
              Legacy small groups
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Small groups from before LifeLines. They never appear on the public site. Pushing
              them live gives each leader an account and puts the group on their dashboard, where
              they can see their members and email them. Groups marked Not meeting are skipped; edit
              one and set its status to Draft to include it.
            </p>
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-medium">{drafts.length}</span> draft
              {drafts.length === 1 ? '' : 's'} · <span className="font-medium">{live.length}</span> live
              {notMeeting.length > 0 && (
                <>
                  {' '}· <span className="font-medium">{notMeeting.length}</span> not meeting
                </>
              )}
            </p>
          </div>
          <Button
            onClick={pushLive}
            disabled={pushing || drafts.length - draftsWithoutLeader.length === 0}
            className="shrink-0"
          >
            <Rocket className="h-4 w-4 mr-2" aria-hidden="true" />
            {pushing
              ? 'Pushing live…'
              : drafts.length === 0
                ? 'All pushed live'
                : `Push ${drafts.length - draftsWithoutLeader.length} draft${drafts.length - draftsWithoutLeader.length === 1 ? '' : 's'} live`}
          </Button>
        </div>

        {result && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <p className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              {result.published.length} group{result.published.length === 1 ? '' : 's'} pushed live.{' '}
              {result.accountsCreated.length} new leader account{result.accountsCreated.length === 1 ? '' : 's'}
              {result.accountsGivenLeaderRole.length > 0 &&
                `, ${result.accountsGivenLeaderRole.length} existing account${result.accountsGivenLeaderRole.length === 1 ? '' : 's'} made leader${result.accountsGivenLeaderRole.length === 1 ? '' : 's'}`}
              .
            </p>
            <p className="mt-1">
              No emails were sent. When you&apos;re ready to invite them, use{' '}
              <Link href="/dashboard/admin?tab=users" className="underline">User Management</Link> to send
              setup emails to leaders who haven&apos;t signed in.
            </p>
            {result.skipped.length > 0 && (
              <ul className="mt-3 space-y-1 text-amber-900">
                {result.skipped.map(item => (
                  <li key={item.id}>
                    <span className="font-medium">{item.title}</span> stayed in draft: {item.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="dashboard-card text-center py-10 text-gray-600">No legacy small groups yet.</div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {groups.map(group => {
            const isDraft = group.status === 'DRAFT'
            const isNotMeeting = group.status === 'ARCHIVED'
            const badge = isDraft
              ? { label: 'Draft', className: 'bg-amber-100 text-amber-800' }
              : isNotMeeting
                ? { label: 'Not meeting', className: 'bg-gray-100 text-gray-700' }
                : { label: 'Live', className: 'bg-green-100 text-green-800' }
            return (
              <li key={group.id} className="dashboard-card !p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{group.title}</h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Leaders</dt>
                    <dd className="text-gray-900">
                      {group.leaders.length === 0 ? (
                        group.legacyLeaders.length > 0 ? (
                          group.legacyLeaders.map(leader => (
                            <span key={leader.email} className="block break-all">
                              {leader.name !== leader.email && `${leader.name} · `}
                              <span className="text-gray-600">{leader.email}</span>
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            {isDraft ? 'No leader email. Add one before pushing live.' : 'No leader email.'}
                          </span>
                        )
                      ) : (
                        group.leaders.map(leader => (
                          <span key={leader.id} className="block break-all">
                            {leader.displayName || leader.email}
                            <span className="text-gray-500">
                              {' '}
                              · {leader.lastLoginAt ? 'has signed in' : 'not signed in yet'}
                            </span>
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Members</dt>
                    <dd className="text-gray-900">{group.memberCount}</dd>
                  </div>
                  {group.legacyNotes && (
                    <div>
                      <dt className="text-gray-500">From the leader&apos;s update</dt>
                      <dd className="text-gray-700 whitespace-pre-line line-clamp-4">{group.legacyNotes}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                  <Link href={`/lifelines/${group.slug || group.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-1.5" aria-hidden="true" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/dashboard/leader/members?lifeLine=${group.id}`}>
                    <Button size="sm" variant="outline">
                      <Users className="h-4 w-4 mr-1.5" aria-hidden="true" />
                      Members
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteGroup(group)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
