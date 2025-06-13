import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === 'OPTIONS') return res.status(200).end();

  console.log("✅ Fonction appelée");

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error("❌ Clés Supabase manquantes");
    return res.status(500).json({ error: 'Clés manquantes' });
  }

  const { userId, achat } = req.body || {};
  console.log("📥 Données reçues :", { userId, achat });

  if (!userId || !achat) {
    console.error("❌ Données manquantes");
    return res.status(400).json({ error: 'Données manquantes' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  try {
    if (achat === 'premium') {
      console.log("✨ Traitement premium");

      const now = new Date();
      const newStart = now.toISOString();
      const newEnd = new Date(now);
      newEnd.setDate(newEnd.getDate() + 30);

      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('premium_end')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        console.error("❌ Utilisateur introuvable ou erreur :", fetchError);
        return res.status(400).json({ error: 'Utilisateur introuvable' });
      }

      console.log("👤 Utilisateur récupéré :", user);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          premium: true,
          premium_start: newStart,
          premium_end: newEnd.toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error("❌ Erreur mise à jour :", updateError);
        return res.status(500).json({ error: 'Erreur mise à jour' });
      }

      console.log("✅ Premium activé !");
      return res.status(200).json({ success: true });
    }

    console.error("❌ Achat inconnu :", achat);
    return res.status(400).json({ error: 'Type d\'achat inconnu' });

  } catch (e) {
    console.error("💥 Exception serveur :", e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
