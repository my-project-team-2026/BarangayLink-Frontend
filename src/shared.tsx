import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, FileText, X } from 'lucide-react'

export type Notice = { kind: 'success' | 'error' | 'info'; text: string }

export function initials(name: string) {
  return name.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('') || 'BL'
}
export function ageFromBirthdate(birthdate: string) {
  const d = new Date(birthdate)
  if (Number.isNaN(d.getTime())) return '—' as unknown as number
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--
  return a
}
export function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><div className="empty-icon"><FileText size={22} /></div><b>{title}</b><p>{text}</p></div>
}
export function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="heading-action">{action}</div>}</div>
}
export function NoticeBox({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  if (!notice) return null
  return <div className={`notice ${notice.kind}`}><span>{notice.kind === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}</span><div>{notice.text}</div><button onClick={onDismiss} aria-label="Dismiss"><X size={16} /></button></div>
}
export const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)
