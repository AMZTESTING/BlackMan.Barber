import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, UserPlus, Trash2, Shield, User, X, Search, RefreshCw, CheckCircle, XCircle, Eye, Edit2, Mail, Key, Phone, Calendar, Save, Settings } from 'lucide-react'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return isMobile
}

const ALL_PERMISSIONS = [
  { key: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
  { key: 'new-order', label: 'نقطة البيع', icon: '🛒' },
  { key: 'appointments', label: 'الحجوزات', icon: '📅' },
  { key: 'orders', label: 'التقارير', icon: '📋' },
  { key: 'services', label: 'الخدمات', icon: '💇' },
  { key: 'customers', label: 'العملاء', icon: '👥' },
  { key: 'barbers', label: 'الحلاقين', icon: '✂️' },
  { key: 'inventory', label: 'المخزون', icon: '📦' },
  { key: 'users', label: 'المستخدمين', icon: '👤' },
  { key: 'expenses', label: 'المصاريف', icon: '💰' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
]

export default function UsersPage() {
  const isMobile = useIsMobile()
  const { isAdmin, profile, getUsers, deleteUserByAdmin, createUserByAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showRolesManager, setShowRolesManager] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'barber', phone: '' })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [viewUser, setViewUser] = useState(null)
  const [editUser, setEditUser] = useState(null)

  useEffect(() => { if (isAdmin) { loadUsers(); loadRoles() } }, [isAdmin])

  async function loadUsers() { const { data } = await getUsers(); setUsers(data || []) }
  async function loadRoles() { const { data } = await supabase.from('roles').select('*').order('name'); setRoles(data || []) }

  async function handleCreateUser() {
    if (!newUser.full_name || !newUser.email || !newUser.password) return alert('جميع الحقول مطلوبة')
    if (newUser.password.length < 6) return alert('كلمة المرور 6 أحرف على الأقل')
    setLoading(true)
    const { error } = await createUserByAdmin(newUser.email, newUser.password, newUser.full_name, newUser.role)
    if (error) { alert('خطأ: ' + error.message) } else {
      alert('تم إنشاء المستخدم بنجاح!')
      setNewUser({ full_name: '', email: '', password: '', role: 'barber', phone: '' })
      setShowForm(false)
      loadUsers()
    }
    setLoading(false)
  }

  async function handleUpdateUser() {
    if (!editUser.full_name) return alert('الاسم مطلوب')
    setLoading(true)
    
    const updateData = { full_name: editUser.full_name, role: editUser.role, phone: editUser.phone }
    
    if (editUser.password && editUser.password.length >= 6) {
      updateData.user_password = editUser.password
    }
    
    await supabase.from('profiles').update(updateData).eq('id', editUser.id)
    
    alert('تم تحديث المستخدم بنجاح')
    setEditUser(null)
    setLoading(false)
    loadUsers()
  }

  async function handleSaveRole() {
    if (!editingRole.name || !editingRole.label) return alert('الاسم والتسمية مطلوبان')
    setLoading(true)
    
    if (editingRole.id) {
      await supabase.from('roles').update({ 
        name: editingRole.name, 
        label: editingRole.label, 
        permissions: editingRole.permissions 
      }).eq('id', editingRole.id)
    } else {
      await supabase.from('roles').insert({ 
        name: editingRole.name, 
        label: editingRole.label, 
        permissions: editingRole.permissions 
      })
    }
    
    alert('تم حفظ الدور بنجاح')
    setEditingRole(null)
    setLoading(false)
    loadRoles()
  }

  async function handleDeleteRole(id) {
    if (!confirm('حذف هذا الدور؟ قد يؤثر على المستخدمين المرتبطين.')) return
    await supabase.from('roles').delete().eq('id', id)
    loadRoles()
  }

  function togglePermission(permKey) {
    setEditingRole(prev => {
      const perms = prev.permissions || []
      const newPerms = perms.includes(permKey) 
        ? perms.filter(p => p !== permKey) 
        : [...perms, permKey]
      return { ...prev, permissions: newPerms }
    })
  }

  function openEdit(u) {
    setEditUser({ 
      id: u.id, 
      full_name: u.full_name || '', 
      role: u.role || 'barber', 
      phone: u.phone || '', 
      email: u.email || '', 
      password: '' 
    })
  }

  function openView(u) {
    setViewUser({
      ...u,
      email: u.email || 'غير مضاف',
      user_password: u.user_password || 'غير متوفرة',
      created_at: u.created_at || new Date()
    })
  }

  function getRoleInfo(roleName) {
    const role = roles.find(r => r.name === roleName)
    const colors = {
      admin: { color: '#D97706', bg: '#FEF3C7' },
      manager: { color: '#7C3AED', bg: '#EDE9FE' },
      cashier: { color: '#EA580C', bg: '#FFF7ED' },
      barber: { color: '#2563EB', bg: '#EFF6FF' },
      receptionist: { color: '#059669', bg: '#ECFDF5' },
    }
    return { 
      label: role?.label || roleName, 
      color: colors[roleName]?.color || '#8B8B8B', 
      bg: colors[roleName]?.bg || '#F5F0EB' 
    }
  }

  async function handleDeleteUser(userId) { 
    if (!confirm('حذف المستخدم؟')) return; 
    const { error } = await deleteUserByAdmin(userId); 
    if (error) alert('خطأ: ' + error.message); 
    else loadUsers() 
  }

  const filtered = users.filter(u => u.full_name?.includes(search) || u.role?.includes(search))

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: isMobile ? '40px' : '80px', color: '#8B8B8B' }}>
        <Shield size={isMobile ? 48 : 64} style={{ marginBottom: '12px', opacity: 0.3 }} />
        <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '600', color: '#1E1E3F' }}>غير مصرح لك</div>
        <div style={{ marginTop: '6px', fontSize: isMobile ? '13px' : '15px' }}>هذه الصفحة متاحة فقط للمدير</div>
      </div>
    )
  }

  return (
    <div>
      {/* الهيدر */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '28px', flexWrap: 'wrap', gap: '10px' }}>
        <div><h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>المستخدمين والصلاحيات</h1><p style={{ color: '#8B8B8B', fontSize: isMobile ? '14px' : '17px' }}>إدارة حسابات الموظفين والأدوار</p></div>
        <div style={{ display: 'flex', gap: isMobile ? '6px' : '10px' }}>
          <button onClick={() => setShowRolesManager(!showRolesManager)} style={{ backgroundColor: '#F5F0EB', color: '#1E1E3F', padding: isMobile ? '8px 12px' : '10px 16px', border: '1px solid #E8E3DC', borderRadius: '12px', fontSize: isMobile ? '11px' : '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Settings size={isMobile ? 14 : 16} /> إدارة الأدوار</button>
          <button onClick={loadUsers} style={{ backgroundColor: 'white', color: '#1E1E3F', padding: isMobile ? '8px 12px' : '10px 16px', border: '1px solid #E8E3DC', borderRadius: '12px', fontSize: isMobile ? '11px' : '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={isMobile ? 14 : 16} /></button>
          <button onClick={() => { setShowForm(!showForm); setNewUser({ full_name: '', email: '', password: '', role: 'barber', phone: '' }) }} style={{ backgroundColor: '#1E1E3F', color: 'white', padding: isMobile ? '10px 18px' : '14px 24px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><UserPlus size={isMobile ? 16 : 20} /> إضافة</button>
        </div>
      </div>

      {/* ========== إدارة الأدوار ========== */}
      {showRolesManager && (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', marginBottom: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}>
            <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '18px', margin: 0 }}>إدارة الأدوار والصلاحيات</h3>
            <button onClick={() => setShowRolesManager(false)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button>
          </div>

          {/* قائمة الأدوار */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '8px' : '12px', marginBottom: '16px' }}>
            {roles.map(role => (
              <div key={role.id} style={{ padding: isMobile ? '10px' : '14px', borderRadius: '14px', backgroundColor: '#FAFAFA', border: '1px solid #E8E3DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '13px' : '15px' }}>{role.label}</div>
                  <div style={{ fontSize: '11px', color: '#8B8B8B' }}>{role.name} - {role.permissions?.length || 0} صلاحية</div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => setEditingRole({ ...role })} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={14} color="#8B8B8B" /></button>
                  {role.name !== 'admin' && (
                    <button onClick={() => handleDeleteRole(role.id)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} color="#EF4444" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setEditingRole({ name: '', label: '', permissions: [] })} style={{ width: '100%', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: '1px dashed #C9A84C', backgroundColor: '#FFFBF0', color: '#C9A84C', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>
            + إضافة دور جديد
          </button>

          {/* نافذة تعديل/إضافة دور */}
          {editingRole && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '15px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '18px' : '28px', width: '100%', maxWidth: isMobile ? '90vw' : '550px', maxHeight: '80vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '18px', margin: 0 }}>{editingRole.id ? 'تعديل الدور' : 'إضافة دور جديد'}</h3>
                  <button onClick={() => setEditingRole(null)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '13px' }}>الاسم التقني (بالإنجليزية)</label>
                    <input type="text" value={editingRole.name} onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })} placeholder="cashier" style={{ width: '100%', padding: '10px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '13px', boxSizing: 'border-box' }} disabled={editingRole.name === 'admin'} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '13px' }}>التسمية العربية</label>
                    <input type="text" value={editingRole.label} onChange={(e) => setEditingRole({ ...editingRole, label: e.target.value })} placeholder="كاشير" style={{ width: '100%', padding: '10px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '8px', fontSize: '13px' }}>الصلاحيات:</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '6px', marginBottom: '20px' }}>
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm.key} style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '10px', 
                      backgroundColor: (editingRole.permissions || []).includes(perm.key) ? '#D1FAE5' : '#FAFAFA',
                      border: (editingRole.permissions || []).includes(perm.key) ? '1px solid #10B981' : '1px solid #E8E3DC',
                      cursor: editingRole.name === 'admin' ? 'not-allowed' : 'pointer',
                      opacity: editingRole.name === 'admin' ? 0.7 : 1,
                      fontSize: '12px'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={(editingRole.permissions || []).includes(perm.key)} 
                        onChange={() => togglePermission(perm.key)}
                        disabled={editingRole.name === 'admin'}
                        style={{ accentColor: '#10B981', width: '16px', height: '16px' }}
                      />
                      <span>{perm.icon} {perm.label}</span>
                    </label>
                  ))}
                </div>

                {editingRole.name === 'admin' && (
                  <div style={{ fontSize: '12px', color: '#D97706', marginBottom: '12px', backgroundColor: '#FEF3C7', padding: '8px', borderRadius: '8px' }}>
                    ⚠️ المدير لديه جميع الصلاحيات تلقائياً ولا يمكن تعديلها
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditingRole(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', color: '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>إلغاء</button>
                  <button onClick={handleSaveRole} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#C9A84C', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>{loading ? 'حفظ...' : 'حفظ الدور'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* بحث */}
      <div style={{ position: 'relative', marginBottom: isMobile ? '14px' : '20px' }}><Search size={isMobile ? 14 : 18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} /><input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: isMobile ? '10px 34px 10px 10px' : '14px 44px 14px 14px', borderRadius: '14px', border: 'none', backgroundColor: 'white', fontSize: isMobile ? '12px' : '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', boxSizing: 'border-box' }} /></div>

      {/* نموذج إضافة */}
      {showForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', marginBottom: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}><h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '18px' }}>إضافة مستخدم جديد</h3><button onClick={() => setShowForm(false)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button></div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '10px' : '16px' }}>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>الاسم الكامل</label><input type="text" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="محمد أحمد" style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>الدور الوظيفي</label><select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px' }}>{roles.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}</select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '14px' : '20px' }}>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>البريد الإلكتروني</label><input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@barber.com" style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>كلمة المرور</label><input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="6 أحرف" style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} /></div>
          </div>
          <div style={{ marginBottom: isMobile ? '14px' : '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>رقم الجوال</label>
            <input type="tel" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+968xxxxxxxx" style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleCreateUser} disabled={loading} style={{ width: '100%', padding: isMobile ? '12px' : '16px', backgroundColor: loading ? '#A0A0A0' : '#C9A84C', color: 'white', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}</button>
        </div>
      )}

      {/* جدول المستخدمين */}
      <div style={{ backgroundColor: 'white', borderRadius: '20px', overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', minWidth: isMobile ? '500px' : '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #F5F0EB', backgroundColor: '#FAFAFA' }}><th style={{ textAlign: 'right', padding: isMobile ? '10px 12px' : '14px 18px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>المستخدم</th><th style={{ textAlign: 'right', padding: isMobile ? '10px 12px' : '14px 18px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>الدور</th><th style={{ textAlign: 'center', padding: isMobile ? '10px 12px' : '14px 18px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>الحالة</th><th style={{ textAlign: 'center', padding: isMobile ? '10px 12px' : '14px 18px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>إجراءات</th></tr></thead>
          <tbody>
            {filtered.map(u => {
              const info = getRoleInfo(u.role)
              return <tr key={u.id} style={{ borderBottom: '1px solid #F5F0EB' }}>
                <td style={{ padding: isMobile ? '8px 12px' : '12px 18px' }}><div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}><div style={{ width: isMobile ? '32px' : '42px', height: isMobile ? '32px' : '42px', borderRadius: '12px', backgroundColor: info.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={isMobile ? 16 : 20} color={info.color} /></div><div><div style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '12px' : '14px' }}>{u.full_name}</div></div></div></td>
                <td style={{ padding: isMobile ? '8px 12px' : '12px 18px' }}><span style={{ padding: isMobile ? '3px 8px' : '4px 12px', borderRadius: '8px', fontSize: isMobile ? '10px' : '11px', fontWeight: '600', backgroundColor: info.bg, color: info.color }}>{info.label}</span></td>
                <td style={{ padding: isMobile ? '8px 12px' : '12px 18px', textAlign: 'center' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: isMobile ? '3px 6px' : '4px 10px', borderRadius: '8px', backgroundColor: u.is_active ? '#D1FAE5' : '#FEE2E2', color: u.is_active ? '#065F46' : '#991B1B', fontSize: isMobile ? '10px' : '11px', fontWeight: '600' }}>{u.is_active ? <CheckCircle size={isMobile ? 10 : 12} /> : <XCircle size={isMobile ? 10 : 12} />}{u.is_active ? 'نشط' : 'غير نشط'}</span></td>
                <td style={{ padding: isMobile ? '8px 12px' : '12px 18px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button onClick={() => openView(u)} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '10px', border: 'none', backgroundColor: '#EFF6FF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="عرض"><Eye size={isMobile ? 12 : 15} color="#3B82F6" /></button>
                    <button onClick={() => openEdit(u)} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="تعديل"><Edit2 size={isMobile ? 12 : 15} color="#8B8B8B" /></button>
                    <button onClick={() => handleDeleteUser(u.id)} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '10px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="حذف"><Trash2 size={isMobile ? 12 : 15} color="#EF4444" /></button>
                  </div>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>

      {/* نافذة عرض التفاصيل */}
      {viewUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '18px' : '28px', width: '100%', maxWidth: isMobile ? '90vw' : '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '18px', margin: 0 }}>تفاصيل المستخدم</h3>
              <button onClick={() => setViewUser(null)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F5F0EB' }}>
              <div style={{ width: isMobile ? '48px' : '56px', height: isMobile ? '48px' : '56px', borderRadius: '16px', backgroundColor: getRoleInfo(viewUser.role).bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={isMobile ? 22 : 26} color={getRoleInfo(viewUser.role).color} />
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '17px' }}>{viewUser.full_name}</div>
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', backgroundColor: getRoleInfo(viewUser.role).bg, color: getRoleInfo(viewUser.role).color }}>{getRoleInfo(viewUser.role).label}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: isMobile ? '12px' : '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B8B8B' }}><Mail size={isMobile ? 14 : 16} /><span>البريد:</span><span style={{ fontWeight: '600', color: '#1E1E3F', marginRight: '4px' }}>{viewUser.email}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B8B8B' }}><Key size={isMobile ? 14 : 16} /><span>كلمة المرور:</span><span style={{ fontWeight: '600', color: '#1E1E3F', marginRight: '4px' }}>{viewUser.user_password || '••••••••'}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B8B8B' }}><Phone size={isMobile ? 14 : 16} /><span>الجوال:</span><span style={{ fontWeight: '600', color: '#1E1E3F', marginRight: '4px' }}>{viewUser.phone || 'غير مضاف'}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B8B8B' }}><Calendar size={isMobile ? 14 : 16} /><span>تاريخ الإنشاء:</span><span style={{ fontWeight: '600', color: '#1E1E3F', marginRight: '4px' }}>{viewUser.created_at ? new Date(viewUser.created_at).toLocaleString('ar-SA') : '-'}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B8B8B' }}><Shield size={isMobile ? 14 : 16} /><span>الحالة:</span><span style={{ fontWeight: '600', color: viewUser.is_active ? '#10B981' : '#EF4444', marginRight: '4px' }}>{viewUser.is_active ? 'نشط' : 'غير نشط'}</span></div>
            </div>

            <button onClick={() => setViewUser(null)} style={{ width: '100%', marginTop: '20px', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: 'none', backgroundColor: '#1E1E3F', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '13px' : '14px' }}>إغلاق</button>
          </div>
        </div>
      )}

      {/* نافذة تعديل المستخدم */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '18px' : '28px', width: '100%', maxWidth: isMobile ? '90vw' : '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '18px', margin: 0 }}>تعديل المستخدم</h3><button onClick={() => setEditUser(null)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button></div>
            <div style={{ marginBottom: '14px' }}><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>الاسم الكامل</label><input type="text" value={editUser.full_name} onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '8px' : '12px', marginBottom: '14px' }}>
              <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>البريد الإلكتروني</label><input type="email" value={editUser.email} disabled style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F0F0F0', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box', color: '#8B8B8B' }} /></div>
              <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>الدور الوظيفي</label><select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px' }}>{roles.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}</select></div>
            </div>
            <div style={{ marginBottom: '14px' }}><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>رقم الجوال</label><input type="tel" value={editUser.phone || ''} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} /></div>
            <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>كلمة مرور جديدة (اختياري)</label><input type="password" value={editUser.password || ''} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} placeholder="اتركه فارغاً" style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} /></div>
            <div style={{ display: 'flex', gap: '8px' }}><button onClick={() => setEditUser(null)} style={{ flex: 1, padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', color: '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>إلغاء</button><button onClick={handleUpdateUser} disabled={loading} style={{ flex: 1, padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#C9A84C', color: 'white', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontSize: isMobile ? '12px' : '14px' }}>حفظ التعديلات</button></div>
          </div>
        </div>
      )}
    </div>
  )
}