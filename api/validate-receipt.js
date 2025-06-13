import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

export default async function handler(req, res) {
  // 🔐 CORS — réponse rapide pour OPTIONS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // 🔐 CORS — pour POST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return res.status(500).json({ error: 'Clés Supabase manquantes (env)' });
  }

  const { userId, achat } = req.body || {};
  if (!userId || !achat) return res.status(400).json({ error: 'Données manquantes' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  if (achat === 'premium') {
    try {
      const now = new Date();
      let newStart = now;
      let newEnd = new Date(now);
      newEnd.setDate(newEnd.getDate() + 30);

      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('premium_end')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        return res.status(400).json({ error: 'Utilisateur introuvable' });
      }

      const prevEnd = user.premium_end ? new Date(user.premium_end) : null;
      if (prevEnd && prevEnd > now) {
        newStart = prevEnd;
        newEnd = new Date(prevEnd);
        newEnd.setDate(newEnd.getDate() + 30);
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          premium: true,
          premium_start: newStart.toISOString(),
          premium_end: newEnd.toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        return res.status(500).json({ error: 'Erreur mise à jour premium' });
      }

      return res.status(200).json({ success: true, message: '✅ Premium activé' });
    } catch (e) {
      return res.status(500).json({ error: 'Erreur serveur premium' });
    }
  }

  const PIECE_PACKS = {
    pack_099: { base: 1500, bonus: 500, flag: 'firstBuy_099' },
    pack_199: { base: 4000, bonus: 1000, flag: 'firstBuy_199' },
    pack_249: { base: 12000, bonus: 3000, flag: 'firstBuy_249' }
  };

  if (PIECE_PACKS[achat]) {
    try {
      const pack = PIECE_PACKS[achat];

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(400).json({ error: 'Utilisateur introuvable' });
      }

      let total = pack.base;
      const updates = {};

      if (!user[pack.flag]) {
        total += pack.bonus;
        updates[pack.flag] = true;
      }

      updates.points = (user.points || 0) + total;

      const { error: upError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (upError) {
        return res.status(500).json({ error: 'Erreur mise à jour pack' });
      }

      return res.status(200).json({ success: true, message: `✅ ${total} pièces ajoutées` });
    } catch (e) {
      return res.status(500).json({ error: 'Erreur serveur pack' });
    }
  }

  return res.status(400).json({ error: 'Type d\'achat inconnu' });
}
