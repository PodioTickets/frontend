import Cookies from "js-cookie";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Textos montados FORA do React (services de auth/usuário), onde não há `useT`.
 * Tabela pequena com os 3 idiomas inline — só mensagens que chegam à tela do comprador.
 */
const MESSAGES = {
  documentExists: {
    "pt-BR": "Já existe um usuário cadastrado com este documento.",
    en: "A user with this document is already registered.",
    es: "Ya existe un usuario registrado con este documento.",
  },
  emailExists: {
    "pt-BR": "Este e-mail já está cadastrado.",
    en: "This email is already registered.",
    es: "Este correo electrónico ya está registrado.",
  },
  loginError: {
    "pt-BR": "Erro ao fazer login. Tente novamente.",
    en: "Could not log in. Please try again.",
    es: "Error al iniciar sesión. Inténtalo de nuevo.",
  },
  invalidCode: {
    "pt-BR": "Código inválido. Tente novamente.",
    en: "Invalid code. Please try again.",
    es: "Código inválido. Inténtalo de nuevo.",
  },
  saveUserError: {
    "pt-BR": "Erro ao salvar usuário. Tente novamente.",
    en: "Could not save your details. Please try again.",
    es: "Error al guardar tus datos. Inténtalo de nuevo.",
  },
} satisfies Record<string, Record<Locale, string>>;

/** Idioma do cookie; no painel (organizer/admin) e no server → pt-BR, igual ao `I18nProvider`. */
function currentLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const path = window.location.pathname;
  const isPanel =
    path.startsWith("/organizer") ||
    path.startsWith("/admin") ||
    !!document.querySelector('meta[name="pt-app-surface"]');
  if (isPanel) return DEFAULT_LOCALE;
  const value = Cookies.get(LOCALE_COOKIE);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function serviceMessage(key: keyof typeof MESSAGES): string {
  return MESSAGES[key][currentLocale()];
}
