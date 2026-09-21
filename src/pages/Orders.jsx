import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useReactToPrint } from 'react-to-print'
import { supabase } from '../lib/supabase'
import PrintableInvoice from '../components/PrintableInvoice'
import { 
  Search, Calendar, User, Scissors, Package, Eye, Printer, Receipt, 
  CheckCircle, RefreshCw, TrendingUp, DollarSign, CreditCard, 
  Smartphone, Banknote, X, Download, Star
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

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

export default function Orders() {
  const { t, i18n } = useTranslation()
  const isMobile = useIsMobile()
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US'

  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [printOrder, setPrintOrder] = useState(null)
  const [timeFilter, setTimeFilter] = useState('all')
  const [stats, setStats] = useState({
    totalSales: 0, totalOrders: 0, avgOrder: 0,
    cashTotal: 0, cardTotal: 0, transferTotal: 0,
    topServices: [], paymentBreakdown: []
  })
  const printRef = useRef()

  useEffect(() => { loadOrders() }, [dateFrom, dateTo, timeFilter])

  async function loadOrders() {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200)
    const now = new Date()
    if (timeFilter === 'today') query = query.gte('created_at', now.toISOString().split('T')[0])
    else if (timeFilter === '7days') { const d = new Date(now); d.setDate(d.getDate() - 7); query = query.gte('created_at', d.toISOString().split('T')[0]) }
    else if (timeFilter === '30days') { const d = new Date(now); d.setDate(d.getDate() - 30); query = query.gte('created_at', d.toISOString().split('T')[0]) }
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')
    const { data: ordersData } = await query

    if (ordersData && ordersData.length > 0) {
      const customerIds = [...new Set(ordersData.map(o => o.customer_id).filter(Boolean))]
      let customersMap = {}
      if (customerIds.length > 0) { const { data: customersData } = await supabase.from('customers').select('id, name, phone').in('id', customerIds); customersData?.forEach(c => { customersMap[c.id] = c }) }
      const orderIds = ordersData.map(o => o.id)
      const { data: itemsData } = await supabase.from('order_items').select('order_id').in('order_id', orderIds)
      const itemCount = {}; itemsData?.forEach(item => { itemCount[item.order_id] = (itemCount[item.order_id] || 0) + 1 })
      const merged = ordersData.map(order => ({ ...order, customers: customersMap[order.customer_id] || null, order_items: [{ count: itemCount[order.id] || 1 }] }))
      setOrders(merged); calculateStats(merged)
    } else { setOrders([]); calculateStats([]) }
  }

  async function calculateStats(data) {
    const totalSales = data.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const totalOrders = data.length
    const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0
    const cashTotal = data.filter(o => o.payment_method === 'كاش').reduce((s, o) => s + o.total_amount, 0)
    const cardTotal = data.filter(o => o.payment_method === 'بطاقة').reduce((s, o) => s + o.total_amount, 0)
    const transferTotal = data.filter(o => o.payment_method === 'تحويل').reduce((s, o) => s + o.total_amount, 0)
    const { data: topServices } = await supabase.from('order_items').select('service_name')
    const serviceCount = {}; topServices?.forEach(item => { serviceCount[item.service_name] = (serviceCount[item.service_name] || 0) + 1 })
    const topServicesList = Object.entries(serviceCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }))
    const paymentBreakdown = [
      { name: t('cash'), value: data.filter(o => o.payment_method === 'كاش').length, color: '#EA580C' },
      { name: t('cardPayment'), value: data.filter(o => o.payment_method === 'بطاقة').length, color: '#2563EB' },
      { name: t('bankTransfer'), value: data.filter(o => o.payment_method === 'تحويل').length, color: '#7C3AED' },
    ].filter(p => p.value > 0)
    setStats({ totalSales, totalOrders, avgOrder, cashTotal, cardTotal, transferTotal, topServices: topServicesList, paymentBreakdown })
  }

  async function loadOrderDetails(orderId) {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
    if (order) {
      let customer = null
      if (order.customer_id) { const { data: cust } = await supabase.from('customers').select('name, phone').eq('id', order.customer_id).single(); customer = cust }
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId)
      setSelectedOrder({ ...order, customers: customer || { name: t('customer'), phone: '-' }, order_items: items || [] })
    }
  }

  async function printInvoice(order) {
    const { data } = await supabase.from('orders').select('*').eq('id', order.id).single()
    if (data) {
      let customer = null
      if (data.customer_id) { const { data: cust } = await supabase.from('customers').select('name, phone').eq('id', data.customer_id).single(); customer = cust }
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', data.id)
      setPrintOrder({ ...data, customer: customer || { name: t('customer'), phone: '-' }, services: items || [], total_amount: data.total_amount, payment_method: data.payment_method, barber_name: data.barber_name, subtotal: data.total_amount, finalTotal: data.total_amount })
      setTimeout(() => handlePrint(), 300)
    }
  }

  const handlePrint = useReactToPrint({ contentRef: printRef })

  async function exportToCSV() {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')
    const { data } = await query
    if (!data || data.length === 0) return alert(t('noData'))
    const customerIds = [...new Set(data.map(o => o.customer_id).filter(Boolean))]
    const { data: customers } = await supabase.from('customers').select('id, name, phone').in('id', customerIds)
    const custMap = {}; customers?.forEach(c => { custMap[c.id] = c })
    let csv = `${t('invoiceNumber')},${t('date')},${t('customer')},${t('phone')},${t('barberName')},${t('total')},${t('paymentMethod')}\n`
    data.forEach(order => { const cust = custMap[order.customer_id]; csv += `"${order.invoice_number || order.id}","${new Date(order.created_at).toLocaleString(locale)}","${cust?.name || ''}","${cust?.phone || ''}","${order.barber_name || ''}","${order.total_amount}","${order.payment_method}"\n` })
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${t('salesReport')}.csv`; link.click(); URL.revokeObjectURL(url)
  }

  const filteredOrders = orders.filter(o => { const s = search.toLowerCase(); return o.id?.toString().includes(s) || o.invoice_number?.includes(s) || o.customers?.name?.toLowerCase().includes(s) || o.customers?.phone?.includes(s) || o.barber_name?.toLowerCase().includes(s) || o.payment_method?.includes(s) })

  const paymentColors = { 'كاش': { bg: '#FFF7ED', color: '#EA580C' }, 'بطاقة': { bg: '#EFF6FF', color: '#2563EB' }, 'تحويل': { bg: '#F5F3FF', color: '#7C3AED' } }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '24px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>{t('reports')}</h1>
          <p style={{ color: '#8B8B8B', fontSize: isMobile ? '14px' : '17px' }}>{t('reportsSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={exportToCSV} style={{ backgroundColor: '#10B981', color: 'white', padding: isMobile ? '8px 12px' : '10px 16px', border: 'none', borderRadius: '12px', fontSize: isMobile ? '12px' : '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={isMobile ? 14 : 16} /> CSV</button>
          <button onClick={loadOrders} style={{ backgroundColor: 'white', color: '#1E1E3F', padding: isMobile ? '8px 12px' : '10px 16px', border: '1px solid #E8E3DC', borderRadius: '12px', fontSize: isMobile ? '12px' : '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={isMobile ? 14 : 16} /> {t('refresh')}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '16px' : '24px' }}>
        {[
          { label: t('invoiceCount'), value: stats.totalOrders, icon: Receipt, color: '#3B82F6', bg: '#EFF6FF' },
          { label: t('totalSales'), value: `${formatPrice(stats.totalSales)} ${t('currency')}`, icon: DollarSign, color: '#10B981', bg: '#ECFDF5' },
          { label: t('avgOrder'), value: `${formatPrice(stats.avgOrder)} ${t('currency')}`, icon: TrendingUp, color: '#C9A84C', bg: '#FFFBF0' },
          { label: t('cash'), value: `${formatPrice(stats.cashTotal)} ${t('currency')}`, icon: Banknote, color: '#EA580C', bg: '#FFF7ED' }
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '16px', padding: isMobile ? '14px' : '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', borderRadius: '10px', backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={isMobile ? 14 : 18} color={s.color} /></div>
                <span style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '13px' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '14px' : '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { key: 'all', label: t('all') },
            { key: 'today', label: t('today') },
            { key: '7days', label: t('last7Days') },
            { key: '30days', label: t('last30Days') }
          ].map(tf => (
            <button key={tf.key} onClick={() => setTimeFilter(tf.key)} style={{ padding: isMobile ? '6px 10px' : '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: timeFilter === tf.key ? '#1E1E3F' : 'white', color: timeFilter === tf.key ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '10px' : '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>{tf.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'white', padding: isMobile ? '6px 10px' : '8px 14px', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <Calendar size={isMobile ? 12 : 14} color="#8B8B8B" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ border: 'none', fontSize: isMobile ? '10px' : '12px', outline: 'none', backgroundColor: 'transparent', width: isMobile ? '100px' : 'auto' }} />
          <span style={{ fontSize: isMobile ? '10px' : '12px', color: '#8B8B8B' }}>-</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ border: 'none', fontSize: isMobile ? '10px' : '12px', outline: 'none', backgroundColor: 'transparent', width: isMobile ? '100px' : 'auto' }} />
        </div>
        <div style={{ flex: 1, position: 'relative', minWidth: '120px' }}>
          <Search size={isMobile ? 14 : 16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} />
          <input type="text" placeholder={t('search') + '...'} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: isMobile ? '8px 32px 8px 10px' : '10px 38px 10px 12px', borderRadius: '12px', border: 'none', backgroundColor: 'white', fontSize: isMobile ? '11px' : '13px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '12px' : '20px', marginBottom: isMobile ? '16px' : '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '14px' : '16px', marginBottom: isMobile ? '14px' : '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', borderRadius: '10px', backgroundColor: '#FFFBF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={isMobile ? 14 : 18} color="#C9A84C" /></div>
            {t('topSellingServices')}
          </h3>
          {stats.topServices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '10px' }}>
              {stats.topServices.map((service, i) => {
                const maxCount = stats.topServices[0]?.count || 1; const percentage = Math.round((service.count / maxCount) * 100)
                const rankColors = [{ bg: '#FFFBF0', bar: '#C9A84C', badge: '#C9A84C', icon: '🥇' }, { bg: '#F5F5F5', bar: '#A0A0A0', badge: '#A0A0A0', icon: '🥈' }, { bg: '#FFF7ED', bar: '#EA580C', badge: '#EA580C', icon: '🥉' }, { bg: '#FAFAFA', bar: '#8B8B8B', badge: '#8B8B8B', icon: '4' }, { bg: '#FAFAFA', bar: '#8B8B8B', badge: '#8B8B8B', icon: '5' }]
                const rank = rankColors[i] || rankColors[4]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
                    <div style={{ width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', borderRadius: '10px', backgroundColor: rank.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: isMobile ? '14px' : '18px', color: rank.badge, flexShrink: 0 }}>{rank.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '11px' : '14px' }}>{service.name}</span>
                        <span style={{ fontWeight: 'bold', color: rank.badge, fontSize: isMobile ? '11px' : '14px' }}>{service.count} <span style={{ fontSize: isMobile ? '9px' : '11px', color: '#8B8B8B' }}>{t('times')}</span></span>
                      </div>
                      <div style={{ width: '100%', height: isMobile ? '4px' : '6px', borderRadius: '3px', backgroundColor: '#F5F0EB', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', borderRadius: '3px', background: i === 0 ? 'linear-gradient(90deg, #C9A84C, #E0B050)' : i === 1 ? 'linear-gradient(90deg, #A0A0A0, #C0C0C0)' : i === 2 ? 'linear-gradient(90deg, #EA580C, #F97316)' : '#D1D5DB' }}></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: isMobile ? '20px' : '40px', color: '#8B8B8B' }}>
              <Star size={isMobile ? 30 : 40} style={{ marginBottom: '6px', opacity: 0.2 }} />
              <div style={{ fontSize: isMobile ? '11px' : '14px' }}>{t('noData')}</div>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '14px' : '16px', marginBottom: isMobile ? '12px' : '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard size={isMobile ? 14 : 18} color="#C9A84C" /> {t('paymentDistribution')}
          </h3>
          {stats.paymentBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 220}>
                <PieChart>
                  <Pie data={stats.paymentBreakdown} cx="50%" cy="50%" innerRadius={isMobile ? 35 : 50} outerRadius={isMobile ? 65 : 90} paddingAngle={5} dataKey="value">
                    {stats.paymentBreakdown.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #F5F0EB', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '8px' : '16px', marginTop: '8px' }}>
                {stats.paymentBreakdown.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '10px' : '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color }}></div>
                    <span style={{ color: '#8B8B8B' }}>{p.name} ({p.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ textAlign: 'center', padding: isMobile ? '20px' : '40px', color: '#8B8B8B' }}>{t('noData')}</div>}
        </div>
      </div>

      <div className="table-wrapper" style={{ backgroundColor: 'white', borderRadius: '20px', overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', minWidth: isMobile ? '650px' : '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E8E3DC', backgroundColor: '#FAFAFA' }}>
              {[t('number'), t('date'), t('customer'), t('mobileNumber'), t('barber'), t('products'), t('total'), t('paymentMethod'), t('status'), t('actions')].map((h, i) => (
                <th key={i} style={{ textAlign: i === 5 || i === 7 || i === 8 || i === 9 ? 'center' : 'start', padding: isMobile ? '8px 10px' : '12px 14px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '11px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(o => {
              const payInfo = paymentColors[o.payment_method] || paymentColors['كاش']
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #F5F0EB' }}>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', fontWeight: 'bold', color: '#C9A84C', fontSize: isMobile ? '10px' : '12px', fontFamily: 'monospace' }}>#{o.invoice_number || o.id}</td>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', fontSize: isMobile ? '9px' : '11px' }}>
                    <div style={{ color: '#1E1E3F' }}>{new Date(o.created_at).toLocaleDateString(locale)}</div>
                    <div style={{ color: '#8B8B8B', fontSize: isMobile ? '8px' : '10px' }}>{new Date(o.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', fontWeight: '500', color: '#1E1E3F', fontSize: isMobile ? '10px' : '12px' }}>{o.customers?.name || t('customer')}</td>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', color: '#8B8B8B', fontSize: isMobile ? '9px' : '11px' }}>{o.customers?.phone || '-'}</td>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', color: '#1E1E3F', fontSize: isMobile ? '9px' : '11px' }}>{o.barber_name || '-'}</td>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', textAlign: 'center', fontWeight: 'bold', fontSize: isMobile ? '10px' : '12px' }}>{o.order_items?.[0]?.count || 1}</td>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', fontWeight: 'bold', color: '#059669', fontSize: isMobile ? '10px' : '12px' }}>{formatPrice(o.total_amount)}</td>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: isMobile ? '9px' : '10px', fontWeight: '600', backgroundColor: payInfo.bg, color: payInfo.color }}>
                      {o.payment_method === 'كاش' ? t('cash') : o.payment_method === 'بطاقة' ? t('cardPayment') : t('bankTransfer')}
                    </span>
                  </td>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: isMobile ? '9px' : '10px', fontWeight: '600', backgroundColor: '#ECFDF5', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <CheckCircle size={isMobile ? 8 : 10} /> {t('paid')}
                    </span>
                  </td>
                  <td style={{ padding: isMobile ? '6px 10px' : '10px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                      <button onClick={() => loadOrderDetails(o.id)} style={{ width: isMobile ? '24px' : '28px', height: isMobile ? '24px' : '28px', borderRadius: '6px', border: 'none', backgroundColor: '#EFF6FF', cursor: 'pointer' }}><Eye size={isMobile ? 10 : 12} color="#3B82F6" /></button>
                      <button onClick={() => printInvoice(o)} style={{ width: isMobile ? '24px' : '28px', height: isMobile ? '24px' : '28px', borderRadius: '6px', border: 'none', backgroundColor: '#FFFBF0', cursor: 'pointer' }}><Printer size={isMobile ? 10 : 12} color="#C9A84C" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: isMobile ? '30px' : '60px', color: '#8B8B8B' }}>
                  <Receipt size={isMobile ? 36 : 48} style={{ marginBottom: '10px', opacity: 0.2 }} />
                  <div style={{ fontSize: isMobile ? '13px' : '16px' }}>{t('noInvoices')}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '18px' : '32px', width: '100%', maxWidth: isMobile ? '95vw' : '550px', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '24px' }}>
              <div>
                <h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '20px', margin: 0 }}>{t('invoice')} #{selectedOrder.invoice_number || selectedOrder.id}</h2>
                <span style={{ fontSize: isMobile ? '11px' : '13px', color: '#8B8B8B' }}>{new Date(selectedOrder.created_at).toLocaleString(locale)}</span>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ backgroundColor: '#FAFAFA', borderRadius: '16px', padding: isMobile ? '12px' : '20px', marginBottom: isMobile ? '14px' : '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px', fontSize: isMobile ? '11px' : '14px' }}>
                <div><span style={{ color: '#8B8B8B', fontSize: isMobile ? '10px' : '12px', display: 'block' }}>{t('customer')}</span><span style={{ fontWeight: '600', color: '#1E1E3F' }}>{selectedOrder.customers?.name || t('customer')}</span></div>
                <div><span style={{ color: '#8B8B8B', fontSize: isMobile ? '10px' : '12px', display: 'block' }}>{t('mobileNumber')}</span><span style={{ fontWeight: '600', color: '#1E1E3F' }}>{selectedOrder.customers?.phone || '-'}</span></div>
                <div><span style={{ color: '#8B8B8B', fontSize: isMobile ? '10px' : '12px', display: 'block' }}>{t('barber')}</span><span style={{ fontWeight: '600', color: '#1E1E3F' }}>{selectedOrder.barber_name || '-'}</span></div>
                <div><span style={{ color: '#8B8B8B', fontSize: isMobile ? '10px' : '12px', display: 'block' }}>{t('paymentMethod')}</span><span style={{ fontWeight: '600', color: paymentColors[selectedOrder.payment_method]?.color || '#1E1E3F' }}>{selectedOrder.payment_method === 'كاش' ? t('cash') : selectedOrder.payment_method === 'بطاقة' ? t('cardPayment') : t('bankTransfer')}</span></div>
              </div>
            </div>
            <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '13px' : '16px', marginBottom: '10px' }}>{t('services')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {selectedOrder.order_items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: isMobile ? '8px' : '12px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #F0F0F0', fontSize: isMobile ? '11px' : '14px' }}>
                  <span>{item.service_name}</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ color: '#8B8B8B' }}>×{item.quantity || 1}</span>
                    <span style={{ fontWeight: 'bold', color: '#C9A84C' }}>{formatPrice(item.price)} {t('currency')}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '2px solid #1E1E3F', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '600' }}>{t('total')}</span>
              <span style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold', color: '#059669' }}>{formatPrice(selectedOrder.total_amount)} {t('currency')}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: isMobile ? '16px' : '24px' }}>
              <button onClick={() => setSelectedOrder(null)} style={{ flex: 1, padding: isMobile ? '10px' : '14px', borderRadius: '12px', border: '1px solid #E8E3DC', backgroundColor: 'white', color: '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>{t('close')}</button>
              <button onClick={() => { printInvoice(selectedOrder); setSelectedOrder(null) }} style={{ flex: 1, padding: isMobile ? '10px' : '14px', borderRadius: '12px', border: 'none', backgroundColor: '#1E1E3F', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Printer size={isMobile ? 14 : 18} /> {t('print')}</button>
            </div>
          </div>
        </div>
      )}

      {filteredOrders.length > 0 && (
        <div style={{ marginTop: isMobile ? '14px' : '20px', background: 'linear-gradient(135deg, #1E1E3F, #2D2D5F)', borderRadius: '20px', padding: isMobile ? '14px 18px' : '20px 28px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: isMobile ? '30px' : '40px', height: isMobile ? '30px' : '40px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={isMobile ? 16 : 20} color="#C9A84C" /></div>
            <div>
              <div style={{ fontSize: isMobile ? '11px' : '13px', opacity: 0.7 }}>{t('grandTotal')}</div>
              <div style={{ fontSize: isMobile ? '10px' : '12px', opacity: 0.5 }}>{stats.totalOrders} {t('invoice')}</div>
            </div>
          </div>
          <span style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 'bold', color: '#C9A84C' }}>{formatPrice(stats.totalSales)} {t('currency')}</span>
        </div>
      )}

      <div style={{ display: 'none' }}>{printOrder && <div ref={printRef}><PrintableInvoice order={printOrder} /></div>}</div>
    </div>
  )
}