import { createClient } from '@supabase/supabase-js';

// Clés dans Vercel : process.env.SUPABASE_URL / process.env.SUPABASE_SERVICE_ROLE
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(https://youhealyblgbwjhsskca.supabase.co, eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdWhlYWx5YmxnYndqaHNza2NhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg2MDAzNywiZXhwIjoyMDY0NDM2MDM3fQ.Hk7HeLyTtcj4bpnt4G483Fx8hTX4EOTkCtYf13ajDsM);

// Montants et produits autorisés (même correspondance que le front)
const PRICES = {
  points3000:  { amount: 3000 },
  points10000: { amount: 10000 },
  jetons12:    { amount: 12 },
  jetons50:    { amount: 50 },
  nopub:       { amount: 1 } // Juste un flag, tu gères ça plus bas si tu stockes le noPub
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { userId, achat } = req.body;
  if (!userId || !achat || !(achat in PRICES)) {
    return res.status(400).json({ error: "Paramètres invalides" });
  }

  // Vérifie ici le reçu Stripe/Paypal, etc. si tu veux sécuriser à fond

  // Ajoute les points/jetons
  if (achat.startsWith('points')) {
    // VCoins
    const { data, error } = await supabase
      .from('users')
      .select('vcoins')
      .eq('id', userId)
      .single();
    if (error || !data) return res.status(400).json({ error: "Utilisateur introuvable" });

    const newVCoins = (data.vcoins || 0) + PRICES[achat].amount;
    const { error: updateError } = await supabase
      .from('users')
      .update({ vcoins: newVCoins })
      .eq('id', userId);
    if (updateError) return res.status(500).json({ error: "Erreur SQL", details: updateError.message });
    return res.status(200).json({ success: true, vcoins: newVCoins });
  }
  if (achat.startsWith('jetons')) {
    // Jetons
    const { data, error } = await supabase
      .from('users')
      .select('jetons')
      .eq('id', userId)
      .single();
    if (error || !data) return res.status(400).json({ error: "Utilisateur introuvable" });

    const newJetons = (data.jetons || 0) + PRICES[achat].amount;
    const { error: updateError } = await supabase
      .from('users')
      .update({ jetons: newJetons })
      .eq('id', userId);
    if (updateError) return res.status(500).json({ error: "Erreur SQL", details: updateError.message });
    return res.status(200).json({ success: true, jetons: newJetons });
  }
  if (achat === "nopub") {
    // Ici, stocke le flag dans Supabase, exemple:
    const { error } = await supabase
      .from('users')
      .update({ nopub: true })
      .eq('id', userId);
    if (error) return res.status(500).json({ error: "Erreur SQL", details: error.message });
    return res.status(200).json({ success: true, nopub: true });
  }

  // Par défaut
  return res.status(400).json({ error: "Type d'achat non géré" });
}

