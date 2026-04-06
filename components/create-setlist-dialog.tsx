'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CreateSetlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateSetlistDialog({ open, onOpenChange, onSuccess }: CreateSetlistDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [venue, setVenue] = useState('')
  const [gigDate, setGigDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`)
      }
      
      if (!user) {
        throw new Error('You must be logged in to create a setlist. Please sign in and try again.')
      }

      const { data: setlist, error: createError } = await supabase
        .from('setlists')
        .insert({
          title,
          description: description || null,
          venue: venue || null,
          gig_date: gigDate || null,
          user_id: user.id,
        })
        .select()
        .single()

      if (createError) {
        // Provide user-friendly error messages
        if (createError.code === '42501') {
          throw new Error('Permission denied. Please ensure you are logged in with a verified email address.')
        } else if (createError.code === '23505') {
          throw new Error('A setlist with this title already exists.')
        } else if (createError.message?.includes('row-level security')) {
          throw new Error('Permission denied. Your account may not have the required permissions. Please try logging out and back in.')
        }
        throw new Error(createError.message || 'Failed to create setlist. Please try again.')
      }

      // Create a default "Set 1" group for the new setlist
      await supabase
        .from('groups')
        .insert({
          setlist_id: setlist.id,
          name: 'Set 1',
          position: 0,
        })
      // Don't throw on group error - setlist was created, we can still navigate

      onOpenChange(false)
      resetForm()
      onSuccess?.()
      router.push(`/setlist/${setlist.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create setlist')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setVenue('')
    setGigDate('')
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New SetList</DialogTitle>
          <DialogDescription>
            Add a new setlist for your upcoming gig or rehearsal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Summer Festival 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Opening night set with all the hits..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  placeholder="The Blue Note"
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
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading ? 'Creating...' : 'Create SetList'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
