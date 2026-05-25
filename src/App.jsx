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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5F0EB' }}>
        <div style={{ fontSize: '20px', color: '#8B8B8B' }}>جاري التحميل...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />
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
              <Route path="/new-order" element={<NewOrder />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/services" element={<Services />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/barbers" element={<Barbers />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/settings" element={<Settings />} />
            
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