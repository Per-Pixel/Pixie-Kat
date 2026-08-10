-- Add optional payment-method filter to admin analytics so dashboards can show wallet-only data.
DROP FUNCTION IF EXISTS public.get_admin_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS public.get_admin_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_admin_analytics(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NOW(),
  p_bucket TEXT DEFAULT 'day',
  p_payment_method TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin_or_support() THEN
    RAISE EXCEPTION 'Unauthorised';
  END IF;

  WITH scoped_orders AS (
    SELECT o.*
    FROM public.orders o
    JOIN public.profiles profile ON profile.id = o.user_id
    WHERE profile.role <> 'admin'
      AND (p_start IS NULL OR o.created_at >= p_start)
      AND o.created_at < p_end
      AND (p_payment_method IS NULL OR o.payment_method = p_payment_method)
  ),
  customer_orders AS (
    SELECT user_id, COUNT(*) AS order_count
    FROM scoped_orders
    GROUP BY user_id
  ),
  metrics AS (
    SELECT
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed_orders,
      COUNT(*) FILTER (WHERE status = 'refunded') AS refunded_orders,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
      COUNT(*) FILTER (WHERE status = 'processing') AS processing_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'refunded'), 0) AS refunds,
      COALESCE(SUM(unit_cost_price * quantity) FILTER (WHERE status = 'completed' AND unit_cost_price IS NOT NULL), 0) AS known_cost,
      COALESCE(SUM((unit_selling_price - unit_cost_price) * quantity) FILTER (WHERE status = 'completed' AND unit_selling_price IS NOT NULL AND unit_cost_price IS NOT NULL), 0) AS known_profit,
      COUNT(*) FILTER (WHERE status = 'completed' AND unit_cost_price IS NULL) AS profit_unknown_orders,
      COALESCE(SUM(quantity) FILTER (WHERE status = 'completed'), 0) AS units_sold,
      COUNT(DISTINCT user_id) AS ordering_customers
    FROM scoped_orders
  ),
  customers AS (
    SELECT
      COUNT(*) FILTER (WHERE role <> 'admin') AS total_customers,
      COUNT(*) FILTER (WHERE role <> 'admin' AND (p_start IS NULL OR created_at >= p_start) AND created_at < p_end) AS new_customers,
      COALESCE(SUM(wallet_balance) FILTER (WHERE role <> 'admin'), 0) AS customer_wallet_balance
    FROM public.profiles
  ),
  wallet AS (
    SELECT
      COALESCE(SUM(ABS(w.amount)) FILTER (WHERE w.type = 'purchase'), 0) AS wallet_spend,
      COALESCE(SUM(w.amount) FILTER (WHERE w.type = 'refund'), 0) AS wallet_refunds,
      COALESCE(SUM(w.amount) FILTER (WHERE w.type = 'credit'), 0) AS wallet_credits
    FROM public.wallet_transactions w
    JOIN public.profiles profile ON profile.id = w.user_id
    WHERE profile.role <> 'admin'
      AND (p_start IS NULL OR w.created_at >= p_start)
      AND w.created_at < p_end
  ),
  status_rows AS (
    SELECT status, COUNT(*) AS count
    FROM scoped_orders
    GROUP BY status
  ),
  trend_rows AS (
    SELECT
      CASE
        WHEN p_bucket = 'month' THEN date_trunc('month', created_at)
        WHEN p_bucket = 'week' THEN date_trunc('week', created_at)
        ELSE date_trunc('day', created_at)
      END AS bucket,
      COUNT(*) AS orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue,
      COALESCE(SUM((unit_selling_price - unit_cost_price) * quantity) FILTER (WHERE status = 'completed' AND unit_selling_price IS NOT NULL AND unit_cost_price IS NOT NULL), 0) AS profit
    FROM scoped_orders
    GROUP BY 1
    ORDER BY 1
  ),
  product_rows AS (
    SELECT
      product_id,
      MAX(product_name) AS name,
      COALESCE(SUM(quantity) FILTER (WHERE status = 'completed'), 0) AS units,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue,
      COALESCE(SUM((unit_selling_price - unit_cost_price) * quantity) FILTER (WHERE status = 'completed' AND unit_selling_price IS NOT NULL AND unit_cost_price IS NOT NULL), 0) AS profit
    FROM scoped_orders
    GROUP BY product_id
    HAVING COUNT(*) FILTER (WHERE status = 'completed') > 0
    ORDER BY units DESC, revenue DESC
    LIMIT 20
  )
  SELECT jsonb_build_object(
    'metrics', to_jsonb(metrics),
    'customers', to_jsonb(customers) || jsonb_build_object(
      'new', COALESCE((SELECT COUNT(*) FROM customer_orders WHERE order_count = 1), 0),
      'returning', COALESCE((SELECT COUNT(*) FROM customer_orders WHERE order_count > 1), 0)
    ),
    'wallet', to_jsonb(wallet),
    'statuses', COALESCE((SELECT jsonb_agg(to_jsonb(status_rows)) FROM status_rows), '[]'::JSONB),
    'trend', COALESCE((SELECT jsonb_agg(to_jsonb(trend_rows)) FROM trend_rows), '[]'::JSONB),
    'products', COALESCE((SELECT jsonb_agg(to_jsonb(product_rows)) FROM product_rows), '[]'::JSONB)
  ) INTO v_result
  FROM metrics, customers, wallet;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
