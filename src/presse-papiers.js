// Copie un texte dans le presse-papiers (avec une solution de secours pour les vieux navigateurs).
export async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = texte;
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}
