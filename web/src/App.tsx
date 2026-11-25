import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, Bell, CheckCircle2, ChevronDown, ClipboardList, FileText, Home, LayoutDashboard,
  LogOut, Menu, Search, Settings, ShieldCheck, Users, UserRound, X, ArrowUpRight, RefreshCw,
  AlertCircle, Plus, Filter, Clock3, MapPin, Mail, LockKeyhole, Landmark, PanelLeftClose,
  Sun, Moon
} from 'lucide-react'
import { api, ApiError, clearSession, getSavedUser, saveSession, pingApiHealth } from './api'
import type { DashboardSummary, DocumentRequest, Resident, User } from './types'
import { EmptyState, NoticeBox, PageHeading, ageFromBirthdate, formatDate, initials, type Notice } from './shared'
import { AnnouncementsPage, HouseholdsPage, ReportsPage } from './modules'
import { SettingsPage, getStoredTheme, applyThemeMode, type ThemeMode } from './settings'

function useAuth() {
  const [user, setUser] = useState<User | null>(() => getSavedUser())
  const logout = () => { clearSession(); setUser(null) }
  return { user, setUser, logout }
}

function App() {
  const auth = useAuth()
  const [mobileNav, setMobileNav] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme())
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const checkHealth = async () => setApiOnline(await pingApiHealth())
    void checkHealth()
    const interval = window.setInterval(checkHealth, 15000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let alive = true
    const checkNotices = async () => {
      try {
        const r = await api.announcements()
        const newest = (r.data || []).reduce((v, a) => Math.max(v, new Date(a.created_at).getTime() || 0), 0)
        const seen = Number(localStorage.getItem('barangaylink_seen_announcement') || 0)
        if (alive) setHasNewAnnouncements(newest > seen)
      } catch { /* announcement indicator is non-blocking */ }
    }
    if (auth.user) void checkNotices()
    return () => { alive = false }
  }, [auth.user?.id, location.pathname])

  useEffect(() => {
    const handleExpired = () => auth.setUser(null)
    window.addEventListener('barangaylink:session-expired', handleExpired)
    return () => window.removeEventListener('barangaylink:session-expired', handleExpired)
  }, [auth.setUser])

  useEffect(() => {
    applyThemeMode(theme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => {
      if (getStoredTheme() === 'system') applyThemeMode('system')
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [theme])

  const toggleTheme = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const next: ThemeMode = isDark ? 'light' : 'dark'
    setTheme(next)
    applyThemeMode(next)
  }

  useEffect(() => setMobileNav(false), [location.pathname])
  if (!auth.user) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<LoginPage onLogin={(u) => auth.setUser(u)} />} />
      </Routes>
    )
  }

  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || theme === 'dark'

  return (
    <div className="app-shell">
      <Sidebar role={auth.user.role} mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />
      <div className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="crumb">
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>{pageTitle(location.pathname)}</strong>
          </div>
          <div className="top-actions">
            <span className={`local-status ${apiOnline === null ? 'checking' : apiOnline ? '' : 'offline'}`} title={apiOnline === null ? 'Checking API connection' : apiOnline ? 'API reachable' : 'API unreachable'}><i /> {apiOnline === null ? 'Checking API' : apiOnline ? 'API Online' : 'API Offline'}</span>
            <button
              className="icon-button theme-toggle-btn"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className={`icon-button notice-bell ${hasNewAnnouncements ? 'has-unread' : ''}`} title={hasNewAnnouncements ? "New announcement available" : "Open Announcements"} aria-label="Open Announcements" onClick={() => { localStorage.setItem('barangaylink_seen_announcement', String(Date.now())); setHasNewAnnouncements(false); navigate('/announcements') }}>
              <Bell size={18} />{hasNewAnnouncements && <i className="notice-bell-dot" />}
            </button>
            {/* Moved logout to Settings: Profile chip links directly to Settings */}
            <NavLink to="/settings" className="profile-chip profile-link" title="Open Settings & Account">
              <div className="avatar">{initials(auth.user.name || auth.user.email)}</div>
              <div className="profile-meta">
                <b>{auth.user.name || auth.user.email.split('@')[0]}</b>
                <span>{auth.user.role}</span>
              </div>
              <span className="profile-chip-settings" title="Settings">
                <Settings size={15} />
              </span>
            </NavLink>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<DashboardPage user={auth.user} />} />
            <Route path="/residents" element={<ResidentsPage role={auth.user.role} />} />
            <Route path="/requests" element={<RequestsPage user={auth.user} />} />
            <Route path="/households" element={auth.user.role === 'Resident' ? <Navigate to="/" replace /> : <HouseholdsPage />} />
            <Route path="/announcements" element={<AnnouncementsPage role={auth.user.role} />} />
            <Route path="/reports" element={auth.user.role === 'Resident' ? <Navigate to="/" replace /> : <ReportsPage />} />
            <Route path="/admin" element={auth.user.role !== 'Administrator' ? <Navigate to="/" replace /> : <AdminConsolePage />} />
            <Route path="/settings" element={<SettingsPage user={auth.user} onLogout={auth.logout} currentTheme={theme} onThemeChange={setTheme} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="footer">
          <span>© {new Date().getFullYear()} BarangayLink</span>
          <span>Encode Once, Reuse Everywhere <span className="footer-dot">•</span> Local development</span>
        </footer>
      </div>
    </div>
  )
}

