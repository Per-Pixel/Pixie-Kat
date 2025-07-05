/**
 * Temporary placeholder data for product listings
 * To be replaced with actual database data
 * Provides type definitions and mock data for development
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  rating: number;
  reviews: number;
}

// Mock product data for development
export const products: Product[] = [
  {
    id: "1",
    name: "Mobile Legends",
    description: "lorem ipsum",
    price: 49.99,
    category: "Games",
    image: "https://placekitten.com/400/400",
    stock: 15,
    rating: 4.5,
    reviews: 128
  },
  {
    id: "2",
    name: "Valorant",
    description: "lorem ipsum",
    price: 0,
    category: "Games",
    image: "https://placekitten.com/400/400",
    stock: 10,
    rating: 4.8,
    reviews: 256
  }
  // Add more mock products as needed
];
