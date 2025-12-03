// src/pages/ProductManagement.tsx

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, LogOut, Home, Upload } from "lucide-react";

import OrderManagement from "@/components/OrderManagement";
import BannerManagement from "@/components/BannerManagement";
import ProductList from "@/components/ProductManagementComponents/ProductList";
import ProductForm from "@/components/ProductManagementComponents/ProductForm";
import CSVUpload from "@/components/ProductManagementComponents/CSVUpload";

import InventoryManagement from "@/components/admin/InventoryManagement";
import Invoicing from "@/components/admin/Invoicing";
import InvoiceArchive from "@/components/admin/InvoiceArchive";
import Customers from "@/components/admin/Customers";

import { Product } from "@/types/product";

interface VariantInput {
  id?: string;
  color?: string | null;
  size?: string | null;
  price?: number | null;
  stock_quantity?: number | null;
  image_url?: string | null;
}

const ProductManagement = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [editingVariants, setEditingVariants] = useState<VariantInput[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [newProductVariants, setNewProductVariants] = useState<VariantInput[]>([]);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    id: undefined,
    name: "",
    description: "",
    price: 0,
    offer_price: null,
    image_url: null,
    image_urls: null,
    category: null,
    features: null,
    ingredients: null,
    offers: null,
    stock_quantity: 0,
    is_active: true,
    featured: false,
    created_at: null,
    updated_at: null,
  });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/auth?admin=true");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchProducts();
  }, [isAdmin]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);

    const existingImages: string[] = [];
    if (product.image_url) existingImages.push(product.image_url);
    if (product.image_urls) existingImages.push(...product.image_urls);
    setEditingImages(existingImages);

    const { data: variants, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", product.id);

    if (error) {
      console.error("Error fetching variants:", error);
      toast({
        title: "Error",
        description: "Failed to fetch product variants",
        variant: "destructive",
      });
    } else {
      setEditingVariants(variants || []);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditingImages([]);
    setEditingVariants([]);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      setProducts(products.filter((product) => product.id !== id));
      toast({ title: "Success", description: "Product deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    try {
      const now = new Date().toISOString();

      const productData = {
        ...newProduct,
        category: newProduct.category || null,
        image_url: newProductImages.length > 0 ? newProductImages[0] : null,
        image_urls: newProductImages.length > 1 ? newProductImages.slice(1) : null,
        created_at: now,
        updated_at: now,
      };

      const { id, variants, ...insertData } = productData as any;

      const { data, error } = await supabase
        .from("products")
        .insert([insertData])
        .select();

      if (error) throw error;
      const createdProduct = data?.[0];

      if (createdProduct && newProductVariants.length > 0) {
        const variantInserts = newProductVariants.map((v) => ({
          product_id: createdProduct.id,
          color: v.color || null,
          size: v.size || null,
          price: v.price || null,
          stock_quantity: v.stock_quantity || 0,
          image_url: v.image_url || null,
          created_at: now,
        }));

        const { error: variantError } = await supabase
          .from("product_variants")
          .insert(variantInserts);

        if (variantError) throw variantError;
      }

      if (createdProduct) {
        setProducts([...products, createdProduct]);
      }
      setIsCreating(false);
      setNewProductImages([]);
      setNewProductVariants([]);

      toast({ title: "Success", description: "Product created successfully" });
    } catch (error: any) {
      console.error("Error creating product or variants:", error);
      toast({
        title: "Error",
        description: "Failed to create product or variants",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    try {
      const now = new Date().toISOString();

      const updateData = {
        ...editingProduct,
        category: editingProduct.category || null,
        image_url: editingImages[0] || null,
        image_urls: editingImages.slice(1) || null,
        updated_at: now,
      };

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", editingProduct.id);

      if (error) throw error;

      for (const variant of editingVariants) {
        const isUUID =
          typeof variant.id === "string" && /^[0-9a-fA-F-]{36}$/.test(variant.id);

        if (variant.id && isUUID) {
          const { error: updateError } = await supabase
            .from("product_variants")
            .update({
              color: variant.color || null,
              size: variant.size || null,
              price: variant.price || null,
              stock_quantity: variant.stock_quantity || 0,
              image_url: variant.image_url || null,
              updated_at: now,
            })
            .eq("id", variant.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("product_variants")
            .insert([
              {
                product_id: editingProduct.id,
                color: variant.color || null,
                size: variant.size || null,
                price: variant.price || null,
                stock_quantity: variant.stock_quantity || 0,
                image_url: variant.image_url || null,
                created_at: now,
              },
            ]);
          if (insertError) throw insertError;
        }
      }

      await fetchProducts();
      handleCancelEdit();

      toast({
        title: "Success",
        description: "Product and variants updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating product and variants:", error);
      toast({
        title: "Error",
        description: "Failed to update product or variants",
        variant: "destructive",
      });
    }
  };

  const handleCSVProductsUploaded = (uploadedProducts: Product[]) => {
    setProducts([...uploadedProducts, ...products]);
    setShowCSVUpload(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Manage products, orders, inventory, invoices & customers
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => navigate("/")} variant="outline">
                <Home className="h-4 w-4 mr-2" /> Home
              </Button>
              <Button onClick={handleSignOut} variant="outline">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full py-6 px-4">
        <div className="w-full">
         <Tabs defaultValue="orders" className="space-y-6">

  <TabsList>
    <TabsTrigger value="orders">Orders</TabsTrigger>
    <TabsTrigger value="products">Products</TabsTrigger>
    <TabsTrigger value="inventory">Inventory</TabsTrigger>
    <TabsTrigger value="sales">Sales & Billing</TabsTrigger>
    <TabsTrigger value="invoice-list">Invoice Archive</TabsTrigger>
    <TabsTrigger value="customers">Customers</TabsTrigger>
    <TabsTrigger value="banner">Banner</TabsTrigger>
  </TabsList>

  <TabsContent value="orders" forceMount className="data-[state=inactive]:hidden">
    <OrderManagement />
  </TabsContent>

  <TabsContent value="products" forceMount className="data-[state=inactive]:hidden">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Products</h2>
      <div className="flex items-center space-x-2">
        <Button onClick={() => setShowCSVUpload(true)} variant="outline">
          <Upload className="h-4 w-4 mr-2" /> Bulk Upload
        </Button>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>
    </div>

    <ProductList
      products={products}
      onEdit={handleEdit}
      onDelete={handleDelete}
      loading={loadingProducts}
    />
  </TabsContent>

  <TabsContent value="inventory" forceMount className="data-[state=inactive]:hidden">
    <InventoryManagement />
  </TabsContent>

  <TabsContent value="sales" forceMount className="data-[state=inactive]:hidden">
    <Invoicing />
  </TabsContent>

  <TabsContent value="invoice-list" forceMount className="data-[state=inactive]:hidden">
    <InvoiceArchive />
  </TabsContent>

  <TabsContent value="customers" forceMount className="data-[state=inactive]:hidden">
    <Customers />
  </TabsContent>

  <TabsContent value="banner" forceMount className="data-[state=inactive]:hidden">
    <BannerManagement />
  </TabsContent>
</Tabs>


          {showCSVUpload && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
              <div className="relative p-4 w-full max-w-2xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCSVUpload(false)}
                  className="absolute top-2 right-2 z-10"
                >
                  ×
                </Button>
                <CSVUpload onProductsUploaded={handleCSVProductsUploaded} />
              </div>
            </div>
          )}

          {editingProduct && (
            <ProductForm
              product={editingProduct}
              images={editingImages}
              variants={editingVariants}
              onProductChange={setEditingProduct}
              onImagesChange={setEditingImages}
              onVariantsChange={setEditingVariants}
              onSave={handleUpdate}
              onCancel={handleCancelEdit}
              isEditing={true}
            />
          )}

          {isCreating && (
            <ProductForm
              product={newProduct}
              images={newProductImages}
              variants={newProductVariants}
              onProductChange={setNewProduct}
              onImagesChange={setNewProductImages}
              onVariantsChange={setNewProductVariants}
              onSave={handleCreate}
              onCancel={() => {
                setIsCreating(false);
                setNewProductImages([]);
                setNewProductVariants([]);
              }}
              isEditing={false}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default ProductManagement;
