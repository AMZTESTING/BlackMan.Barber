import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Clock, User, Scissors, Plus, X, Check, Ban, ChevronRight, ChevronLeft, Search, Hash, CreditCard, Edit2, UserPlus, Phone } from 'lucide-react'

function formatPrice(price) {
  if (!price && price !== 0) return '0.000'
  const parts = price.toString().split('.')
  const rial = parts[0] || '0'
  const baisa = (parts[1] || '').padEnd(3, '0').substring(0, 3)
  return `${rial}.${baisa}`
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return isMobile
}

export default function Appointments() {
  const isMobile = useIsMobile()
  const [appointments, setAppointments] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState('all')
  const [newAppointment, setNewAppointment] = useState({ customer_id: '', service_ids: [], appointment_date: selectedDate, start_time: '10:00', notes: '' })
  const [filter, setFilter] = useState('all')
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [editForm, setEditForm] = useState({ start_time: '', appointment_date: '' })
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [quickCustomer, setQuickCustomer] = useState({ name: '', phone: '' })

  useEffect(() => { loadAppointments(); loadCustomers(); loadServices() }, [selectedDate, viewMode])

  async function loadAppointments() {
    let query = supabase.from('appointments').select('*, customers(name, phone), services(name, price, duration, image_url)').order('appointment_date', { ascending: false }).order('start_time')
    if (viewMode === 'day') query = query.eq('appointment_date', selectedDate)
    const { data } = await query; setAppointments(data || [])
  }
  async function loadCustomers() { const { data } = await supabase.from('customers').select('id, name, phone'); setCustomers(data || []) }
  async function loadServices() { const { data } = await supabase.from('services').select('*, categories(name)').eq('is_active', true); setServices(data || []) }

  async function generateAppointmentNumber() {
    const { data: counter } = await supabase.from('invoice_counter').select('last_number').single()
    const nextNumber = (counter?.last_number || 0) + 1; const appointmentNumber = `A${String(nextNumber).padStart(4, '0')}`
    await supabase.from('invoice_counter').update({ last_number: nextNumber }).eq('id', 1); return appointmentNumber
  }

  function toggleService(serviceId) { setNewAppointment(prev => ({ ...prev, service_ids: prev.service_ids.includes(serviceId) ? prev.service_ids.filter(id => id !== serviceId) : [...prev.service_ids, serviceId] })) }
  function getTotalPrice() { return newAppointment.service_ids.reduce((sum, id) => sum + (services.find(s => s.id === id)?.price || 0), 0) }

  async function checkTimeConflict() {
    const { data: conflicts } = await supabase.from('appointments').select('id').eq('appointment_date', selectedDate).eq('start_time', newAppointment.start_time).neq('status', 'cancelled')
    return conflicts && conflicts.length > 0
  }

  async function createAppointment() {
    if (!newAppointment.customer_id || newAppointment.service_ids.length === 0) return alert('الرجاء اختيار العميل وخدمة')
    if (await checkTimeConflict()) return alert('يوجد حجز مسبق في نفس التاريخ والوقت!')
    const names = services.filter(s => newAppointment.service_ids.includes(s.id)).map(s => s.name).join(' + ')
    const appointmentNumber = await generateAppointmentNumber()
    const { error } = await supabase.from('appointments').insert({ customer_id: parseInt(newAppointment.customer_id), service_id: newAppointment.service_ids[0], appointment_date: selectedDate, start_time: newAppointment.start_time, end_time: newAppointment.start_time, appointment_number: appointmentNumber, notes: newAppointment.notes ? `${newAppointment.notes} | الخدمات: ${names} | الإجمالي: ${getTotalPrice()} ريال` : `الخدمات: ${names} | الإجمالي: ${getTotalPrice()} ريال` })
    if (error) { alert('خطأ: ' + error.message); return }
    setNewAppointment({ customer_id: '', service_ids: [], appointment_date: selectedDate, start_time: '10:00', notes: '' }); setShowForm(false); loadAppointments()
  }

  async function quickAddCustomer() {
    if (!quickCustomer.name || !quickCustomer.phone) return alert('الاسم والجوال مطلوبين')
    const { data, error } = await supabase.from('customers').insert(quickCustomer).select().single()
    if (error) { alert('خطأ: ' + error.message); return }
    setNewAppointment({ ...newAppointment, customer_id: data.id }); setQuickCustomer({ name: '', phone: '' }); setShowQuickAdd(false); loadCustomers()
  }

  async function updateStatus(id, status) { await supabase.from('appointments').update({ status }).eq('id', id); loadAppointments() }
  async function deleteAppointment(id) { if (confirm('حذف الحجز؟')) { await supabase.from('appointments').delete().eq('id', id); loadAppointments() } }
  function changeDate(d) { const dt = new Date(selectedDate); dt.setDate(dt.getDate() + d); setSelectedDate(dt.toISOString().split('T')[0]) }
  function openEdit(app) { setEditingAppointment(app.id); setEditForm({ start_time: app.start_time, appointment_date: app.appointment_date }) }

  async function saveEdit() {
    const { data: conflicts } = await supabase.from('appointments').select('id').eq('appointment_date', editForm.appointment_date).eq('start_time', editForm.start_time).neq('id', editingAppointment).neq('status', 'cancelled')
    if (conflicts && conflicts.length > 0) return alert('يوجد حجز مسبق!')
    await supabase.from('appointments').update({ start_time: editForm.start_time, appointment_date: editForm.appointment_date }).eq('id', editingAppointment)
    setEditingAppointment(null); loadAppointments()
  }

  async function goToInvoice(app) {
    const serviceIds = []; if (app.service_id) serviceIds.push(app.service_id)
    if (app.notes?.includes('الخدمات:')) { const { data: all } = await supabase.from('services').select('*'); all?.forEach(s => { if (app.notes.includes(s.name) && !serviceIds.includes(s.id)) serviceIds.push(s.id) }) }
    const { data: customerData } = await supabase.from('customers').select('id, name, phone').eq('id', app.customer_id).single()
    sessionStorage.setItem('fromAppointment', JSON.stringify({ customer: customerData, serviceIds, appointmentId: app.id, appointmentNumber: app.appointment_number })); window.location.href = '/new-order'
  }

  const filteredCustomers = customers.filter(c => c.name?.includes(customerSearch) || c.phone?.includes(customerSearch))
  const filteredAppointments = filter === 'all' ? appointments : appointments.filter(a => a.status === filter)
  const stats = { total: appointments.length, confirmed: appointments.filter(a => a.status === 'confirmed').length, completed: appointments.filter(a => a.status === 'completed').length, paid: appointments.filter(a => a.status === 'paid').length, cancelled: appointments.filter(a => a.status === 'cancelled').length }
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const sc = { confirmed: { bg: '#D1FAE5', color: '#065F46', label: 'مؤكد' }, completed: { bg: '#EDE9FE', color: '#5B21B6', label: 'مكتمل' }, paid: { bg: '#DBEAFE', color: '#1E40AF', label: 'تم الدفع' }, cancelled: { bg: '#FEE2E2', color: '#991B1B', label: 'ملغي' } }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '28px', flexWrap: 'wrap', gap: '10px' }}>
        <div><h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>الحجوزات</h1><p style={{ color: '#8B8B8B', fontSize: isMobile ? '14px' : '17px' }}>إدارة حجوزات العملاء</p></div>
        <button onClick={() => { setShowForm(!showForm); setNewAppointment({ customer_id: '', service_ids: [], appointment_date: selectedDate, start_time: '10:00', notes: '' }) }} style={{ backgroundColor: '#1E1E3F', color: 'white', padding: isMobile ? '10px 16px' : '14px 24px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={isMobile ? 16 : 20} /> حجز جديد</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 3 : 5}, 1fr)`, gap: isMobile ? '6px' : '12px', marginBottom: isMobile ? '16px' : '24px' }}>
        {[{ label: 'إجمالي', value: stats.total, color: '#3B82F6' }, { label: 'مؤكد', value: stats.confirmed, color: '#10B981' }, { label: 'مكتمل', value: stats.completed, color: '#8B5CF6' }, { label: 'تم الدفع', value: stats.paid, color: '#2563EB' }, { label: 'ملغي', value: stats.cancelled, color: '#EF4444' }].slice(0, isMobile ? 5 : 5).map((s, i) => (
          <div key={i} style={{ backgroundColor: 'white', borderRadius: '16px', padding: isMobile ? '10px' : '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', textAlign: 'center' }}><div style={{ color: '#8B8B8B', fontSize: isMobile ? '10px' : '12px', marginBottom: '4px' }}>{s.label}</div><div style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 'bold', color: s.color }}>{s.value}</div></div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setViewMode('all')} style={{ padding: isMobile ? '6px 12px' : '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: viewMode === 'all' ? '#1E1E3F' : 'white', color: viewMode === 'all' ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '11px' : '14px' }}>الكل</button>
          <button onClick={() => setViewMode('day')} style={{ padding: isMobile ? '6px 12px' : '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: viewMode === 'day' ? '#C9A84C' : 'white', color: viewMode === 'day' ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '11px' : '14px' }}>اليوم</button>
        </div>
        {viewMode === 'day' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: isMobile ? '4px 8px' : '8px 16px', borderRadius: '16px' }}>
            <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ChevronRight size={isMobile ? 16 : 20} color="#1E1E3F" /></button>
            <div style={{ textAlign: 'center', minWidth: isMobile ? '100px' : '140px' }}><div style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '12px' : '16px' }}>{dayNames[new Date(selectedDate).getDay()]}</div><div style={{ color: '#C9A84C', fontSize: isMobile ? '10px' : '14px' }}>{selectedDate}</div></div>
            <button onClick={() => changeDate(1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ChevronLeft size={isMobile ? 16 : 20} color="#1E1E3F" /></button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'الكل' }, { key: 'confirmed', label: 'مؤكد' }, { key: 'completed', label: 'مكتمل' }, { key: 'paid', label: 'تم الدفع' }, { key: 'cancelled', label: 'ملغي' }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: isMobile ? '5px 8px' : '8px 14px', borderRadius: '10px', border: 'none', backgroundColor: filter === f.key ? '#1E1E3F' : 'white', color: filter === f.key ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '10px' : '13px' }}>{f.label}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', marginBottom: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '18px' }}>حجز موعد جديد</h3><button onClick={() => setShowForm(false)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button></div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '6px', fontSize: isMobile ? '12px' : '14px' }}>العميل</label>
            <button onClick={() => setShowCustomerModal(true)} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: newAppointment.customer_id ? '2px solid #C9A84C' : '2px dashed #D1D5DB', backgroundColor: newAppointment.customer_id ? '#FFFBF0' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '12px' : '14px', color: newAppointment.customer_id ? '#1E1E3F' : '#8B8B8B' }}><User size={16} color={newAppointment.customer_id ? '#C9A84C' : '#8B8B8B'} />{newAppointment.customer_id ? customers.find(c => c.id === newAppointment.customer_id)?.name + ' - ' + customers.find(c => c.id === newAppointment.customer_id)?.phone : 'اختيار عميل...'}</button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '6px', fontSize: isMobile ? '12px' : '14px' }}>الخدمات</label>
            <button onClick={() => setShowServiceModal(true)} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: newAppointment.service_ids.length > 0 ? '2px solid #C9A84C' : '2px dashed #D1D5DB', backgroundColor: newAppointment.service_ids.length > 0 ? '#FFFBF0' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '12px' : '14px', color: newAppointment.service_ids.length > 0 ? '#1E1E3F' : '#8B8B8B' }}><Scissors size={16} color={newAppointment.service_ids.length > 0 ? '#C9A84C' : '#8B8B8B'} />{newAppointment.service_ids.length > 0 ? `${newAppointment.service_ids.length} خدمات - ${formatPrice(getTotalPrice())} ريال` : 'اختيار الخدمات...'}</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '12px' }}>التاريخ</label><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '12px' }}>الوقت</label><input type="time" value={newAppointment.start_time} onChange={(e) => setNewAppointment({ ...newAppointment, start_time: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', boxSizing: 'border-box' }} /></div>
          </div>

          <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '12px' }}>ملاحظات</label><textarea value={newAppointment.notes} onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })} rows={2} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} /></div>

          <button onClick={createAppointment} style={{ width: '100%', padding: '14px', backgroundColor: '#C9A84C', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>تأكيد الحجز</button>
        </div>
      )}

      {/* نافذة العميل */}
      {showCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '16px' : '28px', width: '100%', maxWidth: isMobile ? '95vw' : '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ fontWeight: 'bold', fontSize: isMobile ? '16px' : '19px', color: '#1E1E3F', margin: 0 }}>{showQuickAdd ? 'عميل جديد' : 'اختيار العميل'}</h3><button onClick={() => { setShowCustomerModal(false); setShowQuickAdd(false) }} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button></div>
            {!showQuickAdd ? (<>
              <div style={{ display: 'flex', gap: '8px' }}><div style={{ flex: 1, position: 'relative' }}><Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} /><input type="text" placeholder="بحث..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} style={{ width: '100%', padding: '10px 30px 10px 10px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '13px', boxSizing: 'border-box' }} /></div><button onClick={() => { setShowQuickAdd(true); setQuickCustomer({ name: '', phone: '' }) }} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', backgroundColor: '#1E1E3F', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}><UserPlus size={14} /> جديد</button></div>
              <div style={{ flex: 1, overflow: 'auto' }}>{filteredCustomers.map(c => (<div key={c.id} onClick={() => { setNewAppointment({ ...newAppointment, customer_id: c.id }); setShowCustomerModal(false) }} style={{ padding: '10px', borderRadius: '12px', cursor: 'pointer', marginBottom: '3px', backgroundColor: newAppointment.customer_id === c.id ? '#FFFBF0' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} color="#C9A84C" /></div><div style={{ flex: 1 }}><div style={{ fontWeight: '600', fontSize: '14px' }}>{c.name}</div><div style={{ fontSize: '11px', color: '#8B8B8B' }}>{c.phone}</div></div></div>))}</div>
            </>) : (<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><input type="text" placeholder="اسم العميل" value={quickCustomer.name} onChange={(e) => setQuickCustomer({ ...quickCustomer, name: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', boxSizing: 'border-box' }} /><input type="tel" placeholder="رقم الجوال" value={quickCustomer.phone} onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', direction: 'ltr', textAlign: 'right', boxSizing: 'border-box' }} /><div style={{ display: 'flex', gap: '8px' }}><button onClick={() => setShowQuickAdd(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', color: '#8B8B8B', fontWeight: '600', cursor: 'pointer' }}>رجوع</button><button onClick={quickAddCustomer} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#10B981', color: 'white', fontWeight: '600', cursor: 'pointer' }}>حفظ</button></div></div>)}
          </div>
        </div>
      )}

      {/* نافذة الخدمات */}
      {showServiceModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '16px' : '28px', width: '100%', maxWidth: isMobile ? '95vw' : '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ fontWeight: 'bold', fontSize: isMobile ? '16px' : '19px', color: '#1E1E3F', margin: 0 }}>اختيار الخدمات</h3><button onClick={() => setShowServiceModal(false)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button></div>
            {newAppointment.service_ids.length > 0 && (<div style={{ padding: '10px', backgroundColor: '#FFFBF0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span style={{ fontWeight: '600' }}>{newAppointment.service_ids.length} خدمات</span><span style={{ fontWeight: 'bold', color: '#C9A84C' }}>{formatPrice(getTotalPrice())} ريال</span></div>)}
            <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '130px' : '160px'}, 1fr))`, gap: '10px' }}>
              {services.map(s => {
                const sel = newAppointment.service_ids.includes(s.id)
                return (<div key={s.id} onClick={() => toggleService(s.id)} style={{ padding: isMobile ? '10px' : '14px', borderRadius: '14px', cursor: 'pointer', border: sel ? '2px solid #C9A84C' : '2px solid #E8E3DC', backgroundColor: sel ? '#FFFBF0' : 'white', textAlign: 'center' }}><div style={{ width: '100%', height: isMobile ? '60px' : '90px', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px', backgroundColor: '#F5F0EB' }}>{s.image_url ? <img src={s.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '24px' : '32px' }}>💇</div>}</div><div style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '11px' : '13px' }}>{s.name}</div><div style={{ fontSize: '10px', color: '#8B8B8B' }}>{s.duration} د</div><div style={{ fontWeight: 'bold', color: '#C9A84C', fontSize: isMobile ? '12px' : '14px' }}>{formatPrice(s.price)} ريال</div>{sel && <div style={{ fontSize: '9px', color: '#C9A84C' }}>✓</div>}</div>)
              })}
            </div>
            <button onClick={() => setShowServiceModal(false)} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#1E1E3F', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>تم</button>
          </div>
        </div>
      )}

      {/* جدول الحجوزات */}
      <div style={{ backgroundColor: 'white', borderRadius: '20px', overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', minWidth: isMobile ? '650px' : '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #F5F0EB', backgroundColor: '#FAFAFA' }}><th style={{ textAlign: 'right', padding: isMobile ? '10px 10px' : '14px 14px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}><Hash size={isMobile ? 12 : 14} /> رقم</th><th style={{ textAlign: 'right', padding: isMobile ? '10px 10px' : '14px 14px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>التاريخ</th><th style={{ textAlign: 'right', padding: isMobile ? '10px 10px' : '14px 14px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>الوقت</th><th style={{ textAlign: 'right', padding: isMobile ? '10px 10px' : '14px 14px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>العميل</th><th style={{ textAlign: 'right', padding: isMobile ? '10px 10px' : '14px 14px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>الخدمة</th><th style={{ textAlign: 'right', padding: isMobile ? '10px 10px' : '14px 14px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>الحالة</th><th style={{ textAlign: 'right', padding: isMobile ? '10px 10px' : '14px 14px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>الإجراءات</th></tr></thead>
          <tbody>
            {filteredAppointments.map(app => {
              const si = sc[app.status] || sc.confirmed
              return <tr key={app.id} style={{ borderBottom: '1px solid #F5F0EB' }}>
                <td style={{ padding: isMobile ? '8px 10px' : '12px 14px', fontWeight: 'bold', color: '#C9A84C', fontSize: isMobile ? '11px' : '13px', fontFamily: 'monospace' }}>{app.appointment_number || `#${app.id}`}</td>
                <td style={{ padding: isMobile ? '8px 10px' : '12px 14px', fontSize: isMobile ? '10px' : '12px' }}>{new Date(app.appointment_date).toLocaleDateString('ar-SA')}</td>
                <td style={{ padding: isMobile ? '8px 10px' : '12px 14px', fontSize: isMobile ? '10px' : '12px' }}>{app.start_time?.substring(0, 5)}</td>
                <td style={{ padding: isMobile ? '8px 10px' : '12px 14px' }}><div style={{ fontWeight: '600', fontSize: isMobile ? '10px' : '12px' }}>{app.customers?.name}</div><div style={{ fontSize: isMobile ? '8px' : '10px', color: '#8B8B8B' }}>{app.customers?.phone}</div></td>
                <td style={{ padding: isMobile ? '8px 10px' : '12px 14px', fontSize: isMobile ? '10px' : '12px' }}>{app.services?.name}</td>
                <td style={{ padding: isMobile ? '8px 10px' : '12px 14px' }}><span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: isMobile ? '9px' : '10px', fontWeight: '600', backgroundColor: si.bg, color: si.color }}>{si.label}</span></td>
                <td style={{ padding: isMobile ? '8px 10px' : '12px 14px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: isMobile ? '3px' : '6px', alignItems: 'center', justifyContent: 'center' }}>
                    {app.status === 'confirmed' && (<><button onClick={() => updateStatus(app.id, 'completed')} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '8px', border: 'none', backgroundColor: '#D1FAE5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={isMobile ? 12 : 16} color="#065F46" /></button><button onClick={() => updateStatus(app.id, 'cancelled')} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '8px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ban size={isMobile ? 12 : 16} color="#991B1B" /></button><button onClick={() => openEdit(app)} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '8px', border: 'none', backgroundColor: '#EFF6FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={isMobile ? 12 : 16} color="#3B82F6" /></button></>)}
                    {app.status === 'completed' && (<><button onClick={() => goToInvoice(app)} style={{ padding: isMobile ? '4px 6px' : '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#1E1E3F', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '9px' : '11px' }}>فاتورة</button><button onClick={() => openEdit(app)} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '8px', border: 'none', backgroundColor: '#EFF6FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={isMobile ? 12 : 16} color="#3B82F6" /></button></>)}
                    {app.status === 'paid' && <span style={{ fontSize: isMobile ? '9px' : '11px', color: '#8B8B8B' }}>تم الدفع</span>}
                    {app.status === 'cancelled' && <button onClick={() => updateStatus(app.id, 'confirmed')} style={{ padding: isMobile ? '4px 6px' : '6px 10px', borderRadius: '8px', border: 'none', backgroundColor: '#D1FAE5', color: '#065F46', cursor: 'pointer', fontSize: isMobile ? '9px' : '11px' }}>استعادة</button>}
                    <button onClick={() => deleteAppointment(app.id)} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '8px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width={isMobile ? '12' : '16'} height={isMobile ? '12' : '16'} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                  </div>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>

      {/* تعديل */}
      {editingAppointment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '16px' : '28px', width: '100%', maxWidth: isMobile ? '90vw' : '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '18px', margin: 0 }}>تعديل الموعد</h3><button onClick={() => setEditingAppointment(null)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button></div>
            <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '12px' }}>التاريخ</label><input type="date" value={editForm.appointment_date} onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', boxSizing: 'border-box' }} /></div>
            <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '12px' }}>الوقت</label><input type="time" value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', boxSizing: 'border-box' }} /></div>
            <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setEditingAppointment(null)} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', color: '#8B8B8B', fontWeight: '600', cursor: 'pointer' }}>إلغاء</button><button onClick={saveEdit} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: '#1E1E3F', color: 'white', fontWeight: '600', cursor: 'pointer' }}>حفظ</button></div>
          </div>
        </div>
      )}
    </div>
  )
}