import './App.css'
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from '@clerk/react'
import ProfileForm from './components/ProfileForm'
import { OutreachForm } from './components/OutreachForm'
function App() {
  const { getToken } = useAuth()

  const testBackend = async () => {
    try {
      const token = await getToken()

      const response = await fetch('http://localhost:8000/api/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      console.log('Backend response:', data)
    } catch (error) {
      console.error('Backend error:', error)
    }
  }

  return (
    <>
      <header>
        <Show when="signed-out">
          <SignInButton />
          <SignUpButton />
        </Show>

        <Show when="signed-in">
          <UserButton />

          <button onClick={testBackend}>
            Test Backend
          </button>
          
          <ProfileForm />
          <OutreachForm />
        </Show>
      </header>
    </>
  )
}

export default App