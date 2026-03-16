import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { firebaseConfig } from '../../../infrastructure/firebase.js'
import AppLayout from '../../../layouts/AppLayout.jsx'
import {
  SectionTitle,
  Card,
  Input,
  Button,
  Alert,
  Select,
} from '../../../ui/index.js'
import { createUser } from '../../auth/services/userRepository.js'
import { useToast } from '../../../context/ToastContext.jsx'

const ROLES = [
  { value: 'player', label: 'Player' },
  { value: 'editor', label: 'Editor' },
  { value: 'superadmin', label: 'Superadmin' },
]


export default function AdminUserCreatePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'player' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  function validate() {
    const e = {}
    if (!form.displayName.trim()) e.displayName = 'Display name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return }

    setSubmitting(true)
    setServerError(null)

    // Use a secondary Firebase app instance so admin stays logged in
    const secondaryApp = initializeApp(firebaseConfig, `admin-create-${Date.now()}`)
    const secondaryAuth = getAuth(secondaryApp)

    try {
      const { user } = await createUserWithEmailAndPassword(
        secondaryAuth,
        form.email.trim().toLowerCase(),
        form.password
      )

      await createUser(user.uid, {
        uid: user.uid,
        email: form.email.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        role: form.role,
      })

      await signOut(secondaryAuth)

      showToast({ title: 'User created', message: `${form.displayName.trim()} has been added.`, variant: 'success' })
      navigate('/admin/users')
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : 'Failed to create user. Please try again.'
      setServerError(msg)
    } finally {
      setSubmitting(false)
      try { await signOut(secondaryAuth) } catch { /* ignore */ }
    }
  }

  function handleChange(field, value) {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: undefined }))
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-section">
        <div className="mb-8">
          <SectionTitle title="New User" subtitle="Create a user account with a role." />
        </div>

        {serverError && <Alert variant="error" className="mb-6">{serverError}</Alert>}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Display name"
              name="displayName"
              placeholder="e.g. John Doe"
              value={form.displayName}
              onChange={e => handleChange('displayName', e.target.value)}
              error={errors.displayName}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="e.g. john@example.com"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              error={errors.email}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={e => handleChange('password', e.target.value)}
              error={errors.password}
            />
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-text-light">
                Role
              </label>
              <Select
                value={form.role}
                onChange={e => handleChange('role', e.target.value)}
                options={ROLES}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={submitting} loadingLabel="Creating...">
                Create User
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate('/admin/users')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  )
}
