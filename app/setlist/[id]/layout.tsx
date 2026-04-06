import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { redirect } from 'next/navigation'

export default async function SetlistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <Header profile={profile} />
      <main>{children}</main>
    </div>
  )
}
