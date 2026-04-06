'use client'

import { useState } from 'react'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, MoreVertical, Pencil, Trash2, Plus } from 'lucide-react'
import { SongItem } from '@/components/song-item'
import type { Group, Song } from '@/lib/types'
import { formatDuration, calculateTotalDuration } from '@/lib/types'

interface SetlistGroupProps {
  group: Group & { songs: Song[] }
  onAddSong: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onRenameGroup: (groupId: string, name: string) => void
  onDeleteSong: (songId: string) => void
  onOpenNotes: (song: Song) => void
  onToggleCollapse: (groupId: string, collapsed: boolean) => void
  isOwner: boolean
}

export function SetlistGroup({
  group,
  onAddSong,
  onDeleteGroup,
  onRenameGroup,
  onDeleteSong,
  onOpenNotes,
  onToggleCollapse,
  isOwner,
}: SetlistGroupProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(group.name)

  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group.id}`,
    data: { type: 'group', groupId: group.id },
  })

  const totalDuration = calculateTotalDuration(group.songs)
  const songIds = group.songs.map((song) => song.id)

  const handleRename = () => {
    if (editedName.trim() && editedName !== group.name) {
      onRenameGroup(group.id, editedName.trim())
    }
    setIsEditing(false)
  }

  return (
    <Collapsible
      open={!group.is_collapsed}
      onOpenChange={(open) => onToggleCollapse(group.id, !open)}
    >
      <div
        className={`rounded-xl border bg-card transition-all ${
          isOver ? 'ring-2 ring-primary' : ''
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-left">
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${
                  group.is_collapsed ? '-rotate-90' : ''
                }`}
              />
              {isEditing ? (
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') {
                      setEditedName(group.name)
                      setIsEditing(false)
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="h-8 w-40"
                />
              ) : (
                <span className="font-semibold">{group.name}</span>
              )}
            </button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {group.songs.length} song{group.songs.length !== 1 ? 's' : ''} ·{' '}
              {formatDuration(totalDuration)}
            </span>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAddSong(group.id)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Song
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditedName(group.name)
                      setIsEditing(true)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteGroup(group.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Set
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div ref={setNodeRef} className="min-h-[60px] p-4">
            {group.songs.length > 0 ? (
              <SortableContext items={songIds} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {group.songs.map((song) => (
                    <SongItem
                      key={song.id}
                      song={song}
                      onDelete={onDeleteSong}
                      onOpenNotes={onOpenNotes}
                      isOwner={isOwner}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
                <p className="text-sm">
                  {isOwner ? 'Drag songs here or click Add Song' : 'No songs in this set'}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