function AdminConsolePage() {
  const [tab,setTab]=useState<'users'|'audit'>('users'); const [users,setUsers]=useState<Array<{id:string;email:string;role:string;is_active:boolean;created_at:string}>>([]); const [logs,setLogs]=useState<Array<{id:string;table_name:string;record_id:string;action:string;performed_by:string;timestamp:string;old_data:unknown;new_data:unknown}>>([]); const [notice,setNotice]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [role,setRole]=useState('Barangay Staff');
  const load=async()=>{try{if(tab==='users')setUsers((await api.adminUsers()).data);else setLogs((await api.auditLogs()).data)}catch(e){setNotice(e instanceof Error?e.message:'Could not load administration data.')}}
  useEffect(()=>{void load()},[tab]);
  const create=async(e:FormEvent)=>{e.preventDefault();try{await api.createAdminUser(email,password,role);setEmail('');setPassword('');setNotice('Account created.');void load()}catch(e){setNotice(e instanceof Error?e.message:'Could not create account.')}}
  return <><PageHeading eyebrow="ADMINISTRATION" title="Users & audit history" subtitle="Manage staff access and review recorded database changes."/><div className="panel-tools"><button className={`button ${tab==='users'?'primary':'secondary'}`} onClick={()=>setTab('users')}>User accounts</button><button className={`button ${tab==='audit'?'primary':'secondary'}`} onClick={()=>setTab('audit')}>Audit log</button></div>{notice&&<p role="status">{notice}</p>}{tab==='users'?<><section className="panel request-form-panel"><h2>Create staff account</h2><form className="request-form" onSubmit={create}><div className="form-two"><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Temporary password (8+ characters)<input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value)}><option>Barangay Staff</option><option>Administrator</option></select></label></div><button className="button primary">Create account</button></form></section><section className="panel list-panel"><div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Access</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.email}</td><td><select value={u.role} onChange={async e=>{try{await api.updateAdminUser(u.id,e.target.value,u.is_active);void load()}catch(err){setNotice(err instanceof Error?err.message:'Update failed')}}}><option>Resident</option><option>Barangay Staff</option><option>Administrator</option></select></td><td>{u.is_active?'Active':'Inactive'}</td><td><button className="button secondary" onClick={async()=>{try{await api.updateAdminUser(u.id,u.role,!u.is_active);void load()}catch(err){setNotice(err instanceof Error?err.message:'Update failed')}}}>{u.is_active?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table></div></section></>:<section className="panel list-panel"><div className="table-wrap"><table><thead><tr><th>Time</th><th>Table</th><th>Action</th><th>Record ID</th><th>Performed by</th></tr></thead><tbody>{logs.map(l=><tr key={l.id}><td>{formatDate(l.timestamp)}</td><td>{l.table_name}</td><td>{l.action}</td><td className="tracking">{l.record_id}</td><td>{l.performed_by||'System'}</td></tr>)}</tbody></table></div></section>}</>
}

function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function pageTitle(path: string) {
  const map: Record<string, string> = {
    '/': 'Dashboard',
    '/residents': 'Residents',
    '/requests': 'Document requests',
    '/households': 'Households',
    '/announcements': 'Announcements',
    '/reports': 'Reports',
    '/admin': 'Administration',
    '/settings': 'Settings'
  }
  return map[path] || 'Dashboard'
}

function Sidebar({ role, mobileOpen, onClose }: { role: string; mobileOpen: boolean; onClose: () => void }) {
  const admin = role === 'Administrator' || role === 'Barangay Staff'
  return (
    <>
      {mobileOpen && <button className="mobile-overlay" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Landmark size={22} />
          </div>
          <div>
            <strong>Barangay<span>Link</span></strong>
            <small>COMMUNITY PORTAL</small>
          </div>
          <button className="icon-button sidebar-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">MAIN MENU</div>
        <nav className="nav-list">
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          {admin && <NavItem to="/residents" icon={<Users size={18} />} label="Residents" />}
          {role === 'Resident' && <NavItem to="/requests" icon={<ClipboardList size={18} />} label="My requests" />}
          {admin && <NavItem to="/requests" icon={<FileText size={18} />} label="Document requests" />}
          {admin && <NavItem to="/households" icon={<Home size={18} />} label="Households" />}
          <NavItem to="/announcements" icon={<Bell size={18} />} label="Announcements" />
          {admin && <NavItem to="/reports" icon={<Activity size={18} />} label="Reports & analytics" />}
          {role === 'Administrator' && <NavItem to="/admin" icon={<ShieldCheck size={18} />} label="Users & audit log" />}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><ShieldCheck size={17} /></div>
            <b>Community first.</b>
            <p>One trusted place for local records and services.</p>
            <span className="secure-line"><i /> Role-based workspace</span>
          </div>
          <NavItem to="/settings" icon={<Settings size={18} />} label="Settings" />
          <div className="version">BARANGAYLINK <span>v1.0 MVP</span></div>
        </div>
      </aside>
    </>
  )
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {to === '/requests' && <span className="nav-arrow"><ArrowUpRight size={14} /></span>}
    </NavLink>
  )
}

