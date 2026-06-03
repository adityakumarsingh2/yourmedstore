import { Filter, FlaskConical, IndianRupee, Minus, Plus, Search, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AppNav from '../components/AppNav.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../lib/api.js';

const unitOptionsByBaseUnit = {
  g: ['g', 'kg'],
  L: ['L', 'mL'],
  items: ['items']
};

const conversionFactorsToBase = {
  g: 1,
  kg: 1000,
  L: 1,
  mL: 0.001,
  items: 1
};

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function calculateCartLine(item) {
  const convertedQuantity = Number(item.quantity || 0) * conversionFactorsToBase[item.unit];
  return convertedQuantity * Number(item.basePricePerUnit || 0);
}

function stockStatus(product) {
  const stock = Number(product.currentStock);

  if (stock <= 0) {
    return 'Out';
  }

  if (stock < 100) {
    return 'Limited';
  }

  return 'In stock';
}

function MarketplacePage() {
  const { isAuthenticated, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadProducts(nextSearch = search) {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();

      if (nextSearch) {
        params.set('search', nextSearch);
      }

      params.set('inStockOnly', String(inStockOnly));

      const data = await apiRequest(`/api/products?${params.toString()}`);
      setProducts(data.products);

      setDrafts((current) => {
        const nextDrafts = { ...current };

        data.products.forEach((product) => {
          if (!nextDrafts[product.id]) {
            nextDrafts[product.id] = {
              quantity: '100',
              unit: product.baseUnit
            };
          }
        });

        return nextDrafts;
      });
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inStockOnly]);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + calculateCartLine(item), 0),
    [cartItems]
  );

  function updateDraft(productId, field, value) {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        [field]: value
      }
    }));
  }

  function addToCart(product) {
    const draft = drafts[product.id] || { quantity: '1', unit: product.baseUnit };
    const quantity = Number(draft.quantity);

    setMessage('');
    setError('');

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    const convertedQuantity = quantity * conversionFactorsToBase[draft.unit];

    if (convertedQuantity > Number(product.currentStock)) {
      setError(`Only ${product.currentStock} ${product.baseUnit} is available for ${product.name}.`);
      return;
    }

    setCartItems((current) => {
      const existingItem = current.find((item) => item.productId === product.id && item.unit === draft.unit);

      if (existingItem) {
        return current.map((item) => (
          item.id === existingItem.id
            ? { ...item, quantity: String(Number(item.quantity) + quantity) }
            : item
        ));
      }

      return [
        ...current,
        {
          id: `${product.id}-${draft.unit}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          baseUnit: product.baseUnit,
          basePricePerUnit: product.basePricePerUnit,
          currentStock: product.currentStock,
          quantity: draft.quantity,
          unit: draft.unit
        }
      ];
    });
  }

  function updateCartItem(itemId, field, value) {
    setCartItems((current) => current.map((item) => (
      item.id === itemId ? { ...item, [field]: value } : item
    )));
  }

  function removeCartItem(itemId) {
    setCartItems((current) => current.filter((item) => item.id !== itemId));
  }

  async function submitOrder() {
    setMessage('');
    setError('');

    if (!isAuthenticated) {
      setError('Please sign in before placing a quotation.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Add at least one product to the quotation cart.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiRequest('/api/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit
          }))
        })
      });

      setCartItems([]);
      setMessage(`Quotation ${data.order.id} placed for ${formatInr(data.order.totalAmount)}.`);
      await loadProducts(search);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSearchSubmit(event) {
    event.preventDefault();
    await loadProducts(search);
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-40">
      <AppNav />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="h-fit rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-950">Marketplace</h1>
            <Filter size={18} className="text-slate-500" aria-hidden="true" />
          </div>
          <form onSubmit={handleSearchSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Search</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Compound or SKU"
                  type="search"
                  value={search}
                />
              </span>
            </label>
          </form>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Unit systems</p>
            <div className="grid gap-2 text-sm text-slate-700">
              <div className="rounded-md border border-slate-200 px-3 py-2">Mass: g, kg</div>
              <div className="rounded-md border border-slate-200 px-3 py-2">Volume: L, mL</div>
              <div className="rounded-md border border-slate-200 px-3 py-2">Count: items</div>
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Availability</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                checked={inStockOnly}
                className="accent-teal-700"
                onChange={(event) => setInStockOnly(event.target.checked)}
                type="checkbox"
              />
              In-stock products
            </label>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-teal-700">{products.length} products</p>
              <h2 className="text-2xl font-semibold text-slate-950">Chemical catalog</h2>
            </div>
            <button
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-50"
              onClick={() => loadProducts(search)}
              type="button"
            >
              Refresh catalog
            </button>
          </div>

          {(error || message) && (
            <div className={`mb-4 rounded-md border px-4 py-3 text-sm font-medium ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-teal-200 bg-teal-50 text-teal-800'}`}>
              {error || message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading && (
              <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm md:col-span-2 xl:col-span-3">
                Loading products...
              </div>
            )}
            {!isLoading && products.length === 0 && (
              <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm md:col-span-2 xl:col-span-3">
                No products match the current search.
              </div>
            )}
            {!isLoading && products.map((product) => {
              const draft = drafts[product.id] || { quantity: '100', unit: product.baseUnit };
              const linePreview = calculateCartLine({
                quantity: draft.quantity,
                unit: draft.unit,
                basePricePerUnit: product.basePricePerUnit
              });

              return (
                <article key={product.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-cyan-50 text-cyan-800">
                      <FlaskConical size={22} aria-hidden="true" />
                    </div>
                    <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{stockStatus(product)}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-950">{product.name}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">{product.sku}</p>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{product.description || 'No description available.'}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-slate-100 p-3">
                      <p className="text-xs text-slate-500">Base price</p>
                      <p className="mt-1 font-semibold text-slate-950">{formatInr(product.basePricePerUnit)} / {product.baseUnit}</p>
                    </div>
                    <div className="rounded-md bg-slate-100 p-3">
                      <p className="text-xs text-slate-500">Stock</p>
                      <p className="mt-1 font-semibold text-slate-950">{Number(product.currentStock).toLocaleString('en-IN')} {product.baseUnit}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_96px] gap-2">
                    <input
                      className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                      min="0.00000001"
                      onChange={(event) => updateDraft(product.id, 'quantity', event.target.value)}
                      step="0.00000001"
                      type="number"
                      value={draft.quantity}
                    />
                    <select
                      className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                      onChange={(event) => updateDraft(product.id, 'unit', event.target.value)}
                      value={draft.unit}
                    >
                      {unitOptionsByBaseUnit[product.baseUnit].map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Preview</span>
                    <span className="font-semibold text-slate-950">{formatInr(linePreview)}</span>
                  </div>
                  <button
                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                    onClick={() => addToCart(product)}
                    type="button"
                  >
                    <Plus size={17} aria-hidden="true" />
                    Add quote item
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <aside className="fixed bottom-4 left-4 right-4 z-30 mx-auto max-w-5xl rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-white">
                <ShoppingCart size={19} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Quotation cart</h2>
                <p className="text-xs text-slate-500">{cartItems.length} selected items</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 md:min-w-64">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="flex items-center text-lg font-semibold text-slate-950">
                  <IndianRupee size={17} aria-hidden="true" />
                  {cartTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <button
                className="h-10 rounded-md bg-amber-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isSubmitting}
                onClick={submitOrder}
                type="button"
              >
                {isSubmitting ? 'Placing' : 'Place quote'}
              </button>
            </div>
          </div>
          {cartItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cartItems.map((item) => {
                const lineTotal = calculateCartLine(item);

                return (
                  <div key={item.id} className="grid gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 sm:grid-cols-[minmax(150px,1fr)_96px_82px_88px_32px] sm:items-center">
                    <span className="font-medium text-slate-950">{item.name}</span>
                    <input
                      className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm"
                      min="0.00000001"
                      onChange={(event) => updateCartItem(item.id, 'quantity', event.target.value)}
                      step="0.00000001"
                      type="number"
                      value={item.quantity}
                    />
                    <select
                      className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm"
                      onChange={(event) => updateCartItem(item.id, 'unit', event.target.value)}
                      value={item.unit}
                    >
                      {unitOptionsByBaseUnit[item.baseUnit].map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                    <span className="font-semibold text-slate-950">{formatInr(lineTotal)}</span>
                    <button
                      aria-label={`Remove ${item.name}`}
                      className="grid h-8 w-8 place-items-center rounded bg-white text-slate-500"
                      onClick={() => removeCartItem(item.id)}
                      type="button"
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default MarketplacePage;
