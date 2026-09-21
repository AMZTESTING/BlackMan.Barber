import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  DollarSign, ShoppingCart, Users, TrendingUp, ArrowUp, ArrowDown, Scissors, FileText, 
  BarChart3, Clock, Calendar, Bell, AlertCircle,
  User, ArrowRight, Download, CheckCircle, XCircle, Ban, CreditCard
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function formatPrice(price) {
  if (!price && price !== 0) return '0.000'
  const parts = price.toString().split('.')
  const rial = parts[0] || '0'
  const baisa = (parts[1] || '').padEnd(3, '0').substring(0, 3)
  return `${rial}.${baisa}`
}

function SkeletonCard() {
  return (
    <div style={{ background: '#E5E7EB', borderRadius: '20px', padding: '28px', animation: 'pulse 1.5s infinite' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#D1D5DB' }}></div>
        <div style={{ width: '50px', height: '28px', borderRadius: '10px', background: '#D1D5DB' }}></div>
      </div>
      <div style={{ width: '80px', height: '16px', borderRadius: '8px', background: '#D1D5DB', marginBottom: '8px' }}></div>
      <div style={{ width: '120px', height: '32px', borderRadius: '8px', background: '#D1D5DB' }}></div>
    </div>
  )
}

function SkeletonSmall() {
  return (
    <div style={{ background: '#E5E7EB', borderRadius: '16px', padding: '18px', textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
      <div style={{ width: '60px', height: '28px', borderRadius: '8px', background: '#D1D5DB', margin: '0 auto 8px' }}></div>
      <div style={{ width: '40px', height: '24px', borderRadius: '8px', background: '#D1D5DB', margin: '0 auto' }}></div>
    </div>
  )
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

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todaySales: 0, todayOrders: 0, avgOrder: 0,
    totalCustomers: 0, totalServices: 0, totalBarbers: 0,
    weeklySales: [], recentOrders: []
  })
  const [appointmentStats, setAppointmentStats] = useState({
    total: 0, confirmed: 0, completed: 0, paid: 0, cancelled: 0, noShow: 0
  })
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [changes, setChanges] = useState({ salesChange: 0, ordersChange: 0, avgChange: 0 })

  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US'

  useEffect(() => {
    loadAllData()
    const interval = setInterval(() => checkUpcomingAppointments(), 30000)
    return () => clearInterval(interval)
  }, [dateFrom, dateTo])

  async function loadAllData() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const fromDate = dateFrom || today
    const toDate = dateTo || today

    const [
      { data: currentOrders },
      { data: prevOrders },
      { data: allAppointments },
      { count: totalCustomers },
      { count: totalServices },
      { count: totalBarbers },
      { data: upcomingApps }
    ] = await Promise.all([
      supabase.from('orders').select('total_amount, customer_id, created_at, customers(name)').gte('created_at', fromDate).lte('created_at', toDate + 'T23:59:59').order('created_at', { ascending: false }),
      supabase.from('orders').select('total_amount, customer_id').gte('created_at', new Date(new Date(fromDate).setDate(new Date(fromDate).getDate() - 7)).toISOString().split('T')[0]).lt('created_at', fromDate),
      supabase.from('appointments').select('*').gte('appointment_date', fromDate).lte('appointment_date', toDate),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('services').select('*', { count: 'exact', head: true }),
      supabase.from('barbers').select('*', { count: 'exact', head: true }),
      supabase.from('appointments').select('*, customers(name, phone), services(name, duration, price)').in('appointment_date', [today, new Date(Date.now() + 86400000).toISOString().split('T')[0]]).eq('status', 'confirmed').gte('start_time', new Date().toTimeString().split(' ')[0].substring(0, 5)).order('appointment_date').order('start_time').limit(5)
    ])

    const { data: weekOrders } = await supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
    const weeklyData = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dayStr = d.toISOString().split('T')[0]
      weeklyData.push({ day: d.toLocaleDateString(locale, { weekday: 'short' }), sales: weekOrders?.filter(o => o.created_at?.startsWith(dayStr))?.reduce((sum, o) => sum + o.total_amount, 0) || 0 })
    }

    const currentTotalSales = currentOrders?.reduce((sum, o) => sum + o.total_amount, 0) || 0
    const currentTotalOrders = currentOrders?.length || 0
    const currentAvg = currentTotalOrders > 0 ? currentTotalSales / currentTotalOrders : 0
    const prevTotalSales = prevOrders?.reduce((sum, o) => sum + o.total_amount, 0) || 0
    const prevTotalOrders = prevOrders?.length || 0
    const prevAvg = prevTotalOrders > 0 ? prevTotalSales / prevTotalOrders : 0
    const calcChange = (c, p) => p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100)

    setChanges({ salesChange: calcChange(currentTotalSales, prevTotalSales), ordersChange: calcChange(currentTotalOrders, prevTotalOrders), avgChange: calcChange(currentAvg, prevAvg) })
    setStats({ todaySales: currentTotalSales, todayOrders: currentTotalOrders, avgOrder: currentAvg.toFixed(0), totalCustomers: totalCustomers || 0, totalServices: totalServices || 0, totalBarbers: totalBarbers || 0, recentOrders: currentOrders?.slice(0, 5) || [], weeklySales: weeklyData })
    setAppointmentStats({ total: allAppointments?.length || 0, confirmed: allAppointments?.filter(a => a.status === 'confirmed').length || 0, completed: allAppointments?.filter(a => a.status === 'completed').length || 0, paid: allAppointments?.filter(a => a.status === 'paid').length || 0, cancelled: allAppointments?.filter(a => a.status === 'cancelled').length || 0, noShow: allAppointments?.filter(a => a.status === 'no_show').length || 0 })
    setUpcomingAppointments(upcomingApps || [])
    checkUpcomingAppointments(upcomingApps || [])
    setLoading(false)
  }

  function checkUpcomingAppointments(list) {
    const now = new Date()
    const alerts = []
    const dataList = list || upcomingAppointments
    dataList.forEach(app => {
      const appDate = new Date(`${app.appointment_date}T${app.start_time}`)
      const diffMinutes = Math.floor((appDate - now) / 60000)
      if (diffMinutes <= 30 && diffMinutes > 0) alerts.push({ id: app.id, type: 'warning', message: t('appointmentSoon', { minutes: diffMinutes }), customer: app.customers?.name, service: app.services?.name, time: app.start_time?.substring(0, 5) })
      if (diffMinutes <= 0 && diffMinutes > -30) alerts.push({ id: app.id, type: 'now', message: t('appointmentNow'), customer: app.customers?.name, service: app.services?.name, time: app.start_time?.substring(0, 5) })
    })
    if (alerts.length > 0) setNotifications(alerts)
  }

  function exportToCSV() {
    const fd = dateFrom || new Date().toISOString().split('T')[0]
    const td = dateTo || new Date().toISOString().split('T')[0]
    supabase.from('orders').select('*, customers(name, phone)').gte('created_at', fd).lte('created_at', td + 'T23:59:59').order('created_at', { ascending: false }).then(({ data }) => {
      if (!data?.length) return alert(t('noData'))
      let csv = `${t('invoiceNumber')},${t('date')},${t('customer')},${t('phone')},${t('barberName')},${t('total')},${t('paymentMethod')}\n`
      data.forEach(o => csv += `"${o.invoice_number || o.id}","${new Date(o.created_at).toLocaleString(locale)}","${o.customers?.name || ''}","${o.customers?.phone || ''}","${o.barber_name || ''}","${o.total_amount}","${o.payment_method}"\n`)
      const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${t('reports')}.csv`; a.click(); URL.revokeObjectURL(u)
    })
  }

  const statCards = [
    { label: t('sales'), value: `${formatPrice(stats.todaySales)} ${t('currency')}`, icon: DollarSign, bg: 'linear-gradient(135deg, #10B981, #059669)', change: changes.salesChange },
    { label: t('invoices'), value: stats.todayOrders, icon: ShoppingCart, bg: 'linear-gradient(135deg, #3B82F6, #2563EB)', change: changes.ordersChange },
    { label: t('customers'), value: stats.totalCustomers, icon: Users, bg: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', change: null },
    { label: t('avgOrder'), value: `${formatPrice(stats.avgOrder)} ${t('currency')}`, icon: TrendingUp, bg: 'linear-gradient(135deg, #F59E0B, #D97706)', change: changes.avgChange },
  ]

  const appointmentCards = [
    { label: t('total'), value: appointmentStats.total, icon: Calendar, color: '#3B82F6', bg: '#EFF6FF' },
    { label: t('confirmed'), value: appointmentStats.confirmed, icon: CheckCircle, color: '#10B981', bg: '#D1FAE5' },
    { label: t('completed'), value: appointmentStats.completed, icon: CheckCircle, color: '#8B5CF6', bg: '#EDE9FE' },
    { label: t('paid'), value: appointmentStats.paid, icon: CreditCard, color: '#2563EB', bg: '#DBEAFE' },
    { label: t('cancelled'), value: appointmentStats.cancelled, icon: XCircle, color: '#EF4444', bg: '#FEE2E2' },
    { label: t('noShow'), value: appointmentStats.noShow, icon: Ban, color: '#F59E0B', bg: '#FEF3C7' },
  ]

  const quickLinks = [
    { to: '/new-order', label: t('pos'), icon: ShoppingCart, bg: '#1E1E3F', desc: t('newInvoice') },
    { to: '/appointments', label: t('appointments'), icon: Calendar, bg: '#C9A84C', desc: `${appointmentStats.total} ${t('appointmentSingular')}` },
    { to: '/customers', label: t('customers'), icon: Users, bg: '#1E1E3F', desc: `${stats.totalCustomers} ${t('customerSingular')}` },
    { to: '/services', label: t('services'), icon: Scissors, bg: '#C9A84C', desc: `${stats.totalServices} ${t('serviceSingular')}` },
    { to: '/orders', label: t('reports'), icon: BarChart3, bg: '#1E1E3F', desc: t('sales') },
    { to: '/barbers', label: t('barbers'), icon: User, bg: '#C9A84C', desc: `${stats.totalBarbers} ${t('barberSingular')}` },
  ]

  const statsCols = isMobile ? 2 : 4
  const appCols = isMobile ? 3 : 6
  const linksCols = isMobile ? 3 : 6

  return (
    <div>
      {/* رأس الصفحة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>{t('dashboard')}</h1>
          <p style={{ color: '#8B8B8B', fontSize: isMobile ? '14px' : '17px' }}>{new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'white', padding: isMobile ? '6px 8px' : '8px 14px', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Calendar size={14} color="#8B8B8B" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ border: 'none', fontSize: '12px', outline: 'none', backgroundColor: 'transparent', width: isMobile ? '100px' : '120px' }} />
            <span style={{ fontSize: '12px', color: '#8B8B8B' }}>-</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ border: 'none', fontSize: '12px', outline: 'none', backgroundColor: 'transparent', width: isMobile ? '100px' : '120px' }} />
          </div>
          <button onClick={exportToCSV} style={{ backgroundColor: '#10B981', color: 'white', padding: isMobile ? '8px 10px' : '10px 16px', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> {isMobile ? '' : 'CSV'}
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowNotifications(!showNotifications)} style={{ width: isMobile ? '36px' : '44px', height: isMobile ? '36px' : '44px', borderRadius: '14px', border: 'none', backgroundColor: notifications.length > 0 ? '#FEF3C7' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <Bell size={18} color={notifications.length > 0 ? '#D97706' : '#8B8B8B'} />
              {notifications.length > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#EF4444', color: 'white', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifications.length}</span>}
            </button>
            {showNotifications && notifications.length > 0 && (
              <div style={{ position: 'absolute', top: '50px', left: '0', width: isMobile ? '300px' : '360px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5F0EB' }}><h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: '15px', margin: 0 }}>{t('notifications')} ({notifications.length})</h3></div>
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {notifications.map(n => (
                    <Link key={n.id} to="/appointments" onClick={() => setShowNotifications(false)} style={{ display: 'block', padding: '14px 20px', textDecoration: 'none', borderBottom: '1px solid #F5F0EB', color: '#1E1E3F' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: n.type === 'now' ? '#FEE2E2' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={18} color={n.type === 'now' ? '#EF4444' : '#D97706'} /></div>
                        <div style={{ flex: 1 }}><div style={{ fontWeight: '600', fontSize: '14px' }}>{n.message}</div><div style={{ fontSize: '12px', color: '#8B8B8B' }}>{n.customer} • {n.service} • {n.time}</div></div>
                        <ArrowRight size={16} color="#C9A84C" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statsCols}, 1fr)`, gap: isMobile ? '10px' : '20px', marginBottom: isMobile ? '16px' : '24px' }}>
        {loading ? Array(statsCols).fill(null).map((_, i) => <SkeletonCard key={i} />) : statCards.map((card, i) => {
          const Icon = card.icon; const isPositive = card.change >= 0
          return (
            <div key={i} style={{ background: card.bg, borderRadius: '20px', padding: isMobile ? '18px' : '28px', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: isMobile ? '10px' : '14px', borderRadius: '14px' }}><Icon size={isMobile ? 20 : 24} /></div>
                {card.change !== null && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.2)', padding: isMobile ? '4px 8px' : '6px 10px', borderRadius: '10px', fontSize: '13px' }}>{isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{Math.abs(card.change)}%</div>}
              </div>
              <div style={{ fontSize: isMobile ? '12px' : '14px', opacity: 0.9, marginBottom: '4px' }}>{card.label}</div>
              <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold' }}>{card.value}</div>
            </div>
          )
        })}
      </div>

      {/* بطاقات الحجوزات */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${appCols}, 1fr)`, gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '16px' : '24px' }}>
        {loading ? Array(appCols).fill(null).map((_, i) => <SkeletonSmall key={i} />) : appointmentCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '16px', padding: isMobile ? '12px' : '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: isMobile ? '24px' : '28px', height: isMobile ? '24px' : '28px', borderRadius: '8px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={isMobile ? 12 : 14} color={card.color} /></div>
                <span style={{ color: '#8B8B8B', fontSize: isMobile ? '10px' : '12px' }}>{card.label}</span>
              </div>
              <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold', color: card.color }}>{card.value}</div>
            </div>
          )
        })}
      </div>

      {/* الحجوزات + الفواتير */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '14px' : '24px', marginBottom: isMobile ? '20px' : '28px' }}>
        {/* الحجوزات القادمة */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '18px' : '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Calendar size={isMobile ? 18 : 22} color="#C9A84C" /><h2 style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 'bold', color: '#1E1E3F', margin: 0 }}>{t('upcomingAppointments')}</h2></div>
            <Link to="/appointments" style={{ fontSize: '13px', color: '#C9A84C', fontWeight: '600', textDecoration: 'none' }}>{t('viewAll')}</Link>
          </div>
          {upcomingAppointments.length > 0 ? upcomingAppointments.map(app => {
            const diff = Math.floor((new Date(`${app.appointment_date}T${app.start_time}`) - new Date()) / 60000)
            const soon = diff <= 30 && diff > 0; const now = diff <= 0 && diff > -30
            return (
              <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px' : '14px', borderRadius: '14px', marginBottom: '8px', backgroundColor: now ? '#FEE2E2' : soon ? '#FFF7ED' : '#FAFAFA', border: now ? '1px solid #FECACA' : soon ? '1px solid #FED7AA' : '1px solid #F0F0F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
                  <div style={{ width: isMobile ? '34px' : '44px', height: isMobile ? '34px' : '44px', borderRadius: '12px', backgroundColor: now ? '#FEE2E2' : soon ? '#FEF3C7' : '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={isMobile ? 16 : 20} color={now ? '#EF4444' : soon ? '#D97706' : '#8B8B8B'} /></div>
                  <div><div style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '12px' : '14px' }}>{app.customers?.name}</div><div style={{ fontSize: isMobile ? '10px' : '12px', color: '#8B8B8B' }}>{app.services?.name} • {app.start_time?.substring(0, 5)}</div></div>
                </div>
                <div>{now ? <span style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#EF4444', fontSize: '11px', fontWeight: '600' }}>{t('now')}</span> : soon ? <span style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '11px', fontWeight: '600' }}>{t('inMinutes', { minutes: diff })}</span> : <span style={{ fontSize: '12px', color: '#8B8B8B' }}>{new Date(app.appointment_date).toLocaleDateString(locale)}</span>}</div>
              </div>
            )
          }) : <div style={{ textAlign: 'center', padding: '40px', color: '#8B8B8B' }}>{t('noUpcomingAppointments')}</div>}
        </div>

        {/* آخر الفواتير */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '18px' : '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={isMobile ? 18 : 22} color="#C9A84C" /><h2 style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 'bold', color: '#1E1E3F', margin: 0 }}>{t('recentInvoices')}</h2></div>
            <Link to="/orders" style={{ fontSize: '13px', color: '#C9A84C', fontWeight: '600', textDecoration: 'none' }}>{t('viewAll')}</Link>
          </div>
          {stats.recentOrders.length > 0 ? stats.recentOrders.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px' : '14px', backgroundColor: '#FAFAFA', borderRadius: '14px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px' }}>
                <div style={{ width: isMobile ? '30px' : '36px', height: isMobile ? '30px' : '36px', borderRadius: '10px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={isMobile ? 14 : 16} color="#10B981" /></div>
                <div><div style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '12px' : '14px' }}>{o.customers?.name || t('customer')}</div><div style={{ fontSize: isMobile ? '10px' : '11px', color: '#8B8B8B' }}>{new Date(o.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div></div>
              </div>
              <span style={{ fontWeight: 'bold', color: '#10B981', fontSize: isMobile ? '12px' : '14px' }}>{formatPrice(o.total_amount)} {t('currency')}</span>
            </div>
          )) : <div style={{ textAlign: 'center', padding: '40px', color: '#8B8B8B' }}>{t('noInvoices')}</div>}
        </div>
      </div>

      {/* المبيعات الأسبوعية */}
      <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '18px' : '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: isMobile ? '20px' : '28px' }}>
        <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '24px' }}>{t('weeklySales')}</h2>
        {stats.weeklySales.some(d => d.sales > 0) ? (
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
            <AreaChart data={stats.weeklySales}>
              <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3}/><stop offset="95%" stopColor="#C9A84C" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F0EB" /><XAxis dataKey="day" stroke="#8B8B8B" /><YAxis stroke="#8B8B8B" />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #F5F0EB', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="sales" stroke="#C9A84C" strokeWidth={3} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div style={{ textAlign: 'center', padding: '60px', color: '#8B8B8B' }}>{t('noData')}</div>}
      </div>

      {/* روابط سريعة */}
      <div>
        <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '16px' }}>{t('quickLinks')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${linksCols}, 1fr)`, gap: isMobile ? '8px' : '16px' }}>
          {quickLinks.map((link, i) => {
            const Icon = link.icon
            return (
              <Link key={i} to={link.to} style={{ backgroundColor: link.bg, color: 'white', padding: isMobile ? '14px 10px' : '24px 20px', borderRadius: '20px', textDecoration: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Icon size={isMobile ? 20 : 28} style={{ marginBottom: isMobile ? '6px' : '12px' }} />
                <div style={{ fontSize: isMobile ? '12px' : '15px', fontWeight: 'bold', marginBottom: '4px' }}>{link.label}</div>
                <div style={{ fontSize: isMobile ? '9px' : '12px', opacity: 0.8 }}>{link.desc}</div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}