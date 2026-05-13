import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Package, ImagePlus, Tag, DollarSign, Layers, FileText, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProductForm {
  name: string;
  game: string;
  category: string;
  price: string;
  comparePrice: string;
  stock: string;
  sku: string;
  description: string;
  imageUrl: string;
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
}

const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState('');
  const [form, setForm] = useState<ProductForm>({
    name: '',
    game: '',
    category: '',
    price: '',
    comparePrice: '',
    stock: '',
    sku: '',
    description: '',
    imageUrl: '',
    status: 'draft',
    featured: false,
  });

  const games = [
    'PUBG Mobile',
    'Free Fire',
    'Mobile Legends',
    'Genshin Impact',
    'Valorant',
    'Call of Duty Mobile',
    'Clash of Clans',
    'Roblox',
    'Fortnite',
    'Other',
  ];

  const categories = [
    'In-Game Currency',
    'Gift Cards',
    'Game Passes',
    'Subscriptions',
    'Top-Up',
    'Bundles',
    'Other',
  ];

  const handleChange = (field: keyof ProductForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddImage = () => {
    if (imageInput.trim() && images.length < 5) {
      setImages([...images, imageInput.trim()]);
      setImageInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.game || !form.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1200));
      toast.success('Product created successfully!');
      navigate('/products');
    } catch {
      toast.error('Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
            <p className="text-gray-600 mt-1">Create a new product listing for your store</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/products')}
            className="btn btn-outline btn-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn btn-primary btn-md"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Product
              </>
            )}
          </button>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Package className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label mb-1.5 block">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., PUBG Mobile 600 UC"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-1.5 block">
                    Game <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.game}
                    onChange={(e) => handleChange('game', e.target.value)}
                    className="input"
                  >
                    <option value="">Select Game</option>
                    {games.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label mb-1.5 block">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="input"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label mb-1.5 block">Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe the product..."
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="input h-auto resize-none"
                />
              </div>
            </div>
          </motion.div>

          {/* Media */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <ImagePlus className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Media</h2>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Paste image URL..."
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddImage(); } }}
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  disabled={images.length >= 5}
                  className="btn btn-outline btn-md whitespace-nowrap"
                >
                  Add Image
                </button>
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((url, i) => (
                    <div
                      key={i}
                      className="relative group aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                    >
                      <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <ImagePlus className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Paste image URLs above to add product images</p>
                  <p className="text-xs text-gray-400 mt-1">Up to 5 images. First image is the primary display image.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Pricing & Inventory */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Pricing & Inventory</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label mb-1.5 block">
                  Price ($) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className="input pl-7"
                  />
                </div>
              </div>
              <div>
                <label className="label mb-1.5 block">Compare-at Price ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.comparePrice}
                    onChange={(e) => handleChange('comparePrice', e.target.value)}
                    className="input pl-7"
                  />
                </div>
              </div>
              <div>
                <label className="label mb-1.5 block">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => handleChange('stock', e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label mb-1.5 block">SKU</label>
                <input
                  type="text"
                  placeholder="e.g., PUBG-600UC"
                  value={form.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column — Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Layers className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Status</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label mb-1.5 block">Product Status</label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="input"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Featured Product</p>
                  <p className="text-xs text-gray-500">Show on homepage</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('featured', !form.featured)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    form.featured ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      form.featured ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      form.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : form.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                  </span>
                  {form.featured && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      Featured
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Tag className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Organization</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label mb-1.5 block">Tags</label>
                <input
                  type="text"
                  placeholder="e.g., popular, bestseller"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">Comma-separated tags</p>
              </div>
              <div>
                <label className="label mb-1.5 block">Vendor</label>
                <input
                  type="text"
                  placeholder="e.g., PixieKat Official"
                  className="input"
                />
              </div>
            </div>
          </motion.div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-900 font-medium">{form.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Game</span>
                <span className="text-gray-900 font-medium">{form.game || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Price</span>
                <span className="text-gray-900 font-medium">
                  {form.price ? `$${parseFloat(form.price).toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stock</span>
                <span className="text-gray-900 font-medium">{form.stock || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Images</span>
                <span className="text-gray-900 font-medium">{images.length}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
