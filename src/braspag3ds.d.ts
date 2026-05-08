// Declarações globais do SDK Braspag/Cielo 3DS 2.0
// https://braspag.github.io/manual/integracao-javascript

declare global {
  interface BpmpiSuccessDetail {
    Cavv: string;
    Eci: string;
    Xid: string;
    ReferenceId: string;
    Version: string;
    ReturnCode: string;
    ReturnMessage: string;
    AuthenticationUrl?: string;
  }

  interface BpmpiFailureDetail {
    Eci: string;
    ReturnCode: string;
    ReturnMessage: string;
  }

  interface BpmpiUnenrolledDetail {
    Eci: string;
    ReturnCode: string;
    ReturnMessage: string;
  }

  interface BpmpiErrorDetail {
    ReturnCode: string;
    ReturnMessage: string;
  }

  var bpmpi_config: {
    onReady?: () => void;
    onSuccess?: (e: CustomEvent<BpmpiSuccessDetail>) => void;
    onFailure?: (e: CustomEvent<BpmpiFailureDetail>) => void;
    onUnenrolled?: (e: CustomEvent<BpmpiUnenrolledDetail>) => void;
    onDisabled?: () => void;
    onError?: (e: CustomEvent<BpmpiErrorDetail>) => void;
    onUnsupportedBrand?: (e: CustomEvent) => void;
    Environment?: "SDB" | "PRD";
    Debug?: boolean;
  };

  function bpmpi_authenticate(): void;
}

export {};
