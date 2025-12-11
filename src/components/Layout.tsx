// src/components/Layout.tsx
// @ts-nocheck
import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col w-full bg-gray-50 text-gray-900">
      {/* Upgraded Minimal Premium Navbar */}
      <Navbar />

      {/* MAIN CONTENT */}
      <main className="flex-grow w-full">
        {children}
      </main>

      {/* Existing Footer (unchanged) */}
      <Footer />
    </div>
  );
};

export default Layout;
