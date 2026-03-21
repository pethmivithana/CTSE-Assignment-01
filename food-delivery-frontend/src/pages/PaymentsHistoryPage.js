import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const statusStyles = {
  PENDING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-700',
  PARTIALLY_REFUNDED: 'bg-indigo-100 text-indigo-800',
};

const PaymentsHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topUpAmt, setTopUpAmt] = useState('2000');
  const [topUpBusy, setTopUpBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/profile');
      return;
    }
    const cid = user._id || user.id;
    const load = async () => {
      try {
        setLoading(true);
        const [hist, bal] = await Promise.all([
          api.getPaymentHistory(cid).catch(() => []),
          api.getWalletBalance(cid).catch(() => null),
        ]);
        setRows(Array.isArray(hist) ? hist : []);
        if (bal?.success) setBalance(bal.balance);
      } catch (e) {
        setError(e.message || 'Could not load payments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  const handleTopUp = async () => {
    const cid = user?._id || user?.id;
    const n = parseFloat(topUpAmt, 10);
    if (!cid || !n || n <= 0) return;
    setTopUpBusy(true);
    try {
      const res = await api.walletTopUp(cid, n);
      if (res.success != null) setBalance(res.balance);
    } catch (e) {
      alert(e.message || 'Top-up not available. Enable ENABLE_WALLET_TOPUP on the payment service.');
    } finally {
      setTopUpBusy(false);
    }
  };

  const openReceipt = async (paymentId) => {
    try {
      const html = await api.getPaymentReceipt(paymentId, 'html');
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    } catch {
      alert('Could not open receipt');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <button type="button" onClick={() => navigate('/profile')} className="text-sm text-primary-600 hover:text-primary-700 mb-6">
        ← Profile
      </button>
      <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 mb-2">Payments & wallet</h1>
      <p className="text-gray-500 mb-8">Transactions, receipts, and wallet balance.</p>

      {balance != null && (
        <div className="card p-6 mb-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg">
          <p className="text-sm text-slate-300 uppercase tracking-wide font-medium">Wallet balance</p>
          <p className="text-3xl font-display font-bold mt-1">LKR {Number(balance).toFixed(2)}</p>
          <div className="mt-4 flex flex-wrap gap-2 items-end">
            <input
              type="number"
              min="1"
              className="input-field py-2 max-w-[140px] bg-white/10 border-white/20 text-white placeholder-slate-400"
              value={topUpAmt}
              onChange={(e) => setTopUpAmt(e.target.value)}
            />
            <button
              type="button"
              onClick={handleTopUp}
              disabled={topUpBusy}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 disabled:opacity-60"
            >
              {topUpBusy ? '…' : 'Add funds (demo)'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">Demo top-up requires ENABLE_WALLET_TOPUP=true on payment service.</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 text-center text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No payment records yet.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li key={p.paymentId} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-gray-400">{p.paymentId}</p>
                <p className="font-semibold text-gray-900 mt-1">
                  LKR {Number(p.amount).toFixed(2)} · {p.paymentMethod?.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[p.status] || 'bg-gray-100 text-gray-700'}`}>
                  {p.statusLabel || p.status}
                </span>
                <button
                  type="button"
                  onClick={() => openReceipt(p.paymentId)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Receipt
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600">
        <p className="font-medium text-slate-800 mb-1">Security</p>
        <p>Card payments are processed by Stripe. PayPal transactions use PayPal’s secure checkout. Duplicate charges are monitored server-side.</p>
      </div>
    </div>
  );
};

export default PaymentsHistoryPage;
