import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';

// Garde-fou : la clé fournie au front doit être la clé publique (anon / publishable),
// jamais la clé service_role / secrète, qui contourne la Row Level Security.
function verifierCle(cle) {
  if (!cle) return;
  if (cle.startsWith('sb_secret_')) throw new Error('VITE_SUPABASE_ANON_KEY est une clé SECRÈTE : utilisez la clé publique (anon / publishable).');
  const morceaux = cle.split('.');
  if (morceaux.length === 3) {
    try {
      const role = JSON.parse(Buffer.from(morceaux[1], 'base64url').toString()).role;
      if (role === 'service_role') throw new Error('VITE_SUPABASE_ANON_KEY est la clé service_role : utilisez la clé « anon ».');
    } catch (e) {
      if (/service_role/.test(e.message)) throw e;
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  verifierCle(env.VITE_SUPABASE_ANON_KEY);
  return {
    // BASE_PATH est fourni par la GitHub Action (ex. /liste-courses/) pour GitHub Pages.
    base: process.env.BASE_PATH || '/',
    plugins: [preact()],
    test: { include: ['tests/**/*.test.js'] },
  };
});
