import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewOrder from './pages/NewOrder'
import Orders from './pages/Orders'
import Services from './pages/Services'
import Customers from './pages/Customers'
import UsersPage from './pages/Users'
import Expenses from './pages/Expenses'
import Barbers from './pages/Barbers'
import Appointments from './pages/Appointments'
import Inventory from './pages/Inventory'
import Settings from './pages/Settings'

function ProtectedRoute({ children, permission }) {
  const { user, loading, hasPermission, isAdmin } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5F0EB' }}>
        <div style={{ fontSize: '20px', color: '#8B8B8B' }}>جاري التحميل...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  if (permission && !hasPermission(permission)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5F0EB', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '48px' }}>🔒</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1E1E3F' }}>غير مصرح لك</div>
        <div style={{ color: '#8B8B8B', fontSize: '14px' }}>ليس لديك صلاحية للوصول لهذه الصفحة</div>
        <a href="/" style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: '600' }}>العودة للرئيسية</a>
      </div>
    )
  }

  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new-order" element={<ProtectedRoute permission="new-order"><NewOrder /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute permission="appointments"><Appointments /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute permission="orders"><Orders /></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute permission="services"><Services /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute permission="customers"><Customers /></ProtectedRoute>} />
              <Route path="/barbers" element={<ProtectedRoute permission="barbers"><Barbers /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute permission="inventory"><Inventory /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute permission="users"><UsersPage /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute permission="expenses"><Expenses /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute permission="settings"><Settings /></ProtectedRoute>} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App