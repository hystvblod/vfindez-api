import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const { userId, achat, quantite } = req.body;
  if (!userId || !achat) return res.status(400).json({ error: "Données manquantes" });

  // Gestion premium (OK)
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

    if (error) return res.status(500).json({ error: "Erreur Supabase", details: error.message });
    return res.status(200).json({ success: true, message: "Premium activé !" });
  }

  // Gestion achat de points/pièces
  if (achat === "points" || achat === "piece") {
    if (!quantite || isNaN(quantite)) return res.status(400).json({ error: "Quantité invalide" });

    // 1. Récupère le score actuel
    const { data, error: getError } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (getError) return res.status(500).json({ error: "Utilisateur non trouvé", details: getError.message });

    // 2. Additionne les points
    const nouveauTotal = (data.points || 0) + Number(quantite);

    // 3. Mets à jour la BDD
    const { error: updateError } = await supabase
      .from('users')
      .update({ points: nouveauTotal })
      .eq('id', userId);

    if (updateError) return res.status(500).json({ error: "Erreur update points", details: updateError.message });

    return res.status(200).json({ success: true, message: `Points crédités (+${quantite}) !` });
  }

  return res.status(400).json({ error: "Type d'achat non supporté" });
}
