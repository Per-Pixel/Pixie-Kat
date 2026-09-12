import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  DEFAULT_CONTACT,
  buildWhatsAppUrl,
  fetchContactSettings,
} from '../../lib/storeContent';

const ContactUsPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [contact, setContact] = useState(DEFAULT_CONTACT);

  useEffect(() => {
    let cancelled = false;

    fetchContactSettings().then((data) => {
      if (!cancelled) {
        setContact(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  const phoneDigits = String(contact.support_phone || '').replace(/\D/g, '');
  const phoneDisplay = contact.phone_display || contact.support_phone || '';
  const whatsappUrl = buildWhatsAppUrl(contact.whatsapp, contact.whatsapp_message);
  const officeLines = Array.isArray(contact.office_lines) ? contact.office_lines : DEFAULT_CONTACT.office_lines;

  const contactInfo = useMemo(
    () => [
      {
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        title: 'Email',
        primary: contact.support_email,
        secondary: contact.business_email,
        color: 'text-violet-600',
        bgColor: 'bg-violet-50 border-violet-200',
        iconBg: 'bg-violet-100',
        href: contact.support_email ? `mailto:${contact.support_email}` : undefined,
        secondaryHref: contact.business_email ? `mailto:${contact.business_email}` : undefined,
      },
      {
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        ),
        title: 'Phone',
        primary: phoneDisplay || 'Phone support',
        secondary: contact.phone_hours,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
        iconBg: 'bg-blue-100',
        href: phoneDigits ? `tel:${phoneDigits}` : undefined,
      },
      {
        icon: (
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
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
        href: whatsappUrl,
        external: whatsappUrl.startsWith('http'),
      },
      {
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        title: 'Business Hours',
        primary: contact.hours_primary,
        secondary: contact.hours_secondary,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 border-amber-200',
        iconBg: 'bg-amber-100',
      },
    ],
    [contact, phoneDigits, phoneDisplay, whatsappUrl],
  );

  const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: i * 0.1 },
    }),
  };

  const renderContactCard = (info, i) => {
    const cardContent = (
      <>
        <div className={`size-11 rounded-xl ${info.iconBg} ${info.color} mb-4 flex items-center justify-center`}>
          {info.icon}
        </div>
        <h3 className={`text-[0.9375rem] font-semibold ${info.color} mb-0.5`}>{info.title}</h3>
        <p className="text-sm text-gray-700">{info.primary}</p>
        {info.secondary && (
          <p className="mt-1 text-xs text-gray-400">
            {info.secondaryHref ? (
              <a href={info.secondaryHref} className="transition-colors hover:text-gray-600">
                {info.secondary}
              </a>
            ) : (
              info.secondary
            )}
          </p>
        )}
      </>
    );

  const cardClass = `rounded-2xl p-5 border cursor-pointer transition-shadow duration-200 ${info.bgColor}`;

    if (info.href) {
      if (info.external) {
        return (
          <motion.a
            key={i}
            href={info.href}
            target="_blank"
            rel="noopener noreferrer"
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            whileHover={{ y: -4, boxShadow: '0 10px 32px rgba(0,0,0,0.08)' }}
            className={cardClass}
          >
            {cardContent}
          </motion.a>
        );
      }

      return (
        <motion.a
          key={i}
          href={info.href}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          whileHover={{ y: -4, boxShadow: '0 10px 32px rgba(0,0,0,0.08)' }}
          className={cardClass}
        >
          {cardContent}
        </motion.a>
      );
    }

    return (
      <motion.div
        key={i}
        custom={i}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        whileHover={{ y: -4, boxShadow: '0 10px 32px rgba(0,0,0,0.08)' }}
        className={cardClass}
      >
        {cardContent}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen font-general">
      <section className="bg-[#dfdff0] pb-16 pt-28 md:pb-20 md:pt-36">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <Link
            to="/support"
            className="mb-8 inline-flex items-center gap-2 text-sm text-violet-600 transition-colors hover:text-violet-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Support
          </Link>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="mb-4 text-4xl font-bold leading-[1.12] text-gray-900 sm:text-5xl lg:text-[3.25rem]">
              Contact Us
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-gray-500 md:text-[0.9375rem]">
              For bulk orders, partnerships, or any general inquiries — the PixieKat team is here for you.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <motion.h2
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-6 text-xl font-semibold text-gray-900"
          >
            Ways to Reach Us
          </motion.h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo.map((info, i) => renderContactCard(info, i))}
          </div>
        </div>
      </section>

      <section className="bg-[#fef3c7] py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <motion.h2
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="mb-2 text-xl font-semibold text-gray-900"
              >
                Send Us a Message
              </motion.h2>
              <p className="mb-6 text-sm text-gray-500">
                Fill out the form below and we'll get back to you within one business day.
              </p>

              <motion.form
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                onSubmit={handleSubmit}
                className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cu-name" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      id="cu-name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-300"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="cu-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      id="cu-email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-300"
                      placeholder="you@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cu-subject" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Subject
                  </label>
                  <input
                    id="cu-subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-300"
                    placeholder="Bulk order inquiry"
                  />
                </div>

                <div>
                  <label htmlFor="cu-message" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="cu-message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-300"
                    placeholder="Tell us more about your request..."
                  />
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-violet-600 px-8 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-violet-700 sm:w-auto"
                >
                  {submitted ? '✓ Message Sent!' : 'Send Message'}
                </motion.button>
              </motion.form>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex-1 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="mb-3 text-[0.9375rem] font-semibold text-gray-900">Our Office</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-500">
                  {officeLines.map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < officeLines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
                <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                  {contact.map_embed_url ? (
                    <iframe
                      title="Office location map"
                      src={contact.map_embed_url}
                      className="size-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <span className="text-sm text-gray-400">Map not available</span>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-2xl bg-violet-600 p-6 text-white"
              >
                <h3 className="mb-2 text-[0.9375rem] font-semibold">Bulk Orders?</h3>
                <p className="mb-4 text-sm leading-relaxed text-violet-100">
                  Looking to buy in-game currency in bulk for a tournament or community event? We offer special discounts for large orders.
                </p>
                <p className="text-xs text-violet-200">
                  Email us at{' '}
                  <a
                    href={`mailto:${contact.business_email}`}
                    className="font-medium text-white hover:underline"
                  >
                    {contact.business_email}
                  </a>{' '}
                  for a custom quote.
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
