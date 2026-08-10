import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const GetSupportPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    orderId: '',
    category: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  const quickHelp = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      title: 'Order Not Received',
      description: "Your top-up hasn\u2019t arrived yet? Let us track it down for you.",
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      iconBg: 'bg-amber-100',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Payment Failed',
      description: "Money was deducted but order failed? We\u2019ll sort it out.",
      color: 'bg-red-50 text-red-600 border-red-200',
      iconBg: 'bg-red-100',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      title: 'Wrong Amount',
      description: 'Received fewer diamonds/UC than expected? Report it here.',
      color: 'bg-orange-50 text-orange-600 border-orange-200',
      iconBg: 'bg-orange-100',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      title: 'Account Issues',
      description: 'Problems with login, profile, or membership? We can help.',
      color: 'bg-violet-50 text-violet-600 border-violet-200',
      iconBg: 'bg-violet-100',
    },
  ];

  const channels = [
    {
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.7-6.42-1.9l-.148-.1-3.069 1.028 1.028-3.069-.1-.148A9.935 9.935 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
        </svg>
      ),
      title: 'WhatsApp',
      subtitle: 'Chat with us instantly',
      detail: 'Avg. response: 5 min',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      iconBg: 'bg-green-100',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Email',
      subtitle: 'support@pixiekat.com',
      detail: 'Avg. response: 2 hours',
      color: 'text-violet-600',
      bgColor: 'bg-violet-50 border-violet-200',
      iconBg: 'bg-violet-100',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: 'Live Chat',
      subtitle: 'Available 24/7',
      detail: 'Instant response',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100',
    },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: i * 0.1 },
    }),
  };

  return (
    <div className="min-h-screen font-general">
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="bg-[#dfdff0] pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <Link
            to="/support"
            className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 mb-8 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Support
          </Link>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-gray-900 leading-[1.12] mb-4">
              Get Support
            </h1>
            <p className="text-gray-500 text-sm md:text-[0.9375rem] max-w-md leading-relaxed">
              Having issues with a top-up? Choose a topic below or submit a ticket and our team will get back to you right away.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Quick Help ───────────────────────────────── */}
      <section className="bg-white py-14 md:py-16">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <motion.h2
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-xl font-semibold text-gray-900 mb-6"
          >
            What do you need help with?
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickHelp.map((item, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                whileHover={{ y: -4, boxShadow: '0 10px 32px rgba(0,0,0,0.08)' }}
                className={`rounded-2xl p-5 border cursor-pointer transition-shadow duration-200 ${item.color}`}
              >
                <div className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center mb-4`}>
                  {item.icon}
                </div>
                <h3 className="font-semibold text-[0.9375rem] mb-1.5">{item.title}</h3>
                <p className="text-sm leading-relaxed opacity-80">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Support Channels ─────────────────────────── */}
      <section className="bg-[#f7f7fc] py-14 md:py-16">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <motion.h2
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-xl font-semibold text-gray-900 mb-6"
          >
            Reach us directly
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {channels.map((ch, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className={`rounded-2xl p-6 border cursor-pointer transition-all duration-200 ${ch.bgColor}`}
              >
                <div className={`w-12 h-12 rounded-xl ${ch.iconBg} ${ch.color} flex items-center justify-center mb-4`}>
                  {ch.icon}
                </div>
                <h3 className={`font-semibold text-[0.9375rem] ${ch.color} mb-0.5`}>{ch.title}</h3>
                <p className="text-gray-700 text-sm">{ch.subtitle}</p>
                <p className="text-gray-400 text-xs mt-1">{ch.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Submit a Ticket ──────────────────────────── */}
      <section className="bg-[#fef3c7] py-14 md:py-16">
        <div className="max-w-3xl mx-auto px-6 md:px-10">
          <motion.h2
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-xl font-semibold text-gray-900 mb-2"
          >
            Submit a Ticket
          </motion.h2>
          <p className="text-gray-500 text-sm mb-8">
            Can&apos;t find what you&apos;re looking for? Describe your issue and we&apos;ll respond within 24 hours.
          </p>

          <motion.form
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="gs-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="gs-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="gs-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="gs-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition"
                  placeholder="you@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="gs-order" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Order ID <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id="gs-order"
                  name="orderId"
                  value={form.orderId}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition"
                  placeholder="#PK-12345"
                />
              </div>
              <div>
                <label htmlFor="gs-category" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Issue Category
                </label>
                <select
                  id="gs-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition appearance-none bg-white"
                >
                  <option value="">Select a category</option>
                  <option value="order">Order Not Received</option>
                  <option value="payment">Payment Failed</option>
                  <option value="amount">Wrong Amount</option>
                  <option value="account">Account Issues</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="gs-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
                Describe Your Issue
              </label>
              <textarea
                id="gs-desc"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition resize-none"
                placeholder="Tell us what happened..."
              />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-8 py-3 rounded-xl transition-colors duration-200"
            >
              {submitted ? '✓ Ticket Submitted!' : 'Submit Ticket'}
            </motion.button>
          </motion.form>
        </div>
      </section>
    </div>
  );
};

export default GetSupportPage;
