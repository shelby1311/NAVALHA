export type Theme = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'navalha-theme'

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system'
}

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

/** Aplica o tema no <html> e guarda localmente (evita flash na próxima visita, antes do perfil carregar). */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage indisponível (modo privado etc.) — o tema ainda funciona nesta sessão, só não persiste.
  }
}

/** Script inline injetado no <head>: roda antes da hidratação, sem flash de tema errado. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'||t==='dark'||t==='system')document.documentElement.dataset.theme=t}catch(e){}})()`
