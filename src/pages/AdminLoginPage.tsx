import { type FormEvent, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Wordmark } from '../components/Wordmark'

export function AdminLoginPage() {
  const navigate = useNavigate(); const [email, setEmail] = useState('jambekbolsun@gmail.com'); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) { setError(authError.message); setBusy(false); return } const uid = data.user?.id; if (!uid) { setError('Пользователь не найден'); setBusy(false); return } const { data: admin } = await supabase.from('atadan_admins').select('role').eq('user_id', uid).maybeSingle(); if (!admin) { await supabase.auth.signOut(); setError('У этого аккаунта нет доступа к ATADAN Admin'); setBusy(false); return } navigate('/admin') }
  return <div className="admin-login"><section className="admin-login__visual"><Wordmark inverse/><div className="admin-login__monogram" aria-hidden="true">A</div></section><div className="admin-login__form-wrap"><form onSubmit={submit} className="admin-login__form"><div className="admin-login__lock"><LockKeyhole/></div><h1>Вход в админку</h1><p>Используйте аккаунт Supabase, которому выдан доступ ATADAN.</p><label className="admin-login__field"><span>Email</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required/></label><label className="admin-login__field"><span>Пароль</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required/></label>{error && <div className="admin-login__error">{error}</div>}<button disabled={busy} className="admin-login__submit">{busy ? 'Входим…' : 'Войти'}</button></form></div></div>
}
