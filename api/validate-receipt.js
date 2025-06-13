import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

export default async function handler(req, res) {
  // 🔒 CORS obligatoire
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ✅ Vérif données
  const { userId, achat } = req.body;
  if (!userId || !achat) return res.status(400).json({ error: "Missing data" });

  // 🔑 Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  try {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 30);

    const { error } = await supabase
      .from("users")
      .update({
        premium: true,
        premium_start: start.toISOString(),
        premium_end: end.toISOString()
      })
      .eq("id", userId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
