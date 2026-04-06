import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Music, Music2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Group, Song, Setlist } from '@/lib/types'
import { formatDuration, formatDurationLong, calculateTotalDuration } from '@/lib/types'
import { format } from 'date-fns'

interface PageProps {
  params: Promise<{ shareId: string }>
}

export default async function SharedSetlistPage({ params }: PageProps) {
  const { shareId } = await params
  const supabase = await createClient()

  const { data: setlist, error } = await supabase
    .from('setlists')
    .select(`
      *,
      groups (
        *,
        songs (*)
      ),
      profiles!setlists_user_id_fkey (
        display_name
      )
    `)
    .eq('share_id', shareId)
    .single()

  if (error || !setlist) {
    notFound()
  }

  // Sort groups and songs by position
  const sortedGroups = (setlist.groups || [])
    .sort((a: Group, b: Group) => a.position - b.position)
    .map((group: Group & { songs: Song[] }) => ({
      ...group,
      songs: (group.songs || []).sort((a: Song, b: Song) => a.position - b.position),
    }))

  const allSongs = sortedGroups.flatMap((g: Group & { songs: Song[] }) => g.songs)
  const totalSongs = allSongs.length
  const totalDuration = calculateTotalDuration(allSongs)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Music2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">SetList Builder</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Setlist Info */}
        <div className="mb-8">
          <p className="mb-2 text-sm text-muted-foreground">
            Shared by {setlist.profiles?.display_name || 'Anonymous'}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{setlist.title}</h1>
          {setlist.description && (
            <p className="mt-2 text-muted-foreground">{setlist.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
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
              {formatDurationLong(totalDuration)}
            </Badge>
          </div>
        </div>

        {/* Groups/Sets */}
        <div className="space-y-6">
          {sortedGroups.map((group: Group & { songs: Song[] }) => (
            <Card key={group.id}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {group.songs.length} song{group.songs.length !== 1 ? 's' : ''} ·{' '}
                    {formatDurationLong(calculateTotalDuration(group.songs))}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="py-0 pb-4">
                {group.songs.length > 0 ? (
                  <div className="space-y-2">
                    {group.songs.map((song: Song, index: number) => (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 rounded-lg border bg-card p-3"
                      >
                        <span className="w-6 text-center font-mono text-sm text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                          {song.album_art_url ? (
                            <Image
                              src={song.album_art_url}
                              alt={song.album || song.title}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Music className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{song.title}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {song.artist || 'Unknown Artist'}
                          </p>
                        </div>
                        <div className="hidden items-center gap-2 sm:flex">
                          {song.bpm && (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {song.bpm} BPM
                            </Badge>
                          )}
                          {song.song_key && (
                            <Badge variant="secondary" className="text-xs">
                              {song.song_key}
                            </Badge>
                          )}
                        </div>
                        <span className="min-w-[48px] text-right font-mono text-sm text-muted-foreground">
                          {formatDuration(song.duration_ms)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No songs in this set
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {sortedGroups.length === 0 && (
          <div className="rounded-xl border-2 border-dashed py-12 text-center">
            <Music className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">This setlist is empty</p>
          </div>
        )}
      </main>
    </div>
  )
}
