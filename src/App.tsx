import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, Bell, CheckCircle2, ChevronDown, ClipboardList, FileText, Home, LayoutDashboard,
  LogOut, Menu, Search, Settings, ShieldCheck, Users, UserRound, X, ArrowUpRight, RefreshCw,
  AlertCircle, Plus, Filter, Clock3, MapPin, Mail, LockKeyhole, Landmark, PanelLeftClose
} from 'lucide-react'
import { api, ApiError, clearSession, getSavedUser, saveSession } from './api'
import type { DashboardSummary, DocumentRequest, Resident, User } from './types'

type Notice = { kind: 'success' | 'error' | 'info'; text: string }
function useAuth() {
  const [user, setUser] = useState<User | null>(() => getSavedUser())
  const logout = () => { clearSession(); setUser(null) }
  return { user, setUser, logout }
}
function App() {
  const auth = useAuth()
  const [mobileNav, setMobileNav] = useState(false)
  const location = useLocation()
  useEffect(() => setMobileNav(false), [location.pathname])
  if (!auth.user) return <Routes><Route path="/register" element={<RegisterPage />} /><Route path="*" element={<LoginPage onLogin={(u) => auth.setUser(u)} />} /></Routes>
  return <div className="app-shell">
    <Sidebar role={auth.user.role} mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />
    <div className="main-shell">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20}/></button>
        <div className="crumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle(location.pathname)}</strong></div>
        <div className="top-actions"><span className="local-status"><i/> Local server</span><button className="icon-button" title="Announcements"><Bell size={18}/><i className="notification-dot"/></button><div className="profile-chip"><div className="avatar">{initials(auth.user.name || auth.user.email)}</div><div className="profile-meta"><b>{auth.user.name || auth.user.email.split('@')[0]}</b><span>{auth.user.role}</span></div><button className="icon-button tiny" title="Sign out" onClick={auth.logout}><LogOut size={16}/></button></div></div>
      </header>
      <main className="page-content">
        <Routes>
          <Route path="/" element={<DashboardPage user={auth.user} />} />
          <Route path="/residents" element={<ResidentsPage role={auth.user.role} />} />
          <Route path="/requests" element={<RequestsPage user={auth.user} />} />
          <Route path="/households" element={<ComingSoon title="Household management" description="Create households, assign residents, and identify the head of family." />} />
          <Route path="/announcements" element={<ComingSoon title="Announcements" description="Publish community announcements and let residents browse current and past notices." />} />
          <Route path="/reports" element={<ComingSoon title="Reports & analytics" description="Printable population, household, and document-request reports will be available when the corresponding API endpoints are implemented." />} />
          <Route path="/settings" element={<ComingSoon title="Account settings" description="Account administration endpoints are not currently present in the supplied backend." />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer"><span>© {new Date().getFullYear()} BarangayLink</span><span>Encode Once, Reuse Everywhere <span className="footer-dot">•</span> Local development</span></footer>
    </div>
  </div>
}

