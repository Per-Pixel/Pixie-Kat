import { supabase } from '../lib/supabase';

// ============================================================
// Types — mirror the 005_games_products.sql schema
// ============================================================
export type GameStatus = 'active' | 'inactive' | 'draft';
export type GameProvider = 'manual' | 'smile_one' | 'smilecoin' | 'yokcash' | 'other';
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
  cost_price?: number | null;
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
  region?: string | null;
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

export async function deleteGame(id: string): Promise<'deleted' | 'archived'> {
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (!error) return 'deleted';
  if (!isFkViolation(error)) throw error;
  // The cascade hit order-referenced products — retire the game instead.
  const { error: updErr } = await supabase
    .from('games')
    .update({ status: 'inactive' })
    .eq('id', id);
  if (updErr) throw updErr;
  return 'archived';
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
}): Promise<Array<Product & { game?: { name: string; slug: string; provider: GameProvider } }>> {
  let query = supabase
    .from('products')
    .select('*, game:games(name, slug, provider)')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.gameId) query = query.eq('game_id', filters.gameId);
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Array<Product & { game?: { name: string; slug: string; provider: GameProvider } }>;
}

const isFkViolation = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503';

export interface ReplaceProductsResult {
  /** Saved rows in the same order as the input drafts. */
  products: Product[];
  /** Removed rows kept as 'inactive' because orders reference them. */
  archived: number;
}

export async function replaceProducts(
  gameId: string,
  products: Array<Partial<NewProduct> & { id?: string }>
): Promise<ReplaceProductsResult> {
  // orders.product_id is ON DELETE RESTRICT, so wipe-and-reinsert breaks once a
  // game has orders. Keep ids stable instead: upsert incoming drafts (existing
  // ids update in place), hard-delete removed rows, and retire order-referenced
  // removals to 'inactive' so order history keeps a valid FK target.
  const existing = await listProducts({ gameId });
  const existingIds = new Set(existing.map((p) => p.id));

  const rows = products.map((p, idx) => ({
    id: p.id && existingIds.has(p.id) ? p.id : crypto.randomUUID(),
    game_id: gameId,
    name: p.name,
    description: p.description ?? null,
    amount: p.amount ?? null,
    price: Number(p.price ?? 0),
    cost_price: p.cost_price != null ? Number(p.cost_price) : null,
    compare_price: p.compare_price != null ? Number(p.compare_price) : null,
    currency: p.currency ?? 'INR',
    image_url: p.image_url ?? null,
    sku: p.sku ?? null,
    provider_product_id: p.provider_product_id ?? null,
    stock: p.stock != null ? Number(p.stock) : null,
    is_popular: p.is_popular ?? false,
    status: p.status ?? 'active',
    sort_order: idx + 1,
    metadata: p.metadata ?? {},
  }));

  const keepIds = new Set(rows.map((r) => r.id));
  const removedIds = existing.map((p) => p.id).filter((id) => !keepIds.has(id));

  let archived = 0;
  if (removedIds.length) {
    const { error: delErr } = await supabase.from('products').delete().in('id', removedIds);
    if (delErr) {
      if (!isFkViolation(delErr)) throw delErr;
      const outcomes = await Promise.all(
        removedIds.map(async (pid) => {
          const { error } = await supabase.from('products').delete().eq('id', pid);
          if (!error) return 'deleted';
          if (!isFkViolation(error)) throw error;
          const { error: updErr } = await supabase
            .from('products')
            .update({ status: 'inactive' })
            .eq('id', pid);
          if (updErr) throw updErr;
          return 'archived';
        })
      );
      archived = outcomes.filter((o) => o === 'archived').length;
    }
  }

  if (rows.length === 0) return { products: [], archived };

  const { data, error } = await supabase.from('products').upsert(rows).select('*');
  if (error) throw error;
  const byId = new Map((data ?? []).map((r) => [r.id, r]));
  const ordered = rows
    .map((r) => byId.get(r.id))
    .filter((p): p is Product => Boolean(p));
  return { products: ordered, archived };
}

// Provider syncs replace a game's whole package list. Match incoming SKUs to
// existing products by provider_product_id so admin-edited fields (package
// name, in-game label, images, popular flag, metadata like
// expected_provider_price) survive the resync instead of resetting to the
// provider's raw SKU description.
export async function syncProviderProducts(
  gameId: string,
  rows: Array<Partial<NewProduct> & { provider_product_id?: string | null }>
): Promise<ReplaceProductsResult> {
  const existing = await listProducts({ gameId });
  const byProviderId = new Map(
    existing
      .filter((p) => p.provider_product_id)
      .map((p) => [p.provider_product_id as string, p])
  );

  const merged = rows.map((row) => {
    const prev = row.provider_product_id ? byProviderId.get(row.provider_product_id) : undefined;
    if (!prev) return row;
    return {
      ...row,
      name: prev.name,
      amount: prev.amount ?? row.amount,
      description: prev.description ?? row.description,
      compare_price: prev.compare_price ?? row.compare_price,
      image_url: prev.image_url ?? row.image_url,
      sku: prev.sku ?? row.sku,
      stock: prev.stock ?? row.stock,
      is_popular: prev.is_popular,
      status: prev.status,
      metadata: prev.metadata ?? row.metadata,
    };
  });

  return replaceProducts(gameId, merged);
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

export async function deleteProduct(id: string): Promise<'deleted' | 'archived'> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (!error) return 'deleted';
  if (!isFkViolation(error)) throw error;
  // Orders reference this product — retire it instead of failing the delete.
  const { error: updErr } = await supabase
    .from('products')
    .update({ status: 'inactive' })
    .eq('id', id);
  if (updErr) throw updErr;
  return 'archived';
}

// ============================================================
// Promotional Items (Trending Games + Exclusive Offers)
// ============================================================
export type PromoSection = 'trending' | 'exclusive_offers' | 'promotions';

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
  // promotions-only fields
  slug?: string | null;
  description?: string | null;
  details?: string | null;
  discount_label?: string | null;
  // scheduling (all sections)
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type NewPromoItem = Omit<PromoItem, 'id' | 'created_at' | 'updated_at'>;

export async function listPromoItemsByGame(gameId: string): Promise<PromoItem[]> {
  const { data, error } = await supabase
    .from('promotional_items')
    .select('*')
    .eq('game_id', gameId);
  if (error) throw error;
  return (data ?? []) as PromoItem[];
}

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
