import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  LayoutDashboard, ShoppingCart, CalendarDays, Sparkles, Users, Scissors,
  ClipboardList, DollarSign, Package, UserCog, Settings, LogOut, ChevronLeft, Menu, X
} from 'lucide-react'

const menuGroups = [
  {
    title: 'الرئيسية',
    items: [{ to: '/', label: 'لوحة التحكم', icon: LayoutDashboard }]
  },
  {
    title: 'العمليات',
    items: [
      { to: '/new-order', label: 'نقطة البيع', icon: ShoppingCart },
      { to: '/appointments', label: 'الحجوزات', icon: CalendarDays },
    ]
  },
  {
    title: 'الإدارة',
    items: [
      { to: '/services', label: 'الخدمات', icon: Sparkles },
      { to: '/customers', label: 'العملاء', icon: Users },
      { to: '/barbers', label: 'الحلاقين', icon: Scissors },
      { to: '/inventory', label: 'المخزون', icon: Package },
    ]
  },
  {
    title: 'المالية',
    items: [
      { to: '/orders', label: 'التقارير', icon: ClipboardList },
      { to: '/expenses', label: 'المصاريف', icon: DollarSign },
    ]
  },
  {
    title: 'النظام',
    items: [
      { to: '/users', label: 'المستخدمين', icon: UserCog },
      { to: '/settings', label: 'الإعدادات', icon: Settings },
    ]
  },
]

export default function Layout({ children }) {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = () => setSidebarOpen(false)

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* لوقو */}
      <div style={{ padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#C9A84C', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scissors size={16} color="#1E1E3F" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>Barber POS</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>نظام الإدارة</div>
          </div>
        </div>
        {/* زر إغلاق للجوال */}
        <button onClick={closeSidebar} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'none' }} className="close-sidebar-btn">
          <X size={20} />
        </button>
      </div>

      {/* القائمة - بدون overflow auto عشان ما يصير سكرول */}
      <nav style={{ padding: '8px', flexShrink: 0 }}>
        {menuGroups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: '10px' }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '3px', padding: '0 8px' }}>{group.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.to
                return (
                  <Link key={item.to} to={item.to} onClick={closeSidebar}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                      borderRadius: '10px', textDecoration: 'none',
                      color: isActive ? '#1E1E3F' : 'rgba(255,255,255,0.65)',
                      backgroundColor: isActive ? '#C9A84C' : 'transparent',
                      fontWeight: isActive ? '600' : '400', fontSize: '12px', transition: 'all 0.2s'
                    }}>
                    <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {isActive && <ChevronLeft size={12} />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* المسافة اللي تدفع المستخدم للأسفل */}
      <div style={{ flex: 1 }}></div>

      {/* المستخدم - في الأسفل */}
      <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #C9A84C, #E0B050)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E1E3F', fontWeight: 'bold', fontSize: '12px' }}>{user?.email?.charAt(0).toUpperCase() || 'م'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email?.split('@')[0] || 'مدير'}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px' }}>المدير</div>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}><LogOut size={14} /></button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* سايد بار للكمبيوتر */}
      <div className="sidebar-desktop" style={{ width: '220px', backgroundColor: '#1E1E3F', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>
        {sidebarContent}
      </div>

      {/* سايد بار للجوال - overlay */}
      {sidebarOpen && (
        <div className="sidebar-mobile-overlay" onClick={closeSidebar} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'none' }}></div>
      )}
      <div className="sidebar-mobile" style={{ position: 'fixed', top: 0, right: 0, width: '260px', height: '100vh', backgroundColor: '#1E1E3F', zIndex: 1000, display: 'none', transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s' }}>
        {sidebarContent}
      </div>

      {/* المحتوى الرئيسي */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px', backgroundColor: '#F5F0EB' }}>
        {/* زر الهامبرغر للجوال */}
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{ display: 'none', marginBottom: '16px', width: '40px', height: '40px', borderRadius: '10px', border: 'none', backgroundColor: 'white', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Menu size={22} color="#1E1E3F" />
        </button>
        {children}
      </div>

      {/* CSS للتجاوب */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: block !important; }
          .sidebar-mobile-overlay { display: block !important; }
          .hamburger-btn { display: flex !important; }
          .close-sidebar-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}