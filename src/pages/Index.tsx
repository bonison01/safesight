// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import FeaturedProducts from '@/components/FeaturedProducts';
import TestimonialCard from '@/components/TestimonialCard';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, ChevronRight, Tag, Gift, Truck, Percent } from 'lucide-react';

interface Promo {
  id: string;
  title: string;
  subtitle?: string;
  cta?: string;
  image?: string;
  href?: string;
}

interface Testimonial {
  name: string;
  rating: number;
  comment: string;
  location?: string;
  image?: string;
}

// FALLBACKS
const fallbackPromos: Promo[] = [
  { id: 'f-p1', title: 'Up to 50% off on Frames', subtitle: 'Limited time mega sale', cta: 'Shop Offers', image: '/lovable-uploads/promo-frames.jpg', href: '/shop?offer=frames' },
  { id: 'f-p2', title: 'Buy 1 Get 1 Free', subtitle: 'Select sunglasses', cta: 'Explore', image: '/lovable-uploads/promo-sun.jpg', href: '/shop?offer=bogo' },
  { id: 'f-p3', title: 'Free Home Eye Test', subtitle: 'Certified optometrists at your door', cta: 'Book Now', image: '/lovable-uploads/promo-eye-test.jpg', href: '/book-appointment' },
];

const fallbackTestimonials: Testimonial[] = [
  { name: 'Dr. Aditi Rao', rating: 5, comment: 'Incredible lens clarity. My patients recommend EyeWell!', location: 'Pune', image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face' },
  { name: 'Arjun Patel', rating: 5, comment: 'Great BOGO deals on sunglasses — stylish and affordable.', location: 'Delhi', image: 'https://images.unsplash.com/photo-1502767089025-6572583495b0?w=400&h=400&fit=crop&crop=face' },
  { name: 'Sneha Verma', rating: 4, comment: 'Fast delivery and excellent packaging.', location: 'Bangalore', image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face' },
];

const Index = () => {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [homepageProducts, setHomepageProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchPromos();
    fetchDynamicCategories();
    fetchTestimonials();
    fetchHomeProducts();
  }, []);

  const fetchPromos = async () => {
    const { data, error } = await supabase.from<any>('promos').select('*');
    if (error || !data?.length) return setPromos(fallbackPromos);
    setPromos(data);
  };

  // ⛔ No categories table
  // 🔥 Fetch unique categories from products
  const fetchDynamicCategories = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('category, image_url')
      .not('category', 'is', null);

    if (error || !data?.length) return;

    const unique = [...new Set(data.map((p) => p.category))];

    const formatted = unique.map((c: string, index: number) => {
      const firstImage = data.find((p) => p.category === c)?.image_url;

      return {
        id: 'auto-' + index,
        name: c,
        href: '/shop?cat=' + encodeURIComponent(c),
        image: firstImage || '/placeholder.svg',
      };
    });

    setCategories(formatted);
  };

  const fetchHomeProducts = async () => {
    const { data, error } = await supabase
      .from<any>('products')
      .select('*')
      .eq('is_active', true)
      .limit(12);

    if (!error && data?.length > 0) {
      setHomepageProducts(data);
    }
  };

  const fetchTestimonials = async () => {
    const { data, error } = await supabase.from<any>('testimonials').select('*');
    if (error || !data?.length) return setTestimonials(fallbackTestimonials);
    setTestimonials(data);
  };

  return (
    <Layout>

      {/* Top offers ribbon */}
      <div className="w-full bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <Tag className="w-4 h-4 text-yellow-700" />
            <span className="font-medium">Mega Fest — Upto 50% off + Extra coupons</span>
            <span className="text-gray-600">| Free shipping ₹499+</span>
          </div>
          <div>
            <Link to="/shop" className="text-yellow-700 font-semibold hover:underline">Shop Deals <ChevronRight className="inline w-4 h-4 ml-1" /></Link>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-700 to-blue-900 text-white p-8">
          <img src="/lovable-uploads/mega-banner-left.jpg" className="absolute inset-0 w-full h-full object-cover opacity-20" alt="hero" />
          <div className="relative z-10 max-w-xl">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">Frames, Sunglasses & Specs — All Under One Roof</h1>
            <p className="text-lg text-blue-100 mb-6">Marketplace deals, multiple brands, try-on experiences and free home eye tests.</p>
            <div className="flex gap-3">
              <Link to="/shop" className="bg-white text-blue-900 px-5 py-3 rounded-lg font-semibold shadow">Shop Now</Link>
              <Link to="/offers" className="border-2 border-white px-5 py-3 rounded-lg text-white hover:bg-white hover:text-blue-900 transition">View Offers</Link>
            </div>
          </div>
        </div>

        {/* PROMOS */}
        <div className="space-y-4">
          {promos.map((p) => (
            <Link key={p.id} to={p.href || '/shop'} className="block rounded-lg overflow-hidden shadow hover:shadow-lg transition bg-white">
              <div className="flex items-center gap-4">
                <img src={p.image || '/placeholder.svg'} alt={p.title} className="w-28 h-28 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold text-blue-900">{p.title}</h3>
                  <p className="text-sm text-gray-600">{p.subtitle}</p>
                  <div className="mt-2 text-sm text-blue-700 font-medium">{p.cta} <ChevronRight className="inline w-4 h-4" /></div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CATEGORY STRIP (dynamic) */}
      <section className="py-6 bg-white border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Shop by Category</h2>
            <Link to="/shop" className="text-blue-700 font-medium hover:underline">See all categories</Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {categories.map((c) => (
              <Link key={c.id} to={c.href} className="min-w-[180px] bg-blue-50 p-4 rounded-xl flex-shrink-0 hover:shadow-lg transition">
                <img src={c.image} alt={c.name} className="w-full h-28 object-cover rounded-md mb-3" />
                <div className="font-semibold text-blue-800">{c.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT GRID — REAL PRODUCTS */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">Recommended for You</h3>
            <Link to="/shop" className="text-blue-700 font-medium hover:underline">Browse more</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {homepageProducts.map((p) => {
              const displayPrice = p.offer_price && p.offer_price < p.price ? p.offer_price : p.price;
              return (
                <Link key={p.id} to={`/product/${p.id}`} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition block">
                  <div className="aspect-square">
                    <img src={p.image_url || '/placeholder.svg'} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-blue-900 line-clamp-2">{p.name}</div>
                    <div className="text-blue-800 font-bold mt-1">₹{displayPrice}</div>
                    {p.rating && <div className="text-yellow-500 text-xs mt-1">★ {p.rating}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products — uses carousel */}
      <section className="py-12 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">Hot Deals & Top Sellers</h3>
            <Link to="/shop" className="text-blue-700 font-medium">View all</Link>
          </div>
          <FeaturedProducts />
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <Truck className="w-7 h-7 text-blue-700" />
            <div>
              <h4 className="font-semibold text-blue-900">Fast Delivery</h4>
              <p className="text-sm text-gray-600">Same-day dispatch for select pins and express delivery options.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Gift className="w-7 h-7 text-blue-700" />
            <div>
              <h4 className="font-semibold text-blue-900">Marketplace Offers</h4>
              <p className="text-sm text-gray-600">Exclusive brand coupons and marketplace seller discounts.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Percent className="w-7 h-7 text-blue-700" />
            <div>
              <h4 className="font-semibold text-blue-900">Flexible Returns</h4>
              <p className="text-sm text-gray-600">7–15 days easy returns on eligible products.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 bg-gradient-to-r from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">What shoppers say</h3>
          <p className="text-sm text-gray-600 mb-8">Real buyers — real feedback</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <TestimonialCard
                key={i}
                name={t.name}
                rating={t.rating}
                comment={t.comment}
                location={t.location}
                image={t.image}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SELLER CTA */}
      <section className="py-8 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-bold">Become a Marketplace Seller</h4>
            <p className="text-sm text-blue-200">Reach lakhs of customers — onboard quickly and start selling.</p>
          </div>
          <div>
            <Link to="/sell" className="bg-white text-blue-900 px-5 py-2 rounded-lg font-semibold">Sell on EyeWell</Link>
          </div>
        </div>
      </section>

      {/* Floating chat */}
      <button
        onClick={() => alert('Live chat feature coming soon!')}
        className="fixed bottom-6 right-6 z-50 bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105"
        aria-label="Live chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

    </Layout>
  );
};

export default Index;
