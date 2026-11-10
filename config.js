// Settings for the read-only group page (g.html). Both values are public:
// the anon key only lets a browser call what the database allows anon to do,
// here get_public_group(token).
//
// OWNER: paste the hosted project's anon (public) key below.
// Supabase dashboard → Project Settings → API → "anon public".
window.OTT_CONFIG = {
  supabaseUrl: "https://pdxryoxxyljoovccigku.supabase.co",
  supabaseAnonKey: "PASTE_SUPABASE_ANON_KEY_HERE",
  // Where "Get the app" goes until the App Store listing is live.
  appUrl: "./#waitlist",
};
