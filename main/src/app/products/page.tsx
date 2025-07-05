/**
 * Products listing page component.
 * Features:
 * - Grid display of all available products
 * - Each product card links to its detailed view
 * - Responsive grid layout using Tailwind CSS
 * - Currently uses placeholder data (to be replaced with real data)
 */

import Link from 'next/link';
import { products } from './placeholder-data';
import PageWrapper from '@/components/PageWrapper'

export default function ProductsPage() {
  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Products</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Link 
              key={product.id} 
              href={`/products/${product.id}`}
              className="block p-6 border rounded-lg hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <p className="text-lg text-primary mt-2">${product.price.toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
