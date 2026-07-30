// Public browser configuration only. RLS protects per-account data; private keys stay in Vercel.
window.TTSK_AUTH_CONFIG = {
  // Account services are retained for a future relaunch, but this build is local-first.
  localOnly: true,
  enableGate: false,
  supabaseUrl: 'https://evctipcohtjtfdaeivmv.supabase.co',
  supabaseAnonKey: 'sb_publishable_Zo4vZ_SWT2uUtLHH7xDOcg_wwv7gdGV',
  apiBase: 'https://knowledge-three-vert.vercel.app',
  siteUrl: 'https://zhang-0221.github.io/tiantianshuati/',
};
