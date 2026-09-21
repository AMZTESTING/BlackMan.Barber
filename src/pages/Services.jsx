import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Plus, Scissors, Edit2, Trash2, Upload, X, Tag, Settings, Ban, CheckCircle, Package } from 'lucide-react'

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

function QuickAddHiddenService({ onAdd }) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [show, setShow] = useState(false)

  async function addHiddenService() {
    if (!name.trim()) return alert(t('serviceNameRequired'))
    if (!price) return alert(t('priceRequired'))
    setAdding(true)
    const cleanPrice = parseFloat(price.toString().replace(',', '.'))
    const { data, error } = await supabase.from('services').insert({ 
      name: name.trim(), price: cleanPrice, is_active: true, is_hidden: true, duration: 30
    }).select().single()
    if (error) { alert(t('error') + ': ' + error.message); setAdding(false); return }
    setName(''); setPrice(''); setShow(false); setAdding(false)
    if (data && onAdd) onAdd(data)
  }

  if (!show) return (
    <button onClick={() => setShow(true)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px dashed #C9A84C', backgroundColor: '#FFFBF0', cursor: 'pointer', fontSize: '12px', color: '#C9A84C', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
      <Plus size={14} /> {t('addHiddenService')}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px', backgroundColor: '#FFFBF0', borderRadius: '10px', border: '1px solid #C9A84C', flexWrap: 'wrap' }}>
      <input type="text" placeholder={t('serviceName')} value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 2, minWidth: '100px', padding: '8px', borderRadius: '8px', border: '1px solid #E8E3DC', fontSize: '12px' }} autoFocus />
      <input type="text" inputMode="decimal" placeholder={t('price')} value={price} onChange={(e) => setPrice(e.target.value)} style={{ flex: 1, minWidth: '60px', padding: '8px', borderRadius: '8px', border: '1px solid #E8E3DC', fontSize: '12px' }} />
      <button onClick={addHiddenService} disabled={adding} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#C9A84C', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>{adding ? '...' : t('save')}</button>
      <button onClick={() => setShow(false)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#8B8B8B' }}><X size={14} /></button>
    </div>
  )
}

