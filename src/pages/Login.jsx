import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Scissors, Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)
    
    if (error) {
      if (error.message.includes('Invalid login')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else {
        setError('حدث خطأ: ' + error.message)
      }
    }
    
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1E1E3F 0%, #2D2D5F 100%)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '28px',
        padding: '48px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
      }}>
        {/* لوقو */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #C9A84C, #E0B050)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 30px rgba(201,168,76,0.3)'
          }}>
            <Scissors size={36} color="#1E1E3F" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
            <Zap size={22} color="#C9A84C" />
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1E1E3F' }}>Barber POS</h1>
          </div>
          <p style={{ color: '#8B8B8B', fontSize: '16px', marginTop: '4px' }}>نظام إدارة صالون الحلاقة</p>
        </div>

        {/* رسالة خطأ */}
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            padding: '14px 18px',
            borderRadius: '14px',
            marginBottom: '24px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        {/* فورم */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontWeight: '700', color: '#1E1E3F', marginBottom: '10px', fontSize: '14px' }}>
              البريد الإلكتروني
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={20} style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@barber.com"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '18px 52px 18px 18px',
                  borderRadius: '16px',
                  border: '2px solid #F5F0EB',
                  backgroundColor: '#FAFAFA',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
                onBlur={(e) => e.target.style.borderColor = '#F5F0EB'}
              />
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontWeight: '700', color: '#1E1E3F', marginBottom: '10px', fontSize: '14px' }}>
              كلمة المرور
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '18px 52px 18px 52px',
                  borderRadius: '16px',
                  border: '2px solid #F5F0EB',
                  backgroundColor: '#FAFAFA',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
                onBlur={(e) => e.target.style.borderColor = '#F5F0EB'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#8B8B8B',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '18px',
              backgroundColor: loading ? '#A0A0A0' : '#1E1E3F',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 8px 25px rgba(30,30,63,0.3)'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                جاري تسجيل الدخول...
              </span>
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '28px', color: '#8B8B8B', fontSize: '13px' }}>
          نسيت كلمة المرور؟ تواصل مع المسؤول
        </p>
      </div>
    </div>
  )
}