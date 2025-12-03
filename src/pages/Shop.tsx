import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthContext';
import { useCart } from '@/hooks/useCartContext';
import Layout from '@/components/Layout';
import CartSidebar from '@/components/CartSidebar';
import { Loader2, ShoppingCart, Filter, Search, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

// Types
interface Variant {
  id: string;
  product_id: string;
  color?: string | null;
  size?: string | null;
  price?: number | null;
  stock_quantity?: number | null;
  image_url?: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  offer_price: number | null;
  image_url: string | null;
  description: string | null;
  category: string | null;
  is_active: boolean;
  stock_quantity: number | null;
  seller?: string | null;
  rating?: number | null;
  variants?: Variant[];
}

type SortOption = 'popular' | 'new' | 'price_low' | 'price_high' | 'rating';

const PAGE_SIZE = 24;

const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [page, setPage] = useState(1);
  const [expandedFilters, setExpandedFilters] = useState(true);

  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { addToCart, cartCount, refreshCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, searchTerm, selectedCategory, selectedBrands, priceRange, inStockOnly, sortBy, page]);

  // Fetch products + variants (marketplace style)
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('id, name, price, offer_price, image_url, description, category, is_active, stock_quantity, seller, rating')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (prodErr) throw prodErr;
      const productsRaw = prodData || [];

      const { data: varData, error: varErr } = await supabase
        .from('product_variants')
        .select('id, product_id, color, size, price, stock_quantity, image_url');

      if (varErr) throw varErr;
      const variantsRaw = varData || [];

      const mapped: Product[] = (productsRaw as any[]).map((p) => ({
        ...p,
        variants: variantsRaw.filter((v) => v.product_id === p.id)
      }));

      setProducts(mapped);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error loading products',
        description: 'Could not fetch product list. Try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
  }, [products]);

  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.seller).filter(Boolean))).sort();
  }, [products]);

  const computeTotalStock = (p: Product) => {
    if (p.variants && p.variants.length) return p.variants.reduce((s, v) => s + (v.stock_quantity || 0), 0);
    return p.stock_quantity || 0;
  };

  const applyFilters = () => {
    let out = [...products];

    // search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      out = out.filter((p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }

    // category
    if (selectedCategory !== 'all') out = out.filter((p) => (p.category || '') === selectedCategory);

    // brands
    if (selectedBrands.length > 0) out = out.filter((p) => selectedBrands.includes(p.seller || ''));

    // in stock
    if (inStockOnly) out = out.filter((p) => computeTotalStock(p) > 0);

    // price range (consider offer price if present)
    out = out.filter((p) => {
      const price = p.offer_price && p.offer_price < p.price ? p.offer_price : p.price;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // sort
    switch (sortBy) {
      case 'new':
        out.sort((a, b) => 0 - (a.id < b.id ? -1 : 1)); // best-effort newness (relies on created_at ideally)
        break;
      case 'price_low':
        out.sort((a, b) => (a.offer_price || a.price) - (b.offer_price || b.price));
        break;
      case 'price_high':
        out.sort((a, b) => (b.offer_price || b.price) - (a.offer_price || a.price));
        break;
      case 'rating':
        out.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        // popular - keep server order or sort by rating+stock
        out.sort((a, b) => ((b.rating || 0) - (a.rating || 0)));
    }

    // pagination
    setFiltered(out);
  };

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedBrands([]);
    setPriceRange([0, 10000]);
    setInStockOnly(false);
    setSortBy('popular');
    setPage(1);
  };

  const handleAddToCart = async (p: Product, qty = 1) => {
    try {
      await addToCart(p.id, qty);
      await refreshCart();
      toast({ title: 'Added to cart', description: `${p.name} added`, variant: 'default' });
    } catch (err) {
      toast({ title: 'Add to cart failed', description: 'Please try again', variant: 'destructive' });
    }
  };

  const handleBuyNow = async (p: Product) => {
    try {
      await addToCart(p.id, 1);
      await refreshCart();
      navigate('/checkout');
    } catch (err) {
      toast({ title: 'Purchase failed', description: 'Please try again', variant: 'destructive' });
    }
  };

  // Try-on placeholder modal (simple alert for now)
  const openTryOn = (product: Product) => {
    alert(`Try-On (placeholder) for ${product.name}. Integrate 3D/AR try-on SDK here.`);
  };

  return (
    <Layout>
      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Floating cart button */}
      <Button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-xl"
      >
        <ShoppingCart className="h-6 w-6" />
        {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">{cartCount}</span>}
      </Button>

      {/* Sticky top search + sorting bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-blue-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-3 w-full md:w-1/2">
            <Search className="w-5 h-5 text-blue-500" />
            <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Search frames, sunglasses, brands..." className="w-full" />
          </div>

          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="new">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
              </SelectContent>
            </Select>

            <button onClick={() => setExpandedFilters((s) => !s)} className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded">
              <Filter className="w-4 h-4" /><span className="text-sm font-medium">{expandedFilters ? 'Hide Filters' : 'Show Filters'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        {expandedFilters && (
          <aside className="col-span-1 bg-white p-4 rounded-lg border border-blue-50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Filters</h4>
              <button className="text-sm text-blue-600" onClick={clearAllFilters}>Clear</button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Category</label>
              <div className="flex flex-col gap-2">
                <button className={`text-left text-sm p-2 rounded ${selectedCategory === 'all' ? 'bg-blue-50 font-semibold' : 'hover:bg-blue-50'}`} onClick={() => setSelectedCategory('all')}>All</button>
                {uniqueCategories.map((cat) => (
                  <button key={cat} className={`text-left text-sm p-2 rounded ${selectedCategory === cat ? 'bg-blue-50 font-semibold' : 'hover:bg-blue-50'}`} onClick={() => { setSelectedCategory(cat); setPage(1); }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Brands</label>
              <div className="flex flex-col max-h-48 overflow-auto gap-2">
                {uniqueBrands.map((b) => (
                  <label key={b} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => toggleBrand(b)} />
                    <span className="truncate">{b}</span>
                  </label>
                ))}
                {uniqueBrands.length === 0 && <div className="text-sm text-gray-500">No brands</div>}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Price Range (₹)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={priceRange[0]} onChange={(e) => setPriceRange([Number(e.target.value || 0), priceRange[1]])} className="w-24 p-2 border rounded" />
                <span className="text-sm">—</span>
                <input type="number" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value || 10000)])} className="w-24 p-2 border rounded" />
              </div>
            </div>

            <div className="mb-4">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                <span className="text-sm">In-stock only</span>
              </label>
            </div>

            <div className="mt-6">
              <Button onClick={() => { setPage(1); applyFilters(); }} className="w-full">Apply Filters</Button>
            </div>
          </aside>
        )}

        {/* Products grid */}
        <main className={`${expandedFilters ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
              <span className="ml-3 text-blue-700">Loading products...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <h3 className="text-2xl font-bold text-blue-700 mb-2">No products found</h3>
              <p className="text-sm text-gray-600 mb-6">Try removing filters or expanding the price range.</p>
              <Button onClick={clearAllFilters}>Reset Filters</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {paginated.map((p) => {
                  const displayPrice = p.offer_price && p.offer_price < p.price ? p.offer_price : p.price;
                  const totalStock = computeTotalStock(p);
                  const colors = p.variants ? Array.from(new Set(p.variants.map((v) => v.color).filter(Boolean))) : [];

                  return (
                    <div key={p.id} className="bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-lg transition overflow-hidden">
                      <div className="relative aspect-square">
                        <img src={p.image_url || (p.variants && p.variants[0]?.image_url) || '/placeholder.svg'} alt={p.name} className="w-full h-full object-cover" />
                        {/* quick try-on */}
                        <button onClick={() => openTryOn(p)} className="absolute top-3 left-3 bg-white/90 text-blue-800 px-2 py-1 rounded text-xs font-medium">Try On</button>
                        {/* Seller badge */}
                        {p.seller && <div className="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded text-xs">{p.seller}</div>}
                      </div>

                      <div className="p-3">
                        <h4 className="text-sm font-semibold text-blue-900 line-clamp-2">{p.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-blue-800 font-bold">₹{displayPrice}</div>
                          {p.offer_price && p.offer_price < p.price && <div className="text-xs line-through text-gray-400">₹{p.price}</div>}
                          {p.rating && <div className="ml-auto flex items-center gap-1 text-yellow-500"><Star className="w-4 h-4" /> <span className="text-sm font-medium">{p.rating}</span></div>}
                        </div>

                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{p.description || 'Premium eyewear'}</p>

                        {/* color swatches */}
                        <div className="flex items-center gap-2 mt-3">
                          {colors.length > 0 ? colors.slice(0,6).map((c, i) => (
                            <div key={i} title={c} className="w-6 h-6 rounded-full border" style={{ background: c || '#ddd' }} />
                          )) : <div className="text-xs text-gray-400">No color variants</div>}
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <Button size="sm" onClick={() => handleAddToCart(p, 1)} className="col-span-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white">Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleBuyNow(p)}>Buy</Button>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          {totalStock === 0 ? <span className="text-red-600">Out of stock</span> : <span>{totalStock} in stock</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-600">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} products</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-2 bg-blue-50 rounded">Prev</button>
                  <div className="px-3 py-2 rounded bg-white border">{page}</div>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page * PAGE_SIZE >= filtered.length} className="px-3 py-2 bg-blue-50 rounded">Next</button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </Layout>
  );
};

export default Shop;
