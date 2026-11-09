import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Home, MapPin, Pin, Pencil, Plus, Printer, RefreshCw, Search, Trash2, UserPlus, Users, X, Activity, ShieldCheck
} from 'lucide-react'
import { api } from './api'
import type { Announcement, DemographicReport, Household, HouseholdDetail, Resident } from './types'
import { EmptyState, NoticeBox, PageHeading, errText, formatDate, initials, type Notice } from './shared'

/* ------------------------------------------------------------------ */
/* Resident picker: backend paginates residents, so search by name.    */
/* ------------------------------------------------------------------ */
function ResidentPicker({ value, onChange, label, required }: {
  value: Resident | null; onChange: (r: Resident | null) => void; label: string; required?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Resident[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (value || query.trim().length < 2) { setResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const p = new URLSearchParams({ search: query.trim(), status: 'active', limit: '8' })
        const r = await api.residents(p)
        if (!cancelled) setResults(r.data || [])
      } catch (e) { if (!cancelled) setError(errText(e, 'Could not search residents.')) }
      finally { if (!cancelled) setLoading(false) }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, value])

  return <label className="picker">
    <span>{label}{required ? '' : <span className="optional"> (optional)</span>}</span>
    {value
      ? <div className="picker-chip"><div className="person-avatar">{initials(`${value.first_name} ${value.last_name}`)}</div><div><b>{value.first_name} {value.last_name}</b><small>{value.purok_zone} · {value.address_line}</small></div><button type="button" className="icon-button tiny" onClick={() => { onChange(null); setQuery('') }} aria-label="Clear resident"><X size={15} /></button></div>
      : <>
        <div className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Type at least 2 letters of a name…" /></div>
        {loading && <small className="picker-hint">Searching…</small>}
        {error && <small className="picker-hint err">{error}</small>}
        {!loading && !error && query.trim().length >= 2 && results.length === 0 && <small className="picker-hint">No active residents match “{query.trim()}”.</small>}
        {results.length > 0 && <ul className="picker-list">{results.map(r => <li key={r.id}><button type="button" onClick={() => { onChange(r); setResults([]) }}><b>{r.first_name} {r.last_name}</b><small>{r.purok_zone} · {r.address_line}</small></button></li>)}</ul>}
      </>}
  </label>
}

/* ------------------------------------------------------------------ */
/* Households                                                          */
/* ------------------------------------------------------------------ */
const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Grandchild', 'Relative', 'Other']

