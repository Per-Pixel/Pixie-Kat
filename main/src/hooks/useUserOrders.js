import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const ORDER_SELECT =
  "id, product_id, product_name, quantity, total_amount, currency, status, payment_method, payment_id, razorpay_order_id, unit_selling_price, created_at, updated_at, metadata";

const sortOrders = (orders) =>
  [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

export const useUserOrders = (userId) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const loadOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setOrders(data ?? []);
    setError(queryError?.message ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setOrders([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error: queryError } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setOrders(data ?? []);
      setError(queryError?.message ?? null);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;

    const channelSuffix = `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const channel = supabase.channel(`account-orders:${userId}:${channelSuffix}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `user_id=eq.${userId}`,
      },
      ({ eventType, new: nextOrder, old: previousOrder }) => {
        setOrders((current) => {
          if (eventType === "INSERT") {
            return [nextOrder, ...current.filter((order) => order.id !== nextOrder.id)];
          }
          if (eventType === "UPDATE") {
            return sortOrders(
              current.map((order) => (order.id === nextOrder.id ? nextOrder : order)),
            );
          }
          return current.filter((order) => order.id !== previousOrder.id);
        });
      },
    );

    channelRef.current = channel;
    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        loadOrders();
      }
    });

    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [loadOrders, userId]);

  return { orders, loading, error, refresh: loadOrders };
};
