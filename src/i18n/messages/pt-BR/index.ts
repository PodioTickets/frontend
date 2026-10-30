import common from "./common";
import header from "./header";
import footer from "./footer";
import ui from "./ui";
import home from "./home";
import landing from "./landing";
import event from "./event";
import checkoutInfo from "./checkoutInfo";
import checkout from "./checkout";
import auth from "./auth";
import user from "./user";

/**
 * Dicionário FONTE (pt-BR). Um arquivo por namespace (área do site); en/es espelham
 * as MESMAS chaves (`satisfies` acusa chave faltando/sobrando no type-check).
 * Só o pt-BR entra no bundle do client (é o fallback); en/es vêm do server via
 * `I18nProvider`, só o idioma ativo.
 */
export const ptBR = {
  common,
  header,
  footer,
  ui,
  home,
  landing,
  event,
  checkoutInfo,
  checkout,
  auth,
  user,
};

export type Messages = typeof ptBR;
export type Namespace = keyof Messages;
