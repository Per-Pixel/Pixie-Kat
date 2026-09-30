import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { TiLocationArrow } from 'react-icons/ti';
import PageWrapper from '../../components/common/PageWrapper';
import AnimatedTitle from '../../components/common/AnimatedTitle';
import Button from '../../components/common/Button';
import { BentoTilt } from '../home/sections/Features';
import { supabase } from '../../lib/supabase';
import { fetchJsonSetting } from '../../lib/storeContent';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const currencySymbols = { INR: '₹', USD: '$', EUR: '€', BRL: 'R$' };

const formatPrice = (amount, currency = 'INR') => {
  const symbol = currencySymbols[currency] || `${currency} `;
  const value = Number(amount);
  if (Number.isNaN(value)) return `${symbol}—`;
  return `${symbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatDuration = (days) => {
  const n = Number(days) || 0;
  if (n % 365 === 0 && n >= 365) {
    const years = n / 365;
    return years === 1 ? '1 year' : `${years} years`;
  }
  if (n % 30 === 0 && n >= 30) {
    const months = n / 30;
    return months === 1 ? '1 month' : `${months} months`;
  }
  return n === 1 ? '1 day' : `${n} days`;
};

const defaultPricingCopy = {
  heading: 'membersh<b>i</b>p pl<b>a</b>ns',
  subheading:
    'One small plan, cheaper top-ups all month. Members save on every recharge across 100+ supported games.',
  empty_message: 'No membership plans are available right now. Check back soon.',
  faqs: [
    {
      question: 'Can I change my plan anytime?',
      answer:
        'Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next eligible purchase.',
    },
    {
      question: 'Do unused benefits carry over?',
      answer:
        'Membership discounts apply while your plan is active. Benefits end when the plan expires unless you renew.',
    },
    {
      question: 'Is there a free trial?',
      answer:
        'Membership plans are paid subscriptions. Discounts apply immediately after purchase for the plan duration.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept UPI, cards, net banking, digital wallets, and Pixie Wallet balance where available.',
    },
  ],
};

const easeOutExpo = [0.16, 1, 0.3, 1];

const riseIn = (reduced, delay = 0) => ({
  initial: reduced ? false : { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.6, delay, ease: easeOutExpo },
});

const PlanCard = ({ plan, index, featured, reduced, onChoose }) => {
  const benefits = Array.isArray(plan.benefits) ? plan.benefits : [];
  const discount = Number(plan.discount_percent) || 0;
  const duration = formatDuration(plan.duration_days);

  const surface = featured
    ? 'bg-violet-300 text-white'
    : 'bg-[#0c0c10] text-blue-50 border-hsla';

  return (
    <motion.div
      {...riseIn(reduced, 0.1 + index * 0.12)}
      className={`w-full max-w-sm ${featured && !reduced ? 'lg:-translate-y-4' : ''}`}
    >
      <BentoTilt className="h-full">
        <article
          className={`relative flex h-full flex-col justify-between overflow-hidden rounded-md p-6 sm:p-8 ${surface}`}
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <span
                className={`font-general text-[10px] uppercase tracking-[0.2em] ${
                  featured ? 'text-white/60' : 'text-white/60'
                }`}
              >
                Tier {String(index + 1).padStart(2, '0')}
              </span>
              {featured ? (
                <span className="rounded-full bg-black px-3 py-1 font-general text-[10px] font-semibold uppercase tracking-wide text-yellow-300">
                  Best value
                </span>
              ) : null}
            </div>

            <h3 className="special-font mt-6 font-zentry text-4xl font-black uppercase leading-none sm:text-5xl">
              {plan.name}
            </h3>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-zentry text-5xl font-black leading-none sm:text-6xl">
                {formatPrice(plan.price, plan.currency)}
              </span>
              <span
                className={`font-circular-web text-sm ${
                  featured ? 'text-white/80' : 'text-white/70'
                }`}
              >
                / {duration}
              </span>
            </div>

            {discount > 0 ? (
              <div className="mt-4">
                <span className="rounded-full bg-yellow-300 px-3 py-1 font-general text-xs font-semibold text-black">
                  {discount}% off every top-up
                </span>
              </div>
            ) : null}

            {plan.description ? (
              <p
                className={`mt-5 max-w-xs font-circular-web text-sm leading-relaxed ${
                  featured ? 'text-white/80' : 'text-white/70'
                }`}
              >
                {plan.description}
              </p>
            ) : null}

            {benefits.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {benefits.map((benefit, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-3 font-circular-web text-sm ${
                      featured ? 'text-white/90' : 'text-white/80'
                    }`}
                  >
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${
                        featured ? 'text-yellow-300' : 'text-yellow-300'
                      }`}
                      strokeWidth={3}
                    />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-8">
            <Button
              title={`Choose ${plan.name}`}
              rightIcon={<TiLocationArrow />}
              containerClass={`w-full flex-center gap-2 ${
                featured ? 'bg-yellow-300' : 'bg-blue-50'
              }`}
              onClick={() => onChoose(plan)}
            />
          </div>
        </article>
      </BentoTilt>
    </motion.div>
  );
};

const SavingsStrip = ({ plans, reduced }) => {
  const rows = plans
    .map((plan) => ({
      name: plan.name,
      discount: Number(plan.discount_percent) || 0,
    }))
    .filter((row) => row.discount > 0);

  if (rows.length === 0) return null;

  const exampleBase = 1000;

  return (
    <motion.div
      {...riseIn(reduced)}
      className="border-hsla mt-12 grid grid-cols-1 divide-y divide-white/10 rounded-md sm:mt-16 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] sm:divide-x sm:divide-y-0"
    >
      <div className="p-5 sm:p-6">
        <p className="font-general text-[10px] uppercase tracking-[0.2em] text-white/60">
          The math is simple
        </p>
        <p className="mt-2 font-circular-web text-sm leading-relaxed text-white/70">
          Every {formatPrice(exampleBase)} top-up costs less the moment your plan
          is active.
        </p>
      </div>
      <div className="grid grid-cols-1 divide-y divide-white/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {rows.map((row) => (
          <div key={row.name} className="p-5 sm:p-6">
            <p className="font-general text-xs uppercase tracking-wide text-yellow-300">
              {formatPrice((exampleBase * row.discount) / 100)} cheaper
            </p>
            <p className="mt-2 font-circular-web text-sm text-white/70">
              on every {formatPrice(exampleBase)} with{' '}
              <span className="font-semibold uppercase text-blue-50">{row.name}</span>
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const FaqItem = ({ faq, open, onToggle }) => (
  <div className="border-b border-black/10">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-4 py-5 text-left"
    >
      <span className="font-general text-base font-semibold text-black md:text-lg">
        {faq.question}
      </span>
      <Plus
        className={`size-5 shrink-0 text-black/60 transition-transform duration-300 ease-out ${
          open ? 'rotate-45' : ''
        }`}
      />
    </button>
    <div
      className={`grid transition-all duration-300 ease-out ${
        open ? 'grid-rows-[1fr] pb-5 opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">
        <p className="max-w-2xl font-circular-web text-sm leading-relaxed text-black/70 md:text-base">
          {faq.answer}
        </p>
      </div>
    </div>
  </div>
);

