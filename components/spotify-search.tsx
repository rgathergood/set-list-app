'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Music, Loader2, Plus } from 'lucide-react'
import Image from 'next/image'
import type { SpotifyTrack } from '@/lib/types'
import { formatDuration } from '@/lib/types'
import { useDebounce } from '@/hooks/use-debounce'
import useSWR from 'swr'

interface SpotifySearchProps {
  onSelectTrack: (track: SpotifyTrack) => void
}

async function searchSpotify(query: string): Promise<{ items: SpotifyTrack[] }> {
  if (!query.trim()) return { items: [] }
  
  const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=10`)
  if (!response.ok) throw new Error('Search failed')
  return response.json()
}

export function SpotifySearch({ onSelectTrack }: SpotifySearchProps) {
  const [query, setQuery] = useState('')
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null)
  const debouncedQuery = useDebounce(query, 300)

  const { data, error, isLoading } = useSWR(
    debouncedQuery ? `spotify-search-${debouncedQuery}` : null,
    () => searchSpotify(debouncedQuery)
  )

  const handleSelectTrack = useCallback((track: SpotifyTrack) => {
    setAddingTrackId(track.id)
    onSelectTrack(track)
    setAddingTrackId(null)
  }, [onSelectTrack])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search Spotify for songs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="py-4 text-center text-sm text-destructive">
          Failed to search. Make sure Spotify credentials are configured.
        </div>
      )}

      {data && data.items && data.items.length > 0 && (
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {data.items.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/30"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {track.album.images[0]?.url ? (
                    <Image
                      src={track.album.images[0].url}
                      alt={track.album.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{track.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {track.artists.map((a) => a.name).join(', ')}
                  </p>
                </div>

                <span className="hidden text-sm text-muted-foreground sm:block">
                  {formatDuration(track.duration_ms)}
                </span>

                <Button
                  size="sm"
                  onClick={() => handleSelectTrack(track)}
                  disabled={addingTrackId === track.id}
                >
                  {addingTrackId === track.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {data && data.items && data.items.length === 0 && debouncedQuery && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No results found for &quot;{debouncedQuery}&quot;
        </div>
      )}

      {!debouncedQuery && !isLoading && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Start typing to search Spotify
        </div>
      )}
    </div>
  )
}
