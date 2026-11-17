import { Link } from 'react-router-dom';

export default function UsernameLockNote({ verified, className = '' }) {
  if (verified) return null;

  return (
    <p className={`text-sm leading-relaxed text-slate-500 ${className}`}>
      Your account already works.
      <Link to="/account/security" className="ml-1 font-semibold text-[#6c49ff] hover:underline">
        Verify your email
      </Link>
      {' '}to lock your username so nobody else can take it. The email sometimes lands in spam, or ask us on support or WhatsApp.
    </p>
  );
}
