import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatPrice(price) {
  if (!price && price !== 0) return '0.000'
  const parts = price.toString().split('.')
  const rial = parts[0] || '0'
  const baisa = (parts[1] || '').padEnd(3, '0').substring(0, 3)
  return `${rial}.${baisa}`
}

export default function PrintableInvoice({ order }) {
  const [settings, setSettings] = useState({})

  useEffect(() => {
    async function loadInvoiceSettings() {
      const { data } = await supabase.from('settings').select('*')
      if (data) {
        const s = {}
        data.forEach(item => { s[item.key] = item.value })
        setSettings(s)
      }
    }
    loadInvoiceSettings()
  }, [])

  const today = new Date()
  const dateEn = today.toLocaleDateString('en-US')
  const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  
  const services = order.services || []
  const subtotal = order.subtotal || order.total_amount || 0
  const discountAmount = order.discountAmount || 0
  const discountPercent = order.discountPercent || 0
  const taxAmount = order.taxAmount || 0
  const taxRate = order.taxRate || 0
  const finalTotal = order.finalTotal || order.total_amount || 0
  const hasDiscount = discountAmount > 0
  const hasTax = taxAmount > 0

  return (
    <div style={{
      width: '80mm',
      margin: '0 auto',
      padding: '4mm 4mm',
      fontFamily: "'Courier New', 'Consolas', 'Monaco', monospace",
      backgroundColor: 'white',
      color: '#000000',
      fontSize: '11px',
      lineHeight: '1.6',
      boxSizing: 'border-box',
      direction: 'rtl',
      fontWeight: 'normal'
    }}>
      
      {/* ========== الهيدر ========== */}
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        {settings.logo_url && (
          <img src={settings.logo_url} alt="LOGO" style={{ width: '35mm', height: 'auto', marginBottom: '2mm', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
        )}
        <div style={{ fontWeight: 'bold', fontSize: '20px', letterSpacing: '3px', marginBottom: '2mm', color: '#000', fontFamily: "'Arial Black', 'Arial', sans-serif" }}>
          {settings.invoice_header || 'BLACK MAN'}
        </div>
        <div style={{ fontSize: '12px', color: '#000', marginBottom: '1mm', fontWeight: 'bold', fontFamily: "'Arial', sans-serif" }}>
          {settings.invoice_subheader || 'صالون حلاقة رجالي'}
        </div>
        <div style={{ fontSize: '11px', color: '#000', fontFamily: "'Arial', sans-serif" }}>
          س.ت: {settings.invoice_cr || '1234567890'}
        </div>
      </div>

      <div style={{ borderTop: '2px solid #000', margin: '3mm 0' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3mm', fontSize: '13px' }}>
        <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'right' }}>فاتورة</span>
        <span style={{ fontWeight: 'bold', width: '40%', textAlign: 'center', fontSize: '15px', color: '#000' }}>#{order.invoice_number || order.id}</span>
        <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'left' }}>Invoice</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3mm', fontSize: '12px', color: '#000' }}>
        <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'right' }}>الوقت والتاريخ</span>
        <span style={{ fontWeight: 'bold', width: '40%', textAlign: 'center', fontSize: '12px' }}>{dateEn} | {timeStr}</span>
        <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'left' }}>Date & Time</span>
      </div>

      <div style={{ borderTop: '1px dashed #666', margin: '3mm 0' }}></div>

      <div style={{ 
        backgroundColor: '#F5F5F5', 
        borderRadius: '3mm', 
        padding: '3mm 4mm', 
        marginBottom: '4mm',
        border: '1px solid #BBB'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm', fontSize: '12px' }}>
          <span style={{ fontWeight: 'bold', width: '25%', textAlign: 'right' }}>الاسم</span>
          <span style={{ fontWeight: 'bold', width: '50%', textAlign: 'center', fontSize: '13px' }}>{order.customer?.name || 'عميل'}</span>
          <span style={{ fontWeight: 'bold', width: '25%', textAlign: 'left' }}>Name</span>
        </div>
        
        {order.customer?.phone && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold', width: '25%', textAlign: 'right' }}>الجوال</span>
            <span style={{ fontWeight: 'bold', width: '50%', textAlign: 'center', fontSize: '13px' }}>{order.customer.phone}</span>
            <span style={{ fontWeight: 'bold', width: '25%', textAlign: 'left' }}>Phone</span>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ fontWeight: 'bold', width: '25%', textAlign: 'right' }}>الحلاق</span>
          <span style={{ fontWeight: 'bold', width: '50%', textAlign: 'center', fontSize: '13px' }}>{order.barber_name || '-'}</span>
          <span style={{ fontWeight: 'bold', width: '25%', textAlign: 'left' }}>Barber</span>
        </div>
      </div>

      <div style={{ borderTop: '2px solid #000', margin: '3mm 0' }}></div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            <th style={{ textAlign: 'center', padding: '3mm 2mm', fontSize: '14px', fontWeight: '900', width: '50%' }}>الخدمة / Service</th>
            <th style={{ textAlign: 'center', padding: '3mm 2mm', fontSize: '14px', fontWeight: '900', width: '25%' }}>السعر / Price</th>
            <th style={{ textAlign: 'center', padding: '3mm 2mm', fontSize: '14px', fontWeight: '900', width: '25%' }}>العدد / Qty</th>
          </tr>
        </thead>
        <tbody>
          {services.length > 0 ? services.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #999' }}>
              <td style={{ textAlign: 'center', padding: '3mm 2mm', fontSize: '14px', fontWeight: 'bold' }}>
                {item.isBundle ? `📦 ${item.name}` : item.name}
              </td>
              <td style={{ textAlign: 'center', padding: '3mm 2mm', fontSize: '14px', fontWeight: 'bold' }}>
                {formatPrice(item.price)} ر.ع
              </td>
              <td style={{ textAlign: 'center', padding: '3mm 2mm', fontSize: '14px', fontWeight: 'bold' }}>
                {item.quantity || 1}
              </td>
            </tr>
          )) : (
            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '5mm', fontSize: '14px' }}>لا توجد خدمات</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ borderTop: '2px solid #000', paddingTop: '3mm', marginBottom: '3mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm', fontSize: '12px' }}>
          <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'right' }}>المجموع</span>
          <span style={{ fontWeight: 'bold', width: '40%', textAlign: 'center', fontSize: '13px' }}>{formatPrice(subtotal)} ر.ع</span>
          <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'left' }}>Subtotal</span>
        </div>
        
        {hasDiscount && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm', fontSize: '12px', color: '#CC0000' }}>
            <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'right' }}>الخصم ({discountPercent}%)</span>
            <span style={{ fontWeight: 'bold', width: '40%', textAlign: 'center', fontSize: '13px' }}>-{formatPrice(discountAmount)} ر.ع</span>
            <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'left' }}>Discount</span>
          </div>
        )}
        
        {hasTax && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'right' }}>الضريبة ({taxRate}%)</span>
            <span style={{ fontWeight: 'bold', width: '40%', textAlign: 'center', fontSize: '13px' }}>{formatPrice(taxAmount)} ر.ع</span>
            <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'left' }}>VAT</span>
          </div>
        )}
      </div>

      <div style={{
        backgroundColor: '#000000',
        color: '#FFFFFF',
        padding: '3mm 5mm',
        borderRadius: '3mm',
        marginBottom: '4mm',
        marginTop: '3mm',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        fontWeight: 'bold'
      }}>
        <span>الإجمالي / TOTAL</span>
        <span style={{ fontSize: '16px' }}>{formatPrice(finalTotal)} ر.ع</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3mm', fontSize: '12px' }}>
        <span style={{ fontWeight: 'bold', width: '35%', textAlign: 'right' }}>طريقة الدفع</span>
        <span style={{ fontWeight: 'bold', width: '30%', textAlign: 'center', fontSize: '13px' }}>{order.payment_method}</span>
        <span style={{ fontWeight: 'bold', width: '35%', textAlign: 'left' }}>Payment Method</span>
      </div>

      <div style={{ borderTop: '1px dashed #666', margin: '3mm 0' }}></div>

      <div style={{ textAlign: 'center', fontSize: '11px', color: '#000', fontFamily: "'Arial', sans-serif" }}>
        <div style={{ marginBottom: '2mm', fontWeight: 'bold', fontSize: '13px' }}>
          {settings.invoice_footer || 'شكراً لزيارتكم'}
        </div>
        <div style={{ marginBottom: '2mm', fontSize: '10px' }}>
          {settings.invoice_return_policy || 'لا يمكن استرجاع أو استبدال المنتجات'}
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
          للتواصل: {settings.invoice_phone || '91234567'}
        </div>
      </div>
    </div>
  )
}