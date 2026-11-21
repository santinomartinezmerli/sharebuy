import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from './lib/UserContext.jsx'
import { DarkModeProvider } from './lib/DarkModeContext'
import Landing from './pages/Landing'
import SetupProfile from './pages/SetupProfile'
import Feed from './pages/Feed'
import Explore from './pages/Explore'
import NewPost from './pages/NewPost'
import PostDetail from './pages/PostDetail'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import UserProfile from './pages/UserProfile'
import Notifications from './pages/Notifications'
import Review from './pages/Review'
import Layout from './components/Layout'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import FollowList from './pages/FollowList'
import EditPost from './pages/EditPost'
import { supabase } from './lib/supabase'

function App() {
  const { session, loading, user, userId } = useUser()
  const userEmail = user?.email
  const [needsSetup, setNeedsSetup] = useState(false)

  // Runs once per user (not on every token refresh): one query to know if the profile
  // exists and is complete; if it does not exist yet, create it.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    const checkProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('setup_complete')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled) return

      if (!profile) {
        // ignoreDuplicates = ON CONFLICT DO NOTHING: safe if two checks race.
        await supabase.from('profiles').upsert(
          { id: userId, username: userEmail?.split('@')[0] ?? 'usuario', setup_complete: false },
          { onConflict: 'id', ignoreDuplicates: true }
        )
        if (cancelled) return
        setNeedsSetup(true)
      } else {
        setNeedsSetup(!profile.setup_complete)
      }
    }

    checkProfile()
    return () => { cancelled = true }
  }, [userId, userEmail])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-green-500 text-sm">Cargando...</div>
    </div>
  )

  if (!session) return <Landing />

  return (
    <BrowserRouter>
      <DarkModeProvider>
        {needsSetup ? (
          <Routes>
            <Route path="*" element={<SetupProfile />} />
          </Routes>
        ) : (
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/feed" />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/new" element={<NewPost />} />
              <Route path="/post/:postId" element={<PostDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/review/:postId" element={<Review />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:conversationId" element={<Chat />} />
              <Route path="/user/:userId/follow" element={<FollowList />} />
              <Route path="/edit-post/:postId" element={<EditPost />} />
            </Routes>
          </Layout>
        )}
      </DarkModeProvider>
    </BrowserRouter>
  )
}

export default App
