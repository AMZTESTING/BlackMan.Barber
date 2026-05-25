import { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { supabase } from '../lib/supabase'
import PrintableInvoice from '../components/PrintableInvoice'
import { 
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone,
  User, X, Printer, Check, ShoppingCart, Scissors, UserPlus, Phone
} from 'lucide-react'

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

export default function NewOrder() {
  const isMobile = useIsMobile()
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [customers, setCustomers] = useState([])
  const [barbers, setBarbers] = useState([])
  const [cart, setCart] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('كاش')
  const [lastOrder, setLastOrder] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' })
  const [customerSearch, setCustomerSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('الكل')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [discountType, setDiscountType] = useState('none')
  const [discountValue, setDiscountValue] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [appointmentId, setAppointmentId] = useState(null)
  const [appointmentNumber, setAppointmentNumber] = useState(null)
  const printRef = useRef()

  useEffect(() => {
    loadServices(); loadCustomers(); loadCategories(); loadBarbers(); loadSettings()
    const appointmentData = sessionStorage.getItem('fromAppointment')
    if (appointmentData) {
      try {
        const parsed = JSON.parse(appointmentData)
        if (parsed.customer && parsed.customer.id) setSelectedCustomer({ id: parsed.customer.id, name: parsed.customer.name, phone: parsed.customer.phone })
        if (parsed.appointmentId) setAppointmentId(parsed.appointmentId)
        if (parsed.appointmentNumber) setAppointmentNumber(parsed.appointmentNumber)
        if (parsed.serviceIds && parsed.serviceIds.length > 0) window.__pendingServiceIds = parsed.serviceIds
      } catch (e) { console.error('Error:', e) }
      sessionStorage.removeItem('fromAppointment')
    }
  }, [])

  useEffect(() => {
    if (window.__pendingServiceIds && services.length > 0) {
      window.__pendingServiceIds.forEach(id => {
        const fullService = services.find(s => s.id === id)
        if (fullService) setCart(prev => { const exists = prev.find(item => item.id === fullService.id); if (exists) return prev; return [...prev, { ...fullService, quantity: 1, barber_id: null, barber_name: '' }] })
      })
      window.__pendingServiceIds = null
    }
  }, [services])

  async function loadServices() { const { data } = await supabase.from('services').select('*, categories(name)').eq('is_active', true).order('name'); setServices(data || []) }
  async function loadCustomers() { const { data } = await supabase.from('customers').select('*').order('name'); setCustomers(data || []) }
  async function loadCategories() { const { data } = await supabase.from('categories').select('*').order('name'); setCategories(data || []) }
  async function loadBarbers() { const { data } = await supabase.from('barbers').select('*').eq('is_active', true).order('name'); setBarbers(data || []) }
  async function loadSettings() { const { data } = await supabase.from('settings').select('*').eq('key', 'tax_rate').single(); if (data) setTaxRate(parseFloat(data.value) || 0) }

  function addToCart(service) { if (!service?.id) return; setCart(prev => { const exists = prev.find(item => item.id === service.id); if (exists) return prev.map(item => item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item); return [...prev, { ...service, quantity: 1, barber_id: null, barber_name: '' }] }) }
  function removeFromCart(id) { setCart(prev => prev.filter(i => i.id !== id)) }
  function updateQuantity(id, d) { setCart(prev => prev.map(i => i.id === id ? (i.quantity + d <= 0 ? null : { ...i, quantity: i.quantity + d }) : i).filter(Boolean)) }
  function assignBarberToItem(id, barberId) { const barber = barbers.find(b => b.id === parseInt(barberId)); setCart(prev => prev.map(i => i.id === id ? { ...i, barber_id: barber?.id || null, barber_name: barber?.name || '' } : i)) }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  function getDiscountAmount() {
    if (discountType === 'none' || !discountValue) return 0
    if (discountType === 'percent') return subtotal * (parseFloat(discountValue) / 100)
    if (discountType === 'fixed') return parseFloat(discountValue) || 0
    return 0
  }

  const discountAmount = getDiscountAmount()
  const afterDiscount = subtotal - discountAmount
  const taxAmount = afterDiscount * (taxRate / 100)
  const finalTotal = afterDiscount + taxAmount

  async function addNewCustomer() { if (!newCustomer.name || !newCustomer.phone) return alert('الاسم والجوال مطلوبين'); const { data, error } = await supabase.from('customers').insert({ name: newCustomer.name, phone: newCustomer.phone }).select().single(); if (error) { alert('خطأ: ' + error.message); return } setSelectedCustomer(data); setNewCustomer({ name: '', phone: '' }); setAddingCustomer(false); loadCustomers() }
  const filteredCustomers = customers.filter(c => c.name?.includes(customerSearch) || c.phone?.includes(customerSearch))

  async function generateInvoiceNumber() { if (appointmentId && appointmentNumber) return appointmentNumber; const { data: counter } = await supabase.from('invoice_counter').select('last_number').single(); const nextNumber = (counter?.last_number || 0) + 1; const invoiceNumber = `A${String(nextNumber).padStart(4, '0')}`; await supabase.from('invoice_counter').update({ last_number: nextNumber }).eq('id', 1); return invoiceNumber }

  async function completeSale() {
    if (cart.length === 0) return alert('السلة فارغة')
    if (!selectedCustomer || !selectedCustomer.id) return alert('الرجاء اختيار عميل')
    if (!selectedBarber) { const unassigned = cart.filter(item => !item.barber_id); if (unassigned.length > 0) return alert(`الرجاء تعيين حلاق للخدمة: ${unassigned[0].name}`) }
    const barberNameForOrder = selectedBarber ? selectedBarber.name : cart.map(item => `${item.name}: ${item.barber_name}`).join(' | ')
    const invoiceNumber = await generateInvoiceNumber()
    const { data: order, error } = await supabase.from('orders').insert({ customer_id: selectedCustomer.id, barber_name: barberNameForOrder, total_amount: finalTotal, payment_method: paymentMethod, invoice_number: invoiceNumber, appointment_id: appointmentId || null }).select().single()
    if (error) { alert('خطأ: ' + error.message); return }
    await supabase.from('order_items').insert(cart.map(item => ({ order_id: order.id, service_name: item.name, price: item.price, quantity: item.quantity })))
    if (appointmentId) await supabase.from('appointments').update({ status: 'paid' }).eq('id', appointmentId)
    setLastOrder({ ...order, customer: selectedCustomer, services: cart.map(item => ({ name: item.name, price: item.price, quantity: item.quantity || 1 })), subtotal, discountAmount, discountPercent: discountType === 'percent' ? parseFloat(discountValue) : 0, taxAmount, taxRate, finalTotal })
    setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2000); setTimeout(() => handlePrint(), 500)
    setCart([]); setSelectedCustomer(null); setSelectedBarber(null); setPaymentMethod('كاش'); setDiscountType('none'); setDiscountValue(''); setAppointmentId(null); setAppointmentNumber(null)
  }

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'فاتورة', pageStyle: '@page { size: 80mm auto; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; } }' })
  const filteredServices = services.filter(s => { const m = s.name?.includes(searchQuery) || s.categories?.name?.includes(searchQuery); const c = activeCategory === 'الكل' || s.categories?.name === activeCategory; return m && c })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px', height: '100%' }}>
      {showSuccess && (<div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#10B981', color: 'white', padding: '12px 24px', borderRadius: '14px', zIndex: 2000, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 30px rgba(16,185,129,0.4)', fontWeight: '700', fontSize: '15px' }}><Check size={20} /> تم البيع بنجاح!</div>)}
      {appointmentId && (<div style={{ backgroundColor: '#FFFBF0', border: '1px solid #C9A84C', color: '#1E1E3F', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>📅 تم تحويل الحجز #{appointmentNumber} إلى فاتورة</div>)}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#1E1E3F', margin: 0 }}>نقطة البيع</h1><div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '12px', backgroundColor: 'white', padding: isMobile ? '6px 10px' : '8px 14px', borderRadius: '10px' }}>{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '8px' : '14px', flex: 1, overflow: 'hidden' }}>
        {/* قسم الخدمات */}
        <div style={{ flex: isMobile ? 'none' : 1, height: isMobile ? '45%' : 'auto', display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '10px', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ position: 'relative' }}><Search size={isMobile ? 14 : 16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} /><input type="text" placeholder="ابحث عن خدمة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: isMobile ? '10px 32px 10px 10px' : '12px 38px 12px 12px', borderRadius: '12px', border: 'none', backgroundColor: 'white', fontSize: isMobile ? '12px' : '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', boxSizing: 'border-box' }} /></div>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveCategory('الكل')} style={{ padding: isMobile ? '5px 10px' : '6px 14px', borderRadius: '10px', border: 'none', backgroundColor: activeCategory === 'الكل' ? '#1E1E3F' : 'white', color: activeCategory === 'الكل' ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '10px' : '12px' }}>الكل</button>
            {categories.map(cat => (<button key={cat.id} onClick={() => setActiveCategory(cat.name)} style={{ padding: isMobile ? '5px 10px' : '6px 14px', borderRadius: '10px', border: 'none', backgroundColor: activeCategory === cat.name ? '#C9A84C' : 'white', color: activeCategory === cat.name ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '10px' : '12px' }}>{cat.name}</button>))}
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '110px' : '140px'}, 1fr))`, gap: isMobile ? '6px' : '10px', alignContent: 'start', paddingBottom: '6px' }}>
            {filteredServices.map(service => (
              <div key={service.id} onClick={() => addToCart(service)} style={{ backgroundColor: 'white', borderRadius: '14px', padding: isMobile ? '10px' : '14px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '2px solid transparent', transition: 'all 0.2s', userSelect: 'none' }}>
                <div style={{ width: '100%', height: isMobile ? '60px' : '80px', borderRadius: '10px', overflow: 'hidden', marginBottom: '6px', backgroundColor: '#F5F0EB' }}>{service.image_url ? <img src={service.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '24px' : '32px' }}>💇</div>}</div>
                <div style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '11px' : '13px', marginBottom: '2px' }}>{service.name}</div>
                <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#8B8B8B', marginBottom: '2px' }}>{service.duration} دقيقة</div>
                <div style={{ fontWeight: 'bold', color: '#C9A84C', fontSize: isMobile ? '13px' : '15px' }}>{formatPrice(service.price)} ريال</div>
              </div>
            ))}
          </div>
        </div>

        {/* السلة */}
        <div style={{ width: isMobile ? '100%' : '380px', display: 'flex', flexDirection: 'column', flexShrink: 0, maxHeight: isMobile ? 'none' : 'calc(100vh - 90px)', flex: isMobile ? 1 : 'none' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '18px', boxShadow: '0 2px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: isMobile ? '12px' : '16px', borderBottom: '1px solid #F5F0EB', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}><ShoppingCart size={isMobile ? 16 : 20} color="#C9A84C" /><h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '14px' : '16px', margin: 0 }}>السلة</h2><span style={{ marginRight: 'auto', backgroundColor: '#F5F0EB', padding: isMobile ? '2px 8px' : '3px 10px', borderRadius: '6px', fontSize: isMobile ? '10px' : '11px', color: '#8B8B8B' }}>{cart.reduce((sum, i) => sum + i.quantity, 0)} خدمة</span></div>
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '6px' : '10px' }}>
              {cart.length === 0 ? (<div style={{ textAlign: 'center', color: '#D1D5DB', padding: isMobile ? '20px 0' : '30px 0' }}><Scissors size={isMobile ? 28 : 36} style={{ marginBottom: '6px', opacity: 0.3 }} /><div style={{ fontSize: isMobile ? '12px' : '14px' }}>السلة فارغة</div></div>) : cart.map(item => (
                <div key={item.id} style={{ padding: isMobile ? '6px' : '8px', borderRadius: '10px', marginBottom: isMobile ? '4px' : '6px', backgroundColor: '#FAFAFA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: !selectedBarber ? '6px' : '0' }}>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '11px' : '13px' }}>{item.name}</div><div style={{ color: '#C9A84C', fontWeight: 'bold', fontSize: isMobile ? '10px' : '12px' }}>{formatPrice(item.price)} ريال</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button onClick={() => updateQuantity(item.id, -1)} style={{ width: isMobile ? '22px' : '24px', height: isMobile ? '22px' : '24px', borderRadius: '6px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={isMobile ? 10 : 12} color="#EF4444" /></button>
                      <span style={{ fontWeight: '600', minWidth: '16px', textAlign: 'center', fontSize: isMobile ? '11px' : '12px' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} style={{ width: isMobile ? '22px' : '24px', height: isMobile ? '22px' : '24px', borderRadius: '6px', border: 'none', backgroundColor: '#D1FAE5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={isMobile ? 10 : 12} color="#10B981" /></button>
                      <button onClick={() => removeFromCart(item.id)} style={{ width: isMobile ? '22px' : '24px', height: isMobile ? '22px' : '24px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}><Trash2 size={isMobile ? 10 : 12} color="#EF4444" /></button>
                    </div>
                  </div>
                  {!selectedBarber && (<select value={item.barber_id || ''} onChange={(e) => assignBarberToItem(item.id, e.target.value)} style={{ width: '100%', padding: '5px', borderRadius: '8px', border: item.barber_id ? '1px solid #C9A84C' : '1px dashed #D1D5DB', backgroundColor: item.barber_id ? '#FFFBF0' : '#FAFAFA', fontSize: isMobile ? '9px' : '10px', color: item.barber_id ? '#1E1E3F' : '#8B8B8B', boxSizing: 'border-box' }}><option value="">👤 تعيين حلاق...</option>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>)}
                </div>
              ))}
            </div>
            <div style={{ padding: isMobile ? '8px 10px' : '10px 14px', borderTop: '1px solid #F5F0EB', flexShrink: 0 }}>
              {/* ✅ تم تغيير الزر الخارجي من button إلى div لحل مشكلة button داخل button */}
              <div onClick={() => setShowCustomerModal(true)} style={{ width: '100%', padding: isMobile ? '6px 8px' : '8px 10px', borderRadius: '10px', border: selectedCustomer ? '2px solid #C9A84C' : '2px dashed #D1D5DB', backgroundColor: selectedCustomer ? '#FFFBF0' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: isMobile ? '11px' : '12px', color: selectedCustomer ? '#1E1E3F' : '#8B8B8B', boxSizing: 'border-box' }}><User size={isMobile ? 12 : 14} color={selectedCustomer ? '#C9A84C' : '#8B8B8B'} />{selectedCustomer ? <span style={{ fontWeight: '600', fontSize: isMobile ? '11px' : '12px' }}>{selectedCustomer.name}</span> : 'اختيار عميل...'}{selectedCustomer && <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null) }} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}><X size={isMobile ? 10 : 12} color="#8B8B8B" /></button>}</div>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
                <select value={selectedBarber?.id || ''} onChange={(e) => { const barber = barbers.find(b => b.id === parseInt(e.target.value)); setSelectedBarber(barber || null); if (barber) setCart(prev => prev.map(item => ({ ...item, barber_id: null, barber_name: '' }))) }} style={{ flex: 1, padding: isMobile ? '6px 4px' : '8px 6px', borderRadius: '10px', border: selectedBarber ? '2px solid #C9A84C' : '2px dashed #D1D5DB', backgroundColor: selectedBarber ? '#FFFBF0' : 'transparent', cursor: 'pointer', fontSize: isMobile ? '10px' : '11px', color: selectedBarber ? '#1E1E3F' : '#8B8B8B', boxSizing: 'border-box' }}><option value="">✂️ حلاق...</option>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              </div>
              <div style={{ marginBottom: '4px', paddingTop: '4px', borderTop: '1px solid #F5F0EB' }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
                  <button onClick={() => { setDiscountType('none'); setDiscountValue('') }} style={{ flex: 1, padding: isMobile ? '4px' : '5px', borderRadius: '8px', border: discountType === 'none' ? '2px solid #C9A84C' : '1px solid #E8E3DC', backgroundColor: discountType === 'none' ? '#FFFBF0' : 'white', cursor: 'pointer', fontSize: isMobile ? '9px' : '10px', fontWeight: '600', color: discountType === 'none' ? '#C9A84C' : '#8B8B8B' }}>بدون</button>
                  <button onClick={() => setDiscountType('percent')} style={{ flex: 1, padding: isMobile ? '4px' : '5px', borderRadius: '8px', border: discountType === 'percent' ? '2px solid #C9A84C' : '1px solid #E8E3DC', backgroundColor: discountType === 'percent' ? '#FFFBF0' : 'white', cursor: 'pointer', fontSize: isMobile ? '9px' : '10px', fontWeight: '600', color: discountType === 'percent' ? '#C9A84C' : '#8B8B8B' }}>%</button>
                  <button onClick={() => setDiscountType('fixed')} style={{ flex: 1, padding: isMobile ? '4px' : '5px', borderRadius: '8px', border: discountType === 'fixed' ? '2px solid #C9A84C' : '1px solid #E8E3DC', backgroundColor: discountType === 'fixed' ? '#FFFBF0' : 'white', cursor: 'pointer', fontSize: isMobile ? '9px' : '10px', fontWeight: '600', color: discountType === 'fixed' ? '#C9A84C' : '#8B8B8B' }}>ر.ع</button>
                </div>
                {discountType !== 'none' && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input type="text" inputMode="decimal" placeholder={discountType === 'percent' ? '%' : 'ر.ع'} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} style={{ flex: 1, padding: isMobile ? '5px' : '7px', borderRadius: '8px', border: '1px solid #E8E3DC', fontSize: isMobile ? '10px' : '12px', textAlign: 'center', boxSizing: 'border-box' }} />
                    {discountAmount > 0 && <span style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: '600', color: '#EF4444', whiteSpace: 'nowrap' }}>-{formatPrice(discountAmount)}</span>}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '10px' : '11px', color: '#8B8B8B', marginBottom: '1px' }}><span>المجموع</span><span>{formatPrice(subtotal)}</span></div>
                {discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '10px' : '11px', color: '#EF4444' }}><span>الخصم</span><span>-{formatPrice(discountAmount)}</span></div>}
                {taxRate > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '10px' : '11px', color: '#8B8B8B' }}><span>الضريبة</span><span>{formatPrice(taxAmount)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '14px' : '16px', paddingTop: '4px', borderTop: '1px solid #F5F0EB' }}><span>الإجمالي</span><span style={{ color: '#10B981' }}>{formatPrice(finalTotal)}</span></div>
              </div>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                {[{ key: 'كاش', icon: Banknote, label: 'نقداً' }, { key: 'بطاقة', icon: CreditCard, label: 'بطاقة' }, { key: 'تحويل', icon: Smartphone, label: 'تحويل' }].map(m => { const Icon = m.icon; return <button key={m.key} onClick={() => setPaymentMethod(m.key)} style={{ flex: 1, padding: isMobile ? '5px 3px' : '7px 4px', borderRadius: '8px', border: paymentMethod === m.key ? '2px solid #C9A84C' : '1px solid #E8E3DC', backgroundColor: paymentMethod === m.key ? '#FFFBF0' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', fontSize: isMobile ? '9px' : '10px', color: paymentMethod === m.key ? '#C9A84C' : '#8B8B8B' }}><Icon size={isMobile ? 12 : 14} /> {m.label}</button> })}
              </div>
              <button onClick={completeSale} disabled={cart.length === 0} style={{ width: '100%', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: 'none', backgroundColor: cart.length === 0 ? '#D1D5DB' : '#10B981', color: 'white', fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}>دفع {formatPrice(finalTotal)} ريال</button>
            </div>
          </div>
        </div>
      </div>

      {showCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '22px', width: '100%', maxWidth: isMobile ? '95vw' : '450px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ fontWeight: 'bold', fontSize: isMobile ? '15px' : '17px', color: '#1E1E3F', margin: 0 }}>{addingCustomer ? 'عميل جديد' : 'اختيار العميل'}</h3><button onClick={() => { setShowCustomerModal(false); setAddingCustomer(false) }} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={14} /></button></div>
            {!addingCustomer ? (<><div style={{ display: 'flex', gap: '6px' }}><div style={{ flex: 1, position: 'relative' }}><Search size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} /><input type="text" placeholder="بحث..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} style={{ width: '100%', padding: isMobile ? '8px 26px 8px 8px' : '10px 30px 10px 10px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '12px' : '13px', boxSizing: 'border-box' }} /></div><button onClick={() => { setAddingCustomer(true); setNewCustomer({ name: '', phone: '' }) }} style={{ padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: '10px', border: 'none', backgroundColor: '#1E1E3F', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '11px' : '12px', whiteSpace: 'nowrap' }}><UserPlus size={12} /> جديد</button></div><div style={{ flex: 1, overflow: 'auto' }}>{filteredCustomers.map(c => (<div key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerModal(false); setCustomerSearch('') }} style={{ padding: isMobile ? '8px' : '10px', borderRadius: '12px', cursor: 'pointer', marginBottom: '3px', backgroundColor: selectedCustomer?.id === c.id ? '#FFFBF0' : 'transparent', border: selectedCustomer?.id === c.id ? '1px solid #C9A84C' : '1px solid transparent', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: isMobile ? '30px' : '36px', height: isMobile ? '30px' : '36px', borderRadius: '10px', backgroundColor: '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={isMobile ? 16 : 18} color="#C9A84C" /></div><div style={{ flex: 1 }}><div style={{ fontWeight: '600', fontSize: isMobile ? '12px' : '14px' }}>{c.name}</div><div style={{ fontSize: isMobile ? '10px' : '11px', color: '#8B8B8B' }}>{c.phone}</div></div>{selectedCustomer?.id === c.id && <Check size={isMobile ? 14 : 16} color="#C9A84C" />}</div>))}</div></>) : (<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '3px', fontSize: isMobile ? '12px' : '13px' }}>اسم العميل</label><input type="text" placeholder="أدخل اسم العميل" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '14px', boxSizing: 'border-box' }} autoFocus /></div><div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '3px', fontSize: isMobile ? '12px' : '13px' }}>رقم الجوال</label><input type="tel" placeholder="05xxxxxxxx" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '14px', direction: 'ltr', textAlign: 'right', boxSizing: 'border-box' }} /></div><div style={{ display: 'flex', gap: '6px' }}><button onClick={() => setAddingCustomer(false)} style={{ flex: 1, padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F5F0EB', color: '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>رجوع</button><button onClick={addNewCustomer} style={{ flex: 1, padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: 'none', backgroundColor: '#10B981', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>حفظ</button></div></div>)}
          </div>
        </div>
      )}

      <div style={{ display: 'none' }}>{lastOrder && (<div ref={printRef}><PrintableInvoice order={lastOrder} /></div>)}</div>
    </div>
  )
}