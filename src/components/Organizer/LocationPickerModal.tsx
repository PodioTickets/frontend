"use client";

import { useEffect, useRef, useState } from "react";
import { X, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/Button";
import { LoadingAnimation } from "@/components/Loading";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import {
  parseCoordinate,
  roundCoordinate,
  formatCoordinatesLabel,
  parseGoogleAddressComponents,
  type ParsedAddressComponents,
} from "@/utils/googleMapsGeo";

/* Google Maps não tem tipos instalados no projeto — usamos `any` localmente
 * (mesmo padrão adotado em outros boundaries de SDK do repo). */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LocationPickerResult {
  lat: number;
  lng: number;
  /** Rótulo amigável do local (nome do POI ou endereço formatado). */
  name: string;
  /** Endereço formatado retornado pelo Google. */
  address: string;
  /**
   * Endereço estruturado (cep/rua/bairro/cidade/estado) derivado do local no
   * MELHOR ESFORÇO. `undefined` quando o pino não foi movido/reselecionado
   * nesta sessão (ex.: reabrir e confirmar as coords já salvas) — o consumidor
   * NÃO deve sobrescrever o endereço existente nesse caso.
   */
  components?: ParsedAddressComponents;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Coordenadas já salvas (reabrir posiciona o pino nelas). */
  initialLat?: string | number | null;
  initialLng?: string | number | null;
  /** Rótulo já salvo, exibido enquanto não há novo reverse-geocode. */
  initialName?: string;
  /**
   * Busca de fallback (ex.: "São Paulo, SP, Brasil") usada só para CENTRALIZAR
   * o mapa quando ainda não há pino — nunca cria pino automaticamente.
   */
  fallbackQuery?: string;
  onConfirm: (result: LocationPickerResult) => void;
}

// Centro/zoom do Brasil quando não há pino nem fallback resolvido.
const BRAZIL_CENTER = { lat: -14.235, lng: -51.9253 };
const COUNTRY_ZOOM = 4;
const CITY_ZOOM = 12;
const PIN_ZOOM = 16;

export function LocationPickerModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  initialName,
  fallbackQuery,
  onConfirm,
}: LocationPickerModalProps) {
  const { status, google } = useGoogleMaps(isOpen);

  const mapElRef = useRef<HTMLDivElement | null>(null);
  // Container onde o <gmp-place-autocomplete> (Places API New) é montado.
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  // Endereço estruturado do local selecionado NESTA sessão. Null enquanto o pino
  // não for (re)posicionado — evita apagar o endereço salvo ao só reconfirmar.
  const [components, setComponents] = useState<ParsedAddressComponents | null>(
    null,
  );

  // ── Reset do estado ao (re)abrir: parte do que já estava salvo ──────────────
  useEffect(() => {
    if (!isOpen) return;
    const lat = parseCoordinate(initialLat);
    const lng = parseCoordinate(initialLng);
    const hasInitial =
      lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    setPin(hasInitial ? { lat: lat!, lng: lng! } : null);
    setName(initialName?.trim() || "");
    setAddress(initialName?.trim() || "");
    setGeocoding(false);
    setComponents(null);
  }, [isOpen, initialLat, initialLng, initialName]);

  // ── Inicialização imperativa do mapa (só quando o SDK está pronto) ──────────
  useEffect(() => {
    if (!isOpen || status !== "ready" || !google || !mapElRef.current) return;
    const gm = google.maps;

    const lat0 = parseCoordinate(initialLat);
    const lng0 = parseCoordinate(initialLng);
    const startPin =
      lat0 !== null && lng0 !== null && lat0 >= -90 && lat0 <= 90 && lng0 >= -180 && lng0 <= 180
        ? { lat: lat0, lng: lng0 }
        : null;

    const map = new gm.Map(mapElRef.current, {
      center: startPin ?? BRAZIL_CENTER,
      zoom: startPin ? PIN_ZOOM : COUNTRY_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: true,
      gestureHandling: "greedy", // 1 dedo arrasta no mobile (dentro do sheet)
    });
    mapRef.current = map;
    geocoderRef.current = new gm.Geocoder();

    // Move/cria o marcador e sincroniza o estado React. `reverse` dispara o
    // geocoding inverso (clique/arraste, sem rótulo); `presetName/presetAddress`
    // vêm do Autocomplete (já com nome/endereço, sem gasto de geocoding).
    const applyPosition = (
      pos: { lat: number; lng: number },
      opts: {
        reverse: boolean;
        recenter: boolean;
        presetName?: string;
        presetAddress?: string;
        presetComponents?: ParsedAddressComponents;
      },
    ) => {
      if (!markerRef.current) {
        markerRef.current = new gm.Marker({ map, position: pos, draggable: true });
        markerRef.current.addListener("dragend", (e: any) => {
          applyPosition(
            { lat: e.latLng.lat(), lng: e.latLng.lng() },
            { reverse: true, recenter: false },
          );
        });
      } else {
        markerRef.current.setPosition(pos);
      }

      if (opts.recenter) {
        map.panTo(pos);
        if (map.getZoom() < PIN_ZOOM) map.setZoom(PIN_ZOOM);
      }

      setPin({ lat: pos.lat, lng: pos.lng });

      if (opts.presetName !== undefined || opts.presetAddress !== undefined) {
        setName(opts.presetName?.trim() || opts.presetAddress?.trim() || "");
        setAddress(opts.presetAddress?.trim() || "");
      }
      if (opts.presetComponents) {
        setComponents(opts.presetComponents);
      }

      if (opts.reverse && geocoderRef.current) {
        setGeocoding(true);
        geocoderRef.current.geocode(
          { location: pos },
          (results: any[], geoStatus: string) => {
            setGeocoding(false);
            if (geoStatus === "OK" && results?.[0]) {
              const formatted = results[0].formatted_address as string;
              if (formatted) {
                setAddress(formatted);
                setName(formatted);
              }
              // Endereço estruturado do ponto (clique/arraste) → preenche o form.
              setComponents(
                parseGoogleAddressComponents(results[0].address_components),
              );
            }
          },
        );
      }
    };

    if (startPin) {
      applyPosition(startPin, { reverse: false, recenter: false });
    } else if (fallbackQuery?.trim()) {
      // Só centraliza — não cria pino.
      geocoderRef.current.geocode(
        { address: fallbackQuery.trim() },
        (results: any[], geoStatus: string) => {
          if (geoStatus === "OK" && results?.[0]?.geometry?.location) {
            map.setCenter(results[0].geometry.location);
            map.setZoom(CITY_ZOOM);
          }
        },
      );
    }

    const clickListener = map.addListener("click", async (e: any) => {
      // Clique num POI do mapa (ícone de estabelecimento) traz `placeId`: buscamos
      // o NOME do local (displayName) em vez de só reverse-geocodar o endereço.
      if (e.placeId && gm.places?.Place) {
        e.stop?.(); // impede o info-window padrão do Google
        try {
          const poi = new gm.places.Place({ id: e.placeId });
          await poi.fetchFields({
            fields: [
              "location",
              "displayName",
              "formattedAddress",
              "addressComponents",
            ],
          });
          const loc = poi.location;
          const coords =
            (loc &&
              readLatLng(loc)) ||
            (e.latLng ? { lat: e.latLng.lat(), lng: e.latLng.lng() } : null);
          if (!coords) return;
          const displayName =
            typeof poi.displayName === "string"
              ? poi.displayName
              : poi.displayName?.text;
          applyPosition(coords, {
            reverse: false,
            recenter: false,
            presetName: displayName,
            presetAddress: poi.formattedAddress,
            presetComponents: parseGoogleAddressComponents(
              poi.addressComponents,
            ),
          });
          return;
        } catch {
          /* falha ao buscar o POI → cai no reverse geocode do ponto clicado */
        }
      }
      if (!e.latLng) return;
      applyPosition(
        { lat: e.latLng.lat(), lng: e.latLng.lng() },
        { reverse: true, recenter: false },
      );
    });

    // ── Busca por endereço (Places API New: PlaceAutocompleteElement) ──
    // O Autocomplete CLÁSSICO (google.maps.places.Autocomplete) não está
    // disponível para projetos criados após 2025-03-01 ("new customers"). Usamos
    // o web component novo, que monta seu próprio input dentro do container.
    let autocompleteEl: any = null;
    let onSearchKeyDown: ((e: KeyboardEvent) => void) | null = null;
    // Lê lat/lng tolerando as duas formas do SDK (método lat()/lng() ou número).
    const readLatLng = (loc: any): { lat: number; lng: number } | null => {
      if (!loc) return null;
      const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
      return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;
    };
    // Resolve um Place (do dropdown ou de uma predição) → busca campos, extrai
    // coordenadas/nome/endereço e posiciona o pino. Compartilhado entre o clique
    // numa sugestão (`handleSelect`) e o Enter (`selectFirstSuggestion`).
    const resolveAndPlace = async (place: any, prediction: any) => {
      if (!place) return;
      if (typeof place.fetchFields === "function") {
        await place.fetchFields({
          fields: [
            "location",
            "displayName",
            "formattedAddress",
            "addressComponents",
          ],
        });
      }
      const coords = readLatLng(place.location);
      if (!coords) return;
      // Nome do local: preferimos o `displayName` do Place (nome do POI, ex.:
      // "Ginásio Municipal"). Quando ele não vem, usamos o TEXTO PRINCIPAL da
      // sugestão (`mainText` — a linha em negrito do dropdown, que para um
      // estabelecimento é o nome), e só então o endereço formatado.
      const displayName =
        typeof place.displayName === "string"
          ? place.displayName
          : place.displayName?.text;
      const predictionMainText =
        prediction?.mainText?.text ??
        prediction?.structuredFormat?.mainText?.text ??
        (typeof prediction?.mainText === "string" ? prediction.mainText : undefined);
      applyPosition(coords, {
        reverse: false,
        recenter: true,
        presetName: displayName || predictionMainText,
        presetAddress: place.formattedAddress,
        presetComponents: parseGoogleAddressComponents(place.addressComponents),
      });
    };
    const handleSelect = async (event: any) => {
      try {
        // Formatos possíveis conforme a versão: `placePrediction` (gmp-select
        // atual) ou `place` (gmp-placeselect legado do web component).
        const prediction = event?.placePrediction;
        const place =
          (prediction?.toPlace ? prediction.toPlace() : null) ??
          event?.place ??
          prediction;
        await resolveAndPlace(place, prediction);
      } catch (err) {
        // Diagnóstico: aparece no console se a seleção falhar (ex.: sem location).
        console.warn("[LocationPicker] falha ao resolver o local:", err);
      }
    };

    // Enter no campo de busca escolhe a PRIMEIRA sugestão da lista. O web
    // component novo não seleciona nada no Enter sem navegar com as setas — então
    // buscamos as predições do texto atual e resolvemos a 1ª nós mesmos.
    let enterInFlight = false;
    const selectFirstSuggestion = async (rawInput: string) => {
      const input = rawInput.trim();
      if (!input || enterInFlight) return;
      const suggestionApi = gm.places?.AutocompleteSuggestion;
      if (!suggestionApi?.fetchAutocompleteSuggestions) return;
      enterInFlight = true;
      try {
        // `includedRegionCodes` pode não existir em versões antigas → refaz sem ele.
        let result: any;
        try {
          result = await suggestionApi.fetchAutocompleteSuggestions({
            input,
            includedRegionCodes: ["br"],
          });
        } catch {
          result = await suggestionApi.fetchAutocompleteSuggestions({ input });
        }
        const suggestions: any[] = result?.suggestions ?? [];
        const first = suggestions.find((s) => s?.placePrediction);
        const prediction = first?.placePrediction;
        if (!prediction) return;
        const place = prediction.toPlace ? prediction.toPlace() : null;
        await resolveAndPlace(place, prediction);
      } catch (err) {
        console.warn("[LocationPicker] falha ao resolver a 1ª sugestão:", err);
      } finally {
        enterInFlight = false;
      }
    };
    if (searchContainerRef.current && gm.places?.PlaceAutocompleteElement) {
      // Construção à prova de versão: se a opção `includedRegionCodes` não for
      // suportada, o construtor lança — recriamos SEM opções para o campo SEMPRE
      // renderizar (senão a busca some inteira).
      try {
        autocompleteEl = new gm.places.PlaceAutocompleteElement({
          includedRegionCodes: ["br"],
        });
      } catch {
        try {
          autocompleteEl = new gm.places.PlaceAutocompleteElement();
        } catch {
          autocompleteEl = null;
        }
      }
      if (autocompleteEl) {
        autocompleteEl.style.width = "100%";
        searchContainerRef.current.appendChild(autocompleteEl);
        // Nome do evento varia por versão — ouvimos ambos (só um dispara).
        autocompleteEl.addEventListener("gmp-select", handleSelect);
        autocompleteEl.addEventListener("gmp-placeselect", handleSelect);
        // Enter → escolhe a 1ª sugestão da lista. Interceptamos na CAPTURA (antes
        // do handler interno do componente) e suprimimos o Enter nativo, que sem
        // navegar pelas setas não seleciona nada. O <input> pode estar no shadow DOM.
        onSearchKeyDown = (e: KeyboardEvent) => {
          if (e.key !== "Enter") return;
          const inputEl: HTMLInputElement | null =
            autocompleteEl.querySelector?.("input") ??
            autocompleteEl.shadowRoot?.querySelector?.("input") ??
            null;
          const value = (inputEl?.value ??
            (e.target as HTMLInputElement)?.value ??
            "") as string;
          if (!value.trim()) return;
          e.preventDefault();
          e.stopPropagation();
          void selectFirstSuggestion(value);
        };
        autocompleteEl.addEventListener("keydown", onSearchKeyDown, true);
      }
    } else {
      console.warn(
        "[LocationPicker] PlaceAutocompleteElement indisponível — verifique se a 'Places API (New)' está habilitada no Google Cloud.",
      );
    }

    return () => {
      clickListener?.remove?.();
      if (autocompleteEl) {
        autocompleteEl.removeEventListener("gmp-select", handleSelect);
        autocompleteEl.removeEventListener("gmp-placeselect", handleSelect);
        if (onSearchKeyDown) {
          autocompleteEl.removeEventListener("keydown", onSearchKeyDown, true);
        }
        autocompleteEl.remove();
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapRef.current = null;
      geocoderRef.current = null;
      // O Autocomplete injeta um `.pac-container` no body — remove os órfãos.
      document
        .querySelectorAll(".pac-container")
        .forEach((el) => el.parentElement?.removeChild(el));
    };
    // Reinicializa a cada abertura / quando o SDK fica pronto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, status, google]);

  if (!isOpen) return null;

  const canConfirm = pin !== null;
  const showMap = status === "ready" || status === "loading" || status === "idle";

  const handleConfirm = () => {
    if (!pin) return;
    const label = name.trim() || address.trim() || formatCoordinatesLabel(pin.lat, pin.lng);
    onConfirm({
      lat: roundCoordinate(pin.lat),
      lng: roundCoordinate(pin.lng),
      name: label,
      address: address.trim(),
      // Só envia o endereço estruturado quando houve (re)seleção nesta sessão —
      // senão `undefined` sinaliza "não mexer no endereço já salvo".
      components: components ?? undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      <div className="relative bg-gray-1 w-full md:max-w-[860px] rounded-tl-xl rounded-tr-xl md:rounded-xl border border-gray-6 shadow-lg max-h-[92dvh] md:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-6 shrink-0">
          <h2 className="font-semibold text-base md:text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
            Selecione o local no mapa
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="size-[18px] text-gray-12" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 p-4 md:p-6 flex-1 min-h-0 overflow-y-auto">
          {showMap ? (
            <>
              {/* Busca (Places API New monta o <gmp-place-autocomplete> aqui;
                  o estilo do host está em globals.css para combinar com os inputs) */}
              <div ref={searchContainerRef} className="shrink-0 w-full" />

              <p className="text-gray-11 text-sm font-family-dm-sans leading-[1.4] shrink-0">
                Busque o endereço, ou toque no mapa e arraste o marcador para
                ajustar o ponto exato.
              </p>

              {/* Mapa */}
              <div className="relative w-full flex-1 min-h-[320px] md:min-h-[380px] rounded-xl overflow-hidden border border-gray-6">
                <div ref={mapElRef} className="absolute inset-0" />
                {status !== "ready" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-2">
                    <LoadingAnimation />
                  </div>
                )}
              </div>

              {/* Local selecionado */}
              <div className="flex items-start gap-2 shrink-0 min-h-[44px]">
                <MapPin className="size-5 text-primary-11 shrink-0 mt-0.5" />
                {pin ? (
                  <div className="flex flex-col min-w-0">
                    <p className="text-gray-12 text-sm md:text-base font-medium font-family-dm-sans leading-[1.3] break-words">
                      {geocoding ? "Buscando endereço..." : name || address || "Local selecionado"}
                    </p>
                    <p className="text-gray-11 text-xs md:text-sm font-family-dm-sans">
                      {formatCoordinatesLabel(pin.lat, pin.lng)}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.3]">
                    Nenhum ponto selecionado ainda.
                  </p>
                )}
              </div>
            </>
          ) : (
            // Estados degradados: sem chave configurada ou falha de carga.
            <div className="flex flex-col items-center justify-center gap-3 text-center py-10 px-4 flex-1">
              <AlertTriangle className="size-10 text-gray-11" strokeWidth={1.5} />
              {status === "no-key" ? (
                <>
                  <p className="text-gray-12 text-base font-semibold font-family-dm-sans">
                    Mapa indisponível
                  </p>
                  <p className="text-gray-11 text-sm font-family-dm-sans max-w-[420px] leading-[1.4]">
                    A integração com o Google Maps ainda não foi configurada
                    (chave de API ausente). Configure a variável
                    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para habilitar a seleção de
                    local no mapa.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-12 text-base font-semibold font-family-dm-sans">
                    Não foi possível carregar o mapa
                  </p>
                  <p className="text-gray-11 text-sm font-family-dm-sans max-w-[420px] leading-[1.4]">
                    Verifique sua conexão e tente novamente em instantes.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-4 md:px-6 border-t border-gray-6 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="border-gray-6 text-gray-12 h-11"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirmar local
          </Button>
        </div>
      </div>
    </div>
  );
}
