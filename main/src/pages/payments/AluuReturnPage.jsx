import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { signalAluuReturn, ALUU_PAYMENT_DISMISSED } from "../../lib/aluuCheckout";

export default function AluuReturnPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const groupId = searchParams.get("groupId") || "";
  const [mode, setMode] = useState("working");

  useEffect(() => {
    const result = signalAluuReturn({ orderId: orderId || undefined, groupId: groupId || undefined });
    if (result === "opener") {
      setMode("closing");
      const t = window.setTimeout(() => setMode("standalone"), 1200);
      return () => window.clearTimeout(t);
    }
    setMode("standalone");
    return undefined;
  }, [orderId, groupId]);

  const backHref = groupId ? "/cart" : orderId ? `/account/orders/${orderId}` : "/";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      {mode === "closing" ? (
        <p className="text-sm text-white/70">Returning you to checkout…</p>
      ) : (
        <>
          <h1 className="font-display text-2xl text-white">Payment window closed</h1>
          <p className="mt-3 max-w-md text-sm text-white/65">
            If checkout is open in another tab, switch back there to continue or try payment again.
          </p>
          <Link
            to={backHref}
            className="mt-8 inline-flex rounded-full bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-400"
          >
            {groupId ? "Back to cart" : "View order"}
          </Link>
        </>
      )}
    </div>
  );
}
