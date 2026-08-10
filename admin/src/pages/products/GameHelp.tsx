import React from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Gamepad2, HelpCircle, Package, Plug, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    title: 'Basic game information',
    icon: Gamepad2,
    items: [
      ['Game Name', 'Required', 'Mobile Legends', 'Customer-facing title and admin search name.'],
      ['Slug', 'Required', 'mobile-legends', 'Creates the storefront URL. Keep it lowercase and stable after publishing.'],
      ['Description', 'Optional', 'Instant diamond top-ups…', 'Shown on the storefront game page. Do not place API credentials here.'],
      ['Currency Label', 'Required', 'Diamonds', 'Names the in-game item; it is not an ISO payment currency.'],
    ],
  },
  {
    title: 'Player identification fields',
    icon: UserRound,
    items: [
      ['Label', 'Required', 'User ID', 'The customer-facing field name.'],
      ['Key', 'Required', 'user_id', 'Sent to fulfilment. Use stable lowercase keys; changing them can break provider mapping.'],
      ['Type', 'Required', 'Text', 'Controls the storefront input and browser validation.'],
      ['Required', 'Recommended', 'Enabled', 'Disable only when the provider truly accepts the field as optional.'],
    ],
  },
  {
    title: 'Packages and prices',
    icon: Package,
    items: [
      ['Package Name', 'Required', 'Diamonds 100 + 10', 'Product title shown to customers and recorded on orders.'],
      ['In-Game Name', 'Optional', '110 Diamonds', 'Compact denomination displayed on package cards; stored in the existing amount field.'],
      ['Selling Price', 'Required', '₹149.00', 'Amount charged to the customer. INR is the primary currency.'],
      ['Cost Price', 'Recommended', '₹121.50', 'Provider wholesale cost. New orders snapshot this value for accurate profit reporting.'],
      ['Provider Product ID', 'API only', 'mobilelegends_100', 'Exact provider denomination identifier. A typo can cause fulfilment failure.'],
    ],
  },
  {
    title: 'API fulfilment',
    icon: Plug,
    items: [
      ['Provider', 'Required', 'Smile.one', 'Manual requires staff delivery; API providers attempt automatic fulfilment.'],
      ['Provider Game Code', 'API only', 'mobilelegends', 'Provider game identifier used to route verification and fulfilment.'],
      ['Region', 'When applicable', 'Philippines', 'Must match the provider catalogue and customer account region.'],
      ['Secondary Provider ID', 'Optional', 'mobilelegends_weekly', 'Bundles a second provider item. Both identifiers run for one customer order.'],
    ],
  },
];

const GameHelp: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></button>
        <div><div className="flex items-center gap-2"><HelpCircle className="h-6 w-6 text-primary-600" /><h1 className="text-2xl font-bold text-gray-900">Game Editor Help</h1></div><p className="mt-1 text-sm text-gray-500">Field requirements, examples, storefront effects, and fulfilment warnings.</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {sections.map(({ title, icon: Icon, items }) => <section key={title} className="overflow-hidden rounded-xl border bg-white"><div className="flex items-center gap-2 border-b bg-gray-50 px-5 py-4"><Icon className="h-5 w-5 text-primary-600" /><h2 className="font-semibold">{title}</h2></div><div className="divide-y">{items.map(([field, requirement, example, effect]) => <div key={field} className="p-5"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-gray-900">{field}</h3><span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">{requirement}</span></div><p className="mt-2 text-xs text-gray-500">Example: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">{example}</code></p><p className="mt-2 text-sm text-gray-600">{effect}</p></div>)}</div></section>)}
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" /><div><h2 className="font-semibold text-amber-900">Common mistakes</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800"><li>Using a display name instead of the provider's exact game or product identifier.</li><li>Publishing before testing player fields and provider region mapping.</li><li>Leaving cost price blank, which makes future profit unknown rather than estimated.</li><li>Changing field keys after integrations already depend on them.</li><li>Putting API keys or provider secrets in game, package, or metadata fields.</li></ul></div></div></section>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /><div><h2 className="font-semibold text-emerald-900">Before publishing</h2><p className="mt-1 text-sm text-emerald-800">Preview the storefront, confirm every required player field, verify package prices and costs, test provider identifiers, then switch the game from Draft to Active.</p></div></div></section>
    </div>
  );
};

export default GameHelp;
