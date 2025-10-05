
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthContext';
import { useCart } from '@/hooks/useCartContext';
import Layout from '../components/Layout';
import CartSidebar from '../components/CartSidebar';
import { Loader2, Package, ShoppingCart, User, Plus, Minus, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

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
}

interface GroupedProducts {
  [category: string]: Product[];
}

const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<GroupedProducts>({});
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const { addToCart, cartCount, refreshCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory]);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products for shop page...');
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, offer_price, image_url, description, category, is_active, stock_quantity')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Products fetched successfully:', data?.length || 0);
      setProducts(data || []);

      // Initialize quantities
      const initialQuantities: { [key: string]: number } = {};
      (data || []).forEach(product => {
        initialQuantities[product.id] = 1;
      });
      setQuantities(initialQuantities);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again later.",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);

    // Group filtered products by category
    const grouped = filtered.reduce((acc: GroupedProducts, product) => {
      const category = product.category || 'Other';
      const categoryName = getCategoryDisplayName(category);
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    }, {});

    setGroupedProducts(grouped);
  };

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'chicken':
        return 'Chicken';
      case 'red_meat':
        return 'Red Meat';
      case 'chilli_condiments':
        return 'Chilli Condiments';
      default:
        return 'Other';
    }
  };

  const getCategories = () => {
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return categories.map(cat => ({
      value: cat!,
      label: getCategoryDisplayName(cat!)
    }));
  };

  const handleBuyNow = async (product: Product) => {
    console.log('🛒 Buy Now clicked for product:', product.name);

    if (isAuthenticated) {
      try {
        console.log('🔄 Adding item to cart for authenticated user...');
        await addToCart(product.id, quantities[product.id] || 1);

        console.log('🔄 Refreshing cart data...');
        await refreshCart();

        setTimeout(() => {
          console.log('➡️ Navigating to checkout with updated cart...');
          navigate('/checkout');
        }, 100);

      } catch (error) {
        console.error('❌ Error in Buy Now for authenticated user:', error);
        toast({
          title: "Error",
          description: "Failed to process purchase. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      console.log('➡️ Guest checkout - navigating with product data...');
      navigate('/checkout', {
        state: {
          guestCheckout: true,
          product: product,
          quantity: quantities[product.id] || 1
        }
      });
    }
  };

  const handleAddToCart = async (product: Product) => {
    await addToCart(product.id, quantities[product.id] || 1);
  };

  const updateQuantity = (productId: string, change: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + change)
    }));
  };

  const handleCartClick = () => {
    setCartOpen(true);
  };

  const renderProductCard = (product: Product) => {
    const displayPrice = product.offer_price || product.price;
    const hasOffer = product.offer_price && product.offer_price < product.price;

    return (
      <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="aspect-square">
          <img
            src={product.image_url || '/placeholder.svg'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-2 md:p-4">
          <h3 className="text-sm md:text-lg font-semibold text-gray-900 mb-1 md:mb-2 line-clamp-1">{product.name}</h3>
          <p className="text-gray-600 text-xs md:text-sm mb-2 md:mb-3 line-clamp-2">
            {product.description || 'No description available'}
          </p>
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="flex flex-col">
              <span className="text-lg md:text-2xl font-bold text-black">₹{displayPrice}</span>
              {hasOffer && (
                <span className="text-sm text-gray-500 line-through">₹{product.price}</span>
              )}
            </div>
            {product.stock_quantity !== null && (
              <span className="text-xs md:text-sm text-gray-500">
                Stock: {product.stock_quantity}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center space-x-1 md:space-x-2 mb-2 md:mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateQuantity(product.id, -1)}
              disabled={quantities[product.id] <= 1}
              className="h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-gray-100 transition-colors"
            >
              <Minus className="w-2 h-2 md:w-3 md:h-3" />
            </Button>
            <span className="text-xs md:text-sm font-medium px-1 md:px-3">{quantities[product.id] || 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateQuantity(product.id, 1)}
              className="h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-2 h-2 md:w-3 md:h-3" />
            </Button>
          </div>

          <div className="space-y-1 md:space-y-2">
            <Button
              onClick={() => handleBuyNow(product)}
              className="w-full bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-gray-900 text-xs md:text-sm py-2 md:py-2 transition-all duration-300 transform hover:scale-105"
              disabled={product.stock_quantity === 0}
            >
              <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              {product.stock_quantity === 0 ? 'Out of Stock' : 'Buy Now'}
            </Button>

            <Button
              onClick={() => handleAddToCart(product)}
              variant="outline"
              className="w-full text-xs md:text-sm py-2 md:py-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
              disabled={product.stock_quantity === 0}
            >
              Add to Cart
            </Button>

            <Button
              onClick={() => navigate(`/product/${product.id}`)}
              variant="ghost"
              className="w-full text-xs md:text-sm py-1 md:py-2 hover:bg-gray-100 transition-colors"
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      <Button
        onClick={handleCartClick}
        className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-gray-900 shadow-xl transition-all duration-300 transform hover:scale-110"
      >
        <ShoppingCart className="h-6 w-6" />
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
            {cartCount}
          </span>
        )}
      </Button>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-black to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Products</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8">
            Discover our carefully crafted collection of traditional foods
          </p>

          <div className="mt-8">
            {isAuthenticated ? (
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2 text-green-400">
                  <User className="h-5 w-5" />
                  <span>Welcome back, {user?.email}</span>
                </div>
                <Button
                  onClick={handleCartClick}
                  variant="outline"
                  className="bg-green-500 text-white border border-green-500 hover:bg-white hover:text-green-500 transition-all duration-300"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart ({cartCount})
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-blue-200 text-lg">Browse, shop, and checkout as a guest • Sign in for a better experience</p>
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={() => navigate('/auth')}
                    variant="outline"
                    // className="text-white border-white hover:bg-white hover:text-black transition-all duration-300"
                    className="bg-black text-white border border-white hover:bg-white hover:text-black transition-all duration-300"

                  >
                    Sign In / Register
                  </Button>
                  <Button
                    onClick={handleCartClick}
                    variant="outline"
                    // className="text-white border-white hover:bg-white hover:text-black transition-all duration-300"
                    className="bg-green-500 text-white border border-green-500 hover:bg-white hover:text-green-500 transition-all duration-300"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart ({cartCount})
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-8 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600">Filter by:</span>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getCategories().map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(searchTerm || selectedCategory !== 'all') && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Showing {filteredProducts.length} of {products.length} products
              </span>
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchTerm}"
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Category: {getCategoryDisplayName(selectedCategory)}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Products by Category */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : Object.keys(groupedProducts).length > 0 ? (
            <>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Available Products</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Choose from our selection of {filteredProducts.length} premium products
                  {searchTerm || selectedCategory !== 'all' ? ' matching your criteria' : ' organized by category'}
                </p>
              </div>

              {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                <div key={category} className="mb-16">
                  <div className="flex items-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-black to-gray-600 bg-clip-text text-transparent">
                      {category}
                    </h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent ml-4"></div>
                    <span className="text-sm text-gray-500 ml-4">{categoryProducts.length} items</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
                    {categoryProducts.map(renderProductCard)}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-20">
              <Package className="h-20 w-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {searchTerm || selectedCategory !== 'all' ? 'No products found' : 'No Products Available'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                  : 'We\'re working on adding new products. Please check back soon!'
                }
              </p>
              {(searchTerm || selectedCategory !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  View All Products
                </Button>
              )}
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="mt-16 text-center">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg max-w-md mx-auto border border-gray-200">
                <h3 className="text-2xl font-bold text-black mb-4">More Products Coming Soon!</h3>
                <p className="text-gray-600 mb-6">
                  We're constantly working on new flavors and products to add to our collection.
                  Stay tuned for exciting additions to the Googoo Foods family.
                </p>
                <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                  <p className="text-black font-medium">
                    Sign up for our newsletter to be the first to know about new products!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Shop;
