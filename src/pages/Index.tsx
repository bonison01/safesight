// @ts-nocheck
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import FeaturedProducts from "@/components/FeaturedProducts";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, MessageCircle } from "lucide-react";

// CATEGORY ICON IMAGES
const categoryIcons = {
  "Eyeglasses": "/eyegl.jpg",
  "Zero Power": "/zero.jpg",
  "Contact Lenses": "/contact lens.jpg",
  "Kids Glasses": "/kids.jpg",
  "Sunglasses": "/sun.jpg",
  "Progressive": "/progessive.jpg",
};

const categoryList = [
  "Eyeglasses",
  "Zero Power",
  "Contact Lenses",
  "Kids Glasses",
  "Sunglasses",
  "Progressive",
];

const Index = () => {
  const [homepageProducts, setHomepageProducts] = useState([]);

  useEffect(() => {
    fetchHomeProducts();
  }, []);

  const fetchHomeProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .limit(12);

    if (data) setHomepageProducts(data);
  };

  return (
    <Layout>

      {/* CATEGORY ICON STRIP — LENSKART STYLE */}
      <section className="bg-white py-5 border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto">
          {categoryList.map((cat, index) => (
            <Link
              key={index}
              to={`/shop?category=${encodeURIComponent(cat)}`}
              className="min-w-[180px] bg-white rounded-2xl shadow p-4 flex flex-col items-center hover:shadow-md transition"
            >
              <img
                src={categoryIcons[cat]}
                className="h-20 object-contain mb-3"
              />
              <p className="font-medium text-gray-800">{cat}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* HERO BANNER — LARGE */}
      <section className="w-full bg-black">
        <div className="max-w-10xl mx-auto">
          <img
            src="/eye.jpg"
            className="w-full rounded-b-3xl"
          />
        </div>
      </section>

      {/* RECOMMENDED PRODUCTS */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">Recommended for You</h3>
            <Link to="/shop" className="text-blue-700">View All</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {homepageProducts.map((p) => {
              const price = p.offer_price && p.offer_price < p.price ? p.offer_price : p.price;

              return (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="bg-white rounded-xl border shadow-sm hover:shadow-lg transition overflow-hidden"
                >
                  <img
                    src={p.image_url || "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800"}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 line-clamp-2">{p.name}</p>
                    <p className="text-blue-700 font-bold mt-1">₹{price}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOT DEALS CAROUSEL */}
      <section className="py-12 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl font-bold mb-6">Hot Deals & Top Sellers</h3>
          <FeaturedProducts />
        </div>
      </section>

      {/* FLOATING CHAT */}
      <button
        onClick={() => alert("Live chat coming soon!")}
        className="fixed bottom-6 right-6 bg-blue-700 text-white p-4 rounded-full shadow-lg"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

    </Layout>
  );
};

export default Index;
