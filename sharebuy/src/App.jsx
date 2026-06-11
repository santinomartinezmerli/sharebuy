import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
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

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)

  const checkProfile = async (user) => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!data) {
      const username = user.email?.split('@')[0] ?? 'usuario'
      await supabase.from('profiles').insert({
        id: user.id,
        username: username,
        setup_complete: false
      })
      setNeedsSetup(true)
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('setup_complete')
        .eq('id', user.id)
        .single()
      setNeedsSetup(!profile?.setup_complete)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) checkProfile(session.user)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkProfile(session.user)
    })
  }, [])

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
