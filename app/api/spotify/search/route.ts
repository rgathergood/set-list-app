import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!

async function getSpotifyAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.access_token
  } catch {
    return null
  }
}

async function getClientCredentialsToken(): Promise<string | null> {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.access_token
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = searchParams.get('limit') || '10'

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let accessToken: string | null = null

  // Try to use user's refresh token if connected
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('spotify_refresh_token')
      .eq('id', user.id)
      .single()

    if (profile?.spotify_refresh_token) {
      accessToken = await getSpotifyAccessToken(profile.spotify_refresh_token)
    }
  }

  // Fall back to client credentials if no user token
  if (!accessToken) {
    accessToken = await getClientCredentialsToken()
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Failed to authenticate with Spotify' }, { status: 500 })
  }

  try {
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?${new URLSearchParams({
        q: query,
        type: 'track',
        limit,
      })}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!searchResponse.ok) {
      throw new Error('Spotify search failed')
    }

    const data = await searchResponse.json()
    return NextResponse.json(data.tracks)
  } catch (err) {
    console.error('Spotify search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
