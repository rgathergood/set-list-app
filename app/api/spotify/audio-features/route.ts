import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!

async function getClientCredentialsToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('[v0] Spotify credentials not configured')
    return null
  }
  
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[v0] Spotify token error:', response.status, errorText)
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (err) {
    console.error('[v0] Spotify token fetch error:', err)
    return null
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const trackId = searchParams.get('trackId')

  if (!trackId) {
    return NextResponse.json({ error: 'Track ID required' }, { status: 400 })
  }

  const accessToken = await getClientCredentialsToken()

  if (!accessToken) {
    return NextResponse.json({ error: 'Failed to authenticate with Spotify' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    // Handle 403 - Spotify restricted Audio Features API for most apps (as of late 2024)
    // Handle 404 - track might not have audio features available
    // Both cases are expected and should not be treated as errors
    if (response.status === 403 || response.status === 404) {
      return NextResponse.json({ 
        bpm: null, 
        key: null,
      })
    }

    if (!response.ok) {
      // Return empty data instead of error to not break the UI
      return NextResponse.json({ bpm: null, key: null })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[v0] Audio features error:', err)
    // Return empty data instead of error to not break the UI
    return NextResponse.json({ bpm: null, key: null })
  }
}