function pageTitle(path: string) {
  const map: Record<string,string> = {'/':'Dashboard','/residents':'Residents','/requests':'Document requests','/households':'Households','/announcements':'Announcements','/reports':'Reports','/settings':'Settings'}
  return map[path] || 'Dashboard'
}
function initials(name: string) { return name.split(/[\s.@_-]+/).filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('') || 'BL' }
function Sidebar({ role, mobileOpen, onClose }: { role: string; mobileOpen: boolean; onClose: () => void }) {
  const admin = role === 'Administrator' || role === 'Barangay Staff'
  return <>
    {mobileOpen && <button className="mobile-overlay" onClick={onClose} aria-label="Close navigation"/>}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Landmark size={22}/></div><div><strong>Barangay<span>Link</span></strong><small>COMMUNITY PORTAL</small></div><button className="icon-button sidebar-close" onClick={onClose}><X size={18}/></button></div>
      <div className="workspace-label">MAIN MENU</div>
      <nav className="nav-list">
        <NavItem to="/" icon={<LayoutDashboard size={18}/>} label="Dashboard"/>
        {admin && <NavItem to="/residents" icon={<Users size={18}/>} label="Residents" />}
        {role === 'Resident' && <NavItem to="/requests" icon={<ClipboardList size={18}/>} label="My requests"/>}
        {admin && <NavItem to="/requests" icon={<FileText size={18}/>} label="Document requests"/>}
        <NavItem to="/households" icon={<Home size={18}/>} label="Households" />
        <NavItem to="/announcements" icon={<Bell size={18}/>} label="Announcements" />
        {admin && <NavItem to="/reports" icon={<Activity size={18}/>} label="Reports & analytics" />}
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><ShieldCheck size={17}/></div><b>Community first.</b><p>One trusted place for local records and services.</p><span className="secure-line"><i/> Role-based workspace</span></div><NavItem to="/settings" icon={<Settings size={18}/>} label="Settings"/><div className="version">BARANGAYLINK <span>v1.0 MVP</span></div></div>
    </aside>
  </>
}
function NavItem({to, icon, label}: {to:string; icon:ReactNode; label:string}) {
  return <NavLink to={to} end={to==='/'} className={({isActive})=>`nav-item ${isActive?'active':''}`}><span className="nav-icon">{icon}</span><span>{label}</span>{to==='/requests'&&<span className="nav-arrow"><ArrowUpRight size={14}/></span>}</NavLink>
}
function PageHeading({eyebrow, title, subtitle, action}: {eyebrow?:string; title:string; subtitle:string; action?:ReactNode}) {
  return <div className="page-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{subtitle}</p></div>{action&&<div className="heading-action">{action}</div>}</div>
}
function NoticeBox({notice, onDismiss}: {notice:Notice|null; onDismiss:()=>void}) {
  if (!notice) return null
  return <div className={`notice ${notice.kind}`}><span>{notice.kind==='error'?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}</span><div>{notice.text}</div><button onClick={onDismiss} aria-label="Dismiss"><X size={16}/></button></div>
}
function DashboardPage({user}: {user:User}) {
  const [summary,setSummary] = useState<DashboardSummary|null>(null)
  const [requests,setRequests] = useState<DocumentRequest[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const isStaff = user.role !== 'Resident'
  const refresh = async () => {
    setLoading(true); setError('')
    const tasks: Promise<unknown>[] = [api.requests().then(r=>setRequests(r.data || []))]
    if (isStaff) tasks.push(api.dashboard().then(r=>setSummary(r.data)))
    const results = await Promise.allSettled(tasks)
    const rejected = results.find(r=>r.status==='rejected') as PromiseRejectedResult|undefined
    if(rejected) setError(rejected.reason instanceof Error?rejected.reason.message:'Could not load dashboard data.')
    setLoading(false)
  }
  useEffect(()=>{void refresh()},[user.role])
  const pending = requests.filter(r=>r.status==='Pending').length
  const totalResidents = valueFrom(summary,['total_residents','residents_count','resident_count'])
  const totalHouseholds = valueFrom(summary,['total_households','households_count','household_count'])
  const statCards = isStaff ? [
    {label:'Registered residents',value:totalResidents,desc:'Central resident records',icon:<Users/>,tone:'blue'},
    {label:'Households',value:totalHouseholds,desc:'Linked household profiles',icon:<Home/>,tone:'violet'},
    {label:'Pending requests',value:valueFrom(summary,['pending_requests','pending_requests_count']) ?? pending,desc:'Awaiting staff review',icon:<Clock3/>,tone:'amber'}
  ] : [
    {label:'My document requests',value:requests.length,desc:'All requests submitted',icon:<FileText/>,tone:'blue'},
    {label:'Pending requests',value:pending,desc:'Waiting for review',icon:<Clock3/>,tone:'amber'},
    {label:'Ready for release',value:requests.filter(r=>r.status==='Ready for Release').length,desc:'Visit the barangay office',icon:<CheckCircle2/>,tone:'green'}
  ]
  return <><PageHeading eyebrow="OVERVIEW" title={`Good day${user.name ? `, ${user.name.split(' ')[0]}` : ''}.`} subtitle={isStaff?'Here is the latest overview of your barangay workspace.':'Welcome to your community service portal.'} action={<button className="button secondary" onClick={()=>void refresh()}><RefreshCw size={16}/> Refresh data</button>}/>
    {error&&<NoticeBox notice={{kind:'error',text:error}} onDismiss={()=>setError('')}/>}
    <div className="welcome-banner"><div className="banner-copy"><div className="banner-pill"><span/> BARANGAYLINK WORKSPACE</div><h2>Better records. <em>Better service.</em></h2><p>{isStaff?'Manage essential community records and document requests from one organized workspace.':'Request barangay documents and track the progress without losing your tracking number.'}</p></div><div className="banner-art"><div className="art-circle circle-one"/><div className="art-circle circle-two"/><div className="art-building"><Landmark size={66} strokeWidth={1.25}/></div><div className="art-card"><CheckCircle2 size={15}/> Community connected</div></div></div>
    <div className="section-head"><div><h2>Workspace snapshot</h2><p>Live information from the connected API</p></div><span className="live-label"><i/> {loading?'Syncing…':'API connected when data loads'}</span></div>
    <div className="stats-grid">{statCards.map((s,i)=><div className="stat-card" key={s.label}><div className={`stat-icon ${s.tone}`}>{s.icon}</div><div className="stat-label">{s.label}</div><div className="stat-value">{loading?'—':s.value ?? '—'}</div><div className="stat-foot">{s.desc}</div><div className="stat-spark"><span style={{height:`${38+i*13}%`}}/><span style={{height:`${52+i*8}%`}}/><span style={{height:`${42+i*11}%`}}/><span style={{height:`${72-i*5}%`}}/><span style={{height:`${61+i*4}%`}}/></div></div>)}</div>
    <div className="content-grid"><section className="panel requests-panel"><div className="panel-head"><div><h2>{isStaff?'Recent document requests':'My recent requests'}</h2><p>{isStaff?'Review the latest submissions from residents.':'Check the latest status of your requests.'}</p></div><NavLink className="text-link" to="/requests">View all <ArrowUpRight size={15}/></NavLink></div>
      {loading?<div className="loading-state"><span className="spinner"/>Loading requests…</div>:requests.length===0?<EmptyState title="No document requests yet" text={user.role==='Resident'?'Submit a request when you need a barangay document.':'New requests will appear here when residents submit them.'}/>:<div className="table-wrap"><table><thead><tr><th>Tracking number</th>{isStaff&&<th>Resident</th>}<th>Document</th><th>Status</th><th>Date</th></tr></thead><tbody>{requests.slice(0,5).map(r=><tr key={r.id}><td><b className="tracking">{r.tracking_number}</b></td>{isStaff&&<td>{r.first_name} {r.last_name}</td>}<td>{r.document_type}</td><td><StatusPill status={r.status}/></td><td>{formatDate(r.created_at)}</td></tr>)}</tbody></table></div>}
    </section><section className="panel quick-panel"><div className="panel-head"><div><h2>Quick access</h2><p>Common workspace actions</p></div></div><div className="quick-links">
      {isStaff&&<NavLink to="/residents" className="quick-link"><div className="quick-icon blue"><Users size={18}/></div><div><b>Resident records</b><span>Search and review profiles</span></div><ArrowUpRight size={16}/></NavLink>}
      <NavLink to="/requests" className="quick-link"><div className="quick-icon purple"><ClipboardList size={18}/></div><div><b>{isStaff?'Process requests':'Request a document'}</b><span>{isStaff?'Review and update request status':'Submit and track documents'}</span></div><ArrowUpRight size={16}/></NavLink>
      <NavLink to="/announcements" className="quick-link"><div className="quick-icon orange"><Bell size={18}/></div><div><b>Announcements</b><span>Community notices and updates</span></div><ArrowUpRight size={16}/></NavLink>
      <NavLink to="/households" className="quick-link"><div className="quick-icon green"><Home size={18}/></div><div><b>Households</b><span>Household records and members</span></div><ArrowUpRight size={16}/></NavLink>
    </div><div className="tip-box"><div><ShieldCheck size={17}/></div><p><b>Keep records accurate</b><br/>BarangayLink follows “Encode Once, Reuse Everywhere” to reduce repeated data entry.</p></div></section></div>
  </>
}
function valueFrom(data:DashboardSummary|null, keys:string[]):number|undefined {
  if(!data)return undefined
  for(const key of keys){const v=data[key];if(typeof v==='number')return v;if(typeof v==='string'&&v.trim()!==''&&!Number.isNaN(Number(v)))return Number(v)}
  return undefined
}
function ResidentsPage({role}: {role:string}) {
  const [residents,setResidents] = useState<Resident[]>([])
  const [search,setSearch] = useState('')
  const [purok,setPurok] = useState('')
  const [status,setStatus] = useState('active')
  const [loading,setLoading] = useState(true)
  const [notice,setNotice] = useState<Notice|null>(null)
  const [selected,setSelected] = useState<Resident|null>(null)
  const [reload,setReload] = useState(0)
  const load = async () => {
    setLoading(true);setNotice(null)
    try {const p=new URLSearchParams();if(search.trim())p.set('search',search.trim());if(purok)p.set('purok_zone',purok);if(status)p.set('status',status);const r=await api.residents(p);setResidents(r.data||[])}
    catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not load residents.'})}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[reload])
  const submit=(e:FormEvent)=>{e.preventDefault();setReload(v=>v+1)}
  return <><PageHeading eyebrow="RECORDS" title="Resident management" subtitle="Search and review resident profiles stored in the central barangay database." action={<button className="button secondary" onClick={()=>{setSearch('');setPurok('');setStatus('active');setReload(v=>v+1)}}><RefreshCw size={16}/> Reset filters</button>}/>
    {notice&&<NoticeBox notice={notice} onDismiss={()=>setNotice(null)}/>}
    <div className="resident-summary"><div><span className="summary-icon"><Users size={20}/></span><div><b>{loading?'…':residents.length}</b><span>Matching resident records</span></div></div><span className="read-only-note"><ShieldCheck size={15}/> Connected to PostgreSQL API</span></div>
    <section className="panel list-panel"><form className="filter-bar" onSubmit={submit}><label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search first or last name…"/></label><label className="select-wrap"><MapPin size={16}/><input value={purok} onChange={e=>setPurok(e.target.value)} placeholder="Purok / zone"/></label><label className="select-wrap"><Filter size={16}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="active">Active residents</option><option value="archived">Archived residents</option><option value="all">All records</option></select></label><button className="button primary" type="submit"><Search size={16}/> Search</button></form>
      {loading?<div className="loading-state"><span className="spinner"/>Loading resident records…</div>:residents.length===0?<EmptyState title="No residents found" text="Try another name, purok, or status filter."/>:<div className="table-wrap"><table className="resident-table"><thead><tr><th>Resident</th><th>Age / Gender</th><th>Purok / Zone</th><th>Contact</th><th>Status</th><th></th></tr></thead><tbody>{residents.map(r=><tr key={r.id}><td><div className="person-cell"><div className="person-avatar">{initials(`${r.first_name} ${r.last_name}`)}</div><div><b>{r.first_name} {r.middle_name?`${r.middle_name} `:''}{r.last_name} {r.suffix||''}</b><span>{r.address_line}</span></div></div></td><td>{r.age ?? ageFromBirthdate(r.birthdate)} <span className="muted">/ {r.gender||'—'}</span></td><td><span className="zone-tag">{r.purok_zone}</span></td><td>{r.contact_number||'—'}</td><td><StatusPill status={r.is_archived?'Archived':'Active'}/></td><td><button className="table-action" onClick={()=>setSelected(r)}>Details</button></td></tr>)}</tbody></table></div>}
      <div className="table-foot"><span>Showing {residents.length} record{residents.length===1?'':'s'}</span><span>Read-only view · Changes must be made through an implemented backend endpoint</span></div>
    </section>
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><section className="detail-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">RESIDENT PROFILE</div><h2>{selected.first_name} {selected.last_name}</h2></div><button className="icon-button" onClick={()=>setSelected(null)}><X size={18}/></button></div><div className="detail-grid">{[['Full name',[selected.first_name,selected.middle_name,selected.last_name,selected.suffix].filter(Boolean).join(' ')],['Birthdate',formatDate(selected.birthdate)],['Age',String(selected.age??ageFromBirthdate(selected.birthdate))],['Gender',selected.gender||'Not provided'],['Civil status',selected.civil_status||'Not provided'],['Purok / zone',selected.purok_zone],['Address',selected.address_line],['Contact',selected.contact_number||'Not provided']].map(([k,v])=><div className="detail-field" key={k}><span>{k}</span><b>{v}</b></div>)}</div><div className="modal-note"><LockKeyhole size={16}/> Personal data is visible only to authorized staff accounts.</div></section></div>}
  </>
}
function ageFromBirthdate(birthdate:string){const d=new Date(birthdate);if(Number.isNaN(d.getTime()))return '—' as unknown as number;const now=new Date();let a=now.getFullYear()-d.getFullYear();if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))a--;return a}
function RequestsPage({user}: {user:User}) {
  const [items,setItems]=useState<DocumentRequest[]>([])
  const [loading,setLoading]=useState(true)
  const [notice,setNotice]=useState<Notice|null>(null)
  const [showForm,setShowForm]=useState(false)
  const [documentType,setDocumentType]=useState('Barangay Clearance')
  const [purpose,setPurpose]=useState('')
  const [saving,setSaving]=useState(false)
  const [statusFilter,setStatusFilter]=useState('All statuses')
  const staff=user.role!=='Resident'
  const refresh=async()=>{setLoading(true);try{const r=await api.requests();setItems(r.data||[])}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not load requests.'})}finally{setLoading(false)}}
  useEffect(()=>{void refresh()},[])
  const submit=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setNotice(null);try{await api.createRequest(documentType,purpose.trim());setPurpose('');setShowForm(false);setNotice({kind:'success',text:'Your document request was submitted.'});await refresh()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not submit request.'})}finally{setSaving(false)}}
  const update=async(id:string,status:string)=>{const remarks=window.prompt(`Optional remarks for status "${status}":`)||'';try{await api.updateRequestStatus(id,status,remarks);setNotice({kind:'success',text:`Request status updated to ${status}.`});await refresh()}catch(e){setNotice({kind:'error',text:e instanceof Error?e.message:'Could not update request.'})}}
  const filtered=useMemo(()=>items.filter(i=>statusFilter==='All statuses'||i.status===statusFilter),[items,statusFilter])
  return <><PageHeading eyebrow="SERVICE DESK" title={staff?'Document requests':'My document requests'} subtitle={staff?'Review resident submissions and keep request statuses up to date.':'Submit a document request and follow its status from one place.'} action={!staff&&<button className="button primary" onClick={()=>setShowForm(v=>!v)}><Plus size={17}/> New request</button>}/>
    {notice&&<NoticeBox notice={notice} onDismiss={()=>setNotice(null)}/>}
    {showForm&&<section className="panel request-form-panel"><div className="panel-head"><div><h2>Submit a document request</h2><p>Your account must have a linked resident profile.</p></div><button className="icon-button" onClick={()=>setShowForm(false)}><X size={17}/></button></div><form onSubmit={submit} className="request-form"><label>Document type<select value={documentType} onChange={e=>setDocumentType(e.target.value)}><option>Barangay Clearance</option><option>Certificate of Residency</option><option>Certificate of Indigency</option><option>Barangay Certificate</option><option>Other</option></select></label><label>Purpose<textarea value={purpose} onChange={e=>setPurpose(e.target.value)} required minLength={3} rows={3} placeholder="Explain why you need this document…"/></label><div className="form-actions"><button className="button secondary" type="button" onClick={()=>setShowForm(false)}>Cancel</button><button className="button primary" disabled={saving} type="submit">{saving?'Submitting…':'Submit request'}</button></div></form></section>}
    <div className="request-kpis"><div className="mini-kpi"><span>Total requests</span><b>{items.length}</b></div><div className="mini-kpi"><span>Pending</span><b>{items.filter(i=>i.status==='Pending').length}</b></div><div className="mini-kpi"><span>Approved</span><b>{items.filter(i=>i.status==='Approved').length}</b></div><div className="mini-kpi"><span>Released</span><b>{items.filter(i=>i.status==='Released').length}</b></div></div>
    <section className="panel list-panel"><div className="panel-head"><div><h2>{staff?'All submissions':'Request history'}</h2><p>Track numbers are generated by the backend.</p></div><div className="panel-tools"><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option><option>Ready for Release</option><option>Released</option></select><button className="icon-button" title="Refresh" onClick={()=>void refresh()}><RefreshCw size={17}/></button></div></div>
      {loading?<div className="loading-state"><span className="spinner"/>Loading requests…</div>:filtered.length===0?<EmptyState title="No matching requests" text={staff?'New resident submissions will appear here.':'Use “New request” to submit your first document request.'}/>:<div className="table-wrap"><table><thead><tr><th>Tracking number</th>{staff&&<th>Resident</th>}<th>Document type</th><th>Purpose</th><th>Submitted</th><th>Status</th>{staff&&<th>Update</th>}</tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><b className="tracking">{r.tracking_number}</b></td>{staff&&<td><b>{r.first_name} {r.last_name}</b><span className="table-sub">{r.purok_zone}</span></td>}<td>{r.document_type}</td><td className="purpose-cell">{r.purpose}</td><td>{formatDate(r.created_at)}</td><td><StatusPill status={r.status}/>{r.remarks&&<span className="table-sub">{r.remarks}</span>}</td>{staff&&<td><select className="status-select" defaultValue="" onChange={e=>{if(e.target.value)void update(r.id,e.target.value)}}><option value="" disabled>Change…</option>{['Pending','Approved','Rejected','Ready for Release','Released'].filter(s=>s!==r.status).map(s=><option key={s}>{s}</option>)}</select></td>}</tr>)}</tbody></table></div>}
      <div className="table-foot"><span>{filtered.length} request{filtered.length===1?'':'s'}</span><span>Keep your tracking number for follow-up.</span></div>
    </section>
  </>
}
function StatusPill({status}: {status:string}) {
  const cls=status.toLowerCase().replaceAll(' ','-')
  return <span className={`status-pill status-${cls}`}><i/>{status}</span>
}
function formatDate(value?:string){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}
function EmptyState({title,text}: {title:string;text:string}){return <div className="empty-state"><div className="empty-icon"><FileText size={22}/></div><b>{title}</b><p>{text}</p></div>}
function ComingSoon({title,description}: {title:string;description:string}) {
  return <><PageHeading eyebrow="MVP MODULE" title={title} subtitle={description}/><section className="panel coming-panel"><div className="coming-icon"><PanelLeftClose size={28}/></div><span className="coming-tag">BACKEND ENDPOINT NEEDED</span><h2>This module is planned, but not connected yet.</h2><p>The supplied backend currently exposes authentication, resident read/search, document requests, and dashboard summary endpoints. This screen is a clear placeholder—not fake data—until the team adds the matching API routes and database operations.</p><div className="coming-list"><span><CheckCircle2 size={16}/> UI navigation is ready</span><span><AlertCircle size={16}/> API routes are not in the supplied backend</span></div></section></>
}
function LoginPage({onLogin}: {onLogin:(user:User)=>void}) {
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [showPassword,setShowPassword]=useState(false);const [loading,setLoading]=useState(false);const [error,setError]=useState('')
  const navigate=useNavigate()
  const submit=async(e:FormEvent)=>{e.preventDefault();setLoading(true);setError('');try{const result=await api.login(email.trim(),password);saveSession(result.token,result.user);onLogin(result.user);navigate('/')}catch(e){setError(e instanceof Error?e.message:'Unable to sign in.')}finally{setLoading(false)}}
  return <div className="auth-layout"><section className="auth-visual"><div className="auth-brand"><div className="brand-mark"><Landmark size={22}/></div><strong>Barangay<span>Link</span></strong></div><div className="auth-visual-content"><span className="banner-pill"><span/> COMMUNITY MANAGEMENT PLATFORM</span><h1>Closer communities.<br/><em>Better services.</em></h1><p>A simpler way to organize resident records, follow document requests, and keep your community connected.</p><div className="visual-feature"><div><Users size={18}/></div><span><b>One central record</b><small>Resident and household information, organized.</small></span></div><div className="visual-feature"><div><FileText size={18}/></div><span><b>Clear request tracking</b><small>Know what is pending, approved, or released.</small></span></div><div className="visual-feature"><div><ShieldCheck size={18}/></div><span><b>Role-based access</b><small>Tools shaped around your responsibilities.</small></span></div></div><div className="auth-visual-footer">BUILT FOR THE COMMUNITY <span>•</span> LOCAL DEVELOPMENT</div><div className="auth-decoration deco-a"/><div className="auth-decoration deco-b"/></section>
    <section className="auth-form-side"><div className="auth-form-wrap"><div className="mobile-auth-brand"><div className="brand-mark"><Landmark size={21}/></div><strong>Barangay<span>Link</span></strong></div><div className="form-eyebrow">WELCOME BACK</div><h2>Sign in to your workspace</h2><p className="auth-subtitle">Enter your account details to continue.</p>{error&&<NoticeBox notice={{kind:'error',text:error}} onDismiss={()=>setError('')}/>}
      <form className="auth-form" onSubmit={submit}><label>Email address<span className="input-with-icon"><Mail size={17}/><input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@barangaylink.gov"/></span></label><label>Password<span className="input-with-icon"><LockKeyhole size={17}/><input type={showPassword?'text':'password'} required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/><button type="button" className="show-password" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Hide':'Show'}</button></span></label><div className="auth-options"><span><ShieldCheck size={14}/> Secure JWT authentication</span></div><button className="button primary auth-submit" type="submit" disabled={loading}>{loading?'Signing in…':'Sign in'} <ArrowUpRight size={17}/></button></form>
      <div className="auth-divider"><span/> or <span/></div><p className="register-prompt">New resident? <a href="/register">Create a resident account</a></p><div className="demo-note"><b>Development note</b><p>Use the test accounts seeded by your backend team. Never use these sample credentials in a real deployment.</p></div><div className="auth-bottom">© {new Date().getFullYear()} BarangayLink <span>•</span> Local API</div></div></section></div>
}
function RegisterPage() {
  const [form,setForm]=useState({email:'',password:'',first_name:'',middle_name:'',last_name:'',birthdate:'',gender:'',purok_zone:'',address_line:'',contact_number:''})
  const [error,setError]=useState('');const [success,setSuccess]=useState('');const [loading,setLoading]=useState(false);const navigate=useNavigate()
  const change=(key:keyof typeof form,value:string)=>setForm(old=>({...old,[key]:value}))
  const submit=async(e:FormEvent)=>{e.preventDefault();setError('');setSuccess('');setLoading(true);try{const result=await api.register({...form,middle_name:form.middle_name||undefined,gender:form.gender||undefined,contact_number:form.contact_number||undefined});setSuccess(result.message||'Account created. You can now sign in.');setTimeout(()=>navigate('/'),1000)}catch(e){setError(e instanceof Error?e.message:'Could not register.')}finally{setLoading(false)}}
  return <div className="register-page"><div className="register-top"><a href="/" className="auth-brand"><div className="brand-mark"><Landmark size={21}/></div><strong>Barangay<span>Link</span></strong></a><span>Already have an account? <a href="/">Sign in</a></span></div><div className="register-card"><div className="form-eyebrow">RESIDENT PORTAL</div><h1>Create your account</h1><p className="auth-subtitle">Enter your details to register a resident account.</p>{error&&<NoticeBox notice={{kind:'error',text:error}} onDismiss={()=>setError('')}/ >}{success&&<NoticeBox notice={{kind:'success',text:success}} onDismiss={()=>setSuccess('')}/>}
    <form className="register-form" onSubmit={submit}><div className="form-section-title">Account information</div><div className="register-grid"><label>Email address<input type="email" required value={form.email} onChange={e=>change('email',e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={8} value={form.password} onChange={e=>change('password',e.target.value)} placeholder="At least 8 characters"/></label></div><div className="form-section-title">Resident information</div><div className="register-grid three"><label>First name<input required value={form.first_name} onChange={e=>change('first_name',e.target.value)}/></label><label>Middle name <span className="optional">(optional)</span><input value={form.middle_name} onChange={e=>change('middle_name',e.target.value)}/></label><label>Last name<input required value={form.last_name} onChange={e=>change('last_name',e.target.value)}/></label><label>Birthdate<input type="date" required value={form.birthdate} onChange={e=>change('birthdate',e.target.value)}/></label><label>Gender<select value={form.gender} onChange={e=>change('gender',e.target.value)}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></select></label><label>Contact number<input value={form.contact_number} onChange={e=>change('contact_number',e.target.value)} placeholder="09xx xxx xxxx"/></label><label>Purok / zone<input required value={form.purok_zone} onChange={e=>change('purok_zone',e.target.value)} placeholder="e.g. Purok 1"/></label><label className="span-two">Complete address<input required value={form.address_line} onChange={e=>change('address_line',e.target.value)} placeholder="House number, street, barangay"/></label></div><div className="register-actions"><button className="button secondary" type="button" onClick={()=>navigate('/')}>Cancel</button><button className="button primary" disabled={loading} type="submit">{loading?'Creating account…':'Create account'} <ArrowUpRight size={16}/></button></div></form><p className="privacy-note"><LockKeyhole size={14}/> Your details are submitted to the local BarangayLink API.</p></div></div>
}
export default App
