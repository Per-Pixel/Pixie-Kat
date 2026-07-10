import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = 'testresearch0630@proton.me';

const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

const user = listData.users.find((u) => (u.email || '').toLowerCase() === email);
if (!user) {
  console.log('NOT_FOUND');
  process.exit(0);
}

const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
if (deleteError) throw deleteError;

const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);
if (profileError) {
  console.error('PROFILE_DELETE_ERROR');
  console.error(profileError.message);
  process.exit(1);
}

const { data: afterData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
const stillThere = afterData.users.some((u) => (u.email || '').toLowerCase() === email);
console.log(stillThere ? 'DELETE_FAILED' : 'DELETED');
