'use client'

import { use, useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SetlistGroup } from '@/components/setlist-group'
import { SongItem } from '@/components/song-item'
import { SpotifySearch } from '@/components/spotify-search'
import type { SpotifyTrack } from '@/lib/types'
import { keyNumberToString } from '@/lib/types'
import { ArrowLeft, Calendar, Clock, MapPin, Music, Plus, Search, Settings } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'
import type { Group, Song, SetlistWithDetails } from '@/lib/types'
import { formatDuration, calculateTotalDuration } from '@/lib/types'
import { format } from 'date-fns'

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchSetlist(id: string): Promise<SetlistWithDetails & { isOwner: boolean }> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: setlist, error } = await supabase
    .from('setlists')
    .select(`
      *,
      groups (
        *,
        songs (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  // Sort groups by position, then songs within each group by position
  const sortedGroups = (setlist.groups || [])
    .sort((a: Group, b: Group) => a.position - b.position)
    .map((group: Group & { songs: Song[] }) => ({
      ...group,
      songs: (group.songs || []).sort((a: Song, b: Song) => a.position - b.position),
    }))

  return {
    ...setlist,
    groups: sortedGroups,
    isOwner: user?.id === setlist.user_id,
  }
}

export default function SetlistPage({ params }: PageProps) {
  const { id } = use(params)
  const { data: setlist, error, mutate, isLoading } = useSWR(
    `setlist-${id}`,
    () => fetchSetlist(id)
  )

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeSong, setActiveSong] = useState<Song | null>(null)
  const [addSongDialogOpen, setAddSongDialogOpen] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [selectedSongForNotes, setSelectedSongForNotes] = useState<Song | null>(null)
  const [privateNotes, setPrivateNotes] = useState('')
  const [sharedNotes, setSharedNotes] = useState('')
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)

  // Manual song add form
  const [manualTitle, setManualTitle] = useState('')
  const [manualArtist, setManualArtist] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    // Find the active song across all groups
    for (const group of setlist?.groups || []) {
      const song = group.songs.find((s) => s.id === active.id)
      if (song) {
        setActiveSong(song)
        break
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Handle moving songs between groups
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setActiveSong(null)

    if (!over || !setlist) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find which group contains the active song
    let sourceGroup: (Group & { songs: Song[] }) | undefined
    let activeIndex = -1
    
    for (const group of setlist.groups) {
      const index = group.songs.findIndex((s) => s.id === activeId)
      if (index !== -1) {
        sourceGroup = group
        activeIndex = index
        break
      }
    }

    if (!sourceGroup || activeIndex === -1) return

    // Check if dropped on a group droppable
    const overGroupMatch = overId.match(/^group-(.+)$/)
    if (overGroupMatch) {
      const targetGroupId = overGroupMatch[1]
      if (sourceGroup.id !== targetGroupId) {
        // Move song to different group
        await moveSongToGroup(activeId, sourceGroup.id, targetGroupId)
      }
      return
    }

    // Find the target group and index
    let targetGroup: (Group & { songs: Song[] }) | undefined
    let overIndex = -1

    for (const group of setlist.groups) {
      const index = group.songs.findIndex((s) => s.id === overId)
      if (index !== -1) {
        targetGroup = group
        overIndex = index
        break
      }
    }

    if (!targetGroup) return

    if (sourceGroup.id === targetGroup.id) {
      // Reorder within the same group
      if (activeIndex !== overIndex) {
        const newSongs = arrayMove(sourceGroup.songs, activeIndex, overIndex)
        await updateSongPositions(newSongs, sourceGroup.id)
      }
    } else {
      // Move to different group
      await moveSongToGroup(activeId, sourceGroup.id, targetGroup.id, overIndex)
    }
  }

  const updateSongPositions = async (songs: Song[], groupId: string) => {
    const supabase = createClient()
    
    // Optimistic update
    mutate((current) => {
      if (!current) return current
      return {
        ...current,
        groups: current.groups.map((g) =>
          g.id === groupId ? { ...g, songs } : g
        ),
      }
    }, false)

    // Update database
    await Promise.all(
      songs.map((song, index) =>
        supabase.from('songs').update({ position: index }).eq('id', song.id)
      )
    )

    mutate()
  }

  const moveSongToGroup = async (
    songId: string,
    fromGroupId: string,
    toGroupId: string,
    toIndex?: number
  ) => {
    const supabase = createClient()
    
    // Update database
    await supabase
      .from('songs')
      .update({
        group_id: toGroupId,
        position: toIndex ?? 0,
      })
      .eq('id', songId)

    mutate()
  }

  const handleAddGroup = async () => {
    if (!setlist) return
    const supabase = createClient()
    
    const newPosition = setlist.groups.length
    const groupNumber = newPosition + 1
    const name = groupNumber <= 3 ? `Set ${groupNumber}` : 'Encore'

    await supabase.from('groups').insert({
      setlist_id: setlist.id,
      name,
      position: newPosition,
    })

    mutate()
  }

  const handleDeleteGroup = async (groupId: string) => {
    setGroupToDelete(groupId)
    setDeleteGroupDialogOpen(true)
  }

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return
    const supabase = createClient()
    await supabase.from('groups').delete().eq('id', groupToDelete)
    setDeleteGroupDialogOpen(false)
    setGroupToDelete(null)
    mutate()
  }

  const handleRenameGroup = async (groupId: string, name: string) => {
    const supabase = createClient()
    await supabase.from('groups').update({ name }).eq('id', groupId)
    mutate()
  }

  const handleToggleCollapse = async (groupId: string, collapsed: boolean) => {
    const supabase = createClient()
    await supabase.from('groups').update({ is_collapsed: collapsed }).eq('id', groupId)
    mutate()
  }

  const handleAddSong = (groupId: string) => {
    setActiveGroupId(groupId)
    setAddSongDialogOpen(true)
  }

  const handleDeleteSong = async (songId: string) => {
    const supabase = createClient()
    await supabase.from('songs').delete().eq('id', songId)
    mutate()
  }

  const handleOpenNotes = async (song: Song) => {
    setSelectedSongForNotes(song)
    setSharedNotes(song.shared_notes || '')
    
    // Fetch private notes
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: note } = await supabase
        .from('private_notes')
        .select('*')
        .eq('song_id', song.id)
        .eq('user_id', user.id)
        .single()
      
      setPrivateNotes(note?.content || '')
    }
    
    setNotesDialogOpen(true)
  }

  const handleSaveNotes = async () => {
    if (!selectedSongForNotes) return
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Update shared notes
    await supabase
      .from('songs')
      .update({ shared_notes: sharedNotes || null })
      .eq('id', selectedSongForNotes.id)

    // Update private notes
    if (user) {
      await supabase
        .from('private_notes')
        .upsert({
          song_id: selectedSongForNotes.id,
          user_id: user.id,
          content: privateNotes || null,
        }, { onConflict: 'song_id,user_id' })
    }

    setNotesDialogOpen(false)
    mutate()
  }

  const handleManualAddSong = async () => {
    if (!activeGroupId || !manualTitle.trim()) return
    
    const supabase = createClient()
    const group = setlist?.groups.find((g) => g.id === activeGroupId)
    const position = group?.songs.length || 0

    await supabase.from('songs').insert({
      group_id: activeGroupId,
      setlist_id: setlist?.id,
      title: manualTitle.trim(),
      artist: manualArtist.trim() || null,
      position,
    })

    setManualTitle('')
    setManualArtist('')
    setAddSongDialogOpen(false)
    mutate()
  }

  const handleSpotifyAddSong = async (
    track: SpotifyTrack,
    audioFeatures?: { tempo: number; key: number; energy: number }
  ) => {
    if (!activeGroupId) return
    
    const supabase = createClient()
    const group = setlist?.groups.find((g) => g.id === activeGroupId)
    const position = group?.songs.length || 0

    await supabase.from('songs').insert({
      group_id: activeGroupId,
      setlist_id: setlist?.id,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      duration_ms: track.duration_ms,
      bpm: audioFeatures?.tempo ? Math.round(audioFeatures.tempo) : null,
      song_key: audioFeatures?.key !== undefined ? keyNumberToString(audioFeatures.key) : null,
      energy: audioFeatures?.energy,
      spotify_id: track.id,
      spotify_uri: track.uri,
      album_art_url: track.album.images[0]?.url || null,
      preview_url: track.preview_url,
      position,
    })

    setAddSongDialogOpen(false)
    mutate()
  }

  // Calculate totals
  const allSongs = setlist?.groups.flatMap((g) => g.songs) || []
  const totalSongs = allSongs.length
  const totalDuration = calculateTotalDuration(allSongs)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="mb-8 h-8 w-48 rounded bg-muted" />
          <div className="space-y-4">
            <div className="h-32 rounded-xl bg-muted" />
            <div className="h-32 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !setlist) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">SetList not found</h1>
          <p className="mt-2 text-muted-foreground">
            This setlist doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{setlist.title}</h1>
            {setlist.description && (
              <p className="mt-1 text-muted-foreground">{setlist.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {setlist.gig_date && (
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(setlist.gig_date), 'MMMM d, yyyy')}
                </Badge>
              )}
              {setlist.venue && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {setlist.venue}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Music className="h-3 w-3" />
                {totalSongs} song{totalSongs !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(totalDuration)}
              </Badge>
            </div>
          </div>

          {setlist.isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/setlist/${setlist.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
              <Button size="sm" onClick={handleAddGroup}>
                <Plus className="mr-2 h-4 w-4" />
                Add Set
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Groups */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {setlist.groups.map((group) => (
            <SetlistGroup
              key={group.id}
              group={group}
              onAddSong={handleAddSong}
              onDeleteGroup={handleDeleteGroup}
              onRenameGroup={handleRenameGroup}
              onDeleteSong={handleDeleteSong}
              onOpenNotes={handleOpenNotes}
              onToggleCollapse={handleToggleCollapse}
              isOwner={setlist.isOwner}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId && activeSong && (
            <div className="opacity-80">
              <SongItem
                song={activeSong}
                onDelete={() => {}}
                onOpenNotes={() => {}}
                isOwner={setlist.isOwner}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {setlist.groups.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed">
          <div className="text-center">
            <p className="text-muted-foreground">No sets yet</p>
            {setlist.isOwner && (
              <Button onClick={handleAddGroup} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Set
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Add Song Dialog */}
      <Dialog open={addSongDialogOpen} onOpenChange={setAddSongDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Song</DialogTitle>
            <DialogDescription>
              Search Spotify or add a song manually.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="spotify" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="spotify">Spotify Search</TabsTrigger>
              <TabsTrigger value="manual">Add Manually</TabsTrigger>
            </TabsList>
            <TabsContent value="spotify" className="mt-4">
              <SpotifySearch onSelectTrack={handleSpotifyAddSong} />
            </TabsContent>
            <TabsContent value="manual" className="mt-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Song Title *</label>
                  <Input
                    placeholder="Enter song title"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Artist</label>
                  <Input
                    placeholder="Enter artist name"
                    value={manualArtist}
                    onChange={(e) => setManualArtist(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setAddSongDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleManualAddSong} disabled={!manualTitle.trim()}>
                    Add Song
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Song Notes</DialogTitle>
            <DialogDescription>
              {selectedSongForNotes?.title} by {selectedSongForNotes?.artist || 'Unknown'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Shared Notes</label>
              <p className="text-xs text-muted-foreground">Visible to all collaborators</p>
              <Textarea
                placeholder="Add notes visible to everyone..."
                value={sharedNotes}
                onChange={(e) => setSharedNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Private Notes</label>
              <p className="text-xs text-muted-foreground">Only visible to you</p>
              <Textarea
                placeholder="Add your personal notes..."
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={deleteGroupDialogOpen} onOpenChange={setDeleteGroupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this set and all its songs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGroup}
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
