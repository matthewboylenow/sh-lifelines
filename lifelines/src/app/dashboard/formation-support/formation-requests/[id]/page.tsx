'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  FileText, 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  Users,
  MessageSquare,
  Vote as VoteIcon,
  CheckCircle,
  XCircle,
  HelpCircle,
  MinusCircle,
  Send,
  History,
  AlertCircle
} from 'lucide-react'
import { UserRole, FormationStatus, GroupType } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface FormationRequestDetail {
  id: string
  title: string
  description?: string
  status: FormationStatus
  groupLeader: string
  leaderEmail: string
  cellPhone?: string
  agesStages?: string
  groupType?: GroupType
  meetingFrequency?: string
  dayOfWeek?: string
  meetingTime?: string
  autoApprovalScheduled?: string
  lifeLineCreated: boolean
  createdAt: string
  submitter?: {
    id: string
    displayName: string
    email: string
  }
  votes: Array<{
    id: string
    vote: 'APPROVE' | 'PASS' | 'OBJECT' | 'DISCUSS'
    comment?: string
    user: {
      id: string
      displayName: string
      email: string
    }
    createdAt: string
  }>
  comments: Array<{
    id: string
    content: string
    author: {
      id: string
      displayName: string
      email: string
    }
    createdAt: string
  }>
  createdLifeLine?: {
    id: string
    title: string
    status: string
  }
}

type VoteType = 'APPROVE' | 'PASS' | 'OBJECT' | 'DISCUSS'

