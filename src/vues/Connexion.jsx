import { useState } from 'preact/hooks';
import { envoyerLien, verifierCode } from '../sync.js';

export function Connexion() {
  const [email, setEmail] = useState(() => localStorage.getItem('repas:email') || '');
  const [envoye, setEnvoye] = useState(false);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [attente, setAttente] = useState(false);

  const envoyer = async (e) => {
    e.preventDefault();
    setErreur(''); setAttente(true);
    try {
      localStorage.setItem('repas:email', email.trim());
      await envoyerLien(email.trim());
      setEnvoye(true);
    } catch (err) {
      setErreur(/signups not allowed|not found|Signups/i.test(err.message)
        ? 'Cette adresse n’est pas autorisée.' : err.message);
    } finally { setAttente(false); }
  };

  const valider = async (e) => {
    e.preventDefault();
    setErreur(''); setAttente(true);
    try { await verifierCode(email.trim(), code); } catch (err) { setErreur('Code invalide ou expiré.'); } finally { setAttente(false); }
  };

  return (
    <div class="appli"><main>
      <h1 style="margin:24px 0 8px">🍽️ Repas de la famille</h1>
      <div class="carte">
        {!envoye ? (
          <form onSubmit={envoyer}>
            <label class="champ">Votre adresse e-mail
              <input type="email" required autocomplete="email" value={email} onInput={(e) => setEmail(e.target.value)} />
            </label>
            <button class="btn principal" style="margin-top:12px;width:100%" disabled={attente}>Recevoir le lien de connexion</button>
          </form>
        ) : (
          <form onSubmit={valider}>
            <p>Un e-mail a été envoyé à <b>{email}</b>.</p>
            <p class="doux">Touchez le lien qu’il contient, <b>ou</b> (depuis l’app installée sur l’écran d’accueil) saisissez ici le code à 6 chiffres :</p>
            <input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456"
              style="width:100%;font-size:1.4rem;letter-spacing:.3em;text-align:center" value={code} onInput={(e) => setCode(e.target.value)} />
            <button class="btn principal" style="margin-top:12px;width:100%" disabled={attente || code.trim().length < 6}>Valider le code</button>
            <button type="button" class="btn" style="margin-top:8px;width:100%" onClick={() => { setEnvoye(false); setCode(''); }}>Changer d’adresse</button>
          </form>
        )}
        {erreur && <p class="erreur">{erreur}</p>}
      </div>
    </main></div>
  );
}
