import { useState, useEffect, type FormEvent } from 'react'
import {
  Sun, Moon, Monitor, Lock, KeyRound, Shield, Database,
  Server, LogOut, Check, AlertCircle, Eye, EyeOff, User,
  Sparkles, RefreshCw, Landmark, MapPin, Phone, Calendar
} from 'lucide-react'
import { api, clearSession } from './api'
import type { User as AuthUser, UserProfile } from './types'
import { NoticeBox, PageHeading, formatDate, initials, type Notice } from './shared'

export type ThemeMode = 'light' | 'dark' | 'system'

export function getStoredTheme(): ThemeMode {
  const saved = localStorage.getItem('barangaylink_theme') as ThemeMode | null
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'light'
}

export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement
  let effective = mode
  if (mode === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  root.setAttribute('data-theme', effective)
  localStorage.setItem('barangaylink_theme', mode)
}

interface SettingsPageProps {
  user: AuthUser
  onLogout: () => void
  currentTheme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
}

export function SettingsPage({ user, onLogout, currentTheme, onThemeChange }: SettingsPageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null)

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Fetch full user profile
  const fetchProfile = async () => {
    setLoadingProfile(true)
    try {
      const res = await api.profile()
      if (res && res.data) {
        setProfile(res.data)
      }
    } catch (e) {
      // Non-fatal, fallback to session user
      console.warn('Could not fetch detailed profile:', e)
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    void fetchProfile()
  }, [])

  const handleThemeSelect = (mode: ThemeMode) => {
    onThemeChange(mode)
    applyThemeMode(mode)
    setNotice({
      kind: 'success',
      text: `Theme set to ${mode === 'system' ? 'System Default' : mode === 'dark' ? 'Dark Mode' : 'Light Mode'}.`
    })
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordNotice(null)

    if (newPassword.length < 8) {
      setPasswordNotice({ kind: 'error', text: 'New password must be at least 8 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ kind: 'error', text: 'New password and confirmation do not match.' })
      return
    }

    if (currentPassword === newPassword) {
      setPasswordNotice({ kind: 'error', text: 'New password cannot be the same as your current password.' })
      return
    }

    setSavingPassword(true)
    try {
      const res = await api.changePassword(currentPassword, newPassword)
      setPasswordNotice({ kind: 'success', text: res.message || 'Password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to change password. Please check your current password.'
      })
    } finally {
      setSavingPassword(false)
    }
  }

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user.name || user.email.split('@')[0]

  return (
    <>
      <PageHeading
        eyebrow="PREFERENCES & SECURITY"
        title="Settings"
        subtitle="Manage your interface theme, account profile, security credentials, and session."
      />

      {notice && <NoticeBox notice={notice} onDismiss={() => setNotice(null)} />}

      <div className="settings-container">
        {/* SECTION 1: THEME & DISPLAY PREFERENCES */}
        <section className="panel settings-section">
          <div className="settings-section-head">
            <div className="settings-section-icon theme-icon">
              {currentTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h2>Appearance & Theme</h2>
              <p>Choose between light and dark mode for your workspace.</p>
            </div>
          </div>

          <div className="theme-options-grid">
            {/* Light Mode */}
            <button
              type="button"
              className={`theme-card ${currentTheme === 'light' ? 'selected' : ''}`}
              onClick={() => handleThemeSelect('light')}
            >
              <div className="theme-card-preview preview-light">
                <div className="preview-header" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-line" />
                    <div className="preview-box" />
                  </div>
                </div>
              </div>
              <div className="theme-card-info">
                <div className="theme-card-title">
                  <Sun size={16} />
                  <span>Light Mode</span>
                </div>
                <small>Bright, crisp modern interface</small>
              </div>
              {currentTheme === 'light' && <span className="theme-selected-badge"><Check size={14} /> Active</span>}
            </button>

            {/* Dark Mode */}
            <button
              type="button"
              className={`theme-card ${currentTheme === 'dark' ? 'selected' : ''}`}
              onClick={() => handleThemeSelect('dark')}
            >
              <div className="theme-card-preview preview-dark">
                <div className="preview-header" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-line" />
                    <div className="preview-box" />
                  </div>
                </div>
              </div>
              <div className="theme-card-info">
                <div className="theme-card-title">
                  <Moon size={16} />
                  <span>Dark Mode</span>
                </div>
                <small>Comfortable contrast for low light</small>
              </div>
              {currentTheme === 'dark' && <span className="theme-selected-badge"><Check size={14} /> Active</span>}
            </button>

            {/* System Default */}
            <button
              type="button"
              className={`theme-card ${currentTheme === 'system' ? 'selected' : ''}`}
              onClick={() => handleThemeSelect('system')}
            >
              <div className="theme-card-preview preview-system">
                <div className="preview-header" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-line" />
                    <div className="preview-box" />
                  </div>
                </div>
              </div>
              <div className="theme-card-info">
                <div className="theme-card-title">
                  <Monitor size={16} />
                  <span>System Default</span>
                </div>
                <small>Matches your operating system</small>
              </div>
              {currentTheme === 'system' && <span className="theme-selected-badge"><Check size={14} /> Active</span>}
            </button>
          </div>
        </section>

        {/* SECTION 2: USER PROFILE & ACCOUNT OVERVIEW */}
        <section className="panel settings-section">
          <div className="settings-section-head">
            <div className="settings-section-icon profile-icon">
              <User size={20} />
            </div>
            <div>
              <h2>Account Information</h2>
              <p>Details for your authenticated BarangayLink account.</p>
            </div>
            <button
              type="button"
              className="button secondary tiny-btn"
              onClick={() => void fetchProfile()}
              title="Refresh profile details"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className="profile-card">
            <div className="profile-card-top">
              <div className="profile-avatar-large">
                {initials(displayName)}
              </div>
              <div className="profile-title-block">
                <h3>{displayName}</h3>
                <span className="profile-email">{user.email}</span>
                <div className="profile-badges">
                  <span className="role-pill">{user.role}</span>
                  <span className="status-pill status-active"><i /> Active Account</span>
                </div>
              </div>
            </div>

            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span className="detail-label">User ID</span>
                <span className="detail-value mono-text">{user.id}</span>
              </div>
              <div className="profile-detail-item">
                <span className="detail-label">Account Role</span>
                <span className="detail-value">{user.role}</span>
              </div>
              {profile?.created_at && (
                <div className="profile-detail-item">
                  <span className="detail-label"><Calendar size={13} /> Member Since</span>
                  <span className="detail-value">{formatDate(profile.created_at)}</span>
                </div>
              )}
              {profile?.purok_zone && (
                <div className="profile-detail-item">
                  <span className="detail-label"><MapPin size={13} /> Purok / Zone</span>
                  <span className="detail-value">{profile.purok_zone}</span>
                </div>
              )}
              {profile?.address_line && (
                <div className="profile-detail-item full-width">
                  <span className="detail-label">Residential Address</span>
                  <span className="detail-value">{profile.address_line}</span>
                </div>
              )}
              {profile?.contact_number && (
                <div className="profile-detail-item">
                  <span className="detail-label"><Phone size={13} /> Contact Number</span>
                  <span className="detail-value">{profile.contact_number}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 3: SECURITY & PASSWORD CHANGE */}
        <section className="panel settings-section">
          <div className="settings-section-head">
            <div className="settings-section-icon security-icon">
              <KeyRound size={20} />
            </div>
            <div>
              <h2>Security & Password</h2>
              <p>Update your password to keep your account protected.</p>
            </div>
          </div>

          {passwordNotice && <NoticeBox notice={passwordNotice} onDismiss={() => setPasswordNotice(null)} />}

          <form onSubmit={handlePasswordSubmit} className="password-form">
            <label>
              <span>Current Password</span>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShowCurrent(v => !v)}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="form-two">
              <label>
                <span>New Password</span>
                <div className="input-with-icon">
                  <Lock size={16} />
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => setShowNew(v => !v)}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label>
                <span>Confirm New Password</span>
                <div className="input-with-icon">
                  <Lock size={16} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => setShowConfirm(v => !v)}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="button primary"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? 'Updating password…' : 'Update password'}
              </button>
            </div>
          </form>
        </section>

        {/* SECTION 4: PLATFORM ARCHITECTURE & SYSTEM INFO */}
        <section className="panel settings-section">
          <div className="settings-section-head">
            <div className="settings-section-icon system-icon">
              <Server size={20} />
            </div>
            <div>
              <h2>BarangayLink Platform Info</h2>
              <p>System architecture and database engine details.</p>
            </div>
          </div>

          <div className="system-info-grid">
            <div className="system-info-card">
              <div className="info-icon green"><Database size={18} /></div>
              <div>
                <b>100% Stored Procedures</b>
                <span>PostgreSQL functions & procedures for zero inline queries</span>
              </div>
            </div>
            <div className="system-info-card">
              <div className="info-icon blue"><Shield size={18} /></div>
              <div>
                <b>Role-Based Access Control</b>
                <span>Secure JWT tokens with granular staff and resident permissions</span>
              </div>
            </div>
            <div className="system-info-card">
              <div className="info-icon purple"><Landmark size={18} /></div>
              <div>
                <b>BarangayLink Core v1.0</b>
                <span>Encode Once, Reuse Everywhere resident registry</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: ACCOUNT SESSION & SIGN OUT (MOVED LOGOUT HERE) */}
        <section className="panel settings-section logout-section">
          <div className="settings-section-head">
            <div className="settings-section-icon danger-icon">
              <LogOut size={20} />
            </div>
            <div>
              <h2>Account Session & Sign Out</h2>
              <p>Log out of your current session on this browser or computer.</p>
            </div>
          </div>

          <div className="logout-box">
            <div className="logout-meta">
              <b>Currently signed in as:</b>
              <div className="logout-user-detail">
                <span>{displayName}</span> ({user.email}) &bull; <span className="logout-role">{user.role}</span>
              </div>
              <small>Signing out terminates your current active session token.</small>
            </div>

            <button
              type="button"
              className="button danger-btn"
              onClick={() => setShowLogoutModal(true)}
            >
              <LogOut size={16} /> Sign out of BarangayLink
            </button>
          </div>
        </section>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <section className="detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">CONFIRM SIGN OUT</div>
                <h2>Sign out of your account?</h2>
              </div>
            </div>
            <p className="modal-body-text">
              Are you sure you want to log out? You will need to enter your email and password again to access your workspace.
            </p>
            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button danger-btn"
                onClick={() => {
                  setShowLogoutModal(false)
                  onLogout()
                }}
              >
                <LogOut size={16} /> Yes, sign out
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
