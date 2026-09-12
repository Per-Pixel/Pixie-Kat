import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const HOVER = { y: -4, transition: { type: 'tween', duration: 0.18 } };

const Support = () => {
  const heroCards = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
          <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      ),
      title: 'Get Support',
      description: 'Need help with a top-up? Connect with our support team instantly.',
      link: '/support/get-support',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      title: 'Contact Us',
      description: 'For bulk orders or any inquiries, talk to the PixieKat team.',
      link: '/support/contact-us',
    },
  ];

  const categories = [
    {
      title: 'About PixieKat',
      description: 'Discover the basics of what PixieKat does and how our instant game top-up service can level up your experience.',
    },
    {
      title: 'Game Top-Up Guides',
      description: 'Explore step-by-step top-up instructions for all your favorite games, from A to Z.',
    },
    {
      title: 'Orders & Payments',
      description: 'All about managing your top-up orders, tracking deliveries, and resolving payment issues — in one place.',
    },
  ];

  return (
    <div className="min-h-screen font-general">

      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="bg-[#dfdff0] pb-20 pt-28 md:pb-28 md:pt-36">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-20">

            {/* Left — heading + subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:flex-1"
            >
              <h1 className="mb-5 text-4xl font-bold leading-[1.12] text-gray-900 sm:text-5xl lg:text-[3.25rem]">
                Need help?<br />
                You are in the right<br />
                place.
              </h1>
              <p className="max-w-xs text-sm leading-relaxed text-gray-500 md:text-[0.9375rem]">
                Pick from the categories to find advice and answers from the PixieKat team.
              </p>
            </motion.div>

            {/* Right — action cards */}
            <div className="flex flex-col gap-4 sm:flex-row lg:flex-1">
              {heroCards.map((card, i) => (
                <Link key={i} to={card.link} className="flex-1">
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.12 * (i + 1) }}
                    whileHover={HOVER}
                    className="h-full cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-lg"
                  >
                    <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      {card.icon}
                    </div>
                    <h3 className="mb-2 text-[0.9375rem] font-semibold text-gray-900">{card.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-500">{card.description}</p>
                  </motion.div>
                </Link>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Categories Section ────────────────────────────── */}
      <section className="bg-[#fef3c7] py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                whileHover={HOVER}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-lg"
              >
                <h3 className="mb-2 text-[0.9375rem] font-semibold text-gray-900">{cat.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{cat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Support;
