// Settings for the read-only group page (g.html). Both values are public:
// the anon key only lets a browser call what the database allows anon to do,
// here get_public_group(token).
//
// The hosted project's anon (public) key, from Project Settings → API.
window.OTT_CONFIG = {
  supabaseUrl: "https://pdxryoxxyljoovccigku.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeHJ5b3h4eWxqb292Y2NpZ2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzY1NTIsImV4cCI6MjA5Nzk1MjU1Mn0.hsMZ3651CvtM4yuGoQJ9d2fcUt9fDrIhEmoCeCniynI",
  // Where "Get the app" goes until the App Store listing is live.
  appUrl: "./#waitlist",
};
