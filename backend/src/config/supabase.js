const { createClient } = require("@supabase/supabase-js");
const env = require("./env");

const supabase = createClient(env.supabaseUrl, env.supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = supabase;
