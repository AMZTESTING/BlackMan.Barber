import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Phone, Calendar, Search, X, UserPlus, Edit2, Trash2, ShoppingCart, Clock, DollarSign } from 'lucide-react'

function formatPrice(price) {
  if (!price && price !== 0) return '0.000'
  const parts = price.toString().split('.')
  const rial = parts[0] || '0'
  const baisa = (parts[1] || '').padEnd(3, '0').substring(0, 3)
  return `${rial}.${baisa}`
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [customerStats, setCustomerStats] = useState({})
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', notes: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers(data || [])
    
    if (data && data.length > 0) {
      loadCustomerStats(data)
    }
  }

  async function loadCustomerStats(customersList) {
    const customerIds = customersList.map(c => c.id)
    
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_id, total_amount, created_at')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })

    const stats = {}
    customersList.forEach(c => {
      const customerOrders = orders?.filter(o => o.customer_id === c.id) || []
      stats[c.id] = {
        totalOrders: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        lastVisit: customerOrders.length > 0 ? customerOrders[0].created_at : null
      }
    })
    
    setCustomerStats(stats)
  }

  async function saveCustomer() {
    if (!newCustomer.name || !newCustomer.phone) return alert('الاسم ورقم الجوال مطلوبين')
    setLoading(true)

    if (!editId) {
      const { data: existing } = await supabase.from('customers').select('id').eq('phone', newCustomer.phone).single()
      if (existing) { alert('هذا الرقم مسجل مسبقاً'); setLoading(false); return }
    }

    if (editId) {
      await supabase.from('customers').update({ name: newCustomer.name, phone: newCustomer.phone, notes: newCustomer.notes }).eq('id', editId)
    } else {
      await supabase.from('customers').insert({ name: newCustomer.name, phone: newCustomer.phone, notes: newCustomer.notes })
    }

    setNewCustomer({ name: '', phone: '', notes: '' })
    setShowForm(false)
    setEditId(null)
    setLoading(false)
    loadCustomers()
  }

  function editCustomer(customer) {
    setNewCustomer({ name: customer.name, phone: customer.phone, notes: customer.notes || '' })
    setEditId(customer.id)
    setShowForm(true)
  }

  async function deleteCustomer(id) {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      await supabase.from('customers').delete().eq('id', id)
      loadCustomers()
    }
  }

  const filtered = customers.filter(c => 
    c.name?.includes(search) || c.phone?.includes(search)
  )

  return (
    <div>
      {/* رأس الصفحة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>العملاء</h1>
          <p style={{ color: '#8B8B8B', fontSize: '17px' }}>قاعدة بيانات العملاء ({customers.length})</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setNewCustomer({ name: '', phone: '', notes: '' }) }}
          style={{ backgroundColor: '#1E1E3F', color: 'white', padding: '14px 24px', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <UserPlus size={20} /> إضافة عميل
        </button>
      </div>

      {/* بحث */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={22} style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} />
        <input type="text" placeholder="ابحث عن عميل بالاسم أو رقم الجوال..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '18px 52px 18px 18px', borderRadius: '18px', border: 'none', backgroundColor: 'white', fontSize: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', boxSizing: 'border-box' }} />
      </div>

      {/* شبكة العملاء - بطاقات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {filtered.map(c => {
          const stats = customerStats[c.id] || { totalOrders: 0, totalSpent: 0, lastVisit: null }
          return (
            <div key={c.id} style={{
              backgroundColor: 'white', borderRadius: '20px', padding: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              transition: 'all 0.2s', border: '1px solid #F0F0F0'
            }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#C9A84C' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#F0F0F0' }}>
              
              {/* رأس البطاقة */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #E0E7FF, #C7D2FE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={24} color="#4F46E5" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: '17px', marginBottom: '2px' }}>{c.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B8B8B', fontSize: '13px' }}>
                      <Phone size={14} />
                      <span style={{ direction: 'ltr' }}>{c.phone}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => editCustomer(c)}
                    style={{ width: '34px', height: '34px', borderRadius: '10px', border: 'none', backgroundColor: '#EFF6FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit2 size={15} color="#3B82F6" />
                  </button>
                  <button onClick={() => deleteCustomer(c.id)}
                    style={{ width: '34px', height: '34px', borderRadius: '10px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={15} color="#EF4444" />
                  </button>
                </div>
              </div>

              {/* الإحصائيات */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', borderTop: '1px solid #F5F0EB', paddingTop: '16px' }}>
                {/* عدد الزيارات */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                    <ShoppingCart size={14} color="#C9A84C" />
                    <span style={{ fontSize: '11px', color: '#8B8B8B' }}>زيارة</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1E1E3F' }}>{stats.totalOrders}</div>
                </div>

                {/* إجمالي المشتريات */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                    <DollarSign size={14} color="#C9A84C" />
                    <span style={{ fontSize: '11px', color: '#8B8B8B' }}>المشتريات</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#C9A84C' }}>{formatPrice(stats.totalSpent)}</div>
                </div>

                {/* آخر زيارة */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Clock size={14} color="#8B8B8B" />
                    <span style={{ fontSize: '11px', color: '#8B8B8B' }}>آخر زيارة</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: stats.lastVisit ? '#1E1E3F' : '#8B8B8B' }}>
                    {stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString('ar-SA') : '-'}
                  </div>
                </div>
              </div>

              {/* ملاحظات */}
              {c.notes && (
                <div style={{ borderTop: '1px solid #F5F0EB', marginTop: '12px', paddingTop: '10px', fontSize: '12px', color: '#8B8B8B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Edit2 size={12} color="#8B8B8B" />
                  {c.notes}
                </div>
              )}
            </div>
          )
        })}
        
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#8B8B8B' }}>
            <Users size={48} style={{ marginBottom: '12px', opacity: 0.2 }} />
            <div style={{ fontSize: '16px' }}>لا يوجد عملاء</div>
          </div>
        )}
      </div>

      {/* نافذة إضافة/تعديل عميل */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', backgroundColor: '#F5F0EB', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editId ? <Edit2 size={22} color="#3B82F6" /> : <UserPlus size={22} color="#C9A84C" />}
                </div>
                <h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: '20px' }}>{editId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h2>
              </div>
              <button onClick={() => { setShowForm(false); setEditId(null) }} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} color="#8B8B8B" /></button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '8px', fontSize: '14px' }}>اسم العميل <span style={{ color: '#EF4444' }}>*</span></label>
              <input type="text" placeholder="أدخل اسم العميل" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '16px', boxSizing: 'border-box' }} autoFocus />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '8px', fontSize: '14px' }}>رقم الجوال <span style={{ color: '#EF4444' }}>*</span></label>
              <input type="tel" placeholder="+968xxxxxxxx" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '16px', direction: 'ltr', textAlign: 'right', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '8px', fontSize: '14px' }}>ملاحظات</label>
              <textarea placeholder="أي ملاحظات عن العميل..." value={newCustomer.notes} onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })} rows={3}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowForm(false); setEditId(null) }} style={{ flex: 1, padding: '16px', backgroundColor: '#F5F0EB', color: '#8B8B8B', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>إلغاء</button>
              <button onClick={saveCustomer} disabled={loading} style={{ flex: 1, padding: '16px', backgroundColor: loading ? '#A0A0A0' : '#C9A84C', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'جاري الحفظ...' : editId ? 'تحديث' : 'حفظ العميل'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}