export default function Services() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [bundles, setBundles] = useState([])
  const [hiddenServices, setHiddenServices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showBundleForm, setShowBundleForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editBundleId, setEditBundleId] = useState(null)
  const [activeTab, setActiveTab] = useState('services')
  const [newService, setNewService] = useState({ name: '', price: '', duration: '30', category_id: '', image_url: '' })
  const [newCategory, setNewCategory] = useState('')
  const [newBundle, setNewBundle] = useState({ name: '', price: '', image_url: '', service_ids: [] })
  const [activeCategory, setActiveCategory] = useState('الكل')
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadServices(); loadCategories(); loadBundles(); loadHiddenServices() }, [])

  async function loadServices() { const { data } = await supabase.from('services').select('*, categories(name)').eq('is_hidden', false).order('category_id'); setServices(data || []) }
  async function loadCategories() { const { data } = await supabase.from('categories').select('*').order('name'); setCategories(data || []) }
  async function loadBundles() { const { data } = await supabase.from('bundles').select('*').order('name'); setBundles(data || []) }
  async function loadHiddenServices() { const { data } = await supabase.from('services').select('*').eq('is_hidden', true).order('name'); setHiddenServices(data || []) }

  async function addCategory() { if (!newCategory.trim()) return alert(t('enterCategoryName')); await supabase.from('categories').insert({ name: newCategory.trim() }); setNewCategory(''); loadCategories() }
  async function deleteCategory(id) { if (!confirm(t('confirmDeleteCategoryWarn'))) return; await supabase.from('services').update({ category_id: null }).eq('category_id', id); await supabase.from('categories').delete().eq('id', id); loadCategories(); loadServices() }

  async function uploadImage(file, bucket = 'services-images') {
    setUploading(true)
    const cleanName = file.name.replace(/\s+/g, '-').replace(/[^\x00-\x7F]/g, '').replace(/[^a-zA-Z0-9.-]/g, '')
    const fileName = `${bucket}-${Date.now()}-${cleanName || 'image'}`
    const { error } = await supabase.storage.from(bucket).upload(fileName, file)
    if (error) { alert(t('uploadError') + ': ' + error.message); setUploading(false); return null }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
    setUploading(false); return urlData.publicUrl
  }
  async function handleImageChange(e) { const file = e.target.files[0]; if (!file) return; const url = await uploadImage(file); if (url) setNewService({ ...newService, image_url: url }) }
  async function handleBundleImageChange(e) { const file = e.target.files[0]; if (!file) return; const url = await uploadImage(file, 'bundles-images'); if (url) setNewBundle({ ...newBundle, image_url: url }) }

  async function saveService() {
    if (!newService.name || !newService.category_id) return alert(t('allFieldsRequired'))
    if (!newService.price) return alert(t('priceRequired'))
    const cleanPrice = parseFloat(newService.price.toString().replace(',', '.'))
    const serviceData = { name: newService.name, price: cleanPrice, duration: parseInt(newService.duration) || 30, category_id: parseInt(newService.category_id), image_url: newService.image_url, is_hidden: false }
    if (editId) await supabase.from('services').update(serviceData).eq('id', editId)
    else await supabase.from('services').insert(serviceData)
    setNewService({ name: '', price: '', duration: '30', category_id: '', image_url: '' }); setShowForm(false); setEditId(null); loadServices()
  }

  function editService(service) { setNewService({ name: service.name, price: service.price?.toString() || '', duration: service.duration?.toString() || '30', category_id: service.category_id?.toString() || '', image_url: service.image_url || '' }); setEditId(service.id); setShowForm(true) }

  async function toggleActive(id, currentStatus) { await supabase.from('services').update({ is_active: !currentStatus }).eq('id', id); loadServices(); loadHiddenServices() }

  async function deleteServicePermanently(id) {
    if (!confirm(t('confirmDeleteService'))) return
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) { await supabase.from('services').update({ is_active: false }).eq('id', id); alert(t('cannotDeleteServiceUsed')) }
    else alert(t('serviceDeleted'))
    loadServices(); loadHiddenServices()
  }

  function toggleServiceInBundle(serviceId) {
    setNewBundle(prev => {
      const ids = prev.service_ids.includes(serviceId) ? prev.service_ids.filter(id => id !== serviceId) : [...prev.service_ids, serviceId]
      return { ...prev, service_ids: ids }
    })
  }

  async function saveBundle() {
    if (!newBundle.name) return alert(t('bundleNameRequired'))
    if (!newBundle.price) return alert(t('priceRequired'))
    if (newBundle.service_ids.length === 0) return alert(t('selectAtLeastOneService'))
    const cleanPrice = parseFloat(newBundle.price.toString().replace(',', '.'))
    const bundleData = { name: newBundle.name, price: cleanPrice, image_url: newBundle.image_url, service_ids: newBundle.service_ids }
    if (editBundleId) await supabase.from('bundles').update(bundleData).eq('id', editBundleId)
    else await supabase.from('bundles').insert(bundleData)
    setNewBundle({ name: '', price: '', image_url: '', service_ids: [] }); setShowBundleForm(false); setEditBundleId(null); loadBundles()
  }

  function editBundle(bundle) { setNewBundle({ name: bundle.name, price: bundle.price?.toString() || '', image_url: bundle.image_url || '', service_ids: bundle.service_ids || [] }); setEditBundleId(bundle.id); setShowBundleForm(true); setActiveTab('bundles') }

  async function deleteBundle(id) {
    if (!confirm(t('confirmDeleteBundle'))) return
    await supabase.from('bundles').delete().eq('id', id)
    loadBundles()
  }

  const activeServices = services.filter(s => s.is_active)
  const avgPrice = activeServices.length > 0 ? formatPrice(activeServices.reduce((sum, s) => sum + (s.price || 0), 0) / activeServices.length) : '0.000'
  const filtered = activeCategory === 'الكل' ? services : services.filter(s => s.categories?.name === activeCategory)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '28px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>{t('servicesAndBundles')}</h1>
          <p style={{ color: '#8B8B8B', fontSize: isMobile ? '14px' : '17px' }}>{t('servicesSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? '6px' : '10px' }}>
          <button onClick={() => setShowCategoryForm(!showCategoryForm)} style={{ backgroundColor: '#F5F0EB', color: '#1E1E3F', padding: isMobile ? '8px 12px' : '12px 18px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '12px' : '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Settings size={isMobile ? 14 : 16} /> {t('categories')}</button>
          <button onClick={() => { setActiveTab('services'); setShowForm(!showForm); setEditId(null); setNewService({ name: '', price: '', duration: '30', category_id: categories[0]?.id?.toString() || '', image_url: '' }) }} style={{ backgroundColor: '#1E1E3F', color: 'white', padding: isMobile ? '8px 14px' : '12px 20px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '12px' : '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={isMobile ? 14 : 18} /> {t('service')}</button>
          <button onClick={() => { setActiveTab('bundles'); setShowBundleForm(!showBundleForm); setEditBundleId(null); setNewBundle({ name: '', price: '', image_url: '', service_ids: [] }) }} style={{ backgroundColor: '#C9A84C', color: 'white', padding: isMobile ? '8px 14px' : '12px 20px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '12px' : '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Package size={isMobile ? 14 : 18} /> {t('bundle')}</button>
        </div>
      </div>

      {showCategoryForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', marginBottom: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}>
            <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '18px' }}>{t('manageCategories')}</h3>
            <button onClick={() => setShowCategoryForm(false)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} color="#8B8B8B" /></button>
          </div>
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '14px' : '20px' }}>
            <input type="text" placeholder={t('newCategoryName')} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} style={{ flex: 1, padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px' }} />
            <button onClick={addCategory} style={{ backgroundColor: '#C9A84C', color: 'white', padding: isMobile ? '10px 18px' : '14px 24px', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={isMobile ? 16 : 20} /> {t('add')}</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '8px' : '10px' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#F5F0EB', padding: isMobile ? '10px 14px' : '12px 20px', borderRadius: '14px' }}>
                <Tag size={isMobile ? 14 : 16} color="#C9A84C" />
                <span style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '13px' : '15px' }}>{cat.name}</span>
                <button onClick={() => deleteCategory(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBundleForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', marginBottom: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}>
            <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={isMobile ? 16 : 20} color="#C9A84C" /> {editBundleId ? t('editBundle') : t('addNewBundle')}</h3>
            <button onClick={() => { setShowBundleForm(false); setEditBundleId(null) }} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} color="#8B8B8B" /></button>
          </div>

          <div style={{ marginBottom: isMobile ? '14px' : '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '6px', fontSize: isMobile ? '13px' : '15px' }}>{t('bundleImage')}</label>
            {newBundle.image_url ? (
              <div style={{ position: 'relative', width: isMobile ? '110px' : '150px', height: isMobile ? '110px' : '150px', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px' }}>
                <img src={newBundle.image_url} alt={t('preview')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setNewBundle({ ...newBundle, image_url: '' })} style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="white" /></button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: isMobile ? '110px' : '150px', height: isMobile ? '110px' : '150px', borderRadius: '14px', border: '2px dashed #D1D5DB', backgroundColor: '#F9FAFB', cursor: 'pointer', gap: '6px' }}>
                <Upload size={isMobile ? 22 : 28} color="#8B8B8B" />
                <span style={{ fontSize: isMobile ? '11px' : '13px', color: '#8B8B8B' }}>{t('uploadImage')}</span>
                <input type="file" accept="image/*" onChange={handleBundleImageChange} style={{ display: 'none' }} />
              </label>
            )}
            {uploading && <span style={{ fontSize: '12px', color: '#C9A84C', display: 'block' }}>{t('uploading')}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '10px' : '16px', marginBottom: isMobile ? '12px' : '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('bundleName')}</label>
              <input type="text" placeholder={t('bundleNamePlaceholder')} value={newBundle.name} onChange={(e) => setNewBundle({ ...newBundle, name: e.target.value })} style={{ width: '100%', padding: isMobile ? '12px' : '16px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '14px' : '16px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('bundlePriceLabel')}</label>
              <input type="text" inputMode="decimal" placeholder="5.000" value={newBundle.price} onChange={(e) => setNewBundle({ ...newBundle, price: e.target.value })} style={{ width: '100%', padding: isMobile ? '12px' : '16px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '14px' : '16px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '8px', fontSize: isMobile ? '12px' : '14px' }}>{t('servicesInBundle')}</label>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#8B8B8B', marginBottom: '6px', fontWeight: '600' }}>{t('menuServices')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '6px', maxHeight: '150px', overflow: 'auto', padding: '8px', backgroundColor: '#F5F0EB', borderRadius: '14px' }}>
                {services.filter(s => s.is_active).map(service => (
                  <div key={service.id} onClick={() => toggleServiceInBundle(service.id)} style={{ padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: newBundle.service_ids.includes(service.id) ? '#C9A84C' : 'white', color: newBundle.service_ids.includes(service.id) ? 'white' : '#1E1E3F', fontWeight: newBundle.service_ids.includes(service.id) ? '600' : '400', fontSize: isMobile ? '12px' : '14px', border: '1px solid #E8E3DC', transition: 'all 0.2s' }}>
                    <span style={{ flex: 1 }}>{service.name}</span>
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>{formatPrice(service.price)} {t('currency')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#8B8B8B', marginBottom: '6px', fontWeight: '600' }}>{t('bundleOnlyServices')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '6px', maxHeight: '150px', overflow: 'auto', padding: '8px', backgroundColor: '#FFFBF0', borderRadius: '14px', border: '1px dashed #C9A84C' }}>
                {hiddenServices.filter(s => s.is_active).map(service => (
                  <div key={service.id} onClick={() => toggleServiceInBundle(service.id)} style={{ padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: newBundle.service_ids.includes(service.id) ? '#C9A84C' : '#FFFBF0', color: newBundle.service_ids.includes(service.id) ? 'white' : '#1E1E3F', fontWeight: newBundle.service_ids.includes(service.id) ? '600' : '400', fontSize: isMobile ? '12px' : '14px', border: '1px solid #E8E3DC', transition: 'all 0.2s' }}>
                    <span style={{ flex: 1 }}>{service.name}</span>
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>{formatPrice(service.price)} {t('currency')}</span>
                  </div>
                ))}
              </div>
            </div>

            <QuickAddHiddenService onAdd={(newSrv) => { loadHiddenServices(); toggleServiceInBundle(newSrv.id) }} />

            {newBundle.service_ids.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#8B8B8B' }}>
                {t('selectedServicesCount', { count: newBundle.service_ids.length })} | {t('originalPrice')}: {formatPrice([...services, ...hiddenServices].filter(s => newBundle.service_ids.includes(s.id)).reduce((sum, s) => sum + (s.price || 0), 0))} {t('currency')}
              </div>
            )}
          </div>

          <button onClick={saveBundle} style={{ backgroundColor: '#C9A84C', color: 'white', padding: isMobile ? '12px' : '14px 32px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
            {editBundleId ? t('updateBundle') : t('saveBundle')}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: isMobile ? '16px' : '24px' }}>
        <button onClick={() => setActiveTab('services')} style={{ padding: isMobile ? '10px 16px' : '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: activeTab === 'services' ? '#1E1E3F' : 'white', color: activeTab === 'services' ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '13px' : '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '6px' }}><Scissors size={isMobile ? 14 : 16} /> {t('services')}</button>
        <button onClick={() => setActiveTab('bundles')} style={{ padding: isMobile ? '10px 16px' : '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: activeTab === 'bundles' ? '#1E1E3F' : 'white', color: activeTab === 'bundles' ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '13px' : '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '6px' }}><Package size={isMobile ? 14 : 16} /> {t('bundles')}</button>
      </div>

      {activeTab === 'services' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, 1fr)`, gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '16px' : '24px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{t('servicesCount')}</div>
              <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#1E1E3F', marginTop: '4px' }}>{services.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{t('active')}</div>
              <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#10B981', marginTop: '4px' }}>{activeServices.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{t('avgPrice')}</div>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#C9A84C', marginTop: '4px' }}>{avgPrice} {t('currency')}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px', marginBottom: isMobile ? '16px' : '24px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveCategory('الكل')} style={{ padding: isMobile ? '8px 14px' : '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: activeCategory === 'الكل' ? '#1E1E3F' : 'white', color: activeCategory === 'الكل' ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '13px' : '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>{t('all')}</button>
            {categories.map(cat => (<button key={cat.id} onClick={() => setActiveCategory(cat.name)} style={{ padding: isMobile ? '8px 14px' : '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: activeCategory === cat.name ? '#C9A84C' : 'white', color: activeCategory === cat.name ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '13px' : '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>{cat.name}</button>))}
          </div>

          {showForm && (
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '16px' : '28px', marginBottom: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '20px' }}>
                <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '15px' : '18px' }}>{editId ? t('editService') : t('addNewService')}</h3>
                <button onClick={() => setShowForm(false)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}><X size={16} color="#8B8B8B" /></button>
              </div>
              <div style={{ marginBottom: isMobile ? '14px' : '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '6px', fontSize: isMobile ? '13px' : '15px' }}>{t('serviceImage')}</label>
                {newService.image_url ? (
                  <div style={{ position: 'relative', width: isMobile ? '110px' : '150px', height: isMobile ? '110px' : '150px', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px' }}>
                    <img src={newService.image_url} alt={t('preview')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setNewService({ ...newService, image_url: '' })} style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="white" /></button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: isMobile ? '110px' : '150px', height: isMobile ? '110px' : '150px', borderRadius: '14px', border: '2px dashed #D1D5DB', backgroundColor: '#F9FAFB', cursor: 'pointer', gap: '6px' }}>
                    <Upload size={isMobile ? 22 : 28} color="#8B8B8B" />
                    <span style={{ fontSize: isMobile ? '11px' : '13px', color: '#8B8B8B' }}>{t('uploadImage')}</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                )}
                {uploading && <span style={{ fontSize: '12px', color: '#C9A84C', display: 'block' }}>{t('uploading')}</span>}
              </div>
              <input type="text" placeholder={t('serviceName')} value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} style={{ width: '100%', padding: isMobile ? '12px' : '16px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '14px' : '16px', marginBottom: isMobile ? '12px' : '16px', boxSizing: 'border-box' }} />
              <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('priceExample')}</label>
                <input type="text" inputMode="decimal" placeholder="3.500" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} style={{ width: '100%', padding: isMobile ? '12px' : '16px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '14px' : '16px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '12px' : '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('durationMinutes')}</label>
                  <input type="number" placeholder={t('duration')} value={newService.duration} onChange={(e) => setNewService({ ...newService, duration: e.target.value })} style={{ width: '100%', padding: isMobile ? '12px' : '16px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '14px' : '16px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('category')}</label>
                  <select value={newService.category_id} onChange={(e) => setNewService({ ...newService, category_id: e.target.value })} style={{ width: '100%', padding: isMobile ? '12px' : '16px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '14px' : '16px' }}>
                    <option value="">{t('selectCategory')}</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={saveService} style={{ backgroundColor: '#C9A84C', color: 'white', padding: isMobile ? '12px' : '14px 32px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>{editId ? t('updateService') : t('saveService')}</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, 1fr)`, gap: isMobile ? '10px' : '16px' }}>
            {filtered.map((service) => (
              <div key={service.id} style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '12px' : '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', opacity: service.is_active ? 1 : 0.5, display: 'flex', flexDirection: 'column', height: isMobile ? '290px' : 'auto' }}>
                <div style={{ width: '100%', height: isMobile ? '130px' : '160px', borderRadius: '14px', overflow: 'hidden', marginBottom: isMobile ? '8px' : '16px', backgroundColor: '#F5F0EB', flexShrink: 0 }}>
                  {service.image_url ? <img src={service.image_url} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '36px' : '48px' }}>💇</div>}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '4px' : '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '13px' : '18px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.name}</h3>
                        {!service.is_active && <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: '600' }}>🚫 {t('disabled')}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: isMobile ? '3px' : '6px', flexShrink: 0 }}>
                        <button onClick={() => editService(service)} style={{ width: isMobile ? '26px' : '34px', height: isMobile ? '26px' : '34px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('edit')}><Edit2 size={isMobile ? 11 : 15} color="#8B8B8B" /></button>
                        <button onClick={() => toggleActive(service.id, service.is_active)} style={{ width: isMobile ? '26px' : '34px', height: isMobile ? '26px' : '34px', borderRadius: '10px', border: 'none', backgroundColor: service.is_active ? '#FEF3C7' : '#D1FAE5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{service.is_active ? <Ban size={isMobile ? 11 : 15} color="#D97706" /> : <CheckCircle size={isMobile ? 11 : 15} color="#10B981" />}</button>
                        <button onClick={() => deleteServicePermanently(service.id)} style={{ width: isMobile ? '26px' : '34px', height: isMobile ? '26px' : '34px', borderRadius: '10px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('delete')}><Trash2 size={isMobile ? 11 : 15} color="#EF4444" /></button>
                      </div>
                    </div>
                    <div style={{ color: '#8B8B8B', fontSize: isMobile ? '10px' : '13px', marginBottom: isMobile ? '6px' : '12px' }}>{service.categories?.name} • {service.duration} {t('minutesShort')}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#C9A84C', fontSize: isMobile ? '15px' : '22px' }}>{formatPrice(service.price)} {t('currency')}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, 1fr)`, gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '16px' : '24px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{t('bundlesCount')}</div>
              <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#1E1E3F', marginTop: '4px' }}>{bundles.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{t('avgPrice')}</div>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#C9A84C', marginTop: '4px' }}>{bundles.length > 0 ? formatPrice(bundles.reduce((sum, b) => sum + (b.price || 0), 0) / bundles.length) : '0.000'} {t('currency')}</div>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{t('includedServices')}</div>
              <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#10B981', marginTop: '4px' }}>{bundles.reduce((sum, b) => sum + (b.service_ids?.length || 0), 0)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, 1fr)`, gap: isMobile ? '10px' : '16px' }}>
            {bundles.map((bundle) => (
              <div key={bundle.id} style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '12px' : '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '4px', zIndex: 2 }}>
                  <button onClick={(e) => { e.stopPropagation(); editBundle(bundle) }} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(255,255,255,0.95)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} title={t('edit')}><Edit2 size={isMobile ? 12 : 16} color="#1E1E3F" /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteBundle(bundle.id) }} style={{ width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(255,255,255,0.95)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} title={t('delete')}><Trash2 size={isMobile ? 12 : 16} color="#EF4444" /></button>
                </div>

                <div style={{ width: '100%', height: isMobile ? '100px' : '140px', borderRadius: '14px', overflow: 'hidden', marginBottom: isMobile ? '8px' : '12px', backgroundColor: '#F5F0EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {bundle.image_url ? <img src={bundle.image_url} alt={bundle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={isMobile ? 36 : 48} color="#C9A84C" />}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '14px' : '17px', margin: '0 0 8px 0', paddingInlineEnd: '50px' }}>{bundle.name}</h3>
                  <div style={{ marginBottom: isMobile ? '6px' : '8px' }}>
                    {(bundle.service_ids || []).map(id => {
                      const allServices = [...services, ...hiddenServices]
                      const service = allServices.find(s => s.id === id)
                      return service ? <span key={id} style={{ display: 'inline-block', backgroundColor: '#F5F0EB', padding: '2px 8px', borderRadius: '6px', fontSize: isMobile ? '9px' : '11px', color: '#1E1E3F', marginInlineEnd: '4px', marginBottom: '4px' }}>{service.name}</span> : null
                    })}
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', color: '#10B981', fontSize: isMobile ? '16px' : '22px', marginTop: 'auto' }}>{formatPrice(bundle.price)} {t('currency')}</div>
              </div>
            ))}
            {bundles.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#8B8B8B' }}>
                <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <div>{t('noBundlesMessage')}</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}