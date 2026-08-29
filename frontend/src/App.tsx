import './App.css'
import {
  Show,
  useAuth,
} from '@clerk/react'
import { useEffect } from 'react'
import { Routes, Route } from 'react-router'
import LandingPage from './components/LandingPage'
import SignInPage from './components/SignInPage'
import SignUpPage from './components/SignUpPage'
import Dashboard from './components/Dashboard'
import AboutPage from './components/AboutPage'
import CustomCursor from './components/CustomCursor'
import SeoHead from './components/SeoHead'

function App() {
  const { isSignedIn, isLoaded, getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const syncUser = async () => {
      try {
        const token = await getToken()
        if (!token) return

        await fetch(`${import.meta.env.VITE_API_URL}/api/me`, {
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
      <CustomCursor />
      <SeoHead />
      <Routes>
        <Route
          path="/sign-in/*"
          element={<SignInPage />}
        />
        <Route
          path="/sign-up/*"
          element={<SignUpPage />}
        />
        {/* Public — must sit above the catch-all, which otherwise swallows it */}
        <Route
          path="/about"
          element={<AboutPage />}
        />
        <Route
          path="*"
          element={
            <>
              <Show when="signed-out">
                <LandingPage />
              </Show>

              <Show when="signed-in">
                <Dashboard />
              </Show>
            </>
          }
        />
      </Routes>
    </>
  )
}

export default App
