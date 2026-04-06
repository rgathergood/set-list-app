'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GripVertical, MoreVertical, Trash2, ExternalLink, Music, StickyNote } from 'lucide-react'
import type { Song } from '@/lib/types'
import { formatDuration } from '@/lib/types'
import Image from 'next/image'

interface SongItemProps {
  song: Song
  onDelete: (songId: string) => void
  onOpenNotes: (song: Song) => void
  isOwner: boolean
}

export function SongItem({ song, onDelete, onOpenNotes, isOwner }: SongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled: !isOwner })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : 'hover:border-primary/30'
      }`}
    >
      {isOwner && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {song.album_art_url ? (
          <Image
            src={song.album_art_url}
            alt={song.album || song.title}
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
        <span className="min-w-[48px] text-right font-mono text-sm text-muted-foreground">
          {formatDuration(song.duration_ms)}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpenNotes(song)}>
            <StickyNote className="mr-2 h-4 w-4" />
            Notes
          </DropdownMenuItem>
          {song.spotify_uri && (
            <DropdownMenuItem asChild>
              <a
                href={`https://open.spotify.com/track/${song.spotify_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Spotify
              </a>
            </DropdownMenuItem>
          )}
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(song.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
