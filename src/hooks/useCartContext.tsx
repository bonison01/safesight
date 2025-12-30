import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthContext';
import { useToast } from '@/hooks/use-toast';

interface CartItemProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface CartItemVariant {
  id: string;
  size?: string | null;
  color?: string | null;
  price?: number | null;
  image_url?: string | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product: CartItemProduct;
  variant?: CartItemVariant | null;
}

interface GuestCartItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product: CartItemProduct;
  variant?: CartItemVariant | null;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  loading: boolean;
  addToCart: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
  updateCartItemQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalAmount: () => number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

const GUEST_CART_KEY = 'guest_cart_v2'; // bump key to avoid old format collisions

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // ---------- Guest Cart Helpers ----------
  const loadGuestCart = async (): Promise<CartItem[]> => {
    try {
      const guestCartData = localStorage.getItem(GUEST_CART_KEY);
      if (!guestCartData) return [];

      const guestItems: GuestCartItem[] = JSON.parse(guestCartData);

      const cartItemsWithIds: CartItem[] = guestItems.map((item, index) => ({
        id: `guest_${index}`,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
        product: item.product,
        variant: item.variant ?? null,
      }));

      return cartItemsWithIds;
    } catch (error) {
      console.error('Error loading guest cart:', error);
      return [];
    }
  };

  const saveGuestCart = (items: CartItem[]) => {
    try {
      const guestItems: GuestCartItem[] = items.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        product: item.product,
        variant: item.variant ?? null,
      }));
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestItems));
    } catch (error) {
      console.error('Error saving guest cart:', error);
    }
  };

  // ---------- Fetch Cart ----------
  const fetchCart = async () => {
  if (!isAuthenticated || !user) {
    const guestCart = await loadGuestCart();
    setCartItems(guestCart);
    return;
  }

  try {
    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        variant_id,
        quantity,
        product:products(id, name, price, image_url),
        variant:product_variants(id, size, color, price, stock_quantity, image_url)
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }

    const formattedItems = (data || []).map((item: any): CartItem => {
  return {
    id: item.id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    product: item.product,
    variant: item.variant ?? null,
  };
});


    setCartItems(formattedItems);
  } catch (error: any) {
    console.error('Exception fetching cart:', error);
    toast({
      title: "Error",
      description: "Failed to load cart items",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};


  // ---------- Add to Cart ----------
  const addToCart = async (productId: string, quantity: number = 1, variantId?: string) => {
    if (!isAuthenticated || !user) {
      // Guest mode: enrich with product + variant info
      try {
        const { data: product, error: pErr } = await supabase
          .from('products')
          .select('id, name, price, image_url')
          .eq('id', productId)
          .single();
        if (pErr || !product) throw new Error('Product not found');

        let variant: CartItemVariant | null = null;
        if (variantId) {
          const { data: v, error: vErr } = await supabase
            .from('product_variants')
            .select('id, size, color, price, image_url')
            .eq('id', variantId)
            .single();
          if (vErr) throw vErr;
          variant = v;
        }

        const current = await loadGuestCart();
        const existingIndex = current.findIndex(
          (ci) => ci.product_id === productId && (ci.variant_id ?? null) === (variantId ?? null)
        );

        let updated: CartItem[];
        if (existingIndex >= 0) {
          updated = [...current];
          updated[existingIndex].quantity += quantity;
        } else {
          updated = [
            ...current,
            {
              id: `guest_${current.length}`,
              product_id: productId,
              variant_id: variantId ?? null,
              quantity,
              product,
              variant,
            },
          ];
        }

        setCartItems(updated);
        saveGuestCart(updated);
        toast({ title: "Added to Cart", description: "Item has been added to your cart" });
      } catch (error: any) {
        console.error('Exception adding to guest cart:', error);
        toast({
          title: "Error",
          description: "Failed to add item to cart",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      // Check existing item (handle variant null correctly using .is)
      let existingQuery = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (variantId) {
        existingQuery = existingQuery.eq('variant_id', variantId);
      } else {
        // variant_id IS NULL
        existingQuery = existingQuery.is('variant_id', null);
      }

      const { data: existing, error: checkError } = await existingQuery.maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing cart item:', checkError);
        throw checkError;
      }

      if (existing) {
        const newQuantity = existing.quantity + quantity;
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            variant_id: variantId ?? null,
            quantity,
          });
        if (insertError) throw insertError;
      }

      await fetchCart();
      toast({ title: "Added to Cart", description: "Item has been added to your cart" });
    } catch (error: any) {
      console.error('Exception adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  // ---------- Update Quantity ----------
  const updateCartItemQuantity = async (cartItemId: string, quantity: number) => {
    if (!isAuthenticated || !user) {
      const current = [...cartItems];
      const idx = current.findIndex(item => item.id === cartItemId);
      if (idx >= 0) {
        current[idx].quantity = quantity;
        setCartItems(current);
        saveGuestCart(current);
        toast({ title: "Cart Updated", description: "Item quantity has been updated" });
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', cartItemId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchCart();
      toast({ title: "Cart Updated", description: "Item quantity has been updated" });
    } catch (error: any) {
      console.error('Error updating cart item:', error);
      toast({
        title: "Error",
        description: "Failed to update cart item",
        variant: "destructive",
      });
    }
  };

  // ---------- Remove Item ----------
  const removeFromCart = async (cartItemId: string) => {
    if (!isAuthenticated || !user) {
      const current = cartItems.filter(item => item.id !== cartItemId);
      setCartItems(current);
      saveGuestCart(current);
      toast({ title: "Item Removed", description: "Item has been removed from your cart" });
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchCart();
      toast({ title: "Item Removed", description: "Item has been removed from your cart" });
    } catch (error: any) {
      console.error('Error removing cart item:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    }
  };

  // ---------- Clear Cart ----------
  const clearCart = async () => {
    if (!isAuthenticated || !user) {
      setCartItems([]);
      localStorage.removeItem(GUEST_CART_KEY);
      toast({ title: "Cart Cleared", description: "All items have been removed from your cart" });
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems([]);
      toast({ title: "Cart Cleared", description: "All items have been removed from your cart" });
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  };

  // ---------- Totals ----------
  const getLinePrice = (item: CartItem) => {
    const price = item.variant?.price ?? item.product.price;
    return price * item.quantity;
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + getLinePrice(item), 0);
  };

  const refreshCart = async () => {
    await fetchCart();
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const value: CartContextType = {
    cartItems,
    cartCount,
    loading,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    getTotalAmount,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};