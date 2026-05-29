import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  LayoutDashboard, ShoppingCart, CalendarDays, Sparkles, Users, Scissors,
  ClipboardList, DollarSign, Package, UserCog, Settings, LogOut, ChevronLeft, Menu, X
} from 'lucide-react'

const allMenuGroups = [
  {
    title: 'الرئيسية',
    items: [
      { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, permission: 'dashboard' }
    ]
  },
  {
    title: 'العمليات',
    items: [
      { to: '/new-order', label: 'نقطة البيع', icon: ShoppingCart, permission: 'new-order' },
      { to: '/appointments', label: 'الحجوزات', icon: CalendarDays, permission: 'appointments' },
    ]
  },
  {
    title: 'الإدارة',
    items: [
      { to: '/services', label: 'الخدمات', icon: Sparkles, permission: 'services' },
      { to: '/customers', label: 'العملاء', icon: Users, permission: 'customers' },
      { to: '/barbers', label: 'الحلاقين', icon: Scissors, permission: 'barbers' },
      { to: '/inventory', label: 'المخزون', icon: Package, permission: 'inventory' },
    ]
  },
  {
    title: 'المالية',
    items: [
      { to: '/orders', label: 'التقارير', icon: ClipboardList, permission: 'orders' },
      { to: '/expenses', label: 'المصاريف', icon: DollarSign, permission: 'expenses' },
    ]
  },
  {
    title: 'النظام',
    items: [
      { to: '/users', label: 'المستخدمين', icon: UserCog, permission: 'users' },
      { to: '/settings', label: 'الإعدادات', icon: Settings, permission: 'settings' },
    ]
  },
]

export default function Layout({ children }) {
  const location = useLocation()
  const { user, signOut, profile, hasPermission } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const role = profile?.role || 'barber'
  
  const roleLabels = {
    admin: 'المدير',
    manager: 'مشرف',
    cashier: 'كاشير',
    barber: 'حلاق',
    receptionist: 'استقبال'
  }

  // ✅ تصفية القائمة حسب الصلاحيات الديناميكية
  const menuGroups = allMenuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => hasPermission(item.permission))
  })).filter(group => group.items.length > 0)

  const closeSidebar = () => setSidebarOpen(false)

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar-header" style={{ padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="logo-icon" style={{ width: '32px', height: '32px', backgroundColor: '#C9A84C', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scissors size={16} color="#1E1E3F" />
          </div>
          <div>
            <div className="logo-title" style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>Black Man Barber POS</div>
            <div className="logo-subtitle" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>نظام الإدارة</div>
          </div>
        </div>
        <button onClick={closeSidebar} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'none' }} className="close-sidebar-btn">
          <X size={20} />
        </button>
      </div>

      <nav style={{ flex: 1, padding: '8px', overflow: 'auto' }}>
        {menuGroups.map((group, gi) => (
          <div key={gi} className="menu-group" style={{ marginBottom: '12px' }}>
            <div className="menu-group-title" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '3px', padding: '0 8px' }}>{group.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.to
                return (
                  <Link key={item.to} to={item.to} onClick={closeSidebar}
                    className="menu-link"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px',
                      borderRadius: '10px', textDecoration: 'none',
                      color: isActive ? '#1E1E3F' : 'rgba(255,255,255,0.65)',
                      backgroundColor: isActive ? '#C9A84C' : 'transparent',
                      fontWeight: isActive ? '600' : '400', fontSize: '12px', transition: 'all 0.2s'
                    }}>
                    <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} className="menu-icon" />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {isActive && <ChevronLeft size={12} className="menu-chevron" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        <div className="user-section" style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px' }}>
          <div className="user-card" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
            <div className="user-avatar" style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #C9A84C, #E0B050)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E1E3F', fontWeight: 'bold', fontSize: '12px' }}>{user?.email?.charAt(0).toUpperCase() || 'م'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ color: 'white', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || user?.email?.split('@')[0] || 'مستخدم'}</div>
              <div className="user-role" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px' }}>{roleLabels[role] || 'مستخدم'}</div>
            </div>
            <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}><LogOut size={14} className="logout-icon" /></button>
          </div>
        </div>
      </nav>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div className="sidebar-desktop" style={{ width: '220px', backgroundColor: '#1E1E3F', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>
        {sidebarContent}
      </div>

      {sidebarOpen && (
        <div className="sidebar-mobile-overlay" onClick={closeSidebar} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'none' }}></div>
      )}
      <div className="sidebar-mobile" style={{ position: 'fixed', top: 0, right: 0, width: '300px', height: '100vh', backgroundColor: '#1E1E3F', zIndex: 1000, display: 'none', transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s', overflowY: 'auto' }}>
        {sidebarContent}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px', backgroundColor: '#F5F0EB' }}>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{ display: 'none', marginBottom: '16px', width: '40px', height: '40px', borderRadius: '10px', border: 'none', backgroundColor: 'white', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Menu size={22} color="#1E1E3F" />
        </button>
        {children}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: block !important; }
          .sidebar-mobile-overlay { display: block !important; }
          .hamburger-btn { display: flex !important; }
          .close-sidebar-btn { display: flex !important; }
          
          .sidebar-mobile .sidebar-header { padding: 20px 16px !important; }
          .sidebar-mobile .logo-icon { width: 44px !important; height: 44px !important; border-radius: 12px !important; }
          .sidebar-mobile .logo-icon svg { width: 22px !important; height: 22px !important; }
          .sidebar-mobile .logo-title { font-size: 18px !important; }
          .sidebar-mobile .logo-subtitle { font-size: 11px !important; }
          .sidebar-mobile .menu-group { margin-bottom: 20px !important; }
          .sidebar-mobile .menu-group-title { font-size: 12px !important; letter-spacing: 3px !important; margin-bottom: 8px !important; padding: 0 10px !important; }
          .sidebar-mobile .menu-link { font-size: 16px !important; padding: 14px 16px !important; gap: 14px !important; border-radius: 14px !important; }
          .sidebar-mobile .menu-icon { width: 24px !important; height: 24px !important; }
          .sidebar-mobile .menu-chevron { width: 18px !important; height: 18px !important; }
          .sidebar-mobile .user-section { padding: 16px 0 !important; margin-top: 8px !important; }
          .sidebar-mobile .user-card { padding: 14px !important; gap: 12px !important; border-radius: 14px !important; }
          .sidebar-mobile .user-avatar { width: 44px !important; height: 44px !important; font-size: 18px !important; border-radius: 12px !important; }
          .sidebar-mobile .user-name { font-size: 15px !important; }
          .sidebar-mobile .user-role { font-size: 12px !important; }
          .sidebar-mobile .logout-icon { width: 20px !important; height: 20px !important; }
        }
      `}</style>
    </div>
  )
}