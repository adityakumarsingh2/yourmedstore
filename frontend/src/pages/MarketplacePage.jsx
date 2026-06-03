import { Filter, FlaskConical, IndianRupee, Minus, Plus, Search, ShoppingCart } from 'lucide-react';
import AppNav from '../components/AppNav.jsx';
import { products, quotationItems } from '../data/mockData.js';

const units = ['g', 'kg', 'L', 'mL', 'items'];
const categories = ['All', 'Salts', 'Solvents', 'Acids', 'Oxidizers', 'Labware'];

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(value);
}

function MarketplacePage() {
  const cartTotal = quotationItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      <AppNav />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="h-fit rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-950">Marketplace</h1>
            <Filter size={18} className="text-slate-500" aria-hidden="true" />
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="search"
                placeholder="Compound or SKU"
                className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              />
            </span>
          </label>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Category</p>
            <div className="grid gap-2">
              {categories.map((category, index) => (
                <label key={category} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <span>{category}</span>
                  <input type="radio" name="category" className="accent-teal-700" defaultChecked={index === 0} />
                </label>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Availability</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="accent-teal-700" defaultChecked />
              In-stock products
            </label>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-teal-700">6 products</p>
              <h2 className="text-2xl font-semibold text-slate-950">Chemical catalog</h2>
            </div>
            <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100">
              <option>Sort by stock</option>
              <option>Sort by price</option>
              <option>Sort by name</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-cyan-50 text-cyan-800">
                    <FlaskConical size={22} aria-hidden="true" />
                  </div>
                  <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{product.status}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-950">{product.name}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">{product.sku}</p>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{product.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-slate-100 p-3">
                    <p className="text-xs text-slate-500">Base price</p>
                    <p className="mt-1 font-semibold text-slate-950">{formatInr(product.price)} / {product.baseUnit}</p>
                  </div>
                  <div className="rounded-md bg-slate-100 p-3">
                    <p className="text-xs text-slate-500">Stock</p>
                    <p className="mt-1 font-semibold text-slate-950">{product.stock} {product.baseUnit}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_96px] gap-2">
                  <input
                    type="number"
                    min="1"
                    defaultValue="100"
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  />
                  <select className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100">
                    {units.map((unit) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800">
                  <Plus size={17} aria-hidden="true" />
                  Add quote item
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <aside className="fixed bottom-4 left-4 right-4 z-30 mx-auto max-w-4xl rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-white">
              <ShoppingCart size={19} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Quotation cart</h2>
              <p className="text-xs text-slate-500">{quotationItems.length} selected items</p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            {quotationItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium text-slate-950">{item.name}</span>
                <span>{item.quantity} {item.unit}</span>
                <button className="grid h-6 w-6 place-items-center rounded bg-white text-slate-500" aria-label={`Remove ${item.name}`}>
                  <Minus size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 md:min-w-64">
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="flex items-center text-lg font-semibold text-slate-950">
                <IndianRupee size={17} aria-hidden="true" />
                {cartTotal.toLocaleString('en-IN')}
              </p>
            </div>
            <button className="h-10 rounded-md bg-amber-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-400">
              Place quote
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default MarketplacePage;
