'use client'

import { createClient } from '@/lib/supabase/client'
import { SetlistCard } from '@/components/setlist-card'
import { CreateSetlistDialog } from '@/components/create-setlist-dialog'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Music2, Plus, Search, Copy, Check } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import type { Setlist } from '@/lib/types'
import useSWR from 'swr'

type SetlistWithCount = Setlist & { song_count: number }

async function fetchSetlists(): Promise<SetlistWithCount[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('setlists')
    .select(`
      *,
      songs:songs(count)
    `)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data || []).map((setlist) => ({
    ...setlist,
    song_count: setlist.songs?.[0]?.count || 0,
  }))
}

export default function DashboardPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const { data: setlists, error, mutate, isLoading } = useSWR('setlists', fetchSetlists)

  const filteredSetlists = setlists?.filter((setlist) =>
    setlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    setlist.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    setlist.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = useCallback(async () => {
    if (!selectedSetlist) return
    
    const supabase = createClient()
    await supabase.from('setlists').delete().eq('id', selectedSetlist.id)
    
    setDeleteDialogOpen(false)
    setSelectedSetlist(null)
    mutate()
  }, [selectedSetlist, mutate])

  const handleShare = useCallback((setlist: Setlist) => {
    setSelectedSetlist(setlist)
    setShareDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((id: string) => {
    const setlist = setlists?.find((s) => s.id === id)
    if (setlist) {
      setSelectedSetlist(setlist)
      setDeleteDialogOpen(true)
    }
  }, [setlists])

  const shareUrl = selectedSetlist 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${selectedSetlist.share_id}`
    : ''

  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My SetLists</h1>
          <p className="text-muted-foreground">Manage and organize your setlists for upcoming gigs</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New SetList
        </Button>
      </div>

      {setlists && setlists.length > 0 && (
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search setlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : error ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Music2 className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>Error loading setlists</EmptyTitle>
            <EmptyDescription>
              Something went wrong. Please try refreshing the page.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filteredSetlists && filteredSetlists.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSetlists.map((setlist) => (
            <SetlistCard
              key={setlist.id}
              setlist={setlist}
              onDelete={handleDeleteClick}
              onShare={handleShare}
            />
          ))}
        </div>
      ) : setlists && setlists.length > 0 && searchQuery ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No results found</EmptyTitle>
            <EmptyDescription>
              No setlists match your search. Try a different query.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Music2 className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No setlists yet</EmptyTitle>
            <EmptyDescription>
              Create your first setlist to get started organizing your gigs.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First SetList
          </Button>
        </Empty>
      )}

      <CreateSetlistDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => mutate()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete setlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{selectedSetlist?.title}&quot; and all its songs.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share SetList</DialogTitle>
            <DialogDescription>
              Share this link with bandmates or friends to let them view your setlist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input value={shareUrl} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={copyShareUrl}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
