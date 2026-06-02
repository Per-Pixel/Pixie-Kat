import { supabase } from '../lib/supabase';

// ============================================================
// Types — mirror the 005_games_products.sql schema
// ============================================================
export type GameStatus = 'active' | 'inactive' | 'draft';
export type GameProvider = 'manual' | 'smile_one' | 'other';
export type ProductStatus = 'active' | 'inactive' | 'draft';
export type GameFieldType = 'text' | 'number' | 'email' | 'select' | 'tel';

export interface HowToStep {
  title: string;
  description: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface GameField {
  id: string;
  game_id: string;
  field_key: string;
  label: string;
  field_type: GameFieldType;
  placeholder?: string | null;
  help_text?: string | null;
  is_required: boolean;
  options: SelectOption[];
  validation_regex?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  game_id: string;
  name: string;
  description?: string | null;
  amount?: string | null;
  price: number;
  compare_price?: number | null;
  currency: string;
  image_url?: string | null;
  sku?: string | null;
  provider_product_id?: string | null;
  stock?: number | null;
  is_popular: boolean;
  status: ProductStatus;
  sort_order: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  category?: string | null;
  currency_label: string;
  provider: GameProvider;
  provider_game_code?: string | null;
  status: GameStatus;
  is_featured: boolean;
  sort_order: number;
  how_to_steps: HowToStep[];
  instructions?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface GameWithRelations extends Game {
  game_fields: GameField[];
  products: Product[];
}

// New-record input helpers
export type NewGame = Omit<Game, 'id' | 'created_at' | 'updated_at'>;
export type NewGameField = Omit<GameField, 'id' | 'created_at' | 'updated_at'>;
export type NewProduct = Omit<Product, 'id' | 'created_at' | 'updated_at'>;

// ============================================================
// Games
// ============================================================
export async function listGames(filters?: {
  status?: GameStatus;
  search?: string;
}): Promise<Game[]> {
  let query = supabase
    .from('games')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Game[];
}

export async function getGameWithRelations(id: string): Promise<GameWithRelations> {
  const { data, error } = await supabase
    .from('games')
    .select('*, game_fields(*), products(*)')
    .eq('id', id)
    .single();
  if (error) throw error;

  const game = data as unknown as GameWithRelations;
  game.game_fields = (game.game_fields ?? []).sort((a, b) => a.sort_order - b.sort_order);
  game.products = (game.products ?? []).sort((a, b) => a.sort_order - b.sort_order);
  return game;
}

export async function createGame(input: Partial<NewGame>): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Game;
}

export async function updateGame(id: string, input: Partial<NewGame>): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Game;
}

export async function deleteGame(id: string): Promise<void> {
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Game fields — replace-all strategy for the field builder
// ============================================================
export async function replaceGameFields(
  gameId: string,
  fields: Array<Partial<NewGameField> & { id?: string }>
): Promise<void> {
  // Delete removed, upsert the rest. Simplest reliable approach:
  // wipe and re-insert (small row counts per game).
  const { error: delErr } = await supabase
    .from('game_fields')
    .delete()
    .eq('game_id', gameId);
  if (delErr) throw delErr;

  if (fields.length === 0) return;

  const rows = fields.map((f, idx) => ({
    game_id: gameId,
    field_key: f.field_key,
    label: f.label,
    field_type: f.field_type ?? 'text',
    placeholder: f.placeholder ?? null,
    help_text: f.help_text ?? null,
    is_required: f.is_required ?? true,
    options: f.options ?? [],
    validation_regex: f.validation_regex ?? null,
    sort_order: idx + 1,
  }));

  const { error } = await supabase.from('game_fields').insert(rows);
  if (error) throw error;
}

// ============================================================
// Products
// ============================================================
export async function listProducts(filters?: {
  status?: ProductStatus;
  gameId?: string;
  search?: string;
}): Promise<Array<Product & { game?: { name: string; slug: string } }>> {
  let query = supabase
    .from('products')
    .select('*, game:games(name, slug)')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.gameId) query = query.eq('game_id', filters.gameId);
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Array<Product & { game?: { name: string; slug: string } }>;
}

export async function replaceProducts(
  gameId: string,
  products: Array<Partial<NewProduct> & { id?: string }>
): Promise<void> {
  const { error: delErr } = await supabase
    .from('products')
    .delete()
    .eq('game_id', gameId);
  if (delErr) throw delErr;

  if (products.length === 0) return;

  const rows = products.map((p, idx) => ({
    game_id: gameId,
    name: p.name,
    description: p.description ?? null,
    amount: p.amount ?? null,
    price: Number(p.price ?? 0),
    compare_price: p.compare_price != null ? Number(p.compare_price) : null,
    currency: p.currency ?? 'INR',
    image_url: p.image_url ?? null,
    sku: p.sku ?? null,
    provider_product_id: p.provider_product_id ?? null,
    stock: p.stock != null ? Number(p.stock) : null,
    is_popular: p.is_popular ?? false,
    status: p.status ?? 'active',
    sort_order: idx + 1,
  }));

  const { error } = await supabase.from('products').insert(rows);
  if (error) throw error;
}

export async function createProduct(input: Partial<NewProduct>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, input: Partial<NewProduct>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Promotional Items (Trending Games + Exclusive Offers)
// ============================================================
export type PromoSection = 'trending' | 'exclusive_offers';

export interface PromoItem {
  id: string;
  section: PromoSection;
  title: string;
  image_url?: string | null;
  flag?: string | null;
  link_url?: string | null;
  game_id?: string | null;
  rating?: number | null;
  price?: number | null;
  compare_price?: number | null;
  discount_pct?: number | null;
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type NewPromoItem = Omit<PromoItem, 'id' | 'created_at' | 'updated_at'>;

export async function listPromoItems(section: PromoSection): Promise<PromoItem[]> {
  const { data, error } = await supabase
    .from('promotional_items')
    .select('*')
    .eq('section', section)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PromoItem[];
}

export async function createPromoItem(input: Partial<NewPromoItem>): Promise<PromoItem> {
  const { data, error } = await supabase
    .from('promotional_items')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as PromoItem;
}

export async function updatePromoItem(id: string, input: Partial<NewPromoItem>): Promise<PromoItem> {
  const { data, error } = await supabase
    .from('promotional_items')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as PromoItem;
}

export async function deletePromoItem(id: string): Promise<void> {
  const { error } = await supabase.from('promotional_items').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderPromoItems(
  items: Array<{ id: string; sort_order: number }>
): Promise<void> {
  const updates = items.map(({ id, sort_order }) =>
    supabase.from('promotional_items').update({ sort_order }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error);
  if (firstErr?.error) throw firstErr.error;
}
