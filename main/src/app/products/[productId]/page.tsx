/**
 * Individual product detail page component.
 * Features:
 * - Displays detailed information about a specific product
 * - Shows product image, price, description, and stock status
 * - Includes rating and review information
 * - Add to cart functionality (to be implemented)
 * - Currently uses placeholder data (to be replaced with database queries)
 */

import { notFound } from 'next/navigation';
import { products, type Product } from '../placeholder-data';
import Image from 'next/image';
import PageWrapper from '@/components/PageWrapper';

interface ProductPageProps {
  params: {
    productId: string;
  };
}

/**
 * Fetches product data based on the product ID
 * @param productId - The unique identifier of the product
 * @returns Promise containing the product data or null if not found
 */
async function getProduct(productId: string): Promise<Product | null> {
  console.log('Searching for product with ID:', productId);
  console.log('Available product IDs:', products.map(p => p.id));
  
  // TODO: Replace this with your actual database query
  // const product = await db.products.findUnique({ where: { id: productId }});
  
  const product = products.find(p => p.id === productId);
  console.log('Found product:', product);
  return product || null;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct(params.productId);
  
  if (!product) {
    notFound();
  }

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">{product.name}</h1>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="relative aspect-square">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover rounded-lg"
            />
          </div>

          {/* Product Details */}
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="text-2xl font-semibold text-primary">
              ${product.price.toFixed(2)}
            </div>
            
            {/* Rating Section */}
            <div className="flex items-center gap-2">
              <div className="rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <input
                    key={star}
                    type="radio"
                    name="rating-2"
                    className="mask mask-star-2 bg-orange-400"
                    checked={Math.round(product.rating) === star}
                    readOnly
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                ({product.reviews} reviews)
              </span>
            </div>

            <p className="text-gray-600">{product.description}</p>
            
            {/* Stock Status and Add to Cart */}
            <div className="flex items-center gap-2">
              <span className={product.stock > 0 ? "text-success" : "text-error"}>
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </span>
            </div>
            <button className="btn btn-primary" disabled={product.stock === 0}>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
