"use client";
import logo from "/logo.png";
import { Search } from "lucide-react";

export default function HomePage() {
  return (
    <div className="w-full min-h-screen bg-white">
      
      {/* TOP BAR */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto flex justify-between items-center py-3 px-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
  <img
    src="/logo.png"
    alt="Logo"
    className="h-10 w-auto object-contain"
  />
</div>


          {/* Search Bar */}
          <div className="hidden md:flex items-center w-1/2 border rounded-full px-4 py-2 gap-2">
            <Search size={18} />
            <input 
              type="text"
              placeholder="What are you looking for?"
              className="w-full outline-none text-sm"
            />
          </div>

          {/* Right Options */}
          <div className="flex items-center gap-6 text-sm font-medium">
            <p>99998 99998</p>
            <p>Track Order</p>
            <p>Sign In</p>
            <p>Wishlist</p>
            <p>Cart</p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="border-t">
          <div className="max-w-7xl mx-auto flex justify-center gap-6 py-3 text-sm font-semibold">
            <p>Eyeglasses</p>
            <p>Screen Glasses</p>
            <p>Kids Glasses</p>
            <p>Contact Lenses</p>
            <p>Sunglasses</p>
            <p>Home Eye-Test</p>
            <p>Store Locator</p>
            <p>Sale</p>
          </div>
        </nav>
      </header>

      {/* CATEGORY BOXES */}
      <section className="max-w-7xl mx-auto pt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 px-4">
        
        <CategoryItem
          title="Eyeglasses"
          img="https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300"
        />

        <CategoryItem
          title="Zero Power"
          img="https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300"
        />

        <CategoryItem
          title="Contact Lenses"
          img="https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300"
        />

        <CategoryItem
          title="Kids Glasses"
          img="https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300"
        />

        <CategoryItem
          title="Sunglasses"
          img="https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300"
        />

        <CategoryItem
          title="Progressive"
          img="https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=300"
        />
      </section>

      {/* HERO BANNER */}
      <section className="relative mt-10">
        <img
          src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300"
          alt="Festive Edit"
          className="w-full h-[500px] object-cover"
        />

        {/* Text Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end items-center pb-16 text-white bg-black bg-opacity-30">
          <h1 className="text-4xl font-bold mb-4">The Festive Edit</h1>
          <button className="px-6 py-2 bg-white text-black font-bold rounded-full">
            Shop Now
          </button>
        </div>
      </section>

    </div>
  );
}

interface CatProps {
  img: string;
  title: string;
}

function CategoryItem({ img, title }: CatProps) {
  return (
    <div className="flex flex-col items-center gap-2 border rounded-lg py-4 bg-white shadow-sm hover:shadow-md cursor-pointer transition">
      <img
        src={img}
        alt={title}
        className="h-20 w-20 object-cover rounded-md"
      />
      <p className="font-medium text-sm">{title}</p>
    </div>
  );
}
