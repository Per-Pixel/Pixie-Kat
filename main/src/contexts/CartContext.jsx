import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  addToCart,
  CART_STORAGE_KEY,
  cartCount,
  cartCurrencies,
  cartTotal,
  readCart,
  setLineQuantity,
  writeCart,
} from "../lib/cart";

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(readCart);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const commit = useCallback((next) => {
    itemsRef.current = next;
    setItems(next);
    writeCart(next);
  }, []);

  // addItem(entry) → { ok, merged?, capped?, error? } — see lib/cart.js
  const addItem = useCallback(
    (entry) => {
      const result = addToCart(itemsRef.current, entry);
      if (result.ok) commit(result.items);
      return result;
    },
    [commit]
  );

  const updateQuantity = useCallback(
    (id, quantity) => commit(setLineQuantity(itemsRef.current, id, quantity)),
    [commit]
  );

  const removeItem = useCallback(
    (id) => commit(itemsRef.current.filter((i) => i.id !== id)),
    [commit]
  );

  const clearCart = useCallback(() => commit([]), [commit]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === CART_STORAGE_KEY) {
        const next = readCart();
        itemsRef.current = next;
        setItems(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      count: cartCount(items),
      subtotal: cartTotal(items),
      currencies: cartCurrencies(items),
    }),
    [items, addItem, updateQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
