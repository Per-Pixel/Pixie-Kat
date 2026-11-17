import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

/**
 * In-account alerts from admin_broadcasts (in_app channel).
 */
export default function AccountBroadcastAlerts({ className = "" }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("admin_broadcast_recipients")
      .select("id, read_at, admin_broadcasts ( subject, body, status )")
      .eq("user_id", user.id)
      .eq("channel", "in_app")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.warn("[broadcasts]", error.message);
      return;
    }

    const rows = (data ?? []).filter((row) => {
      const b = row.admin_broadcasts;
      return b && (b.status === "sent" || b.status === "sending");
    });
    setAlerts(rows);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {visible.map((row) => {
        const b = row.admin_broadcasts;
        return (
          <div
            key={row.id}
            className="relative rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 pr-12 shadow-sm"
            role="status"
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full p-1 text-amber-700/70 hover:bg-amber-100 hover:text-amber-900"
              aria-label="Dismiss"
              onClick={() => setDismissed((prev) => new Set(prev).add(row.id))}
            >
              <X className="size-4" />
            </button>
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-950">{b.subject}</p>
                <p className="mt-1 text-sm leading-relaxed text-amber-900/90">{b.body}</p>
                {b.subject?.toLowerCase().includes("verify") && (
                  <Link
                    to="/account/security"
                    className="mt-2 inline-block text-sm font-semibold text-[#6c49ff] hover:underline"
                  >
                    Open Security to lock your username
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}