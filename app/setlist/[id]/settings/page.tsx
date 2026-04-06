'use client'

import { use, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Calendar, Check, Copy, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import type { Setlist } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchSetlist(id: string): Promise<Setlist> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('setlists')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) throw error
  return data
}

export default function SetlistSettingsPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: setlist, error, mutate, isLoading } = useSWR(`setlist-settings-${id}`, () => fetchSetlist(id))

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [venue, setVenue] = useState('')
  const [gigDate, setGigDate] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Initialize form when data loads
  if (setlist && !initialized) {
    setTitle(setlist.title)
    setDescription(setlist.description || '')
    setVenue(setlist.venue || '')
    setGigDate(setlist.gig_date || '')
    setIsPublic(setlist.is_public)
    setInitialized(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()
    
    await supabase
      .from('setlists')
      .update({
        title,
        description: description || null,
        venue: venue || null,
        gig_date: gigDate || null,
        is_public: isPublic,
      })
      .eq('id', id)

    mutate()
    setIsSaving(false)
  }

  const handleDelete = async () => {
    const supabase = createClient()
    await supabase.from('setlists').delete().eq('id', id)
    router.push('/dashboard')
  }

  const shareUrl = setlist ? `${window.location.origin}/share/${setlist.share_id}` : ''

  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl animate-pulse">
          <div className="mb-8 h-8 w-48 rounded bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
      </div>
    )
  }

  if (error || !setlist) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Settings not available</h1>
          <p className="mt-2 text-muted-foreground">This setlist could not be found.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/setlist/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SetList
        </Link>

        <h1 className="mb-6 text-2xl font-bold">SetList Settings</h1>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your setlist details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gig-date">Gig Date</Label>
                  <div className="relative">
                    <Input
                      id="gig-date"
                      type="date"
                      value={gigDate}
                      onChange={(e) => setGigDate(e.target.value)}
                      className="pl-9"
                    />
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Sharing */}
          <Card>
            <CardHeader>
              <CardTitle>Sharing</CardTitle>
              <CardDescription>Share your setlist with others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Link</Label>
                  <p className="text-sm text-muted-foreground">
                    Anyone with the link can view this setlist
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={(checked) => {
                    setIsPublic(checked)
                    // Auto-save this change
                    const supabase = createClient()
                    supabase.from('setlists').update({ is_public: checked }).eq('id', id)
                    mutate()
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyShareUrl}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Delete this setlist</p>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete the setlist and all its songs.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete setlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{setlist.title}&quot; and all its songs.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
