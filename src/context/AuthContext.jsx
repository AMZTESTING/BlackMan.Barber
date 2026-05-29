import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rolePermissions, setRolePermissions] = useState([]) // ✅ جديد

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setRolePermissions([]); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ✅ تحميل صلاحيات الدور من قاعدة البيانات
  async function loadRolePermissions(roleName) {
    const { data } = await supabase.from('roles').select('permissions').eq('name', roleName).single()
    if (data?.permissions) {
      setRolePermissions(data.permissions)
    } else if (roleName === 'admin') {
      // admin له كل الصلاحيات
      setRolePermissions(['dashboard', 'new-order', 'appointments', 'orders', 'services', 'customers', 'barbers', 'inventory', 'users', 'expenses', 'settings'])
    } else {
      setRolePermissions([])
    }
  }

  async function fetchProfile(userId) {
    try {
      let { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      
      if (!data) {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
        const isFirstUser = count === 0
        
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ 
            id: userId, 
            full_name: user?.email?.split('@')[0] || 'مستخدم', 
            role: isFirstUser ? 'admin' : 'barber', 
            email: user?.email || '', 
            user_password: '', 
            phone: '',
            is_active: true 
          })
          .select()
          .single()
        data = newProfile
      }
      
      console.log('Profile loaded:', data?.role)
      setProfile(data)
      
      // ✅ تحميل صلاحيات الدور
      if (data?.role) {
        await loadRolePermissions(data.role)
      }
    } catch (err) {
      console.error('Fetch profile error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ✅ التحقق من الصلاحية
  function hasPermission(page) {
    if (profile?.role === 'admin') return true
    return rolePermissions.includes(page)
  }

  // ✅ التحقق من الصلاحية مع الأدوار المسموحة (للتوافق مع القديم)
  function canAccess(allowedRoles) {
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (allowedRoles && allowedRoles.includes(profile.role)) return true
    return false
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setRolePermissions([])
  }

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
          user_password: password,
          phone: ''
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

  async function getUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  }

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
    isAdmin: profile?.role === 'admin',
    rolePermissions,     // ✅ صلاحيات الدور الحالي
    hasPermission,       // ✅ دالة التحقق من الصلاحية
    canAccess            // ✅ دالة التحقق من الأدوار
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }