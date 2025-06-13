import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { userId, achat, quantite } = req.body;

  if (!userId || !achat) {
    return res.status(400).json({ error: "userId ou achat manquant" });
  }

  // PREMIUM (comme avant)
  if (achat === "premium") {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 30);

    const { error } = await supabase
      .from('users')
      .update({
        premium: true,
        premium_start: start.toISOString(),
        premium_end: end.toISOString()
      })
      .eq('id', userId);

    if (error) return res.status(500).json({ error: "Erreur update premium", details: error.message });
    return res.status(200).json({ success: true, message: "Premium activé !" });
  }

  // POINTS
  if (achat === "points" || achat === "piece") {
    if (!quantite || isNaN(quantite)) {
      return res.status(400).json({ error: "quantite manquante ou invalide" });
    }

    // 1. Récupère points actuels
    const { data, error: getError } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (getError) {
      return res.status(500).json({ error: "Utilisateur introuvable", details: getError.message });
    }

    // 2. Additionne et update
    const nouveauTotal = (data?.points || 0) + Number(quantite);

    const { error: updateError } = await supabase
      .from('users')
      .update({ points: nouveauTotal })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: "Erreur update points", details: updateError.message });
    }

    return res.status(200).json({ success: true, message: `Points crédités ! Nouveau total : ${nouveauTotal}` });
  }

  // Autre type d'achat non géré
  return res.status(400).json({ error: "Type d'achat non supporté" });
}