function DashboardPage({ user }: { user: User }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isStaff = user.role !== 'Resident'

  const refresh = async () => {
    setLoading(true)
    setError('')
    const tasks: Promise<unknown>[] = [api.requests().then(r => setRequests(r.data || []))]
    if (isStaff) tasks.push(api.dashboard().then(r => setSummary(r.data)))
    const results = await Promise.allSettled(tasks)
    const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
    if (rejected) setError(rejected.reason instanceof Error ? rejected.reason.message : 'Could not load dashboard data.')
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [user.role])

  const pending = requests.filter(r => r.status === 'Pending').length
  const totalResidents = valueFrom(summary, ['total_residents', 'residents_count', 'resident_count'])
  const totalHouseholds = valueFrom(summary, ['total_households', 'households_count', 'household_count'])

  const statCards = isStaff ? [
    { label: 'Registered residents', value: totalResidents, desc: 'Central resident records', icon: <Users />, tone: 'blue' },
    { label: 'Households', value: totalHouseholds, desc: 'Linked household profiles', icon: <Home />, tone: 'violet' },
    { label: 'Pending requests', value: valueFrom(summary, ['pending_requests', 'pending_requests_count']) ?? pending, desc: 'Awaiting staff review', icon: <Clock3 />, tone: 'amber' }
  ] : [
    { label: 'My document requests', value: requests.length, desc: 'All requests submitted', icon: <FileText />, tone: 'blue' },
    { label: 'Pending requests', value: pending, desc: 'Waiting for review', icon: <Clock3 />, tone: 'amber' },
    { label: 'Ready for release', value: requests.filter(r => r.status === 'Ready for Release').length, desc: 'Visit the barangay office', icon: <CheckCircle2 />, tone: 'green' }
  ]

  return (
    <>
      <PageHeading
        eyebrow="OVERVIEW"
        title={`Good day${user.name ? `, ${user.name.split(' ')[0]}` : ''}.`}
        subtitle={isStaff ? 'Here is the latest overview of your barangay workspace.' : 'Welcome to your community service portal.'}
        action={<button className="button secondary" onClick={() => void refresh()}><RefreshCw size={16} /> Refresh data</button>}
      />
      {error && <NoticeBox notice={{ kind: 'error', text: error }} onDismiss={() => setError('')} />}
      <div className="welcome-banner">
        <div className="banner-copy">
          <div className="banner-pill"><span /> BARANGAYLINK WORKSPACE</div>
          <h2>Better records. <em>Better service.</em></h2>
          <p>{isStaff ? 'Manage essential community records and document requests from one organized workspace.' : 'Request barangay documents and track the progress without losing your tracking number.'}</p>
        </div>
        <div className="banner-art">
          <div className="art-circle circle-one" />
          <div className="art-circle circle-two" />
          <div className="art-building"><Landmark size={66} strokeWidth={1.25} /></div>
          <div className="art-card"><CheckCircle2 size={15} /> Community connected</div>
        </div>
      </div>
      <div className="section-head">
        <div>
          <h2>Workspace snapshot</h2>
          <p>Live information from the connected API</p>
        </div>
        <span className="live-label"><i /> {loading ? 'Syncing…' : 'API connected when data loads'}</span>
      </div>
      <div className="stats-grid">
        {statCards.map((s, i) => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{loading ? '—' : s.value ?? '—'}</div>
            <div className="stat-foot">{s.desc}</div>
            <div className="stat-spark">
              <span style={{ height: `${38 + i * 13}%` }} />
              <span style={{ height: `${52 + i * 8}%` }} />
              <span style={{ height: `${42 + i * 11}%` }} />
              <span style={{ height: `${72 - i * 5}%` }} />
              <span style={{ height: `${61 + i * 4}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="content-grid">
        <section className="panel requests-panel">
          <div className="panel-head">
            <div>
              <h2>{isStaff ? 'Recent document requests' : 'My recent requests'}</h2>
              <p>{isStaff ? 'Review the latest submissions from residents.' : 'Check the latest status of your requests.'}</p>
            </div>
            <NavLink className="text-link" to="/requests">View all <ArrowUpRight size={15} /></NavLink>
          </div>
          {loading ? (
            <div className="loading-state"><span className="spinner" />Loading requests…</div>
          ) : requests.length === 0 ? (
            <EmptyState title="No document requests yet" text={user.role === 'Resident' ? 'Submit a request when you need a barangay document.' : 'New requests will appear here when residents submit them.'} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tracking number</th>
                    {isStaff && <th>Resident</th>}
                    <th>Document</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 5).map(r => (
                    <tr key={r.id}>
                      <td><b className="tracking">{r.tracking_number}</b></td>
                      {isStaff && <td>{r.first_name} {r.last_name}</td>}
                      <td>{r.document_type}</td>
                      <td><StatusPill status={r.status} /></td>
                      <td>{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel quick-panel">
          <div className="panel-head">
            <div>
              <h2>Quick access</h2>
              <p>Common workspace actions</p>
            </div>
          </div>
          <div className="quick-links">
            {isStaff && (
              <NavLink to="/residents" className="quick-link">
                <div className="quick-icon blue"><Users size={18} /></div>
                <div><b>Resident records</b><span>Search and review profiles</span></div>
                <ArrowUpRight size={16} />
              </NavLink>
            )}
            <NavLink to="/requests" className="quick-link">
              <div className="quick-icon purple"><ClipboardList size={18} /></div>
              <div><b>{isStaff ? 'Process requests' : 'Request a document'}</b><span>{isStaff ? 'Review and update request status' : 'Submit and track documents'}</span></div>
              <ArrowUpRight size={16} />
            </NavLink>
            <NavLink to="/announcements" className="quick-link">
              <div className="quick-icon orange"><Bell size={18} /></div>
              <div><b>Announcements</b><span>Community notices and updates</span></div>
              <ArrowUpRight size={16} />
            </NavLink>
            {isStaff && (
              <NavLink to="/households" className="quick-link">
                <div className="quick-icon green"><Home size={18} /></div>
                <div><b>Households</b><span>Household records and members</span></div>
                <ArrowUpRight size={16} />
              </NavLink>
            )}
          </div>
          <div className="tip-box">
            <div><ShieldCheck size={17} /></div>
            <p><b>Keep records accurate</b><br />BarangayLink follows “Encode Once, Reuse Everywhere” to reduce repeated data entry.</p>
          </div>
        </section>
      </div>
    </>
  )
}

function valueFrom(data: DashboardSummary | null, keys: string[]): number | undefined {
  if (!data) return undefined
  for (const key of keys) {
    const v = data[key]
    if (typeof v === 'number') return v
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  }
  return undefined
}

function ResidentsPage({ role }: { role: string }) {
  const [residents, setResidents] = useState<Resident[]>([])
  const [search, setSearch] = useState('')
  const [purok, setPurok] = useState('')
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [selected, setSelected] = useState<Resident | null>(null)
  const [reload, setReload] = useState(0)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [editor, setEditor] = useState<Resident | null | 'new'>(null)

  const load = async () => {
    setLoading(true)
    setNotice(null)
    try {
      const p = new URLSearchParams()
      if (search.trim()) p.set('search', search.trim())
      if (purok) p.set('purok_zone', purok)
      if (status && status !== 'all') p.set('status', status)
      p.set('page', String(page)); p.set('limit', '20')
      const r = await api.residents(p)
      setResidents(r.data || []); setTotal(r.pagination?.total ?? (r.data || []).length); setTotalPages(r.pagination?.totalPages ?? 1)
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load residents.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [reload, page])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setPage(1); setReload(v => v + 1)
  }

  return (
    <>
      <PageHeading
        eyebrow="RECORDS"
        title="Resident management"
        subtitle="Create, update, archive, and review resident profiles in the central barangay database."
        action={<><button className="button primary" onClick={() => setEditor('new')}><Plus size={16}/> Add resident</button><button className="button secondary" onClick={() => { setSearch(''); setPurok(''); setStatus('active'); setPage(1); setReload(v => v + 1) }}><RefreshCw size={16} /> Reset filters</button></>}
      />
      {notice && <NoticeBox notice={notice} onDismiss={() => setNotice(null)} />}
      <div className="resident-summary">
        <div>
          <span className="summary-icon"><Users size={20} /></span>
          <div><b>{loading ? '…' : total.toLocaleString()}</b><span>Matching resident records</span></div>
        </div>
        <span className="read-only-note"><ShieldCheck size={15} /> Staff record management</span>
      </div>
      <section className="panel list-panel">
        <form className="filter-bar" onSubmit={submit}>
          <label className="search-box">
            <Search size={17} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search full name or part of a name…" />
          </label>
          <label className="select-wrap">
            <MapPin size={16} />
            <input value={purok} onChange={e => setPurok(e.target.value)} placeholder="Purok / zone" />
          </label>
          <label className="select-wrap">
            <Filter size={16} />
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Active residents</option>
              <option value="archived">Archived residents</option>
              <option value="all">All records</option>
            </select>
          </label>
          <button className="button primary" type="submit"><Search size={16} /> Search</button>
        </form>
        {loading ? (
          <div className="loading-state"><span className="spinner" />Loading resident records…</div>
        ) : residents.length === 0 ? (
          <EmptyState title="No residents found" text="Try another name, purok, or status filter." />
        ) : (
          <div className="table-wrap">
            <table className="resident-table">
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Age / Gender</th>
                  <th>Purok / Zone</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {residents.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="person-cell">
                        <div className="person-avatar">{initials(`${r.first_name} ${r.last_name}`)}</div>
                        <div>
                          <b>{r.first_name} {r.middle_name ? `${r.middle_name} ` : ''}{r.last_name} {r.suffix || ''}</b>
                          <span>{r.address_line}</span>
                        </div>
                      </div>
                    </td>
                    <td>{r.age ?? ageFromBirthdate(r.birthdate)} <span className="muted">/ {r.gender || '—'}</span></td>
                    <td><span className="zone-tag">{r.purok_zone}</span></td>
                    <td>{r.contact_number || '—'}</td>
                    <td><StatusPill status={r.is_archived ? 'Archived' : 'Active'} /></td>
                    <td><button className="table-action" onClick={() => setSelected(r)}>Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-foot">
          <span>Showing {total === 0 ? 0 : (page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} records</span>
          <span className="pagination-actions"><button className="button secondary" disabled={page <= 1 || loading} onClick={() => setPage(v => v - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button className="button secondary" disabled={page >= totalPages || loading} onClick={() => setPage(v => v + 1)}>Next</button></span>
        </div>
      </section>
      {editor && <ResidentEditorModal resident={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setSelected(null); setReload(v => v + 1) }} />}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">RESIDENT PROFILE</div>
                <h2>{selected.first_name} {selected.last_name}</h2>
              </div>
              <div className="panel-tools"><button className="button secondary" onClick={() => { setEditor(selected); setSelected(null) }}>Edit</button><button className="button secondary" onClick={async () => { const archived = !selected.is_archived; if (!window.confirm(`${archived ? 'Archive' : 'Restore'} this resident?`)) return; try { await api.archiveResident(selected.id, archived); setSelected(null); setReload(v => v + 1) } catch(e) { setNotice({kind:'error',text:e instanceof Error ? e.message : 'Could not update resident.'}) } }}> {selected.is_archived ? 'Restore' : 'Archive'} </button><button className="icon-button" onClick={() => setSelected(null)}><X size={18} /></button></div>
            </div>
            <div className="detail-grid">
              {[
                ['Full name', [selected.first_name, selected.middle_name, selected.last_name, selected.suffix].filter(Boolean).join(' ')],
                ['Birthdate', formatDate(selected.birthdate)],
                ['Age', String(selected.age ?? ageFromBirthdate(selected.birthdate))],
                ['Gender', selected.gender || 'Not provided'],
                ['Civil status', selected.civil_status || 'Not provided'],
                ['Purok / zone', selected.purok_zone],
                ['Address', selected.address_line],
                ['Contact', selected.contact_number || 'Not provided']
              ].map(([k, v]) => (
                <div className="detail-field" key={k}>
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
            <div className="modal-note"><LockKeyhole size={16} /> Personal data is visible only to authorized staff accounts.</div>
          </section>
        </div>
      )}
    </>
  )
}

function ResidentEditorModal({ resident, onClose, onSaved }: { resident: Resident | null; onClose:()=>void; onSaved:()=>void }) {
  const [form,setForm] = useState({first_name:resident?.first_name||'',middle_name:resident?.middle_name||'',last_name:resident?.last_name||'',suffix:resident?.suffix||'',birthdate:resident?.birthdate?.slice(0,10)||'',gender:resident?.gender||'',civil_status:resident?.civil_status||'Single',purok_zone:resident?.purok_zone||'',address_line:resident?.address_line||'',contact_number:resident?.contact_number||''})
  const [saving,setSaving]=useState(false); const [error,setError]=useState('')
  const titleCase=(v:string)=>v.trim().toLowerCase().replace(/\b([\p{L}])/gu,m=>m.toUpperCase()).replace(/\s+/g,' ')
  const normalizePurok=(v:string)=>{const m=v.trim().match(/^(purok|zone)\s*(\d+)$/i);return m?`${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}`:v.trim().replace(/\s+/g,' ')}
  const today=localToday()
  const change=(key:string,value:string)=>setForm(v=>({...v,[key]:key==='purok_zone'?normalizePurok(value):value}))
  const submit=async(e:FormEvent)=>{e.preventDefault();setError('');if(!form.birthdate||form.birthdate>today){setError('Birthdate cannot be in the future. Please enter a valid birthdate.');return}const payload={...form,first_name:titleCase(form.first_name),middle_name:titleCase(form.middle_name),last_name:titleCase(form.last_name),suffix:form.suffix.trim().toUpperCase(),purok_zone:normalizePurok(form.purok_zone),address_line:titleCase(form.address_line)};setSaving(true);try{if(resident) await api.updateResident(resident.id,payload as Partial<Resident>); else await api.createResident(payload as Partial<Resident>);onSaved()}catch(err){setError(err instanceof Error?err.message:'Could not save resident.')}finally{setSaving(false)}}
  return <div className="modal-backdrop" onClick={onClose}><section className="detail-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">RESIDENT RECORD</div><h2>{resident?'Edit resident':'Add resident'}</h2></div><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{error&&<p className="form-error">{error}</p>}<form className="request-form" onSubmit={submit}><div className="form-grid"><label>First name<input required value={form.first_name} onChange={e=>change('first_name',e.target.value)}/></label><label>Middle name<input value={form.middle_name} onChange={e=>change('middle_name',e.target.value)}/></label><label>Last name<input required value={form.last_name} onChange={e=>change('last_name',e.target.value)}/></label><label>Suffix<input value={form.suffix} onChange={e=>change('suffix',e.target.value)}/></label><label>Birthdate<input type="date" required max={today} value={form.birthdate} onChange={e=>change('birthdate',e.target.value)}/></label><label>Gender<select value={form.gender} onChange={e=>change('gender',e.target.value)}><option value="">Not specified</option><option>Male</option><option>Female</option><option>Other</option></select></label><label>Civil status<select value={form.civil_status} onChange={e=>change('civil_status',e.target.value)}>{['Single','Married','Widowed','Divorced','Separated'].map(x=><option key={x}>{x}</option>)}</select></label><label>Purok / zone<input required value={form.purok_zone} onChange={e=>change('purok_zone',e.target.value)}/></label><label>Address<input required value={form.address_line} onChange={e=>change('address_line',e.target.value)}/></label><label>Contact number<input value={form.contact_number} onChange={e=>change('contact_number',e.target.value)}/></label></div><div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving?'Saving…':'Save resident'}</button></div></form></section></div>
}

function RequestsPage({ user }: { user: User }) {
  const [items, setItems] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [documentType, setDocumentType] = useState('Barangay Clearance')
  const [purpose, setPurpose] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [pendingUpdate, setPendingUpdate] = useState<{id:string;status:string;existingRemarks:string}|null>(null)
  const [remarks,setRemarks] = useState('')
  const staff = user.role !== 'Resident'

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await api.requests()
      setItems(r.data || [])
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load requests.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      await api.createRequest(documentType, purpose.trim())
      setPurpose('')
      setShowForm(false)
      setNotice({ kind: 'success', text: 'Your document request was submitted.' })
      await refresh()
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not submit request.' })
    } finally {
      setSaving(false)
    }
  }

  const update = async () => {
    if (!pendingUpdate) return
    try {
      await api.updateRequestStatus(pendingUpdate.id, pendingUpdate.status, remarks)
      setNotice({ kind: 'success', text: `Request status updated to ${pendingUpdate.status}.` })
      setPendingUpdate(null); setRemarks(''); await refresh()
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not update request.' })
    }
  }

  const filtered = useMemo(
    () => items.filter(i => statusFilter === 'All statuses' || i.status === statusFilter),
    [items, statusFilter]
  )

  return (
    <>
      <PageHeading
        eyebrow="SERVICE DESK"
        title={staff ? 'Document requests' : 'My document requests'}
        subtitle={staff ? 'Review resident submissions and keep request statuses up to date.' : 'Submit a document request and follow its status from one place.'}
        action={!staff && <button className="button primary" onClick={() => setShowForm(v => !v)}><Plus size={17} /> New request</button>}
      />
      {notice && <NoticeBox notice={notice} onDismiss={() => setNotice(null)} />}
      {showForm && (
        <section className="panel request-form-panel">
          <div className="panel-head">
            <div>
              <h2>Submit a document request</h2>
              <p>Your account must have a linked resident profile.</p>
            </div>
            <button className="icon-button" onClick={() => setShowForm(false)}><X size={17} /></button>
          </div>
          <form onSubmit={submit} className="request-form">
            <label>
              Document type
              <select value={documentType} onChange={e => setDocumentType(e.target.value)}>
                <option>Barangay Clearance</option>
                <option>Certificate of Residency</option>
                <option>Certificate of Indigency</option>
                <option>Barangay Certificate</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Purpose
              <textarea value={purpose} onChange={e => setPurpose(e.target.value)} required minLength={3} rows={3} placeholder="Explain why you need this document…" />
            </label>
            <div className="form-actions">
              <button className="button secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="button primary" disabled={saving} type="submit">{saving ? 'Submitting…' : 'Submit request'}</button>
            </div>
          </form>
        </section>
      )}
      <div className="request-kpis">
        <div className="mini-kpi"><span>Total requests</span><b>{items.length}</b></div>
        <div className="mini-kpi"><span>Pending</span><b>{items.filter(i => i.status === 'Pending').length}</b></div>
        <div className="mini-kpi"><span>Approved</span><b>{items.filter(i => i.status === 'Approved').length}</b></div>
        <div className="mini-kpi"><span>Released</span><b>{items.filter(i => i.status === 'Released').length}</b></div>
      </div>
      <section className="panel list-panel">
        <div className="panel-head">
          <div>
            <h2>{staff ? 'All submissions' : 'Request history'}</h2>
            <p>Track numbers are generated by the backend.</p>
          </div>
          <div className="panel-tools">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>All statuses</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Ready for Release</option>
              <option>Released</option>
            </select>
            <button className="icon-button" title="Refresh" onClick={() => void refresh()}><RefreshCw size={17} /></button>
          </div>
        </div>
        {loading ? (
          <div className="loading-state"><span className="spinner" />Loading requests…</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No matching requests" text={staff ? 'New resident submissions will appear here.' : 'Use “New request” to submit your first document request.'} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tracking number</th>
                  {staff && <th>Resident</th>}
                  <th>Document type</th>
                  <th>Purpose</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  {staff && <th>Update</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><b className="tracking">{r.tracking_number}</b></td>
                    {staff && <td><b>{r.first_name} {r.last_name}</b><span className="table-sub">{r.purok_zone}</span></td>}
                    <td>{r.document_type}</td>
                    <td className="purpose-cell">{r.purpose}</td>
                    <td>{formatDate(r.created_at)}</td>
                    <td><StatusPill status={r.status} />{r.remarks && <span className="table-sub">{r.remarks}</span>}</td>
                    {staff && (
                      <td>
                        <select
                          className="status-select"
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value) { setPendingUpdate({id:r.id,status:e.target.value,existingRemarks:r.remarks || ''}); setRemarks(r.remarks || ''); e.target.value = '' }
                          }}
                        >
                          <option value="" disabled>Change…</option>
                          {(({Pending:['Approved','Rejected'],Approved:['Ready for Release','Released','Rejected'],'Ready for Release':['Released','Rejected']} as Record<string,string[]>)[r.status] || [])
                            .map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-foot">
          <span>{filtered.length} request{filtered.length === 1 ? '' : 's'}</span>
          <span>Keep your tracking number for follow-up.</span>
        </div>
      </section>
      {pendingUpdate && <div className="modal-backdrop" onClick={()=>setPendingUpdate(null)}><section className="detail-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">REQUEST STATUS</div><h2>Move to {pendingUpdate.status}</h2></div><button className="icon-button" onClick={()=>setPendingUpdate(null)}><X size={18}/></button></div><form className="request-form" onSubmit={e=>{e.preventDefault();void update()}}>{(pendingUpdate.existingRemarks.trim() || pendingUpdate.status==='Rejected') && <label>Remarks {pendingUpdate.status==='Rejected'?'(required reason)':'(edit existing note)'}<textarea rows={3} value={remarks} required={pendingUpdate.status==='Rejected'} onChange={e=>setRemarks(e.target.value)} placeholder={pendingUpdate.status==='Rejected'?'Explain why this request is rejected…':'Update the existing note…'}/></label>}<div className="form-actions"><button type="button" className="button secondary" onClick={()=>setPendingUpdate(null)}>Cancel</button><button className="button primary">Confirm status</button></div></form></section></div>}
    </>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls = status.toLowerCase().replaceAll(' ', '-')
  return <span className={`status-pill status-${cls}`}><i />{status}</span>
}

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await api.login(email.trim(), password)
      saveSession(result.token, result.user)
      onLogin(result.user)
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-visual">
        <div className="auth-brand">
          <div className="brand-mark"><Landmark size={22} /></div>
          <strong>Barangay<span>Link</span></strong>
        </div>
        <div className="auth-visual-content">
          <span className="banner-pill"><span /> COMMUNITY MANAGEMENT PLATFORM</span>
          <h1>Closer communities.<br /><em>Better services.</em></h1>
          <p>A simpler way to organize resident records, follow document requests, and keep your community connected.</p>
          <div className="visual-feature">
            <div><Users size={18} /></div>
            <span><b>One central record</b><small>Resident and household information, organized.</small></span>
          </div>
          <div className="visual-feature">
            <div><FileText size={18} /></div>
            <span><b>Clear request tracking</b><small>Know what is pending, approved, or released.</small></span>
          </div>
          <div className="visual-feature">
            <div><ShieldCheck size={18} /></div>
            <span><b>Role-based access</b><small>Tools shaped around your responsibilities.</small></span>
          </div>
        </div>
        <div className="auth-visual-footer">BUILT FOR THE COMMUNITY <span>•</span> LOCAL DEVELOPMENT</div>
        <div className="auth-decoration deco-a" />
        <div className="auth-decoration deco-b" />
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="mobile-auth-brand">
            <div className="brand-mark"><Landmark size={21} /></div>
            <strong>Barangay<span>Link</span></strong>
          </div>
          <div className="form-eyebrow">WELCOME BACK</div>
          <h2>Sign in to your workspace</h2>
          <p className="auth-subtitle">Enter your account details to continue.</p>
          {error && <NoticeBox notice={{ kind: 'error', text: error }} onDismiss={() => setError('')} />}
          <form className="auth-form" onSubmit={submit}>
            <label>
              Email address
              <span className="input-with-icon">
                <Mail size={17} />
                <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@barangaylink.gov" />
              </span>
            </label>
            <label>
              Password
              <span className="input-with-icon">
                <LockKeyhole size={17} />
                <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
                <button type="button" className="show-password" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
            <div className="auth-options"><span><ShieldCheck size={14} /> Secure JWT authentication</span></div>
            <button className="button primary auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'} <ArrowUpRight size={17} />
            </button>
          </form>
          <div className="auth-divider"><span /> or <span /></div>
          <p className="register-prompt">New resident? <a href="/register">Create a resident account</a></p>
          <div className="demo-note">
            <b>Development note</b>
            <p>Use the test accounts seeded by your backend team. Never use these sample credentials in a real deployment.</p>
          </div>
          <div className="auth-bottom">© {new Date().getFullYear()} BarangayLink <span>•</span> Local API</div>
        </div>
      </section>
    </div>
  )
}

function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    birthdate: '',
    gender: '',
    purok_zone: '',
    address_line: '',
    contact_number: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const titleCase = (v:string) => v.trim().toLowerCase().replace(/\b([\p{L}])/gu,m=>m.toUpperCase()).replace(/\s+/g,' ')
  const normalizePurok = (v:string) => { const m=v.trim().match(/^(purok|zone)\s*(\d+)$/i); return m ? `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}` : v.trim().replace(/\s+/g,' ') }
  const change = (key: keyof typeof form, value: string) => setForm(old => ({ ...old, [key]: key==='purok_zone' ? normalizePurok(value) : value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const dateParts = form.birthdate.split('-').map(Number)
    const [year, month, day] = dateParts
    const validDate = dateParts.length === 3 && year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31 && new Date(Date.UTC(year, month - 1, day)).getUTCFullYear() === year && new Date(Date.UTC(year, month - 1, day)).getUTCMonth() === month - 1 && new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day
    if (!validDate || form.birthdate > localToday()) { setError('Enter a valid birthdate that is not in the future.'); return }
    setLoading(true)
    try {
      const result = await api.register({
        ...form, first_name:titleCase(form.first_name), middle_name:titleCase(form.middle_name) || undefined, last_name:titleCase(form.last_name), purok_zone:normalizePurok(form.purok_zone), address_line:titleCase(form.address_line),
        gender: form.gender || undefined,
        contact_number: form.contact_number || undefined
      })
      setSuccess(result.message || 'Account created. You can now sign in.')
      setTimeout(() => navigate('/'), 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not register.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="register-top">
        <a href="/" className="auth-brand">
          <div className="brand-mark"><Landmark size={21} /></div>
          <strong>Barangay<span>Link</span></strong>
        </a>
        <span>Already have an account? <a href="/">Sign in</a></span>
      </div>
      <div className="register-card">
        <div className="form-eyebrow">RESIDENT PORTAL</div>
        <h1>Create your account</h1>
        <p className="auth-subtitle">Enter your details to register a resident account.</p>
        {error && <NoticeBox notice={{ kind: 'error', text: error }} onDismiss={() => setError('')} />}
        {success && <NoticeBox notice={{ kind: 'success', text: success }} onDismiss={() => setSuccess('')} />}
        <form className="register-form" onSubmit={submit}>
          <div className="form-section-title">Account information</div>
          <div className="register-grid">
            <label>
              Email address
              <input type="email" required value={form.email} onChange={e => change('email', e.target.value)} placeholder="you@example.com" />
            </label>
            <label>
              Password
              <input type="password" required minLength={8} value={form.password} onChange={e => change('password', e.target.value)} placeholder="At least 8 characters" />
            </label>
          </div>
          <div className="form-section-title">Resident information</div>
          <div className="register-grid three">
            <label>
              First name
              <input required value={form.first_name} onChange={e => change('first_name', e.target.value)} />
            </label>
            <label>
              Middle name <span className="optional">(optional)</span>
              <input value={form.middle_name} onChange={e => change('middle_name', e.target.value)} />
            </label>
            <label>
              Last name
              <input required value={form.last_name} onChange={e => change('last_name', e.target.value)} />
            </label>
            <label>
              Birthdate
              <input type="date" required max={localToday()} value={form.birthdate} onChange={e => change('birthdate', e.target.value)} />
            </label>
            <label>
              Gender
              <select value={form.gender} onChange={e => change('gender', e.target.value)}>
                <option value="">Select gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Contact number
              <input value={form.contact_number} onChange={e => change('contact_number', e.target.value)} placeholder="09xx xxx xxxx" />
            </label>
            <label>
              Purok / zone
              <input required value={form.purok_zone} onChange={e => change('purok_zone', e.target.value)} placeholder="e.g. Purok 1" />
            </label>
            <label className="span-two">
              Complete address
              <input required value={form.address_line} onChange={e => change('address_line', e.target.value)} placeholder="House number, street, barangay" />
            </label>
          </div>
          <div className="register-actions">
            <button className="button secondary" type="button" onClick={() => navigate('/')}>Cancel</button>
            <button className="button primary" disabled={loading} type="submit">
              {loading ? 'Creating account…' : 'Create account'} <ArrowUpRight size={16} />
            </button>
          </div>
        </form>
        <p className="privacy-note"><LockKeyhole size={14} /> Your details are submitted to the local BarangayLink API.</p>
      </div>
    </div>
  )
}

export default App
