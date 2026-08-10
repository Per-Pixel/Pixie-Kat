import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShoppingCart, User, Package, CreditCard, Calendar,
  CheckCircle, Clock, AlertCircle, RefreshCw, XCircle,
  PauseCircle, RotateCcw, Hash, Copy, ExternalLink,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled' | 'on_hold';

interface OrderRow {
  id: string;
  user_id: string;
  product_name: string;
  quantity: number;
  total_amount: number | string;
  currency: string;
  status: OrderStatus;
  payment_method?: string | null;
  payment_id?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { id: string; name: string; email: string } | null;
}

interface OrderDrawerProps {
  order: OrderRow | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ComponentType<any>; color: string; bg: string; badge: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Processing', icon: RefreshCw, color: 'text-blue-700', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50', badge: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', icon: RotateCcw, color: 'text-purple-700', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-gray-700', bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700' },
  on_hold: { label: 'On Hold', icon: PauseCircle, color: 'text-orange-700', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800' },
};

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['processing', 'cancelled', 'on_hold'],
  processing: ['completed', 'failed', 'on_hold', 'cancelled'],
  completed: ['refunded'],
  failed: ['pending'],
  refunded: [],
  cancelled: ['pending'],
  on_hold: ['processing', 'cancelled'],
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const OrderDrawer: React.FC<OrderDrawerProps> = ({ order, isOpen, onClose, onStatusChange }) => {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<OrderStatus | null>(null);

  if (!order) return null;

  const cfg = statusConfig[order.status];
  const StatusIcon = cfg.icon;
  const allowedTransitions = statusTransitions[order.status];

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === order.status) return;
    setConfirmStatus(null);
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;
      toast.success(`Order status updated to ${statusConfig[newStatus].label}`);
      onStatusChange?.(order.id, newStatus);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Order Details</p>
                  <p className="text-sm font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Status Banner */}
              <div className={clsx('flex items-center gap-3 p-4 rounded-xl', cfg.bg)}>
                <StatusIcon className={clsx('w-6 h-6', cfg.color)} />
                <div>
                  <p className={clsx('text-sm font-semibold', cfg.color)}>Status: {cfg.label}</p>
                  <p className={clsx('text-xs opacity-75', cfg.color)}>Updated {formatDate(order.updated_at)}</p>
                </div>
              </div>

              {/* Order Info */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Order Information</h3>
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                  <DetailRow icon={Hash} label="Order ID" value={order.id} onCopy={() => copyToClipboard(order.id, 'Order ID')} />
                  <DetailRow icon={Package} label="Product" value={order.product_name} />
                  <DetailRow icon={ShoppingCart} label="Quantity" value={String(order.quantity)} />
                  <DetailRow icon={CreditCard} label="Amount" value={`${order.currency} ${Number(order.total_amount).toFixed(2)}`} />
                  {order.payment_method && (
                    <DetailRow icon={CreditCard} label="Payment Method" value={order.payment_method} />
                  )}
                  {order.payment_id && (
                    <DetailRow icon={Hash} label="Payment ID" value={order.payment_id} onCopy={() => copyToClipboard(order.payment_id!, 'Payment ID')} />
                  )}
                  <DetailRow icon={Calendar} label="Placed" value={formatDate(order.created_at)} />
                </div>
              </section>

              {/* Customer Info */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Customer</h3>
                <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 text-sm font-semibold">
                      {(order.profiles?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{order.profiles?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">{order.profiles?.email || order.user_id}</p>
                  </div>
                  <a
                    href={`/users/${order.user_id}`}
                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View customer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </section>

              {/* Status Change */}
              {allowedTransitions.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Change Status</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {allowedTransitions.map((s) => {
                      const sCfg = statusConfig[s];
                      const SIcon = sCfg.icon;
                      return (
                        <button
                          key={s}
                          onClick={() => setConfirmStatus(s)}
                          disabled={updatingStatus}
                          className={clsx(
                            'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all hover:shadow-sm',
                            sCfg.bg, sCfg.color, 'border-current/20 hover:border-current/40'
                          )}
                        >
                          <SIcon className="w-4 h-4" />
                          {sCfg.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Confirm */}
                  <AnimatePresence>
                    {confirmStatus && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-3"
                      >
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <div className="flex items-start gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">
                              Change status to <strong>{statusConfig[confirmStatus].label}</strong>? This action will be logged.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusChange(confirmStatus)}
                              disabled={updatingStatus}
                              className="flex-1 btn btn-sm bg-amber-600 text-white hover:bg-amber-700 border-0"
                            >
                              {updatingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setConfirmStatus(null)}
                              className="flex-1 btn btn-outline btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={onClose} className="btn btn-outline btn-md w-full">
                Close
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

const DetailRow: React.FC<{
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  onCopy?: () => void;
}> = ({ icon: Icon, label, value, onCopy }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
    <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
    <span className="text-sm text-gray-900 font-medium flex-1 truncate">{value}</span>
    {onCopy && (
      <button
        onClick={onCopy}
        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export default OrderDrawer;
