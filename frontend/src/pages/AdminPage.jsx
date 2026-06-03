import { Boxes, ClipboardList, PackagePlus, Search, SlidersHorizontal } from 'lucide-react';
import AppNav from '../components/AppNav.jsx';
import { incomingOrders, products } from '../data/mockData.js';

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(value);
}

function AdminPage() {
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
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="search"
                placeholder="Search inventory"
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 sm:w-64"
              />
            </label>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <SlidersHorizontal size={17} aria-hidden="true" />
              Filters
            </button>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800">
              <PackagePlus size={17} aria-hidden="true" />
              Add product
            </button>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Boxes size={19} className="text-teal-700" aria-hidden="true" />
                <h2 className="font-semibold text-slate-950">Inventory management</h2>
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{products.length} rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Base unit</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{product.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{product.category}</p>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600">{product.sku}</td>
                      <td className="px-4 py-4 text-slate-700">{product.baseUnit}</td>
                      <td className="px-4 py-4 text-slate-700">{formatInr(product.price)}</td>
                      <td className="px-4 py-4 text-slate-700">{product.stock.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4">
                        <span className="rounded bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800">{product.status}</span>
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
              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Queue</span>
            </div>
            <div className="divide-y divide-slate-200">
              {incomingOrders.map((order) => (
                <article key={order.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{order.id}</p>
                      <p className="mt-1 text-sm text-slate-500">{order.buyer} · {order.date}</p>
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{order.status}</span>
                  </div>
                  <div className="mt-4 rounded-md bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-950">{order.item}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div>
                        <p className="text-slate-500">Requested</p>
                        <p className="mt-1 font-medium text-slate-900">{order.requested}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Converted</p>
                        <p className="mt-1 font-medium text-slate-900">{order.converted}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-slate-950">{formatInr(order.amount)}</p>
                    <div className="flex gap-2">
                      <button className="h-9 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700">Reject</button>
                      <button className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white">Approve</button>
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
