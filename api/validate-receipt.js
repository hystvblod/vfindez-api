import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const GOOGLE_JSON_KEY = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); // Fichier .json complet
const PACKAGE_NAME = "com.tonapp.exemple"; // <-- À personnaliser
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET; // Dans App Store Connect

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// ---------- Vérification Google (Android) ----------
async function verifierRecuGoogle(receipt) {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_JSON_KEY,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const client = await auth.getClient();
  const publisher = google.androidpublisher({ version: 'v3', auth: client });

  try {
    const [purchaseToken, productId] = receipt.split('||'); // reçu formaté côté client
    const res = await publisher.purchases.products.get({
      packageName: PACKAGE_NAME,
      productId,
      token: purchaseToken,
    });

    return res.data?.purchaseState === 0; // 0 = Achat validé
  } catch (err) {
    console.error("Erreur vérification Google", err);
    return false;
  }
}

// ---------- Vérification Apple (iOS) ----------
async function verifierRecuApple(receipt) {
  try {
    const response = await fetch("https://buy.itunes.apple.com/verifyReceipt", {
      method: "POST",
      body: JSON.stringify({
        'receipt-data': receipt,
        'password': APPLE_SHARED_SECRET
      }),
      headers: { "Content-Type": "application/json" }
    });

    const result = await response.json();
    return result.status === 0; // 0 = succès
  } catch (e) {
    console.error("Erreur vérification Apple", e);
    return false;
  }
}

// ---------- Handler principal ----------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { userId, achat, quantite, receipt, plateforme } = req.body;

  if (!userId || !achat || !receipt || !plateforme) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  // ✅ Étape 1 : Vérification du reçu selon la plateforme
  let recuValide = false;
  if (plateforme === "android") {
    recuValide = await verifierRecuGoogle(receipt);
  } else if (plateforme === "ios") {
    recuValide = await verifierRecuApple(receipt);
  }

  if (!recuValide) {
    return res.status(403).json({ error: "Reçu invalide ou frauduleux" });
  }

  // ✅ Étape 2 : Appliquer les achats (comme avant)
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

  if (achat === "points" || achat === "piece") {
    if (!quantite || isNaN(quantite)) {
      return res.status(400).json({ error: "quantite manquante ou invalide" });
    }

    const { data, error: getError } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (getError) {
      return res.status(500).json({ error: "Utilisateur introuvable", details: getError.message });
    }

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

  return res.status(400).json({ error: "Type d'achat non supporté" });
}
