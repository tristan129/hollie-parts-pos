import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

const CATEGORY_COLORS = {
  'FX Series': '#2563eb',
  'GX Series': '#7c3aed',
  'EQ2 Series': '#0891b2',
  'Turbo Mills': '#059669',
  'HaloMini': '#d97706',
  'HaloPocket': '#dc2626',
  'Clear Tubes': '#4b5563',
  'Other': '#6b7280',
};

const PART_CATEGORIES = {
  'FX Mill': 'FX Series',
  'FX Fans': 'FX Series',
  'FX Feeders': 'FX Series',
  'FX Transformers': 'FX Series',
  'GX Mill': 'GX Series',
  'GX Pro Transformers': 'GX Series',
  'GX Pro Displays': 'GX Series',
  'GX Pro Covers': 'GX Series',
  'EQ2 Masks': 'EQ2 Series',
  'Human Masks': 'EQ2 Series',
  'Turbo Mills': 'Turbo Mills',
  'Turbo Mill Plugs': 'Turbo Mills',
  'HaloMini Grind Mill': 'HaloMini',
  'HaloPocket Batteries': 'HaloPocket',
  'Clear Tube': 'Clear Tubes',
  'IR Covers': 'Other',
  'VB Covers': 'Other',
  'HaloRed UV Key': 'Other',
  'HaloRed Timing Knobs': 'Other',
};

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Failed to load inventory');
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError('Could not load inventory. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function addToCart(item) {
    if (item.quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(c => c.name === item.name);
      if (existing) {
        if (existing.qty >= item.quantity) return prev;
        return prev.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { name: item.name, qty: 1, available: item.quantity }];
    });
  }

  function removeFromCart(name) {
    setCart(prev => prev.filter(c => c.name !== name));
  }

  function updateQty(name, delta) {
    setCart(prev => prev.map(c => {
      if (c.name !== name) return c;
      const newQty = c.qty + delta;
      if (newQty <= 0) return null;
      if (newQty > c.available) return c;
      return { ...c, qty: newQty };
    }).filter(Boolean));
  }

  async function handleCheckout() {
    if (!customer.trim()) { setError('Please enter a customer name.'); return; }
    if (cart.length === 0) { setError('Cart is empty.'); return; }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customer.trim(),
          address: address.trim(),
          notes: notes.trim(),
          items: cart.map(c => ({ name: c.name, qty: c.qty })),
          date: new Date().toLocaleDateString('en-US'),
        }),
      });

      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();

      if (data.success) {
        setMessage(`✅ Shipment logged for ${customer}!`);
        setCart([]);
        setCustomer('');
        setAddress('');
        setNotes('');
        fetchInventory();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError('Checkout failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const grouped = inventory.reduce((acc, item) => {
    const cat = PART_CATEGORIES[item.name] || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const cartTotal = cart.reduce((sum, c) => sum + c.qty, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>🧂 Hollie Parts</h1>
          <p>Parts Fulfillment System</p>
        </div>
        <button onClick={fetchInventory} className={styles.refreshBtn}>↻ Refresh</button>
      </header>

      <div className={styles.layout}>
        {/* LEFT: Parts Grid */}
        <main className={styles.main}>
          {loading && <div className={styles.loading}>Loading inventory...</div>}
          {error && !loading && <div className={styles.errorBanner}>{error}</div>}
          {message && <div className={styles.successBanner}>{message}</div>}

          {!loading && Object.entries(grouped).map(([category, items]) => (
            <div key={category} className={styles.category}>
              <h2 style={{ color: CATEGORY_COLORS[category] || '#6b7280' }}>
                {category}
              </h2>
              <div className={styles.grid}>
                {items.map(item => {
                  const inCart = cart.find(c => c.name === item.name);
                  const outOfStock = item.quantity <= 0;
                  const low = item.quantity > 0 && item.quantity <= (item.minStock || 3);
                  return (
                    <button
                      key={item.name}
                      className={`${styles.partCard} ${outOfStock ? styles.outOfStock : ''} ${low ? styles.lowStock : ''} ${inCart ? styles.inCart : ''}`}
                      onClick={() => addToCart(item)}
                      disabled={outOfStock}
                    >
                      <span className={styles.partName}>{item.name}</span>
                      <span className={styles.partQty}>
                        {outOfStock ? '⚠ Out of Stock' : `${item.quantity} in stock`}
                      </span>
                      {inCart && <span className={styles.cartBadge}>{inCart.qty} in cart</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </main>

        {/* RIGHT: Cart & Checkout */}
        <aside className={styles.sidebar}>
          <div className={styles.cartHeader}>
            <h2>🛒 Cart {cartTotal > 0 && <span className={styles.badge}>{cartTotal}</span>}</h2>
          </div>

          {cart.length === 0 ? (
            <p className={styles.emptyCart}>Tap parts to add them to the cart</p>
          ) : (
            <ul className={styles.cartList}>
              {cart.map(c => (
                <li key={c.name} className={styles.cartItem}>
                  <span className={styles.cartName}>{c.name}</span>
                  <div className={styles.qtyControls}>
                    <button onClick={() => updateQty(c.name, -1)}>−</button>
                    <span>{c.qty}</span>
                    <button onClick={() => updateQty(c.name, 1)}>+</button>
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeFromCart(c.name)}>✕</button>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.checkoutForm}>
            <label>Customer Name *</label>
            <input
              type="text"
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder="e.g. Jane Smith"
              className={styles.input}
            />
            <label>Shipping Address</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Street, City, State ZIP"
              className={styles.textarea}
              rows={3}
            />
            <label>Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Order #, tracking notes, etc."
              className={styles.input}
            />
            <button
              className={styles.shipBtn}
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0 || !customer.trim()}
            >
              {submitting ? 'Logging Shipment...' : '📦 Log Shipment'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
