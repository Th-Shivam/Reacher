import './App.css'
import {
  Show,
  UserButton,
  useAuth,
} from '@clerk/react'
import { useEffect } from 'react'
import ProfileForm from './components/ProfileForm'
import { OutreachForm } from './components/OutreachForm'
import LandingPage from './components/LandingPage'

function App() {
  const { isSignedIn, isLoaded, getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const syncUser = async () => {
      try {
        const token = await getToken()
        if (!token) return

        await fetch('http://localhost:8000/api/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (error) {
        console.error('User sync error:', error)
      }
    }

    syncUser()
  }, [isSignedIn, isLoaded, getToken])

  return (
    <>
      <Show when="signed-out">
        <LandingPage />
      </Show>

      <Show when="signed-in">
        <header style={{ padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0b0f19' }}>
          <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.25rem' }}>
            <span>✨</span>
            <span className="logo-text">REACHER</span>
          </div>
          <UserButton />
        </header>
        <main style={{ padding: '2rem' }}>
          <ProfileForm />
          <OutreachForm />
        </main>
      </Show>
    </>
  )
}

export default App