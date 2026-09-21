import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Settings as SettingsIcon, Save, Building2, Phone, MapPin, Clock, Percent, DollarSign, Receipt, Image } from 'lucide-react'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return isMobile
}

export default function Settings() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const defaultSettings = {
    shop_name: 'صالون الحلاقة', shop_phone: '', shop_address: '', tax_rate: '5', currency: 'ريال',
    opening_time: '09:00', closing_time: '22:00', invoice_header: 'BLACK MAN', invoice_subheader: 'صالون حلاقة رجالي',
    invoice_cr: '1234567890', invoice_phone: '91234567', invoice_footer: 'شكراً لزيارتكم',
    invoice_return_policy: 'لا يمكن استرجاع أو استبدال المنتجات', logo_url: ''
  }

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*')
    if (data && data.length > 0) { const obj = {}; data.forEach(s => { obj[s.key] = s.value }); setSettings({ ...defaultSettings, ...obj }) }
    else setSettings(defaultSettings)
  }

  async function saveSettings() {
    setSaving(true)
    for (const [key, value] of Object.entries(settings)) { await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' }) }
    setSaving(false); setSuccess(true); setTimeout(() => setSuccess(false), 3000)
  }

  function updateSetting(key, value) { setSettings({ ...settings, [key]: value }) }

  const inputStyle = { width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '28px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>{t('settings')}</h1>
          <p style={{ color: '#8B8B8B', fontSize: isMobile ? '14px' : '17px' }}>{t('settingsSubtitle')}</p>
        </div>
        <button onClick={saveSettings} disabled={saving} style={{ backgroundColor: '#C9A84C', color: 'white', padding: isMobile ? '10px 16px' : '14px 24px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Save size={isMobile ? 16 : 20} /> {saving ? t('saving') : t('saveSettings')}
        </button>
      </div>

      {success && (
        <div style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: isMobile ? '10px 14px' : '14px 20px', borderRadius: '14px', marginBottom: isMobile ? '16px' : '24px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', fontSize: isMobile ? '13px' : '15px' }}>
          ✅ {t('settingsSaved')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '14px' : '24px', marginBottom: isMobile ? '20px' : '32px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '16px' : '24px' }}>
            <div style={{ width: isMobile ? '36px' : '44px', height: isMobile ? '36px' : '44px', backgroundColor: '#F5F0EB', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={isMobile ? 18 : 22} color="#C9A84C" /></div>
            <h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '18px', margin: 0 }}>{t('salonInfo')}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('salonName')}</label>
              <input type="text" value={settings.shop_name || ''} onChange={(e) => updateSetting('shop_name', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}><Phone size={isMobile ? 12 : 14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> {t('mobileNumber')}</label>
              <input type="tel" value={settings.shop_phone || ''} onChange={(e) => updateSetting('shop_phone', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}><MapPin size={isMobile ? 12 : 14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> {t('address')}</label>
              <input type="text" value={settings.shop_address || ''} onChange={(e) => updateSetting('shop_address', e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '16px' : '24px' }}>
            <div style={{ width: isMobile ? '36px' : '44px', height: isMobile ? '36px' : '44px', backgroundColor: '#F5F0EB', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SettingsIcon size={isMobile ? 18 : 22} color="#C9A84C" /></div>
            <h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '18px', margin: 0 }}>{t('systemSettings')}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}><Percent size={isMobile ? 12 : 14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> {t('taxRatePercent')}</label>
              <input type="number" value={settings.tax_rate || '5'} onChange={(e) => updateSetting('tax_rate', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}><DollarSign size={isMobile ? 12 : 14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> {t('currency')}</label>
              <input type="text" value={settings.currency || 'ريال'} onChange={(e) => updateSetting('currency', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '8px' : '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}><Clock size={isMobile ? 12 : 14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> {t('openingTime')}</label>
                <input type="time" value={settings.opening_time || '09:00'} onChange={(e) => updateSetting('opening_time', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('closingTime')}</label>
                <input type="time" value={settings.closing_time || '22:00'} onChange={(e) => updateSetting('closing_time', e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '16px' : '24px' }}>
          <div style={{ width: isMobile ? '36px' : '44px', height: isMobile ? '36px' : '44px', backgroundColor: '#F5F0EB', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Receipt size={isMobile ? 18 : 22} color="#C9A84C" /></div>
          <h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '18px', margin: 0 }}>{t('invoiceSettings')}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? '14px' : '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '16px' }}>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('shopNameInInvoice')}</label><input type="text" value={settings.invoice_header || ''} onChange={(e) => updateSetting('invoice_header', e.target.value)} style={inputStyle} placeholder="BLACK MAN" /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('description')}</label><input type="text" value={settings.invoice_subheader || ''} onChange={(e) => updateSetting('invoice_subheader', e.target.value)} style={inputStyle} placeholder={t('salonDescPlaceholder')} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('commercialRegistration')}</label><input type="text" value={settings.invoice_cr || ''} onChange={(e) => updateSetting('invoice_cr', e.target.value)} style={inputStyle} placeholder="1234567890" /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('contactNumber')}</label><input type="text" value={settings.invoice_phone || ''} onChange={(e) => updateSetting('invoice_phone', e.target.value)} style={inputStyle} placeholder="91234567" /></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '16px' }}>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('thankYouMessage')}</label><input type="text" value={settings.invoice_footer || ''} onChange={(e) => updateSetting('invoice_footer', e.target.value)} style={inputStyle} placeholder={t('thankYouPlaceholder')} /></div>
            <div><label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('returnPolicy')}</label><input type="text" value={settings.invoice_return_policy || ''} onChange={(e) => updateSetting('invoice_return_policy', e.target.value)} style={inputStyle} placeholder={t('returnPolicyPlaceholder')} /></div>
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '6px', fontSize: '14px' }}><Image size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> {t('logoUrl')}</label>
                <input type="text" value={settings.logo_url || ''} onChange={(e) => updateSetting('logo_url', e.target.value)} style={inputStyle} placeholder={t('logoUrlPlaceholder')} />
              </div>
              {settings.logo_url && (<div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#F5F0EB', borderRadius: '14px' }}><img src={settings.logo_url} alt={t('logo')} style={{ maxWidth: '120px', maxHeight: '80px', borderRadius: '8px' }} /></div>)}
            </div>
          )}
          {isMobile && (
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: '12px' }}><Image size={12} style={{ display: 'inline', marginInlineEnd: '4px' }} /> {t('logoUrl')}</label>
              <input type="text" value={settings.logo_url || ''} onChange={(e) => updateSetting('logo_url', e.target.value)} style={inputStyle} placeholder={t('logoUrlPlaceholder')} />
              {settings.logo_url && (<div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#F5F0EB', borderRadius: '12px', marginTop: '8px' }}><img src={settings.logo_url} alt={t('logo')} style={{ maxWidth: '100px', maxHeight: '60px', borderRadius: '8px' }} /></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}