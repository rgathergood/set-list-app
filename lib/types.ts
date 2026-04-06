export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  spotify_connected: boolean
  spotify_refresh_token: string | null
  created_at: string
  updated_at: string
}

export interface Setlist {
  id: string
  user_id: string
  title: string
  description: string | null
  gig_date: string | null
  venue: string | null
  share_id: string
  is_public: boolean
  created_at: string
  updated_at: string
  groups?: Group[]
  collaborators?: Collaborator[]
}

export interface Group {
  id: string
  setlist_id: string
  name: string
  position: number
  color: string
  is_collapsed: boolean
  created_at: string
  songs?: Song[]
}

export interface Song {
  id: string
  group_id: string
  setlist_id: string
  title: string
  artist: string | null
  album: string | null
  duration_ms: number | null
  bpm: number | null
  song_key: string | null
  energy: number | null
  spotify_id: string | null
  spotify_uri: string | null
  album_art_url: string | null
  preview_url: string | null
  position: number
  shared_notes: string | null
  created_at: string
  private_notes?: PrivateNote[]
}

export interface PrivateNote {
  id: string
  song_id: string
  user_id: string
  content: string | null
  created_at: string
  updated_at: string
}

export interface Collaborator {
  id: string
  setlist_id: string
  user_id: string
  role: 'editor' | 'viewer'
  invited_by: string | null
  created_at: string
  profile?: Profile
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string; width: number; height: number }[]
  }
  duration_ms: number
  uri: string
  preview_url: string | null
  external_urls: {
    spotify: string
  }
}

export interface SpotifyAudioFeatures {
  tempo: number
  key: number
  energy: number
  time_signature: number
}

export type SetlistWithDetails = Setlist & {
  groups: (Group & { songs: Song[] })[]
}

// Helper to convert Spotify key number to string
export const keyNumberToString = (key: number): string => {
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return keys[key] ?? 'Unknown'
}

// Format duration in ms to mm:ss
export const formatDuration = (ms: number | null): string => {
  if (!ms) return '--:--'
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Calculate total duration of songs
export const calculateTotalDuration = (songs: Song[]): number => {
  return songs.reduce((acc, song) => acc + (song.duration_ms || 0), 0)
}
