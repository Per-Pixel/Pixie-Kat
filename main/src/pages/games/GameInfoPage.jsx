import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  FileText,
  Info,
  Lightbulb,
  MessageCircle,
} from "lucide-react";

import { fallbackGameImage, gamesData } from "./gamesData";

const bannerImage = "/img/hero/game-mlbb-card.webp";

const packageIconMap = {
  sale: "/img/games/mobile-legends.webp",
  double: "/img/promotion/starlight.webp",
  bundle: "/img/promotion/eternal.webp",
  pass: "/img/hero/game-mlbb-card.webp",
};

const packages = [
  { id: "diamonds-10", name: "Diamonds 10 + 1", price: "₹30.00", oldPrice: "₹33.00", icon: "sale" },
  { id: "diamonds-20", name: "Diamonds 20 + 2", price: "₹60.00", oldPrice: "₹67.00", icon: "sale" },
  { id: "double-50", name: "Double Diamonds 50 + 50", price: "₹89.00", oldPrice: "₹99.00", icon: "double" },
  { id: "elite-bundle", name: "Weekly Elite Bundle", price: "₹89.00", oldPrice: "₹100.00", icon: "bundle" },
  { id: "diamonds-78", name: "Diamonds 78 + 8", price: "₹137.00", oldPrice: "₹154.00", icon: "sale" },
  { id: "weekly-pass", name: "Weekly Diamonds Pass", price: "₹169.00", oldPrice: "₹189.00", icon: "pass" },
  { id: "double-150", name: "Double Diamonds 150 + 150", price: "₹250.00", oldPrice: "₹280.00", icon: "double" },
  { id: "diamonds-156", name: "Diamonds 156 + 16", price: "₹273.00", oldPrice: "₹306.00", icon: "sale" },
  { id: "double-250", name: "Double Diamonds 250 + 250", price: "₹399.00", oldPrice: "₹446.00", icon: "double" },
  { id: "diamonds-234", name: "Diamonds 234 + 23", price: "₹410.00", oldPrice: "₹459.00", icon: "sale" },
  { id: "monthly-epic", name: "Monthly Epic Bundle", price: "₹439.00", oldPrice: "₹492.00", icon: "bundle" },
  { id: "three-weekly", name: "3 weekly Pass", price: "₹507.00", oldPrice: "₹568.00", icon: "pass" },
  { id: "diamonds-312", name: "Diamonds 312 + 31", price: "₹549.00", oldPrice: "₹614.00", icon: "sale" },
  { id: "diamonds-468", name: "Diamonds 468 + 46", price: "₹819.00", oldPrice: "₹918.00", icon: "sale" },
  { id: "double-500", name: "Double Diamonds 500 + 500", price: "₹819.00", oldPrice: "₹917.00", icon: "double" },
  { id: "twilight", name: "Twilight", price: "₹839.00", oldPrice: "₹940.00", icon: "bundle" },
  { id: "diamonds-546", name: "Diamonds 546 + 54", price: "₹959.00", oldPrice: "₹1074.00", icon: "sale" },
  { id: "diamonds-625", name: "Diamonds 625 + 81", price: "₹1049.00", oldPrice: "₹1175.00", icon: "sale" },
  { id: "diamonds-859", name: "Diamonds 859 + 104", price: "₹1459.00", oldPrice: "₹1634.00", icon: "sale" },
  { id: "diamonds-937", name: "Diamonds 937 + 113", price: "₹1595.00", oldPrice: "₹1786.00", icon: "sale" },
];

const paymentMethods = [
  { id: "binance", logo: "BINANCE", name: "Binance", description: "Secure online crypto payment", pay: "0.32 USDT", note: "(~ ₹30)", selectedAccent: true },
  { id: "mobikwik", logo: "MobiKwik", name: "Mobikwik", description: "Secure online payment", pay: "₹30" },
  { id: "paytm", logo: "Paytm", name: "Paytm", description: "Secure online payment", pay: "₹30" },
  { id: "upi", logo: "UPI", name: "UPI", description: "Secure online payment", pay: "₹30" },
];

const steps = [
  ["Enter Your ID", "Provide your User ID & Zone ID for verification."],
  ["Choose the Package", "Select the top-up package you want."],
  ["Make Payment", "Choose your preferred payment method."],
  ["Confirmation", "Items are added instantly after payment."],
];

