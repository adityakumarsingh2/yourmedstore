import {
  Boxes,
  ClipboardList,
  Edit,
  PackagePlus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AppNav from '../components/AppNav.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../lib/api.js';

const emptyForm = {
  name: '',
  sku: '',
  description: '',
  baseUnit: 'g',
  basePricePerUnit: '',
  currentStock: ''
};

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function stockStatus(product) {
  const stock = Number(product.currentStock);

  if (stock <= 0) {
    return 'Out';
  }

  if (stock < 100) {
    return 'Watch';
  }

  return 'In stock';
}

function AdminPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`
  }), [token]);

  async function loadProducts(nextSearch = search) {
    setIsLoading(true);
    setError('');

    try {
      const params = nextSearch ? `?search=${encodeURIComponent(nextSearch)}` : '';
      const data = await apiRequest(`/api/admin/products${params}`, {
        headers: authHeaders
      });

      setProducts(data.products);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadOrders() {
    setIsOrdersLoading(true);
    setError('');

    try {
      const data = await apiRequest('/api/admin/orders', {
        headers: authHeaders
      });

      setOrders(data.orders);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsOrdersLoading(false);
    }
  }

  useEffect(() => {
    loadProducts('');
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function openCreateForm() {
    setForm(emptyForm);
    setEditingProductId(null);
    setIsFormOpen(true);
    setError('');
  }

  function openEditForm(product) {
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      baseUnit: product.baseUnit,
      basePricePerUnit: product.basePricePerUnit,
      currentStock: product.currentStock
    });
    setEditingProductId(product.id);
    setIsFormOpen(true);
    setError('');
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingProductId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const endpoint = editingProductId
        ? `/api/admin/products/${editingProductId}`
        : '/api/admin/products';
      const method = editingProductId ? 'PUT' : 'POST';

      await apiRequest(endpoint, {
        method,
        headers: authHeaders,
        body: JSON.stringify(form)
      });

      closeForm();
      await loadProducts();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(productId) {
    setError('');

    try {
      await apiRequest(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: authHeaders
      });

      setProducts((current) => current.filter((product) => product.id !== productId));
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  async function handleSearchSubmit(event) {
    event.preventDefault();
    await loadProducts(search);
  }

  async function updateOrderStatus(orderId, status) {
    setError('');

    try {
      await apiRequest(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status })
      });

      await Promise.all([loadOrders(), loadProducts(search)]);
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-teal-700">Admin panel</p>
            <h1 className="text-2xl font-semibold text-slate-950">Inventory and incoming orders</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form className="relative block" onSubmit={handleSearchSubmit}>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 sm:w-64"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search inventory"
                type="search"
                value={search}
              />
            </form>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => {
                loadProducts(search);
                loadOrders();
              }}
              type="button"
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
              Refresh
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800"
              onClick={openCreateForm}
              type="button"
            >
              <PackagePlus size={17} aria-hidden="true" />
              Add product
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {isFormOpen && (
          <section className="mb-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">
                {editingProductId ? 'Edit product' : 'Add product'}
              </h2>
              <button
                aria-label="Close product form"
                className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                onClick={closeForm}
                type="button"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <form className="grid gap-3 lg:grid-cols-6" onSubmit={handleSubmit}>
              <label className="lg:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
                <input
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  onChange={(event) => updateForm('name', event.target.value)}
                  required
                  value={form.name}
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">SKU</span>
                <input
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  onChange={(event) => updateForm('sku', event.target.value)}
                  required
                  value={form.sku}
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">Base unit</span>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  onChange={(event) => updateForm('baseUnit', event.target.value)}
                  value={form.baseUnit}
                >
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="items">items</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">Price</span>
                <input
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  min="0"
                  onChange={(event) => updateForm('basePricePerUnit', event.target.value)}
                  required
                  step="0.00000001"
                  type="number"
                  value={form.basePricePerUnit}
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">Stock</span>
                <input
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  min="0"
                  onChange={(event) => updateForm('currentStock', event.target.value)}
                  required
                  step="0.00000001"
                  type="number"
                  value={form.currentStock}
                />
              </label>
              <label className="lg:col-span-5">
                <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
                <input
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  onChange={(event) => updateForm('description', event.target.value)}
                  value={form.description}
                />
              </label>
              <div className="flex items-end">
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={isSaving}
                  type="submit"
                >
                  <Save size={17} aria-hidden="true" />
                  {isSaving ? 'Saving' : 'Save'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Boxes size={19} className="text-teal-700" aria-hidden="true" />
                <h2 className="font-semibold text-slate-950">Inventory management</h2>
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {products.length} rows
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Base unit</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan="7">Loading inventory...</td>
                    </tr>
                  )}
                  {!isLoading && products.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan="7">No products found.</td>
                    </tr>
                  )}
                  {!isLoading && products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{product.name}</p>
                        <p className="mt-1 max-w-64 truncate text-xs text-slate-500">{product.description || 'No description'}</p>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600">{product.sku}</td>
                      <td className="px-4 py-4 text-slate-700">{product.baseUnit}</td>
                      <td className="px-4 py-4 text-slate-700">{formatInr(product.basePricePerUnit)}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {Number(product.currentStock).toLocaleString('en-IN')} {product.baseUnit}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800">{stockStatus(product)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            aria-label={`Edit ${product.name}`}
                            className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            onClick={() => openEditForm(product)}
                            type="button"
                          >
                            <Edit size={16} aria-hidden="true" />
                          </button>
                          <button
                            aria-label={`Delete ${product.name}`}
                            className="grid h-9 w-9 place-items-center rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            onClick={() => handleDelete(product.id)}
                            type="button"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={19} className="text-teal-700" aria-hidden="true" />
                <h2 className="font-semibold text-slate-950">Incoming orders</h2>
              </div>
              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{orders.length} orders</span>
            </div>
            <div className="divide-y divide-slate-200">
              {isOrdersLoading && (
                <div className="p-4 text-sm text-slate-500">Loading incoming orders...</div>
              )}
              {!isOrdersLoading && orders.length === 0 && (
                <div className="p-4 text-sm text-slate-500">No incoming orders yet.</div>
              )}
              {!isOrdersLoading && orders.map((order) => (
                <article key={order.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{order.id.slice(0, 8)}</p>
                      <p className="mt-1 text-sm text-slate-500">{order.userEmail} - {new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{order.status}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-md bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-950">{item.productName}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{item.sku}</p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                          <div>
                            <p className="text-slate-500">Requested</p>
                            <p className="mt-1 font-medium text-slate-900">
                              {Number(item.requestedQuantity).toLocaleString('en-IN')} {item.requestedUnit}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Converted</p>
                            <p className="mt-1 font-medium text-slate-900">
                              {Number(item.convertedQuantity).toLocaleString('en-IN')} {item.baseUnit}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Rate</p>
                            <p className="mt-1 font-medium text-slate-900">{formatInr(item.unitPriceAtOrder)} / {item.baseUnit}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Line total</p>
                            <p className="mt-1 font-medium text-slate-900">{formatInr(item.lineTotal)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-slate-950">{formatInr(order.totalAmount)}</p>
                    <div className="flex gap-2">
                      <button
                        className="h-9 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={order.status === 'Rejected'}
                        onClick={() => updateOrderStatus(order.id, 'Rejected')}
                        type="button"
                      >
                        Reject
                      </button>
                      <button
                        className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={order.status === 'Approved'}
                        onClick={() => updateOrderStatus(order.id, 'Approved')}
                        type="button"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;