export default function FormationRequestDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const requestId = params?.id as string
  
  const [request, setRequest] = useState<FormationRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [voteForm, setVoteForm] = useState({
    vote: '' as VoteType | '',
    comment: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (status === 'authenticated') {
      if (!session?.user || 
          (session.user.role !== UserRole.FORMATION_SUPPORT_TEAM && 
           session.user.role !== UserRole.ADMIN)) {
        router.push('/dashboard/leader')
        return
      }
      if (requestId) {
        fetchRequest()
      }
    }
  }, [status, session, router, requestId])

  const fetchRequest = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/formation-requests/${requestId}`)
      const data = await response.json()

      if (data.success) {
        setRequest(data.data)
      } else {
        setError(data.error || 'Failed to load formation request')
      }
    } catch (error) {
      setError('Failed to load formation request')
    } finally {
      setLoading(false)
    }
  }

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voteForm.vote) return

    setVoting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/formation-requests/${requestId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vote: voteForm.vote,
          comment: voteForm.comment || undefined
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Vote submitted successfully')
        setVoteForm({ vote: '', comment: '' })
        // Refresh the request data
        await fetchRequest()
      } else {
        setError(result.error || 'Failed to submit vote')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setVoting(false)
    }
  }

  const getStatusBadge = (status: FormationStatus) => {
    const styles = {
      SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      ARCHIVED: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return styles[status] || styles.SUBMITTED
  }

  const getVoteIcon = (vote: string) => {
    switch (vote) {
      case 'APPROVE': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'OBJECT': return <XCircle className="h-4 w-4 text-red-600" />
      case 'DISCUSS': return <MessageSquare className="h-4 w-4 text-yellow-600" />
      case 'PASS': return <MinusCircle className="h-4 w-4 text-gray-600" />
      default: return <HelpCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getVoteColor = (vote: string) => {
    switch (vote) {
      case 'APPROVE': return 'text-green-700 bg-green-50 border-green-200'
      case 'OBJECT': return 'text-red-700 bg-red-50 border-red-200'
      case 'DISCUSS': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'PASS': return 'text-gray-700 bg-gray-50 border-gray-200'
      default: return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const formatTimeRemaining = (scheduledDate?: string) => {
    if (!scheduledDate) return null
    
    const now = new Date()
    const scheduled = new Date(scheduledDate)
    const diff = scheduled.getTime() - now.getTime()
    
    if (diff <= 0) return 'Overdue'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) {
      return `${hours} hours remaining`
    }
    
    const days = Math.floor(hours / 24)
    return `${days} days ${hours % 24} hours remaining`
  }

  const getCurrentUserVote = () => {
    if (!session?.user || !request) return null
    return request.votes.find(vote => vote.user.id === session.user.id)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Request Not Found</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link href="/dashboard/formation-support/formation-requests">
            <Button>Back to Requests</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!request) return null

  const timeRemaining = formatTimeRemaining(request.autoApprovalScheduled)
  const currentUserVote = getCurrentUserVote()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/formation-support/formation-requests" className="flex items-center text-primary hover:text-primary-dark">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Formation Requests
            </Link>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <FileText className="h-8 w-8 mr-3" />
                {request.title}
              </h1>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(request.status)}`}>
                  {request.status}
                </span>
                {request.lifeLineCreated && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    LifeLine Created
                  </span>
                )}
                <span className="text-sm text-gray-600">
                  Submitted {new Date(request.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Auto-approval Timer */}
          {request.status === 'SUBMITTED' && timeRemaining && (
            <div className="mt-4 flex items-center text-orange-600 bg-orange-50 px-4 py-3 rounded-lg border border-orange-200">
              <Clock className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Auto-approval Timer</div>
                <div className="text-sm">{timeRemaining}</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm text-gray-600">Group Leader</div>
                    <div className="font-medium">{request.groupLeader}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-medium">{request.leaderEmail}</div>
                  </div>
                </div>
                
                {request.cellPhone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm text-gray-600">Phone</div>
                      <div className="font-medium">{request.cellPhone}</div>
                    </div>
                  </div>
                )}
                
                {request.groupType && (
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm text-gray-600">Group Type</div>
                      <div className="font-medium">{request.groupType}</div>
                    </div>
                  </div>
                )}
                
                {request.agesStages && (
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm text-gray-600">Ages/Stages</div>
                      <div className="font-medium">{request.agesStages}</div>
                    </div>
                  </div>
                )}
                
                {request.meetingFrequency && (
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm text-gray-600">Frequency</div>
                      <div className="font-medium">{request.meetingFrequency}</div>
                    </div>
                  </div>
                )}
                
                {request.dayOfWeek && request.meetingTime && (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm text-gray-600">Meeting Time</div>
                      <div className="font-medium">{request.dayOfWeek}s at {request.meetingTime}</div>
                    </div>
                  </div>
                )}
              </div>

              {request.description && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
                  </div>
                </div>
              )}

              {request.createdLifeLine && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <div className="font-medium text-green-900">LifeLine Created</div>
                      <div className="text-sm text-green-700">
                        This request has been approved and a LifeLine has been created.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Voting History */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <History className="h-5 w-5 mr-2" />
                Voting History ({request.votes.length})
              </h2>
              
              {request.votes.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No votes have been cast yet.</p>
              ) : (
                <div className="space-y-4">
                  {request.votes.map((vote) => (
                    <div key={vote.id} className={`p-4 rounded-lg border ${getVoteColor(vote.vote)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          {getVoteIcon(vote.vote)}
                          <div className="ml-3">
                            <div className="font-medium">{vote.user.displayName}</div>
                            <div className="text-sm opacity-75">
                              {vote.vote} • {new Date(vote.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      {vote.comment && (
                        <div className="mt-3 p-3 bg-white/50 rounded border">
                          <p className="text-sm">{vote.comment}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Comments ({request.comments.length})
              </h2>
              
              {request.comments.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No comments yet.</p>
              ) : (
                <div className="space-y-4">
                  {request.comments.map((comment) => (
                    <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">{comment.author.displayName}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Vote Status */}
            {currentUserVote && (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Current Vote</h3>
                <div className={`p-3 rounded-lg border ${getVoteColor(currentUserVote.vote)}`}>
                  <div className="flex items-center">
                    {getVoteIcon(currentUserVote.vote)}
                    <span className="ml-2 font-medium">{currentUserVote.vote}</span>
                  </div>
                  {currentUserVote.comment && (
                    <p className="mt-2 text-sm">{currentUserVote.comment}</p>
                  )}
                  <p className="text-xs opacity-75 mt-2">
                    Voted {new Date(currentUserVote.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Vote Form */}
            {request.status === 'SUBMITTED' && (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6" id="vote">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <VoteIcon className="h-5 w-5 mr-2" />
                  Cast Your Vote
                </h3>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mb-4">
                    {success}
                  </div>
                )}

                <form onSubmit={handleVoteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Vote
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'APPROVE', label: 'Approve', color: 'text-green-700', icon: CheckCircle },
                        { value: 'OBJECT', label: 'Object', color: 'text-red-700', icon: XCircle },
                        { value: 'DISCUSS', label: 'Needs Discussion', color: 'text-yellow-700', icon: MessageSquare },
                        { value: 'PASS', label: 'Pass (Abstain)', color: 'text-gray-700', icon: MinusCircle }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="vote"
                            value={option.value}
                            checked={voteForm.vote === option.value}
                            onChange={(e) => setVoteForm({ ...voteForm, vote: e.target.value as VoteType })}
                            className="text-primary focus:ring-primary"
                          />
                          <option.icon className={`h-4 w-4 ml-3 mr-2 ${option.color}`} />
                          <span className="font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comment (Optional)
                    </label>
                    <RichTextEditor
                      value={voteForm.comment}
                      onChange={(comment) => setVoteForm({ ...voteForm, comment })}
                      placeholder="Add your thoughts or reasoning..."
                      minHeight={120}
                      maxHeight={250}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!voteForm.vote || voting}
                    className="w-full flex items-center justify-center"
                  >
                    {voting ? (
                      <LoadingSpinner className="mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {voting ? 'Submitting...' : currentUserVote ? 'Update Vote' : 'Submit Vote'}
                  </Button>
                </form>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 mr-2" />
                    <div className="text-sm text-blue-800">
                      <div className="font-medium mb-1">Voting Guidelines:</div>
                      <ul className="space-y-1 text-xs">
                        <li>• <strong>Approve</strong>: Support this LifeLine formation</li>
                        <li>• <strong>Object</strong>: Have concerns that need addressing</li>
                        <li>• <strong>Discuss</strong>: Need more information or discussion</li>
                        <li>• <strong>Pass</strong>: Abstain from this decision</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}