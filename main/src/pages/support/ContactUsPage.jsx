import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const ContactUsPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
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

  const contactInfo = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Email',
      primary: 'hello@pixiekat.com',
      secondary: 'business@pixiekat.com',
      color: 'text-violet-600',
      bgColor: 'bg-violet-50 border-violet-200',
      iconBg: 'bg-violet-100',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      title: 'Phone',
      primary: '+91 98765 43210',
      secondary: 'Mon–Sat, 10am–7pm IST',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.7-6.42-1.9l-.148-.1-3.069 1.028 1.028-3.069-.1-.148A9.935 9.935 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
        </svg>
      ),
      title: 'WhatsApp',
      primary: 'Chat with us',
      secondary: 'Avg. response: 5 min',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      iconBg: 'bg-green-100',
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Business Hours',
      primary: 'Mon – Sat: 10am – 7pm',
      secondary: 'Sunday: Closed',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200',
      iconBg: 'bg-amber-100',
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
              Contact Us
            </h1>
            <p className="text-gray-500 text-sm md:text-[0.9375rem] max-w-md leading-relaxed">
              For bulk orders, partnerships, or any general inquiries — the Pixiekat team is here for you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Contact Info Cards ────────────────────────── */}
      <section className="bg-white py-14 md:py-16">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <motion.h2
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-xl font-semibold text-gray-900 mb-6"
          >
            Ways to Reach Us
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactInfo.map((info, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                whileHover={{ y: -4, boxShadow: '0 10px 32px rgba(0,0,0,0.08)' }}
                className={`rounded-2xl p-5 border cursor-pointer transition-shadow duration-200 ${info.bgColor}`}
              >
                <div className={`w-11 h-11 rounded-xl ${info.iconBg} ${info.color} flex items-center justify-center mb-4`}>
                  {info.icon}
                </div>
                <h3 className={`font-semibold text-[0.9375rem] ${info.color} mb-0.5`}>{info.title}</h3>
                <p className="text-gray-700 text-sm">{info.primary}</p>
                <p className="text-gray-400 text-xs mt-1">{info.secondary}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Form + Office Location ────────────── */}
      <section className="bg-[#fef3c7] py-14 md:py-16">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form — takes 3 cols */}
            <div className="lg:col-span-3">
              <motion.h2
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="text-xl font-semibold text-gray-900 mb-2"
              >
                Send Us a Message
              </motion.h2>
              <p className="text-gray-500 text-sm mb-6">
                Fill out the form below and we'll get back to you within one business day.
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
                    <label htmlFor="cu-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="cu-name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="cu-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email
                    </label>
                    <input
                      id="cu-email"
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

                <div>
                  <label htmlFor="cu-subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Subject
                  </label>
                  <input
                    id="cu-subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition"
                    placeholder="Bulk order inquiry"
                  />
                </div>

                <div>
                  <label htmlFor="cu-message" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="cu-message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition resize-none"
                    placeholder="Tell us more about your request..."
                  />
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-8 py-3 rounded-xl transition-colors duration-200"
                >
                  {submitted ? '✓ Message Sent!' : 'Send Message'}
                </motion.button>
              </motion.form>
            </div>

            {/* Office Location — takes 2 cols */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm flex-1"
              >
                <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-[0.9375rem] mb-3">Our Office</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  Pixiekat HQ<br />
                  123 Gaming Street, Tech Park<br />
                  Bangalore, Karnataka 560001<br />
                  India
                </p>
                <div className="w-full h-40 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                  <span className="text-gray-400 text-sm">📍 Map placeholder</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-violet-600 rounded-2xl p-6 text-white"
              >
                <h3 className="font-semibold text-[0.9375rem] mb-2">Bulk Orders?</h3>
                <p className="text-violet-100 text-sm leading-relaxed mb-4">
                  Looking to buy in-game currency in bulk for a tournament or community event? We offer special discounts for large orders.
                </p>
                <p className="text-violet-200 text-xs">
                  Email us at <span className="text-white font-medium">business@pixiekat.com</span> for a custom quote.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactUsPage;