export function HouseholdsPage() {
  const [items, setItems] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [search, setSearch] = useState('')
  const [purok, setPurok] = useState('')
  const [reload, setReload] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const p = new URLSearchParams()
        if (search.trim()) p.set('search', search.trim())
        if (purok.trim()) p.set('purok_zone', purok.trim())
        const r = await api.households(p)
        if (!cancelled) setItems(r.data || [])
      } catch (e) { if (!cancelled) setNotice({ kind: 'error', text: errText(e, 'Could not load households.') }) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
    // search/purok are applied on submit via `reload`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload])

  const totalMembers = items.reduce((n, h) => n + Number(h.member_count || 0), 0)

  return <>
    <PageHeading eyebrow="RECORDS" title="Household management" subtitle="Create households, assign residents, and identify the head of family."
      action={<button className="button primary" onClick={() => setShowCreate(true)}><Plus size={17} /> New household</button>} />
    {notice && <NoticeBox notice={notice} onDismiss={() => setNotice(null)} />}
    <div className="request-kpis kpis-3">
      <div className="mini-kpi"><span>Households shown</span><b>{loading ? '…' : items.length}</b></div>
      <div className="mini-kpi"><span>Total members</span><b>{loading ? '…' : totalMembers}</b></div>
      <div className="mini-kpi"><span>Without a head</span><b>{loading ? '…' : items.filter(h => !h.head_resident_id).length}</b></div>
    </div>
    <section className="panel list-panel">
      <form className="filter-bar" onSubmit={(e: FormEvent) => { e.preventDefault(); setReload(v => v + 1) }}>
        <label className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search household number, head, or address…" /></label>
        <label className="select-wrap"><MapPin size={16} /><input value={purok} onChange={e => setPurok(e.target.value)} placeholder="Purok / zone" /></label>
        <button className="button primary" type="submit"><Search size={16} /> Search</button>
        <button className="button secondary" type="button" onClick={() => { setSearch(''); setPurok(''); setReload(v => v + 1) }}><RefreshCw size={16} /> Reset</button>
      </form>
      {loading ? <div className="loading-state"><span className="spinner" />Loading households…</div>
        : items.length === 0 ? <EmptyState title="No households found" text="Create a household or adjust your search filters." />
          : <div className="table-wrap"><table><thead><tr><th>Household no.</th><th>Head of family</th><th>Purok / zone</th><th>Address</th><th>Members</th><th></th></tr></thead>
            <tbody>{items.map(h => <tr key={h.id}>
              <td><b className="tracking">{h.household_number}</b></td>
              <td>{h.head_name ? <div className="person-cell"><div className="person-avatar">{initials(h.head_name)}</div><div><b>{h.head_name}</b></div></div> : <span className="muted">Not assigned</span>}</td>
              <td><span className="zone-tag">{h.purok_zone}</span></td>
              <td className="purpose-cell">{h.street_address}</td>
              <td>{Number(h.member_count || 0)}</td>
              <td><button className="table-action" onClick={() => setDetailId(h.id)}>View members</button></td>
            </tr>)}</tbody></table></div>}
      <div className="table-foot"><span>Showing {items.length} household{items.length === 1 ? '' : 's'}</span><span>Connected to PostgreSQL API</span></div>
    </section>
    {showCreate && <CreateHouseholdModal onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); setNotice({ kind: 'success', text: 'Household created.' }); setReload(v => v + 1); setDetailId(id) }} />}
    {detailId && <HouseholdDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={() => setReload(v => v + 1)} />}
  </>
}

function CreateHouseholdModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [number, setNumber] = useState('')
  const [purok, setPurok] = useState('')
  const [address, setAddress] = useState('')
  const [head, setHead] = useState<Resident | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const r = await api.createHousehold({ household_number: number.trim(), purok_zone: purok.trim(), street_address: address.trim(), head_resident_id: head?.id ?? null })
      onCreated(r.data.id)
    } catch (err) { setError(errText(err, 'Could not create household.')) } finally { setSaving(false) }
  }
  return <div className="modal-backdrop" onClick={onClose}><section className="detail-modal wide" onClick={e => e.stopPropagation()}>
    <div className="modal-head"><div><div className="eyebrow">NEW RECORD</div><h2>Create household</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
    {error && <div className="notice error"><div>{error}</div></div>}
    <form className="request-form" onSubmit={submit}>
      <div className="form-two">
        <label>Household number<input required value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. HH-0001" /></label>
        <label>Purok / zone<input required value={purok} onChange={e => setPurok(e.target.value)} placeholder="e.g. Purok 1" /></label>
      </div>
      <label>Street address<input required value={address} onChange={e => setAddress(e.target.value)} placeholder="House number, street" /></label>
      <ResidentPicker label="Head of family" value={head} onChange={setHead} />
      <p className="form-hint">The head is automatically listed as a member with the relationship “Head”.</p>
      <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving} type="submit">{saving ? 'Creating…' : 'Create household'}</button></div>
    </form>
  </section></div>
}

function HouseholdDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<HouseholdDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [resident, setResident] = useState<Resident | null>(null)
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setData((await api.household(id)).data) }
    catch (e) { setNotice({ kind: 'error', text: errText(e, 'Could not load household.') }) }
    finally { setLoading(false) }
  }, [id])
  useEffect(() => { void load() }, [load])

  const add = async (e: FormEvent) => {
    e.preventDefault(); if (!resident) return
    setBusy(true); setNotice(null)
    try {
      await api.assignHouseholdMember(id, resident.id, relationship)
      setResident(null); setNotice({ kind: 'success', text: 'Member added to household.' }); await load(); onChanged()
    } catch (err) { setNotice({ kind: 'error', text: errText(err, 'Could not add member.') }) } finally { setBusy(false) }
  }
  const remove = async (m: { resident_id: string; first_name: string; last_name: string }) => {
    if (!window.confirm(`Remove ${m.first_name} ${m.last_name} from this household?`)) return
    setBusy(true); setNotice(null)
    try { await api.removeHouseholdMember(id, m.resident_id); setNotice({ kind: 'success', text: 'Member removed.' }); await load(); onChanged() }
    catch (err) { setNotice({ kind: 'error', text: errText(err, 'Could not remove member.') }) } finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onClick={onClose}><section className="detail-modal wide" onClick={e => e.stopPropagation()}>
    <div className="modal-head"><div><div className="eyebrow">HOUSEHOLD</div><h2>{data ? data.household_number : 'Loading…'}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
    {notice && <NoticeBox notice={notice} onDismiss={() => setNotice(null)} />}
    {loading && !data ? <div className="loading-state"><span className="spinner" />Loading household…</div> : data && <>
      <div className="detail-grid">
        <div className="detail-field"><span>Head of family</span><b>{data.head_name || 'Not assigned'}</b></div>
        <div className="detail-field"><span>Purok / zone</span><b>{data.purok_zone}</b></div>
        <div className="detail-field"><span>Address</span><b>{data.street_address}</b></div>
        <div className="detail-field"><span>Created</span><b>{formatDate(data.created_at)}</b></div>
      </div>
      <h3 className="modal-sub">Members ({data.members.length})</h3>
      {data.members.length === 0 ? <EmptyState title="No members yet" text="Add residents using the form below." />
        : <div className="table-wrap"><table><thead><tr><th>Resident</th><th>Relationship</th><th>Age / Gender</th><th>Contact</th><th></th></tr></thead><tbody>
          {data.members.map(m => <tr key={m.member_id}>
            <td><div className="person-cell"><div className="person-avatar">{initials(`${m.first_name} ${m.last_name}`)}</div><div><b>{m.first_name} {m.last_name}</b></div></div></td>
            <td><span className={`zone-tag ${m.resident_id === data.head_resident_id ? 'is-head' : ''}`}>{m.relationship_to_head}</span></td>
            <td>{m.age ?? '—'} <span className="muted">/ {m.gender || '—'}</span></td>
            <td>{m.contact_number || '—'}</td>
            <td><button className="table-action danger" disabled={busy} onClick={() => void remove(m)}>Remove</button></td>
          </tr>)}</tbody></table></div>}
      <form className="add-member" onSubmit={add}>
        <h3 className="modal-sub"><UserPlus size={15} /> Add a member</h3>
        <div className="form-two">
          <ResidentPicker label="Resident" required value={resident} onChange={setResident} />
          <label className="picker"><span>Relationship to head</span><select value={relationship} onChange={e => setRelationship(e.target.value)}>{RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}</select></label>
        </div>
        <div className="form-actions"><button className="button primary" type="submit" disabled={!resident || busy}><Plus size={15} /> Add to household</button></div>
      </form>
    </>}
  </section></div>
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */
const CATEGORIES = ['General', 'Health', 'Safety', 'Event', 'Public Service', 'Notice']

export function AnnouncementsPage({ role }: { role: string }) {
  const staff = role !== 'Resident'
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [category, setCategory] = useState('')
  const [reload, setReload] = useState(0)
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try { const r = await api.announcements(category || undefined); if (!cancelled) setItems(r.data || []) }
      catch (e) { if (!cancelled) setNotice({ kind: 'error', text: errText(e, 'Could not load announcements.') }) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [category, reload])

  const categories = useMemo(() => Array.from(new Set([...CATEGORIES, ...items.map(i => i.category).filter(Boolean)])), [items])

  const del = async (a: Announcement) => {
    if (!window.confirm(`Delete “${a.title}”? This cannot be undone.`)) return
    try { await api.deleteAnnouncement(a.id); setNotice({ kind: 'success', text: 'Announcement deleted.' }); setReload(v => v + 1) }
    catch (e) { setNotice({ kind: 'error', text: errText(e, 'Could not delete announcement.') }) }
  }

  return <>
    <PageHeading eyebrow="COMMUNITY" title="Announcements" subtitle={staff ? 'Publish community notices and keep residents informed.' : 'Browse current and past notices from your barangay.'}
      action={staff && <button className="button primary" onClick={() => setEditing('new')}><Plus size={17} /> New announcement</button>} />
    {notice && <NoticeBox notice={notice} onDismiss={() => setNotice(null)} />}
    <section className="panel list-panel">
      <div className="panel-head"><div><h2>{items.length} announcement{items.length === 1 ? '' : 's'}</h2><p>Pinned notices appear first.</p></div>
        <div className="panel-tools"><select value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select><button className="icon-button" title="Refresh" onClick={() => setReload(v => v + 1)}><RefreshCw size={17} /></button></div></div>
      {loading ? <div className="loading-state"><span className="spinner" />Loading announcements…</div>
        : items.length === 0 ? <EmptyState title="No announcements" text={staff ? 'Use “New announcement” to publish the first notice.' : 'Check back soon for community updates.'} />
          : <div className="announce-list">{items.map(a => <article key={a.id} className={`announce-card ${a.is_pinned ? 'pinned' : ''}`}>
            <div className="announce-top"><span className="zone-tag">{a.category || 'General'}</span>{a.is_pinned && <span className="pin-tag"><Pin size={12} /> Pinned</span>}
              {staff && <div className="announce-actions"><button className="icon-button tiny" title="Edit" onClick={() => setEditing(a)}><Pencil size={15} /></button><button className="icon-button tiny" title="Delete" onClick={() => void del(a)}><Trash2 size={15} /></button></div>}</div>
            <h3>{a.title}</h3>
            <p>{a.content}</p>
            <small>{a.publisher_name ? `By ${a.publisher_name} · ` : ''}{formatDate(a.created_at)}</small>
          </article>)}</div>}
    </section>
    {editing && <AnnouncementModal existing={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
      onSaved={(msg) => { setEditing(null); setNotice({ kind: 'success', text: msg }); setReload(v => v + 1) }} />}
  </>
}

function AnnouncementModal({ existing, onClose, onSaved }: { existing: Announcement | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [title, setTitle] = useState(existing?.title ?? '')
  const [content, setContent] = useState(existing?.content ?? '')
  const [category, setCategory] = useState(existing?.category ?? 'General')
  const [pinned, setPinned] = useState(existing?.is_pinned ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    const body = { title: title.trim(), content: content.trim(), category: category.trim() || 'General', is_pinned: pinned }
    try {
      if (existing) { await api.updateAnnouncement(existing.id, body); onSaved('Announcement updated.') }
      else { await api.createAnnouncement(body); onSaved('Announcement published.') }
    } catch (err) { setError(errText(err, 'Could not save announcement.')) } finally { setSaving(false) }
  }
  return <div className="modal-backdrop" onClick={onClose}><section className="detail-modal wide" onClick={e => e.stopPropagation()}>
    <div className="modal-head"><div><div className="eyebrow">{existing ? 'EDIT NOTICE' : 'NEW NOTICE'}</div><h2>{existing ? 'Edit announcement' : 'Publish announcement'}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
    {error && <div className="notice error"><div>{error}</div></div>}
    <form className="request-form" onSubmit={submit}>
      <label>Title<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Short, clear headline" /></label>
      <div className="form-two">
        <label>Category<input list="announce-cats" maxLength={50} value={category} onChange={e => setCategory(e.target.value)} /><datalist id="announce-cats">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist></label>
        <label className="check-row"><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} /> Pin to the top</label>
      </div>
      <label>Message<textarea required rows={6} value={content} onChange={e => setContent(e.target.value)} placeholder="Write the full announcement…" /></label>
      <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving} type="submit">{saving ? 'Saving…' : existing ? 'Save changes' : 'Publish'}</button></div>
    </form>
  </section></div>
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */
export function ReportsPage() {
  const [report, setReport] = useState<DemographicReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [reload, setReload] = useState(0)
  const [generated, setGenerated] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try { const r = await api.demographicsReport(); if (!cancelled) { setReport(r.data); setGenerated(new Date()) } }
      catch (e) { if (!cancelled) setNotice({ kind: 'error', text: errText(e, 'Could not load the report.') }) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [reload])

  const n = (v?: number | string) => Number(v ?? 0)
  const total = n(report?.total_population)
  const pct = (v?: number | string) => (total > 0 ? Math.round((n(v) / total) * 1000) / 10 : 0)
  const other = Math.max(0, total - n(report?.male_count) - n(report?.female_count))
  const avg = n(report?.total_households) > 0 ? (total / n(report?.total_households)).toFixed(1) : '—'

  const age = [['Children (0–17)', report?.children_count], ['Adults (18–59)', report?.adult_count], ['Seniors (60+)', report?.senior_count]] as const
  const sex = [['Male', report?.male_count], ['Female', report?.female_count], ...(other > 0 ? [['Other / unspecified', other] as const] : [])] as const

  const Bars = ({ rows, tone }: { rows: readonly (readonly [string, number | string | undefined])[]; tone: string }) =>
    <div className="bars">{rows.map(([label, v]) => <div className="bar-row" key={label}>
      <div className="bar-label"><span>{label}</span><b>{n(v).toLocaleString()} <small>({pct(v)}%)</small></b></div>
      <div className="bar-track" role="img" aria-label={`${label}: ${pct(v)} percent`}><div className={`bar-fill ${tone}`} style={{ width: `${pct(v)}%` }} /></div>
    </div>)}</div>

  return <>
    <PageHeading eyebrow="INSIGHTS" title="Reports & analytics" subtitle="Population and household figures from active resident records."
      action={<div className="panel-tools no-print"><button className="button secondary" onClick={() => setReload(v => v + 1)}><RefreshCw size={16} /> Refresh</button><button className="button primary" onClick={() => window.print()} disabled={!report}><Printer size={16} /> Print report</button></div>} />
    {notice && <NoticeBox notice={notice} onDismiss={() => setNotice(null)} />}
    {loading && !report ? <div className="loading-state"><span className="spinner" />Compiling report…</div>
      : !report ? <EmptyState title="No report data" text="The report could not be generated. Try refreshing." /> : <>
        <div className="request-kpis">
          <div className="mini-kpi"><span><Users size={12} /> Total population</span><b>{total.toLocaleString()}</b></div>
          <div className="mini-kpi"><span><Home size={12} /> Households</span><b>{n(report.total_households).toLocaleString()}</b></div>
          <div className="mini-kpi"><span><Activity size={12} /> Avg. people per household</span><b>{avg}</b></div>
          <div className="mini-kpi"><span><ShieldCheck size={12} /> Senior citizens</span><b>{n(report.senior_count).toLocaleString()}</b></div>
        </div>
        <div className="report-grid">
          <section className="panel list-panel"><div className="panel-head"><div><h2>Age groups</h2><p>Share of the active population</p></div></div><Bars rows={age} tone="blue" /></section>
          <section className="panel list-panel"><div className="panel-head"><div><h2>Gender</h2><p>Share of the active population</p></div></div><Bars rows={sex} tone="teal" /></section>
        </div>
        <section className="panel list-panel report-table"><div className="panel-head"><div><h2>Summary table</h2><p>Generated {generated?.toLocaleString()} · archived residents excluded</p></div></div>
          <div className="table-wrap"><table><thead><tr><th>Category</th><th>Count</th><th>% of population</th></tr></thead><tbody>
            {[...age, ...sex].map(([label, v]) => <tr key={label}><td>{label}</td><td>{n(v).toLocaleString()}</td><td>{pct(v)}%</td></tr>)}
            <tr><td><b>Total population</b></td><td><b>{total.toLocaleString()}</b></td><td>100%</td></tr>
          </tbody></table></div>
          <div className="table-foot"><span>Source: PostgreSQL <code>fn_get_demographic_reports()</code></span><span>BarangayLink</span></div>
        </section>
      </>}
  </>
}

