'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, MoreVertical, Music, Share2, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import type { Setlist } from '@/lib/types'
import { format } from 'date-fns'

interface SetlistCardProps {
  setlist: Setlist & { song_count?: number }
  onDelete: (id: string) => void
  onShare: (setlist: Setlist) => void
}

export function SetlistCard({ setlist, onDelete, onShare }: SetlistCardProps) {
  const songCount = setlist.song_count || 0
  const formattedDate = setlist.gig_date 
    ? format(new Date(setlist.gig_date), 'MMM d, yyyy')
    : null

  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <Link href={`/setlist/${setlist.id}`} className="absolute inset-0 z-10" />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="line-clamp-1 text-lg font-semibold">
            {setlist.title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative z-20 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onShare(setlist)} className="cursor-pointer">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(setlist.id)}
                className="cursor-pointer text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {setlist.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {setlist.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-2">
          {formattedDate && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </Badge>
          )}
          {setlist.venue && (
            <Badge variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" />
              {setlist.venue}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t border-border pt-3">
        <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Music className="h-4 w-4" />
            <span>{songCount} song{songCount !== 1 ? 's' : ''}</span>
          </div>
          {setlist.is_public && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Public</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
