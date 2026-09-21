import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Package, Plus, Minus, ShoppingCart, Truck, Search, AlertTriangle, X, Tag, Trash2, Edit2 } from 'lucide-react'

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

export default function Inventory() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [activeTab, setActiveTab] = useState('inventory')
  const [search, setSearch] = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [cart, setCart] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [editId, setEditId] = useState(null)

  const defaultCategories = ['شامبو', 'زيوت', 'كريمات', 'أدوات', 'أخرى']
  const [productCategories, setProductCategories] = useState(defaultCategories)

  const [newProduct, setNewProduct] = useState({ name: '', price: '', cost: '', quantity: '', min_quantity: '5', category: 'أخرى', supplier_id: '' })
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', email: '', address: '' })
  const [selectedSupplier, setSelectedSupplier] = useState('')

  useEffect(() => { loadProducts(); loadSuppliers() }, [])

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*, suppliers(name)').order('name')
    setProducts(data || [])
  }
  async function loadSuppliers() {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers(data || [])
  }

  async function deleteProduct(id) {
    if (confirm(t('confirmDeleteProduct'))) {
      await supabase.from('products').delete().eq('id', id)
      loadProducts()
    }
  }

  function editProduct(product) {
    setNewProduct({
      name: product.name,
      price: product.price?.toString() || '',
      cost: product.cost?.toString() || '',
      quantity: product.quantity?.toString() || '',
      min_quantity: product.min_quantity?.toString() || '5',
      category: product.category || 'أخرى',
      supplier_id: product.supplier_id?.toString() || ''
    })
    setEditId(product.id)
    setShowProductForm(true)
  }

  async function saveProduct() {
    if (!newProduct.name) return alert(t('productNameRequired'))
    const cleanPrice = parseFloat(newProduct.price.toString().replace(',', '.'))
    const cleanCost = parseFloat(newProduct.cost.toString().replace(',', '.'))
    const productData = {
      name: newProduct.name,
      price: cleanPrice || 0,
      cost: cleanCost || 0,
      quantity: parseInt(newProduct.quantity) || 0,
      min_quantity: parseInt(newProduct.min_quantity) || 5,
      category: newProduct.category,
      supplier_id: newProduct.supplier_id ? parseInt(newProduct.supplier_id) : null
    }
    if (editId) await supabase.from('products').update(productData).eq('id', editId)
    else await supabase.from('products').insert(productData)
    setNewProduct({ name: '', price: '', cost: '', quantity: '', min_quantity: '5', category: 'أخرى', supplier_id: '' })
    setShowProductForm(false)
    setEditId(null)
    loadProducts()
  }

  function addCategory() {
    if (!newCategory.trim()) return alert(t('enterCategoryName'))
    if (productCategories.includes(newCategory.trim())) return alert(t('categoryExists'))
    setProductCategories([...productCategories, newCategory.trim()])
    setNewCategory('')
  }

  function deleteProductCategory(cat) {
    if (cat === 'أخرى') return alert(t('cannotDeleteDefault'))
    if (confirm(`${t('confirmDeleteCategory')} "${cat}"؟`)) {
      setProductCategories(productCategories.filter(c => c !== cat))
    }
  }

  async function addSupplier() {
    if (!newSupplier.name) return alert(t('supplierNameRequired'))
    await supabase.from('suppliers').insert(newSupplier)
    setNewSupplier({ name: '', phone: '', email: '', address: '' })
    setShowSupplierForm(false)
    loadSuppliers()
  }

  function addToCart(product) {
    const exists = cart.find(item => item.id === product.id)
    if (exists) setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    else setCart([...cart, { ...product, quantity: 1 }])
  }
  function removeFromCart(productId) {
    setCart(cart.filter(item => item.id !== productId))
  }
  function updateCartQuantity(productId, quantity) {
    if (quantity <= 0) removeFromCart(productId)
    else setCart(cart.map(item => item.id === productId ? { ...item, quantity } : item))
  }

  async function savePurchase() {
    if (!selectedSupplier || cart.length === 0) return alert(t('selectSupplierAndProducts'))
    const total = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0)
    const { data: purchase } = await supabase.from('purchases').insert({ supplier_id: parseInt(selectedSupplier), total_amount: total }).select().single()
    if (purchase) {
      const items = cart.map(item => ({ purchase_id: purchase.id, product_id: item.id, quantity: item.quantity, cost: item.cost, total: item.cost * item.quantity }))
      await supabase.from('purchase_items').insert(items)
      for (const item of cart) {
        await supabase.rpc('update_product_quantity', { product_id: item.id, added_quantity: item.quantity })
      }
    }
    setCart([])
    setSelectedSupplier('')
    setShowPurchaseForm(false)
    loadProducts()
  }

  const filteredProducts = products.filter(p => p.name?.includes(search) || p.category?.includes(search))
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.cost), 0)
  const lowStock = products.filter(p => p.quantity <= p.min_quantity)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '28px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 'bold', color: '#1E1E3F', marginBottom: '4px' }}>{t('inventoryAndPurchases')}</h1>
          <p style={{ color: '#8B8B8B', fontSize: isMobile ? '14px' : '17px' }}>{t('inventorySubtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? '6px' : '10px' }}>
          <button onClick={() => setShowPurchaseForm(true)} style={{ backgroundColor: '#C9A84C', color: 'white', padding: isMobile ? '10px 14px' : '14px 20px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '13px' : '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCart size={isMobile ? 16 : 18} /> {t('purchaseOrder')}
          </button>
          <button onClick={() => { setShowProductForm(true); setEditId(null); setNewProduct({ name: '', price: '', cost: '', quantity: '', min_quantity: '5', category: 'أخرى', supplier_id: '' }) }} style={{ backgroundColor: '#1E1E3F', color: 'white', padding: isMobile ? '10px 14px' : '14px 20px', border: 'none', borderRadius: '14px', fontSize: isMobile ? '13px' : '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={isMobile ? 16 : 18} /> {t('product')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '16px' : '24px' }}>
        {[
          { label: t('products'), value: products.length, icon: Package, color: '#3B82F6', bg: '#EFF6FF' },
          { label: t('inventoryValue'), value: `${formatPrice(totalInventoryValue)} ${t('currency')}`, icon: ShoppingCart, color: '#10B981', bg: '#D1FAE5' },
          { label: t('low'), value: lowStock.length, icon: AlertTriangle, color: '#F59E0B', bg: '#FEF3C7' },
          { label: t('suppliers'), value: suppliers.length, icon: Truck, color: '#8B5CF6', bg: '#EDE9FE' }
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '20px', padding: isMobile ? '14px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{stat.label}</div>
                <div style={{ width: isMobile ? '30px' : '40px', height: isMobile ? '30px' : '40px', backgroundColor: stat.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={isMobile ? 16 : 20} color={stat.color} />
                </div>
              </div>
              <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#1E1E3F', marginTop: isMobile ? '8px' : '12px' }}>{stat.value}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: isMobile ? '14px' : '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'inventory', label: t('inventory') },
          { key: 'suppliers', label: t('suppliers') },
          { key: 'categories', label: t('categories') }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: isMobile ? '8px 14px' : '12px 24px', borderRadius: '14px', border: 'none', backgroundColor: activeTab === tab.key ? '#1E1E3F' : 'white', color: activeTab === tab.key ? 'white' : '#8B8B8B', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'inventory' && (
        <>
          <div style={{ position: 'relative', marginBottom: isMobile ? '14px' : '20px' }}>
            <Search size={isMobile ? 16 : 20} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8B8B' }} />
            <input type="text" placeholder={t('searchProductPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: isMobile ? '12px 38px 12px 12px' : '16px 48px 16px 16px', borderRadius: '16px', border: 'none', backgroundColor: 'white', fontSize: isMobile ? '13px' : '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: isMobile ? '600px' : '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F5F0EB', backgroundColor: '#FAFAFA' }}>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('product')}</th>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('category')}</th>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('quantity')}</th>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('cost')}</th>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('price')}</th>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('supplier')}</th>
                  <th style={{ textAlign: 'center', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F5F0EB', backgroundColor: p.quantity <= p.min_quantity ? '#FFF7ED' : 'white' }}>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px', fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '11px' : '14px' }}>
                      {p.quantity <= p.min_quantity && <AlertTriangle size={12} color="#F59E0B" style={{ marginInlineEnd: '4px' }} />}
                      {p.name}
                    </td>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '8px', backgroundColor: '#F5F0EB', fontSize: isMobile ? '10px' : '13px', color: '#8B8B8B' }}>{p.category}</span>
                    </td>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px' }}>
                      <span style={{ fontWeight: 'bold', color: p.quantity <= p.min_quantity ? '#EF4444' : '#1E1E3F', fontSize: isMobile ? '11px' : '14px' }}>{p.quantity}</span>
                    </td>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px', color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{formatPrice(p.cost)} {t('currency')}</td>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px', fontWeight: 'bold', color: '#C9A84C', fontSize: isMobile ? '11px' : '14px' }}>{formatPrice(p.price)} {t('currency')}</td>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px', color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{p.suppliers?.name || '-'}</td>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => editProduct(p)} style={{ width: isMobile ? '26px' : '34px', height: isMobile ? '26px' : '34px', borderRadius: '10px', border: 'none', backgroundColor: '#EFF6FF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Edit2 size={isMobile ? 11 : 14} color="#3B82F6" />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} style={{ width: isMobile ? '26px' : '34px', height: isMobile ? '26px' : '34px', borderRadius: '10px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={isMobile ? 11 : 14} color="#EF4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'suppliers' && (
        <div>
          <button onClick={() => setShowSupplierForm(true)} style={{ marginBottom: '14px', backgroundColor: '#C9A84C', color: 'white', padding: isMobile ? '10px 14px' : '12px 20px', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: isMobile ? '12px' : '14px' }}>
            <Truck size={isMobile ? 14 : 18} /> {t('addSupplier')}
          </button>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', minWidth: isMobile ? '500px' : '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F5F0EB', backgroundColor: '#FAFAFA' }}>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('supplier')}</th>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('mobileNumber')}</th>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('email')}</th>
                  <th style={{ textAlign: 'start', padding: isMobile ? '10px 12px' : '16px 20px', color: '#8B8B8B', fontWeight: '600', fontSize: isMobile ? '10px' : '13px' }}>{t('address')}</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F5F0EB' }}>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px', fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '11px' : '14px' }}>{s.name}</td>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px', color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{s.phone || '-'}</td>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px', color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{s.email || '-'}</td>
                    <td style={{ padding: isMobile ? '8px 12px' : '14px 20px', color: '#8B8B8B', fontSize: isMobile ? '11px' : '14px' }}>{s.address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', gap: isMobile ? '6px' : '10px', marginBottom: isMobile ? '14px' : '20px' }}>
            <input type="text" placeholder={t('categoryName')} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} style={{ flex: 1, padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: 'white', fontSize: isMobile ? '13px' : '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', boxSizing: 'border-box' }} />
            <button onClick={addCategory} style={{ padding: isMobile ? '10px 18px' : '14px 24px', borderRadius: '14px', border: 'none', backgroundColor: '#1E1E3F', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={isMobile ? 16 : 18} /> {t('add')}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '6px' : '10px' }}>
            {productCategories.map(cat => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: isMobile ? '10px 14px' : '14px 22px', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                <Tag size={isMobile ? 14 : 16} color="#C9A84C" />
                <span style={{ fontWeight: '600', color: '#1E1E3F', fontSize: isMobile ? '13px' : '15px' }}>{cat}</span>
                <button onClick={() => deleteProductCategory(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '2px' }}>
                  <X size={isMobile ? 12 : 16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPurchaseForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '18px' : '32px', width: '100%', maxWidth: isMobile ? '95vw' : '700px', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '24px' }}>
              <h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '22px' }}>{t('newPurchaseOrder')}</h2>
              <button onClick={() => setShowPurchaseForm(false)} style={{ width: '30px', height: '30px', borderRadius: '10px', border: 'none', backgroundColor: '#F5F0EB', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ marginBottom: isMobile ? '14px' : '20px' }}>
              <label style={{ fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', display: 'block', fontSize: isMobile ? '12px' : '14px' }}>{t('supplier')}</label>
              <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px' }}>
                <option value="">{t('selectSupplier')}</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: isMobile ? '14px' : '20px' }}>
              <label style={{ fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', display: 'block', fontSize: isMobile ? '12px' : '14px' }}>{t('selectProductsTitle')}</label>
              <div style={{ maxHeight: '150px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {products.map(p => (
                  <div key={p.id} onClick={() => addToCart(p)} style={{ padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: '12px', backgroundColor: '#F5F0EB', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isMobile ? '11px' : '14px' }}>
                    <span style={{ fontWeight: '500' }}>{p.name}</span>
                    <span style={{ color: '#C9A84C', fontWeight: '600' }}>{formatPrice(p.cost)} {t('currency')}</span>
                  </div>
                ))}
              </div>
            </div>
            {cart.length > 0 && (
              <div style={{ marginBottom: isMobile ? '14px' : '20px' }}>
                <h4 style={{ fontWeight: '600', color: '#1E1E3F', marginBottom: '8px', fontSize: isMobile ? '12px' : '14px' }}>{t('cart')}</h4>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '8px' : '10px', backgroundColor: '#F5F0EB', borderRadius: '12px', marginBottom: '4px', fontSize: isMobile ? '11px' : '14px' }}>
                    <span style={{ fontWeight: '500' }}>{item.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px' }}>
                      <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} style={{ width: isMobile ? '22px' : '28px', height: isMobile ? '22px' : '28px', borderRadius: '8px', border: 'none', backgroundColor: '#FEE2E2', cursor: 'pointer' }}><Minus size={12} /></button>
                      <span style={{ fontWeight: '600', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} style={{ width: isMobile ? '22px' : '28px', height: isMobile ? '22px' : '28px', borderRadius: '8px', border: 'none', backgroundColor: '#D1FAE5', cursor: 'pointer' }}><Plus size={12} /></button>
                      <span style={{ color: '#C9A84C', fontWeight: '600' }}>{formatPrice(item.cost * item.quantity)} {t('currency')}</span>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'start', marginTop: isMobile ? '8px' : '12px', fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '14px' : '18px' }}>
                  {t('total')}: {formatPrice(cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0))} {t('currency')}
                </div>
              </div>
            )}
            <button onClick={savePurchase} style={{ width: '100%', padding: isMobile ? '12px' : '16px', backgroundColor: '#C9A84C', color: 'white', border: 'none', borderRadius: '14px', fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', cursor: 'pointer' }}>
              {t('savePurchaseOrder')}
            </button>
          </div>
        </div>
      )}

      {showSupplierForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '18px' : '32px', width: '100%', maxWidth: isMobile ? '90vw' : '500px' }}>
            <h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '20px', marginBottom: isMobile ? '14px' : '20px' }}>{t('newSupplier')}</h2>
            <input type="text" placeholder={t('supplierName')} value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', marginBottom: isMobile ? '8px' : '12px', boxSizing: 'border-box' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '8px' : '12px' }}>
              <input type="text" placeholder={t('mobileNumber')} value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} style={{ padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} />
              <input type="email" placeholder={t('email')} value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} style={{ padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} />
            </div>
            <input type="text" placeholder={t('address')} value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', marginBottom: isMobile ? '12px' : '16px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: isMobile ? '6px' : '10px' }}>
              <button onClick={() => setShowSupplierForm(false)} style={{ flex: 1, padding: isMobile ? '10px' : '14px', backgroundColor: '#F5F0EB', color: '#8B8B8B', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>{t('cancel')}</button>
              <button onClick={addSupplier} style={{ flex: 1, padding: isMobile ? '10px' : '14px', backgroundColor: '#C9A84C', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {showProductForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '18px' : '32px', width: '100%', maxWidth: isMobile ? '90vw' : '550px' }}>
            <h2 style={{ fontWeight: 'bold', color: '#1E1E3F', fontSize: isMobile ? '16px' : '20px', marginBottom: isMobile ? '14px' : '20px' }}>{editId ? t('editProduct') : t('newProduct')}</h2>
            <input type="text" placeholder={t('productName')} value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', marginBottom: isMobile ? '10px' : '16px', boxSizing: 'border-box' }} />
            <div style={{ marginBottom: isMobile ? '10px' : '14px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('sellingPrice')}</label>
              <input type="text" inputMode="decimal" placeholder="3.500" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: isMobile ? '10px' : '14px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#1E1E3F', marginBottom: '4px', fontSize: isMobile ? '12px' : '14px' }}>{t('cost')}</label>
              <input type="text" inputMode="decimal" placeholder="2.500" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '8px' : '12px' }}>
              <input type="number" placeholder={t('quantity')} value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })} style={{ padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', boxSizing: 'border-box' }} />
              <select value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} style={{ padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px' }}>
                {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <select value={newProduct.supplier_id} onChange={(e) => setNewProduct({ ...newProduct, supplier_id: e.target.value })} style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: '14px', border: 'none', backgroundColor: '#F5F0EB', fontSize: isMobile ? '13px' : '15px', marginBottom: isMobile ? '12px' : '16px' }}>
              <option value="">{t('selectSupplier')}</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: isMobile ? '6px' : '10px' }}>
              <button onClick={() => { setShowProductForm(false); setEditId(null) }} style={{ flex: 1, padding: isMobile ? '10px' : '14px', backgroundColor: '#F5F0EB', color: '#8B8B8B', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>{t('cancel')}</button>
              <button onClick={saveProduct} style={{ flex: 1, padding: isMobile ? '10px' : '14px', backgroundColor: '#1E1E3F', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>{editId ? t('update') : t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}