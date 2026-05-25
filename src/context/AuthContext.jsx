import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    let { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    
    if (!data) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId, full_name: 'مستخدم', role: 'barber', email: '', user_password: '' })
        .select()
        .single()
      data = newProfile
    }
    
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  // إنشاء مستخدم جديد (للمدير فقط)
  async function createUserByAdmin(email, password, fullName, role) {
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })

      if (authError) {
        console.error('Auth Error:', authError)
        return { error: authError }
      }
      
      if (!authData.user) {
        return { error: { message: 'فشل إنشاء المستخدم' } }
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: authData.user.id, 
          full_name: fullName, 
          role: role, 
          is_active: true,
          email: email,
          user_password: password
        })

      if (profileError) {
        console.error('Profile Error:', profileError)
        return { error: profileError }
      }

      return { data: authData }
    } catch (err) {
      console.error('Create User Error:', err)
      return { error: { message: 'حدث خطأ غير متوقع' } }
    }
  }

  // جلب كل المستخدمين
  async function getUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  }

  // حذف مستخدم
  async function deleteUserByAdmin(userId) {
    try {
      await supabase.from('profiles').delete().eq('id', userId)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) {
        console.error('Delete Error:', error)
        return { error }
      }
      return { error: null }
    } catch (err) {
      console.error('Delete User Error:', err)
      return { error: { message: 'حدث خطأ غير متوقع' } }
    }
  }

  const value = { 
    user, 
    profile, 
    loading, 
    signIn, 
    signOut, 
    createUserByAdmin, 
    getUsers, 
    deleteUserByAdmin, 
    isAdmin: profile?.role === 'admin'
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }