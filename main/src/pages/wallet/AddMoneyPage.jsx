import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

import { fallbackGameImage, gamesData } from "../games/gamesData";

const paymentMethods = [
  { id: "binance", name: "Binance", description: "Secure online crypto payment", priceLabel: "10.42 USDT", note: "(~ Rs 1000)", accent: "text-[#6542ff]", logo: "BINANCE" },
  { id: "fampay", name: "FamPay", description: "Secure online payment", priceLabel: "Rs 1000", note: "", logo: "fampay" },
  { id: "google-pay", name: "Google Pay", description: "Secure online payment", priceLabel: "Rs 1000", note: "", logo: "G Pay" },
  { id: "mobikwik", name: "Mobikwik", description: "Secure online payment", priceLabel: "Rs 1000", note: "", logo: "MobiKwik" },
  { id: "paytm", name: "Paytm", description: "Secure online payment", priceLabel: "Rs 1000", note: "", logo: "Paytm" },
  { id: "upi", name: "UPI", description: "Secure online payment", priceLabel: "Rs 1000", note: "", logo: "UPI" },
  { id: "phonepe", name: "PhonePe", description: "Secure online payment", priceLabel: "Rs 1000", note: "", logo: "PhonePe" },
];

const quickAddAmounts = [1000, 5000, 10000];
const minCoins = 1000;
const maxCoins = 15000;

const formatCoins = (value) => new Intl.NumberFormat("en-IN").format(value);

const AddMoneyPage = () => {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const [coins, setCoins] = useState(minCoins);
  const [selectedMethod, setSelectedMethod] = useState("binance");

  const game = useMemo(() => gamesData.find((item) => item.id === gameId), [gameId]);

  if (!game) {
    return <Navigate to="/games" replace />;
  }

  const selectedPayment = paymentMethods.find((method) => method.id === selectedMethod) ?? paymentMethods[0];

  const handleCoinInput = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, "");
    if (!digitsOnly) {
      setCoins(minCoins);
      return;
    }

    const parsedValue = Number(digitsOnly);
    const clampedValue = Math.min(maxCoins, Math.max(minCoins, parsedValue));
    setCoins(clampedValue);
  };

  const addCoins = (amount) => {
    setCoins((currentValue) => Math.min(maxCoins, currentValue + amount));
  };

  const pageBackgroundStyle = {
    backgroundImage: `radial-gradient(circle at top, rgba(255,255,255,0.72), rgba(255,255,255,0.92) 38%, rgba(233,242,250,0.95) 100%), url(${game.image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-6 text-slate-900 sm:px-6 sm:pb-8 md:px-8" style={pageBackgroundStyle}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <button
            type="button"
            onClick={() => navigate("/games")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur"
            aria-label="Back to games"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Wallet</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Add Coins to Wallet</h1>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/70 p-4 shadow-[0_24px_90px_rgba(90,91,120,0.18)] backdrop-blur-xl sm:p-6 md:p-7">
          <div className="mb-6 overflow-hidden rounded-[24px] border border-slate-200/70 bg-gradient-to-r from-slate-950 to-slate-800 text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)]">
            <div className="grid gap-4 p-4 sm:grid-cols-[140px_1fr] sm:p-5">
              <div className="overflow-hidden rounded-[18px] border border-white/10 bg-white/5">
                <img src={game.image} alt={game.name} className="h-28 w-full object-cover sm:h-full" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackGameImage; }} />
              </div>
              <div className="flex flex-col justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-200">Selected game</p>
                  <h2 className="mt-2 text-2xl font-bold">{game.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    Add {game.coinName.toLowerCase()} fast and continue checkout in a focused payment flow inspired by your reference design.
                  </p>
                </div>
                <Link
                  to="/games"
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <CheckCircle2 size={16} />
                  Pick Favorite game
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-7">
            <section>
              <h3 className="text-[28px] font-bold tracking-tight text-slate-800">Enter coins</h3>
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe3a3,#f6a800)] text-[11px] font-black text-amber-950 shadow-inner">
                    PKS
                  </div>
                  <input
                    type="text"
                    value={formatCoins(coins)}
                    onChange={handleCoinInput}
                    className="w-full bg-transparent text-3xl font-extrabold tracking-tight text-slate-950 outline-none"
                    inputMode="numeric"
                    aria-label="Enter coin amount"
                  />
                </div>
                <p className="mt-3 text-sm text-slate-500">1 Pixie Coin = Rs 1</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {quickAddAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => addCoins(amount)}
                      className="rounded-full bg-slate-100 px-5 py-3 text-lg font-semibold text-slate-500 transition hover:bg-slate-200"
                    >
                      +{formatCoins(amount)}
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-sm text-slate-400">
                  Note: You can add between {formatCoins(minCoins)} and {formatCoins(maxCoins)} coins.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-[28px] font-bold tracking-tight text-slate-800">Select payment method</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {paymentMethods.map((method) => {
                  const isSelected = selectedMethod === method.id;

                  return (
                    <motion.button
                      key={method.id}
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`rounded-[22px] border bg-white px-4 py-4 text-left shadow-[0_10px_25px_rgba(15,23,42,0.06)] transition ${
                        isSelected
                          ? "border-[#6b4dff] ring-2 ring-[#6b4dff]/30"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-row sm:items-center">
                        <div className="flex h-12 w-full items-center justify-center rounded-[12px] border border-slate-200 bg-white px-3 text-lg font-bold text-slate-500 shadow-sm sm:w-auto sm:min-w-28">
                          {method.logo}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xl font-bold text-slate-800">{method.name}</p>
                          <p className="truncate text-sm text-slate-500">{method.description}</p>
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">You pay</p>
                          <p className={`text-2xl font-black tracking-tight ${method.accent ?? "text-slate-900"}`}>
                            {method.priceLabel}
                          </p>
                          {method.note ? <p className="text-xs text-slate-400">{method.note}</p> : null}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full rounded-[20px] bg-gradient-to-r from-[#6542ff] to-[#9a73ff] px-6 py-5 text-center text-xl font-extrabold leading-tight text-white shadow-[0_16px_30px_rgba(101,66,255,0.35)] sm:text-2xl"
            >
              Proceed to add {selectedPayment.priceLabel}
            </motion.button>
          </div>
        </div>

      </div>

      <div className="mx-auto mt-8 w-full max-w-[1400px]">
        <footer className="overflow-hidden rounded-[28px] bg-[#1f1f1f] px-4 py-8 text-white shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:px-6 md:px-8">
          <div className="flex flex-col items-center text-center">
            <img src="/img/logo.png" alt="PixieKat logo" className="h-14 w-auto object-contain" />
            <p className="mt-4 text-sm text-white/70 sm:text-base">
              Seamless game top-ups and digital vouchers.
            </p>
          </div>

          <div className="mt-6 rounded-[18px] border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-extrabold uppercase tracking-wide text-white/85">Newsletter</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="email"
                placeholder="Email address"
                className="h-12 min-w-0 flex-1 rounded-[12px] border border-white/10 bg-[#181818] px-4 text-sm text-white outline-none placeholder:text-white/35"
              />
              <button
                type="button"
                className="h-12 rounded-[12px] bg-[#6542ff] px-5 text-sm font-bold text-white transition hover:bg-[#7a5bff]"
              >
                Go
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AddMoneyPage;
