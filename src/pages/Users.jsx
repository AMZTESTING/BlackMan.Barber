import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, UserPlus, Trash2, Shield, User, X, Search, RefreshCw, CheckCircle, XCircle, Eye, Edit2, Mail, Key, Phone, Calendar } from 'lucide-react'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return isMobile
}

export default function UsersPage() {
  const isMobile = useIsMobile()
  const { isAdmin, getUsers, deleteUserByAdmin, createUserByAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'barber', phone: '' })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [viewUser, setViewUser] = useState(null)
  const [editUser, setEditUser] = useState(null)

  useEffect(() => { if (isAdmin) loadUsers() }, [isAdmin])

  async function loadUsers() { const { data } = await getUsers(); setUsers(data || []) }

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
    
    // إذا كتب كلمة مرور جديدة، نحدثها
    if (editUser.password && editUser.password.length >= 6) {
      updateData.user_password = editUser.password
      await supabase.auth.admin.updateUserById(editUser.id, { password: editUser.password })
    }
    
    await supabase.from('profiles').update(updateData).eq('id', editUser.id)
    
    alert('تم تحديث المستخدم بنجاح')
    setEditUser(null)
    setLoading(false)
    loadUsers()
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

  async function handleDeleteUser(userId) { if (!confirm('حذف المستخدم؟')) return; const { error } = await deleteUserByAdmin(userId); if (error) alert('خطأ: ' + error.message); else loadUsers() }

  const filtered = users.filter(u => u.full_name?.includes(search) || u.role?.includes(search))

  const roleInfo = {
    admin: { label: 'مدير', icon: Shield, color: '#D97706', bg: '#FEF3C7' },
    manager: { label: 'مشرف', icon: Shield, color: '#7C3AED', bg: '#EDE9FE' },
    cashier: { label: 'كاشير', icon: User, color: '#EA580C', bg: '#FFF7ED' },
    barber: { label: 'حلاق', icon: User, color: '#2563EB', bg: '#EFF6FF' },
    receptionist: { label: 'استقبال', icon: User, color: '#059669', bg: '#ECFDF5' },
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '28px', flexWrap: 'wrap', gap: '10px' }}>
        <div><h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>المستخدمين</h1><p style={{ color: '#8B8B8B', fontSize: isMobile ? '14px' : '17px' }}>إدارة حسابات الموظفين</p></div>
        <div style={{ display: 'flex', gap: isMobile ? '6px' : '10px' }}>
          <button onClick={loadUsers} style={{ backgroundColor: 'white', color: '#1E1E3F', padding: isMobile ? '8px 12px' : '10px 16px', border: '1px solid #E8E3DC', borderRadius: '12px', fontSize: isMobile ? '11px' : '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={isMobile ? 14 : 16} /> تحديث</button>
          <button onClick={() => { setShowForm(!showForm); setNewUser({ full_name: '', email: '', password: '', role: 'barber', phone: '' }) }} style={{ backgroundColor: '#1E1E3F', color: 'white', padding: isMobile ? '10px 18px' : '14px 24px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><UserPlus size={isMobile ? 16 : 20} /> إضافة</button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: isMobile ? '14px' : '20px' }}><Search size={isMobile ? 14 : 18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} /><input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: isMobile ? '10px 34px 10px 10px' : '14px 44px 14px 14px', borderRadius: '14px', border: 'none', backgroundColor: 'white', fontSize: isMobile ? '12px' : '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', boxSizing: 'border-box' }} /></div>

      {/* نموذج إضافة */}
      {showForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', marginBottom: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}><h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '18px' }}>إضافة مستخدم جديد</h3><button onClick={() => setShowForm(false)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button></div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '10px' : '16px' }}>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>الاسم الكامل</label><input type="text" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="محمد أحمد" style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>الدور الوظيفي</label><select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px' }}><option value="barber">حلاق</option><option value="cashier">كاشير</option><option value="receptionist">موظف استقبال</option><option value="manager">مشرف</option><option value="admin">مدير</option></select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '14px' : '20px' }}>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>البريد الإلكتروني</label><input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@barber.com" style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>كلمة المرور</label><input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="6 أحرف" style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} /></div>
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
              const info = roleInfo[u.role] || roleInfo.barber; const Icon = info.icon
              return <tr key={u.id} style={{ borderBottom: '1px solid #F5F0EB' }}>
                <td style={{ padding: isMobile ? '8px 12px' : '12px 18px' }}><div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}><div style={{ width: isMobile ? '32px' : '42px', height: isMobile ? '32px' : '42px', borderRadius: '12px', backgroundColor: info.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={isMobile ? 16 : 20} color={info.color} /></div><div><div style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '12px' : '14px' }}>{u.full_name}</div></div></div></td>
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
              <div style={{ width: isMobile ? '48px' : '56px', height: isMobile ? '48px' : '56px', borderRadius: '16px', backgroundColor: roleInfo[viewUser.role]?.bg || '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => { const IconComp = roleInfo[viewUser.role]?.icon || User; return <IconComp size={isMobile ? 22 : 26} color={roleInfo[viewUser.role]?.color || '#2563EB'} /> })()}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '17px' }}>{viewUser.full_name}</div>
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', backgroundColor: roleInfo[viewUser.role]?.bg, color: roleInfo[viewUser.role]?.color }}>{roleInfo[viewUser.role]?.label}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: isMobile ? '12px' : '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B8B8B' }}><Mail size={isMobile ? 14 : 16} /><span>البريد الإلكتروني:</span><span style={{ fontWeight: '600', color: '#1E1E3F', marginRight: '4px' }}>{viewUser.email}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B8B8B' }}><Key size={isMobile ? 14 : 16} /><span>كلمة المرور:</span><span style={{ fontWeight: '600', color: '#1E1E3F', marginRight: '4px' }}>{viewUser.user_password || '••••••••'}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B8B8B' }}><Phone size={isMobile ? 14 : 16} /><span>رقم الجوال:</span><span style={{ fontWeight: '600', color: '#1E1E3F', marginRight: '4px' }}>{viewUser.phone || 'غير مضاف'}</span></div>
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
              <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>البريد الإلكتروني</label><input type="email" value={editUser.email} disabled style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F0F0F0', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box', color: '#8B8B8B' }} /><span style={{ fontSize: '10px', color: '#8B8B8B' }}>لا يمكن تغيير البريد</span></div>
              <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>الدور الوظيفي</label><select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px' }}><option value="barber">حلاق</option><option value="cashier">كاشير</option><option value="receptionist">موظف استقبال</option><option value="manager">مشرف</option><option value="admin">مدير</option></select></div>
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