const Pricing = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [plans, setPlans] = useState([]);
  const [copy, setCopy] = useState(defaultPricingCopy);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data }, pricingCopy] = await Promise.all([
        supabase
          .from('membership_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        fetchJsonSetting('pricing_settings', defaultPricingCopy),
      ]);

      if (cancelled) return;
      setPlans(data ?? []);
      setCopy({
        ...defaultPricingCopy,
        ...pricingCopy,
        faqs:
          Array.isArray(pricingCopy?.faqs) && pricingCopy.faqs.length > 0
            ? pricingCopy.faqs
            : defaultPricingCopy.faqs,
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const popularSlug = useMemo(() => {
    if (plans.length === 0) return null;
    const mid = Math.min(1, plans.length - 1);
    return plans[mid]?.slug ?? plans[0]?.slug;
  }, [plans]);

  return (
    <PageWrapper>
      <section className="mx-auto max-w-7xl px-4 md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 font-general text-[10px] uppercase tracking-[0.2em] text-black/60">
              PixieKat Membership
            </p>
            <AnimatedTitle
              title={copy.heading}
              containerClass="!mt-0 !items-start !gap-0 !px-0 !text-left !text-5xl !leading-[0.9] md:!text-7xl lg:!text-8xl"
              textColor="#000000"
            />
          </div>
          <p className="max-w-sm font-circular-web text-sm leading-relaxed text-black/70 md:text-right md:text-base">
            {copy.subheading}
          </p>
        </div>
      </section>

      <section className="relative mx-2 mt-14 overflow-hidden rounded-[28px] bg-[#000101] py-16 text-blue-50 sm:mx-4 sm:mt-20 sm:rounded-[36px] sm:py-20 md:mx-6 md:rounded-[44px] md:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-4/5 -translate-x-1/2 rounded-full bg-violet-300/20 blur-[90px]"
        />

        <div className="relative mx-auto max-w-7xl px-4 md:px-10">
          <SavingsStrip plans={plans} reduced={reduced} />

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="three-body" aria-label="Loading plans" />
            </div>
          ) : plans.length === 0 ? (
            <div className="border-hsla mx-auto mt-12 max-w-md rounded-md p-10 text-center">
              <p className="font-circular-web text-sm text-white/70">
                {copy.empty_message}
              </p>
              <Button
                title="Browse games"
                rightIcon={<TiLocationArrow />}
                containerClass="mt-8 bg-blue-50 flex-center mx-auto"
                onClick={() => navigate('/games')}
              />
            </div>
          ) : (
            <div className="mt-12 flex flex-wrap items-stretch justify-center gap-6 sm:mt-16 md:gap-7">
              {plans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  index={index}
                  featured={plan.slug === popularSlug}
                  reduced={reduced}
                  onChoose={() => navigate('/games')}
                />
              ))}
            </div>
          )}

          <p className="mt-12 text-center font-circular-web text-sm text-white/60">
            Savings apply automatically at checkout while your plan is active.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-10 md:py-24">
        <motion.div
          {...riseIn(reduced)}
          className="mb-8 flex items-end justify-between gap-4 md:mb-10"
        >
          <AnimatedTitle
            title="quest<b>i</b>ons"
            textColor="#000000"
            containerClass="!mt-0 !items-start !gap-0 !px-0 !text-left !text-4xl !leading-[0.9] md:!text-6xl"
          />
          <Link
            to="/faq"
            className="whitespace-nowrap pb-1 font-general text-xs font-semibold uppercase tracking-wide text-black/70 transition-colors hover:text-violet-300"
          >
            Full FAQ →
          </Link>
        </motion.div>

        <motion.div {...riseIn(reduced, 0.1)} className="border-t border-black/10">
          {copy.faqs.map((faq, index) => (
            <FaqItem
              key={faq.question}
              faq={faq}
              open={openFaq === index}
              onToggle={() => setOpenFaq(openFaq === index ? -1 : index)}
            />
          ))}
        </motion.div>
      </section>
    </PageWrapper>
  );
};

export default Pricing;