const SectionTitle = ({ number, children }) => (
  <div className="mb-5 flex items-center gap-3">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6d4cff] text-sm font-bold text-white">
      {number}
    </span>
    <h2 className="text-xl font-bold text-[#10141f] md:text-2xl">{children}</h2>
  </div>
);

const PaymentLogo = ({ children }) => (
  <div className="flex h-10 w-24 shrink-0 items-center justify-center rounded-md border border-[#e2e6ee] bg-white px-2 text-sm font-bold text-[#6d7480] shadow-sm">
    {children}
  </div>
);

const HowToTopUp = ({ mobile = false }) => {
  if (mobile) {
    return (
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-lg bg-[#7b55ff] px-4 text-left text-sm font-bold text-white shadow-[0_10px_24px_rgba(103,75,255,0.28)]"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          How to Top-Up
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>
    );
  }

  return (
    <section>
      <h2 className="border-l-4 border-[#7555ff] pl-3 text-2xl font-bold text-[#10141f]">
        How to Top-Up
      </h2>
      <div className="relative mt-8 space-y-8 pl-3">
        <div className="absolute left-[31px] top-2 h-[calc(100%-1rem)] w-px bg-[#e3e6ec]" />
        {steps.map(([title, description], index) => (
          <div key={title} className="relative flex gap-5">
            <span className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#6d4cff] shadow-[0_8px_20px_rgba(15,23,42,0.1)]">
              {index + 1}
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#10141f]">{title}</h3>
              <p className="mt-2 text-sm text-[#5f6977]">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const DoubleDiamondsAlert = () => (
  <section className="rounded-xl border border-[#f2c8ad] bg-[#fffaf4] px-6 py-5 text-[#c43a0c]">
    <div className="flex items-start gap-3">
      <Info className="mt-1 h-4 w-4 shrink-0 text-[#99a1ad]" />
      <div className="space-y-3 text-sm leading-7">
        <h3 className="font-bold">Double Diamonds Alert</h3>
        <p>Note:-</p>
        <p>* One-Time Benefit: Double Diamonds benefits are a one-time offer for each eligible pack, irrespective of the platform or medium used for purchase.</p>
        <p>* Already Claimed?: If you have already claimed the Double Diamonds offer for a specific pack through in-game purchases or any other source, you will not be eligible to claim the same benefit again from any platform.</p>
      </div>
    </div>
  </section>
);

const MembershipOffer = () => (
  <section className="rounded-xl bg-[#070b16] p-4 text-white shadow-[0_16px_36px_rgba(5,8,16,0.22)]">
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4cc48] text-xs font-black text-[#5d3a00]">GD</span>
        <div>
          <h3 className="text-xl font-bold leading-5">Unlock Member Prices</h3>
          <p className="mt-1 text-xs text-white/70">Save instantly on this pack</p>
        </div>
      </div>
      <span className="rounded border border-[#6b5d19] px-3 py-1 text-xs font-bold text-[#f5cf21]">RECOMMENDED</span>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <p className="text-xs font-bold text-white/65">SILVER MEMBERS</p>
        <p className="mt-1 text-2xl font-black">₹29.00</p>
        <p className="text-xs text-white/65">Save ₹1.00 vs ₹30.00</p>
      </div>
      <div className="rounded-lg border border-[#7f6b16] bg-[#282205]/70 p-3">
        <p className="text-xs font-bold text-[#f5cf21]">GOLD MEMBERS</p>
        <p className="mt-1 text-2xl font-black text-[#ffe75b]">₹29.00</p>
        <p className="text-xs text-[#ffe75b]">Save ₹1.00 vs ₹30.00</p>
      </div>
    </div>
    <button type="button" className="mt-3 h-11 w-full rounded-lg bg-[#ffda24] text-sm font-black text-black">
      Buy Membership & Save  -&gt;
    </button>
  </section>
);

const MobileCheckoutBar = ({ selectedPackage, selectedPayment }) => (
  <div className="fixed inset-x-0 bottom-24 z-[90] mx-auto block max-w-md px-4 md:hidden">
    <div className="flex h-[72px] items-center gap-3 rounded-t-xl border border-[#e9edf3] bg-white/95 px-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#151922]">{selectedPackage.name}</p>
        <p className="text-xs text-[#7b8492]">ID Required</p>
      </div>
      <div className="min-w-[86px] text-center">
        <p className="text-[10px] font-bold text-[#9aa2ad]">TOTAL</p>
        <p className="text-lg font-black text-[#6d4cff]">{selectedPayment.pay}</p>
        <p className="text-[10px] text-[#7b8492]">{selectedPayment.note ?? ""}</p>
      </div>
      <button type="button" className="h-10 rounded-lg bg-[#aaa] px-4 text-sm font-bold text-white">
        Pay {selectedPayment.pay}
      </button>
    </div>
  </div>
);

const GameInfoPage = () => {
  const { gameId } = useParams();
  const game = useMemo(() => gamesData.find((item) => item.id === gameId), [gameId]);
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0].id);
  const [selectedPaymentId, setSelectedPaymentId] = useState(paymentMethods[0].id);

  if (!game) {
    return <Navigate to="/games" replace />;
  }

  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? packages[0];
  const selectedPayment = paymentMethods.find((item) => item.id === selectedPaymentId) ?? paymentMethods[0];

  return (
    <div className="min-h-screen bg-[linear-gradient(115deg,#fbfaf5_0%,#eef8f7_48%,#faf8f2_100%)] pb-28 pt-24 text-[#10141f] md:pb-16">
      <div className="mx-auto grid max-w-[1480px] gap-10 px-4 md:grid-cols-[394px_minmax(0,1fr)] md:px-8 md:pt-10 lg:px-12">
        <aside className="space-y-8 md:sticky md:top-24 md:self-start">
          <img
            src={bannerImage}
            alt={`${game.name} Golden Month`}
            className="h-36 w-full rounded-xl object-cover shadow-[0_18px_42px_rgba(15,23,42,0.18)] md:h-36"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = game.image || fallbackGameImage;
            }}
          />

          <div className="block md:hidden">
            <HowToTopUp mobile />
          </div>
          <div className="hidden md:block">
            <HowToTopUp />
          </div>

          <DoubleDiamondsAlert />
        </aside>

        <main className="rounded-[28px] bg-white/75 px-4 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur md:px-8 lg:px-9">
          <section>
            <SectionTitle number="1">Enter Account Details</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold text-[#6d7480]">USER ID <span className="text-[#e25c5c]">*</span></span>
                <input className="mt-2 h-14 w-full rounded-xl border border-[#dfe4ec] bg-white px-4 text-base font-bold text-[#141923] outline-none placeholder:text-[#9aa2ad]" placeholder="Enter User ID" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-[#6d7480]">ZONE ID <span className="text-[#e25c5c]">*</span></span>
                <input className="mt-2 h-14 w-full rounded-xl border border-[#dfe4ec] bg-white px-4 text-base font-bold text-[#141923] outline-none placeholder:text-[#9aa2ad]" placeholder="Enter Zone ID" />
              </label>
            </div>
          </section>

          <section className="mt-7">
            <SectionTitle number="2">Select the Package</SectionTitle>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {packages.map((item) => {
                const selected = selectedPackageId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPackageId(item.id)}
                    className={`min-h-[100px] rounded-lg border bg-white p-3 text-left shadow-sm transition ${
                      selected ? "border-[#7152ff] bg-[#f6f3ff]" : "border-[#dfe4ec] hover:border-[#c5ccd8]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <img src={packageIconMap[item.icon]} alt="" className="h-7 w-12 rounded object-cover" />
                      <div className="text-right">
                        <p className={`text-lg font-black ${selected ? "text-[#6d4cff]" : "text-[#141923]"}`}>{item.price}</p>
                        <p className="text-xs text-[#777f8c] line-through">{item.oldPrice}</p>
                      </div>
                    </div>
                    <p className="mt-5 text-sm font-medium text-[#3b4350]">{item.name}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      <div className="mx-auto mt-10 grid max-w-[1480px] gap-10 px-4 md:grid-cols-[394px_minmax(0,1fr)] md:px-8 lg:px-12">
        <div className="hidden md:block" />
        <main className="rounded-[28px] bg-white/75 px-4 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur md:col-start-2 md:px-8 lg:px-9">
          <section className="mt-7">
            <SectionTitle number="3">Choose the Payment Method</SectionTitle>
            <MembershipOffer />

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {paymentMethods.map((method) => {
                const selected = selectedPaymentId === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPaymentId(method.id)}
                    className={`min-h-[84px] rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition ${
                      selected ? "border-[#7152ff] ring-2 ring-[#7152ff]/10" : "border-[#e2e6ee] hover:border-[#cbd2de]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <PaymentLogo>{method.logo}</PaymentLogo>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#202634]">{method.name}</p>
                        <p className="text-xs text-[#6d7480]">{method.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#8a92a0]">YOU PAY</p>
                        <p className={`text-xl font-black ${selected || method.selectedAccent ? "text-[#6d4cff]" : "text-[#10141f]"}`}>{method.pay}</p>
                        {method.note ? <p className="text-[10px] text-[#6d7480]">{method.note}</p> : null}
                      </div>
                      {method.badge ? (
                        <span className="hidden rounded-full border border-[#8ee8c4] bg-[#effff8] px-4 py-2 text-[10px] font-bold text-[#119b69] xl:inline-block">
                          {method.badge}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-[#c8baff] bg-[#f3efff] px-5 py-4 text-sm font-bold text-[#3f4654]">
              <Lightbulb className="mr-2 inline h-4 w-4 text-[#f0b429]" />
              <span className="mr-2 text-[#6d7480]">TIP |</span> Use Pixie Wallet for instant processing and extra discounts!
            </div>
          </section>

          <section className="mt-7">
            <SectionTitle number="4">Contact Info</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <label className="block">
                <span className="text-xs font-bold text-[#6d7480]">EMAIL ADDRESS</span>
                <input className="mt-2 h-14 w-full rounded-xl border border-[#dfe4ec] bg-white px-4 text-base font-bold text-[#141923] outline-none" defaultValue="rishij906@gmail.com" />
              </label>
              <div>
                <span className="text-xs font-bold text-[#6d7480]">WHATSAPP NUMBER</span>
                <div className="mt-2 grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-3">
                  <button type="button" className="flex h-14 items-center justify-between rounded-xl border border-[#dfe4ec] bg-white px-3 text-left">
                    <span className="font-bold text-[#4b5563]">IN</span>
                    <span className="text-center text-sm font-bold text-[#141923]">India<br /><span className="text-xs font-medium text-[#6d7480]">+91</span></span>
                    <ChevronDown className="h-4 w-4 text-[#6d7480]" />
                  </button>
                  <input className="h-14 rounded-xl border border-[#dfe4ec] bg-white px-4 text-base font-bold text-[#9aa2ad] outline-none" defaultValue="98765 43210" />
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-[#dfe4ec] pt-6">
              <div className="rounded-xl bg-[#f1f3f5] p-6">
                <div className="flex items-center justify-between border-b border-[#d9dde3] pb-4 text-sm text-[#4b5563]">
                  <span>Package Price</span>
                  <span className="font-bold text-[#10141f]">{selectedPackage.price}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-black text-[#10141f]">Total Pay</span>
                  <span className="text-right">
                    <span className="block text-3xl font-black text-[#6d4cff]">{selectedPayment.pay}</span>
                    <span className="text-xs text-[#6d7480]">{selectedPayment.note ?? "(~ ₹30)"}</span>
                  </span>
                </div>
              </div>

              <button type="button" className="mt-6 h-16 w-full rounded-xl bg-[#aaa] text-lg font-black text-white">
                Pay {selectedPayment.pay}
              </button>
              <p className="mt-5 text-center text-xs text-[#6d7480]">
                By clicking Pay Now, you agree to our <span className="underline">Terms of Service</span>.
              </p>
            </div>
          </section>
        </main>
      </div>

      <button type="button" className="fixed bottom-28 right-4 z-[130] flex h-12 w-12 items-center justify-center rounded-full bg-[#7b55ff] text-white shadow-[0_14px_30px_rgba(103,75,255,0.35)] md:bottom-8 md:right-8">
        <MessageCircle className="h-5 w-5" />
      </button>
      <MobileCheckoutBar selectedPackage={selectedPackage} selectedPayment={selectedPayment} />
    </div>
  );
};

export default GameInfoPage;
