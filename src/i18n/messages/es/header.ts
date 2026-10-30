import type pt from "../pt-BR/header";

export default {
  searchPlaceholder: "Busca tu evento...",
  defaultUserName: "Usuario",
  profile: "Perfil y configuración",
  myTickets: "Mis entradas",
  logout: "Cerrar sesión",
  logoutMobile: "Salir",
  signUp: "Crear cuenta",
  signIn: "Iniciar sesión",
  menu: "Menú",
  closeMenu: "Cerrar menú",
} satisfies Record<keyof typeof pt, string>;
