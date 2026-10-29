# Set List App

A web app for building and sharing gig set lists. Search for songs via Spotify, drag them into order, track total running time, and share a read-only link with the band.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) with React 19
- [Supabase](https://supabase.com) for auth and data
- Spotify Web API for song search
- Tailwind CSS 4 and [shadcn/ui](https://ui.shadcn.com) components
- [dnd-kit](https://dndkit.com) for drag-and-drop ordering
- Hosted on [Vercel](https://vercel.com); every merge to `main` deploys automatically

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SPOTIFY_CLIENT_ID=
   SPOTIFY_CLIENT_SECRET=
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Optional
   SPOTIFY_REDIRECT_URI=                     # defaults to $NEXT_PUBLIC_APP_URL/api/spotify/callback
   NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=    # sign-up email redirect when developing locally
   ```

3. Set up the database by running `scripts/001_create_schema.sql` in the Supabase SQL editor.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Then open [http://localhost:3000](http://localhost:3000).

## Project structure

| Path | Purpose |
| --- | --- |
| `app/dashboard` | List of the user's set lists |
| `app/setlist/[id]` | Set list editor and settings |
| `app/share/[shareId]` | Public read-only view of a shared set list |
| `app/auth` | Login, sign-up and auth callback |
| `app/api/spotify` | Spotify auth and search routes |
| `components` | App components (`components/ui` holds the shadcn primitives) |
| `lib/supabase` | Supabase clients for browser, server and the request proxy |
| `proxy.ts` | Session refresh and route protection on every request |
| `scripts` | Database schema |
