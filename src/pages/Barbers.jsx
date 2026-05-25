import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, User, Phone, Mail, Edit2, Trash2, X, Clock, Upload } from 'lucide-react'

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return isMobile
}

export default function Barbers() {
  const isMobile = useIsMobile()
  const [barbers, setBarbers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showSchedule, setShowSchedule] = useState(null)
  const [editId, setEditId] = useState(null)
  const [newBarber, setNewBarber] = useState({ name: '', phone: '', email: '', specialty: '', image_url: '' })
  const [schedules, setSchedules] = useState({})
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadBarbers() }, [])

  async function loadBarbers() {
    const { data } = await supabase.from('barbers').select('*').order('name')
    setBarbers(data || [])
    if (data) { const all = {}; for (const b of data) { const { data: sch } = await supabase.from('barber_schedules').select('*').eq('barber_id', b.id); all[b.id] = sch || [] }; setSchedules(all) }
  }

  async function openSchedule(barber) { const { data } = await supabase.from('barber_schedules').select('*').eq('barber_id', barber.id).order('day_of_week'); setSchedules(prev => ({ ...prev, [barber.id]: data || [] })); setShowSchedule(barber.id) }

  async function updateScheduleDay(barberId, dayIndex, field, value) {
    const current = schedules[barberId] || []; const existing = current.find(s => s.day_of_week === dayIndex)
    if (existing) await supabase.from('barber_schedules').update({ [field]: value }).eq('id', existing.id)
    else await supabase.from('barber_schedules').insert({ barber_id: barberId, day_of_week: dayIndex, start_time: '09:00', end_time: '22:00', is_working_day: true, [field]: value })
    const { data } = await supabase.from('barber_schedules').select('*').eq('barber_id', barberId).order('day_of_week'); setSchedules(prev => ({ ...prev, [barberId]: data || [] }))
  }

  async function toggleWorkingDay(barberId, dayIndex) {
    const current = schedules[barberId] || []; const existing = current.find(s => s.day_of_week === dayIndex)
    if (existing) await supabase.from('barber_schedules').update({ is_working_day: !existing.is_working_day }).eq('id', existing.id)
    else await supabase.from('barber_schedules').insert({ barber_id: barberId, day_of_week: dayIndex, start_time: '09:00', end_time: '22:00', is_working_day: false })
    const { data } = await supabase.from('barber_schedules').select('*').eq('barber_id', barberId).order('day_of_week'); setSchedules(prev => ({ ...prev, [barberId]: data || [] }))
  }

  async function uploadImage(file) { setUploading(true); const fileName = `barber-${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('services-images').upload(fileName, file); if (error) { alert('خطأ'); setUploading(false); return null }; const { data: urlData } = supabase.storage.from('services-images').getPublicUrl(fileName); setUploading(false); return urlData.publicUrl }
  async function handleImageChange(e) { const file = e.target.files[0]; if (!file) return; const url = await uploadImage(file); if (url) setNewBarber({ ...newBarber, image_url: url }) }

  async function saveBarber() { if (!newBarber.name) return alert('الاسم مطلوب'); setLoading(true); if (editId) await supabase.from('barbers').update(newBarber).eq('id', editId); else await supabase.from('barbers').insert(newBarber); setNewBarber({ name: '', phone: '', email: '', specialty: '', image_url: '' }); setShowForm(false); setEditId(null); setLoading(false); loadBarbers() }
  async function deleteBarber(id) { if (confirm('حذف؟')) { await supabase.from('barbers').delete().eq('id', id); loadBarbers() } }
  async function toggleActive(id, current) { await supabase.from('barbers').update({ is_active: !current }).eq('id', id); loadBarbers() }
  function editBarber(barber) { setNewBarber({ name: barber.name, phone: barber.phone || '', email: barber.email || '', specialty: barber.specialty || '', image_url: barber.image_url || '' }); setEditId(barber.id); setShowForm(true) }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '28px', flexWrap: 'wrap', gap: '10px' }}>
        <div><h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>الحلاقين</h1><p style={{ color: '#8B8B8B', fontSize: isMobile ? '14px' : '17px' }}>إدارة فريق العمل والأوقات</p></div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setNewBarber({ name: '', phone: '', email: '', specialty: '', image_url: '' }) }} style={{ backgroundColor: '#1E1E3F', color: 'white', padding: isMobile ? '10px 16px' : '14px 24px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={isMobile ? 16 : 20} /> إضافة حلاق</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, 1fr)`, gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '16px' : '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}><div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>عدد الحلاقين</div><div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#3B82F6', marginTop: '4px' }}>{barbers.length}</div></div>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}><div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>نشط</div><div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#10B981', marginTop: '4px' }}>{barbers.filter(b => b.is_active).length}</div></div>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}><div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>غير نشط</div><div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#EF4444', marginTop: '4px' }}>{barbers.filter(b => !b.is_active).length}</div></div>
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', marginBottom: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}><h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '18px' }}>{editId ? 'تعديل بيانات الحلاق' : 'إضافة حلاق جديد'}</h3><button onClick={() => setShowForm(false)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button></div>

          <div style={{ textAlign: 'center', marginBottom: isMobile ? '14px' : '20px' }}>
            {newBarber.image_url ? <div style={{ position: 'relative', width: isMobile ? '70px' : '100px', height: isMobile ? '70px' : '100px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto' }}><img src={newBarber.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><button onClick={() => setNewBarber({ ...newBarber, image_url: '' })} style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="white" /></button></div> : <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: isMobile ? '70px' : '100px', height: isMobile ? '70px' : '100px', borderRadius: '50%', border: '2px dashed #D1D5DB', margin: '0 auto', cursor: 'pointer', gap: '4px' }}><Upload size={isMobile ? 18 : 24} color="#8B8B8B" /><span style={{ fontSize: isMobile ? '9px' : '10px', color: '#8B8B8B' }}>رفع صورة</span><input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} /></label>}
            {uploading && <span style={{ fontSize: '11px', color: '#C9A84C' }}>جاري الرفع...</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '13px' }}>الاسم *</label><input type="text" placeholder="اسم الحلاق" value={newBarber.name} onChange={(e) => setNewBarber({ ...newBarber, name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '13px' }}>التخصص</label><input type="text" placeholder="قص شعر" value={newBarber.specialty} onChange={(e) => setNewBarber({ ...newBarber, specialty: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '13px' }}>رقم الجوال</label><input type="tel" placeholder="05xxxxxxxx" value={newBarber.phone} onChange={(e) => setNewBarber({ ...newBarber, phone: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '13px' }}>الإيميل</label><input type="email" placeholder="example@mail.com" value={newBarber.email} onChange={(e) => setNewBarber({ ...newBarber, email: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: '14px', boxSizing: 'border-box' }} /></div>
          </div>

          <button onClick={saveBarber} disabled={loading} style={{ width: '100%', padding: isMobile ? '12px' : '16px', backgroundColor: '#C9A84C', color: 'white', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'جاري الحفظ...' : editId ? 'تحديث' : 'حفظ'}</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '280px' : '320px'}, 1fr))`, gap: isMobile ? '12px' : '20px' }}>
        {barbers.map(barber => (
          <div key={barber.id} style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', opacity: barber.is_active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', gap: isMobile ? '10px' : '16px', marginBottom: isMobile ? '12px' : '16px' }}>
              <div style={{ width: isMobile ? '50px' : '72px', height: isMobile ? '50px' : '72px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#F5F0EB' }}>{barber.image_url ? <img src={barber.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #C9A84C, #E0B050)' }}><User size={isMobile ? 24 : 32} color="white" /></div>}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div><h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '14px' : '17px', marginBottom: '2px' }}>{barber.name}</h3><p style={{ fontSize: isMobile ? '11px' : '13px', color: '#8B8B8B', margin: 0 }}>{barber.specialty || 'حلاق'}</p></div>
                  <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: isMobile ? '10px' : '11px', fontWeight: '600', backgroundColor: barber.is_active ? '#D1FAE5' : '#FEE2E2', color: barber.is_active ? '#065F46' : '#991B1B' }}>{barber.is_active ? 'نشط' : 'غير نشط'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: isMobile ? '6px' : '8px' }}>
                  {barber.phone && <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#8B8B8B', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={isMobile ? 10 : 12} /> {barber.phone}</div>}
                  {barber.email && <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#8B8B8B', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={isMobile ? 10 : 12} /> {barber.email}</div>}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F5F0EB', paddingTop: isMobile ? '8px' : '12px', marginBottom: isMobile ? '10px' : '14px' }}>
              <button onClick={() => openSchedule(barber)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#C9A84C', fontWeight: '600', fontSize: isMobile ? '11px' : '13px', padding: 0 }}><Clock size={isMobile ? 12 : 14} /> أوقات العمل والإجازات</button>
              <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px', marginTop: isMobile ? '6px' : '8px', flexWrap: 'wrap' }}>{DAYS.map((day, i) => { const sch = (schedules[barber.id] || []).find(s => s.day_of_week === i); const isWorking = sch ? sch.is_working_day : true; return <div key={i} style={{ padding: isMobile ? '2px 5px' : '3px 8px', borderRadius: '6px', fontSize: isMobile ? '9px' : '10px', fontWeight: '600', backgroundColor: isWorking ? '#D1FAE5' : '#FEE2E2', color: isWorking ? '#065F46' : '#991B1B' }}>{day.substring(0, isMobile ? 2 : 3)}</div> })}</div>
            </div>

            <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px' }}>
              <button onClick={() => editBarber(barber)} style={{ flex: 1, padding: isMobile ? '8px' : '10px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', color: '#1E1E3F', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: isMobile ? '11px' : '13px' }}><Edit2 size={isMobile ? 12 : 14} /> تعديل</button>
              <button onClick={() => toggleActive(barber.id, barber.is_active)} style={{ flex: 1, padding: isMobile ? '8px' : '10px', borderRadius: '12px', border: 'none', backgroundColor: barber.is_active ? '#FEF3C7' : '#D1FAE5', color: barber.is_active ? '#92400E' : '#065F46', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '11px' : '13px' }}>{barber.is_active ? 'تعطيل' : 'تفعيل'}</button>
              <button onClick={() => deleteBarber(barber.id)} style={{ width: isMobile ? '34px' : '40px', height: isMobile ? '34px' : '40px', borderRadius: '10px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={isMobile ? 14 : 15} color="#EF4444" /></button>
            </div>
          </div>
        ))}
      </div>

      {showSchedule && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '18px' : '32px', width: '100%', maxWidth: isMobile ? '95vw' : '650px', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '24px' }}><h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '20px' }}>{barbers.find(b => b.id === showSchedule)?.name}</h2><button onClick={() => setShowSchedule(null)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '10px' }}>
              {DAYS.map((day, i) => { const sch = (schedules[showSchedule] || []).find(s => s.day_of_week === i); const isWorking = sch ? sch.is_working_day : true; const start = sch?.start_time || '09:00'; const end = sch?.end_time || '22:00'
                return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '12px', padding: isMobile ? '8px' : '14px', borderRadius: '14px', backgroundColor: isWorking ? '#FAFAFA' : '#FEF2F2', border: isWorking ? '1px solid #F0F0F0' : '1px solid #FECACA' }}>
                  <button onClick={() => toggleWorkingDay(showSchedule, i)} style={{ width: isMobile ? '26px' : '36px', height: isMobile ? '26px' : '36px', borderRadius: '10px', border: 'none', backgroundColor: isWorking ? '#D1FAE5' : '#FEE2E2', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isWorking ? '✓' : '✕'}</button>
                  <div style={{ width: isMobile ? '50px' : '70px', fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '11px' : '14px' }}>{day}</div>
                  {isWorking ? <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', flex: 1 }}><input type="time" value={start} onChange={(e) => updateScheduleDay(showSchedule, i, 'start_time', e.target.value)} style={{ padding: isMobile ? '6px' : '8px 10px', borderRadius: '10px', border: '1px solid #E8E3DC', fontSize: isMobile ? '10px' : '13px', backgroundColor: 'white', width: isMobile ? '80px' : '110px' }} /><span style={{ color: '#8B8B8B', fontSize: isMobile ? '10px' : '13px' }}>-</span><input type="time" value={end} onChange={(e) => updateScheduleDay(showSchedule, i, 'end_time', e.target.value)} style={{ padding: isMobile ? '6px' : '8px 10px', borderRadius: '10px', border: '1px solid #E8E3DC', fontSize: isMobile ? '10px' : '13px', backgroundColor: 'white', width: isMobile ? '80px' : '110px' }} /></div> : <div style={{ flex: 1, color: '#EF4444', fontSize: isMobile ? '11px' : '13px', fontWeight: '600' }}>إجازة</div>}
                </div>
              })}
            </div>
            <button onClick={() => setShowSchedule(null)} style={{ width: '100%', marginTop: isMobile ? '16px' : '24px', padding: isMobile ? '12px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#1E1E3F', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '13px' : '14px' }}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  )
}