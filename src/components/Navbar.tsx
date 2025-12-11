// @ts-nocheck
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuthContext";
import { useCart } from "@/hooks/useCartContext";
import CartSidebar from "./CartSidebar";
import ProfileDropdown from "./ProfileDropdown";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);
  const handleCartClick = () => setCartOpen(true);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      {/* CART SIDEBAR */}
      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center gap-8">

          {/* LOGO (LEFT) */}
          <Link to="/" className="flex items-center gap-3">
            <span className="text-4xl font-extrabold tracking-wide text-gray-900">
              Safe<span className="text-blue-700">Sight</span>
            </span>
          </Link>

          {/* SEARCH BAR (CENTER) */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="w-full max-w-xl bg-white rounded-full flex items-center px-4 py-2 border border-gray-300 shadow-sm hover:shadow transition">
              <Search className="w-5 h-5 text-black" />
              <input
                placeholder="What are you looking for?"
                className="ml-3 bg-transparent outline-none w-full text-gray-900 placeholder-gray-600"
              />
            </div>
          </div>

          {/* NAVIGATION + ACTIONS (RIGHT) */}
          <div className="flex items-center gap-6">

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-black hover:text-blue-700 text-sm font-semibold transition"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* PROFILE DROPDOWN */}
            <ProfileDropdown />

            {/* CART BUTTON */}
            <button
              onClick={handleCartClick}
              className="relative p-3 hover:bg-gray-100 rounded-full"
            >
              <ShoppingCart className="h-7 w-7 text-black" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={toggleMenu}
              className="p-2 md:hidden hover:bg-gray-100 rounded-md"
            >
              {isOpen ? (
                <X className="h-7 w-7 text-black" />
              ) : (
                <Menu className="h-7 w-7 text-black" />
              )}
            </button>
          </div>
        </div>

        {/* CATEGORY BAR */}
        <div className="hidden md:flex justify-center gap-10 py-3 border-t bg-white text-black text-sm font-medium">
          <Link to="/shop?category=Eyeglasses" className="hover:text-blue-700">Eyeglasses</Link>
          <Link to="/shop?category=Zero Power" className="hover:text-blue-700">Zero Power</Link>
          <Link to="/shop?category=Contact Lens" className="hover:text-blue-700">Contact Lenses</Link>
          <Link to="/shop?category=Kids Section" className="hover:text-blue-700">Kids Glasses</Link>
          <Link to="/shop?category=Sunglasses" className="hover:text-blue-700">Sunglasses</Link>
          <Link to="/shop?category=Progressive" className="hover:text-blue-700">Progressive</Link>
        </div>

        {/* MOBILE MENU */}
        {isOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={closeMenu}
                  className="block py-2 text-black text-base font-medium hover:bg-gray-100 rounded"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
