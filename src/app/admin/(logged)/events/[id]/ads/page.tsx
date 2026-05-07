"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { userService } from "@/services";
import { organizerService } from "@/services";
import type { EventTracking, EventTrackingPatch } from "@/services";
import { validateNonEmptyEventTrackingFields } from "@/lib/eventTrackingValidation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { AdminEventHeader } from "@/components/Admin/AdminEventHeader";
import { Loading } from "@/components/Loading";
import toast from "react-hot-toast";
import { GoogleIcon } from "@/components/Icons/GoogleIcon";
import { MetaIcon } from "@/components/Icons/Organizer/MetaIcon";

interface AdsTrackingData {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
}

const emptyAdsForm = (): AdsTrackingData => ({
  metaPixelId: "",
  googleAnalyticsId: "",
  googleAdsId: "",
});

/** Comparação estável para dirty-check (trim nos valores). */
function adsTrackingSnapshot(d: AdsTrackingData): string {
  return JSON.stringify({
    metaPixelId: (d.metaPixelId ?? "").trim(),
    googleAnalyticsId: (d.googleAnalyticsId ?? "").trim(),
    googleAdsId: (d.googleAdsId ?? "").trim(),
  });
}

function trackingToFormData(t: EventTracking): AdsTrackingData {
  return {
    metaPixelId: t.metaPixelId,
    googleAnalyticsId: t.googleAnalyticsId,
    googleAdsId: t.googleAdsId,
  };
}

function buildTrackingPatch(
  form: AdsTrackingData,
  committedSnapshot: string,
): EventTrackingPatch {
  const committed = JSON.parse(committedSnapshot) as {
    metaPixelId: string;
    googleAnalyticsId: string;
    googleAdsId: string;
  };
  const cur = {
    metaPixelId: (form.metaPixelId ?? "").trim(),
    googleAnalyticsId: (form.googleAnalyticsId ?? "").trim(),
    googleAdsId: (form.googleAdsId ?? "").trim(),
  };
  const patch: EventTrackingPatch = {};
  if (cur.metaPixelId !== committed.metaPixelId) patch.metaPixelId = cur.metaPixelId;
  if (cur.googleAnalyticsId !== committed.googleAnalyticsId) {
    patch.googleAnalyticsId = cur.googleAnalyticsId;
  }
  if (cur.googleAdsId !== committed.googleAdsId) patch.googleAdsId = cur.googleAdsId;
  return patch;
}

export default function AdsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [formData, setFormData] = useState<AdsTrackingData>(emptyAdsForm);
  /** `null` até o primeiro load terminar — evita habilitar Salvar antes de hidratar. */
  const [committedSnapshot, setCommittedSnapshot] = useState<string | null>(null);

  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      router.push("/admin/login");
      return;
    }
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  // Carregar dados do evento e tracking
  useEffect(() => {
    if (!authChecked || !eventId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [eventData, tracking] = await Promise.all([
          organizerService.getEventById(eventId),
          organizerService.getEventTracking(eventId),
        ]);
        setEvent(eventData);
        const initial = trackingToFormData(tracking);
        setFormData(initial);
        setCommittedSnapshot(adsTrackingSnapshot(initial));
      } catch (error: any) {
        console.error("Error loading event:", error);
        const msg =
          error.response?.data?.message || error.message || "Erro ao carregar evento";
        toast.error(msg);
        const fallback = emptyAdsForm();
        setFormData(fallback);
        setCommittedSnapshot(adsTrackingSnapshot(fallback));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authChecked, eventId]);

  const isDirty = useMemo(() => {
    if (committedSnapshot === null) return false;
    return adsTrackingSnapshot(formData) !== committedSnapshot;
  }, [formData, committedSnapshot]);

  const handleInputChange = (field: keyof AdsTrackingData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!eventId || committedSnapshot === null) {
      toast.error("Evento não encontrado");
      return;
    }

    const validationError = validateNonEmptyEventTrackingFields(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const patch = buildTrackingPatch(formData, committedSnapshot);
    if (Object.keys(patch).length === 0) {
      return;
    }

    setSaving(true);
    try {
      const updated = await organizerService.patchEventTracking(eventId, patch);
      const next = trackingToFormData(updated);
      setFormData(next);
      setCommittedSnapshot(adsTrackingSnapshot(next));
      toast.success("Configurações de rastreamento salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving tracking data:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Erro ao salvar configurações de rastreamento";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-2">
        <AdminEventHeader eventId={eventId} eventName={event?.name} eventSlug={event?.slug} />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      <AdminEventHeader
        eventId={eventId}
        eventName={event?.name}
        eventSlug={event?.slug}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-4 lg:px-6 2xl:px-0 py-6 md:py-6">
        <div className="flex flex-col gap-6 md:gap-10">
          {/* Title Section - mobile: 18px title, 14px description; desktop: 28px, 16px */}
          <div className="flex flex-col gap-3 md:gap-4">
            <h1 className="text-gray-12 font-bold font-manrope leading-[1.1] text-[18px] md:text-[28px]">
              Rastreamento e Conversões
            </h1>
            <p className="text-gray-11 font-family-dm-sans leading-[1.3] text-sm md:text-base">
              Configure os IDs de rastreamento para medir o tráfego e as vendas do seu evento
            </p>
          </div>

          {/* Tracking Cards - mobile: stacked, gap-4; desktop: row */}
          <div className="flex flex-col md:flex-row gap-4 w-full">
            {/* Meta - Facebook/Instagram */}
            <div className="flex-1 border border-gray-6 rounded-lg p-3 md:p-4 flex flex-col gap-7 md:gap-8">
              <div className="flex gap-2 md:gap-3 items-center">
                <div className="size-7 md:size-8 flex items-center justify-center shrink-0">
                  <MetaIcon />
                </div>
                <p className="text-gray-12 font-semibold font-family-dm-sans leading-[1.3] text-lg">
                  Meta - Facebook/Instagram
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                  ID do Pixel
                </label>
                <Input
                  type="text"
                  placeholder="Ex: 123456789012345"
                  value={formData.metaPixelId}
                  onChange={(e) => handleInputChange("metaPixelId", e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            {/* Google Analytics 4 */}
            <div className="flex-1 border border-gray-6 rounded-lg p-3 md:p-4 flex flex-col gap-7 md:gap-8">
              <div className="flex gap-2 md:gap-3 items-center">
                <div className="size-7 md:size-8 flex items-center justify-center shrink-0">
                  <GoogleIcon />
                </div>
                <p className="text-gray-12 font-semibold font-family-dm-sans leading-[1.3] text-lg">
                  Google Analytics 4 (GA4)
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                  ID da Métrica (Measurement ID)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: G-ABC123DEF4"
                  value={formData.googleAnalyticsId}
                  onChange={(e) => handleInputChange("googleAnalyticsId", e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            {/* Google Ads */}
            <div className="flex-1 border border-gray-6 rounded-lg p-3 md:p-4 flex flex-col gap-7 md:gap-8">
              <div className="flex gap-2 md:gap-3 items-center">
                <div className="size-7 md:size-8 flex items-center justify-center shrink-0">
                  <GoogleIcon />
                </div>
                <p className="text-gray-12 font-semibold font-family-dm-sans leading-[1.3] text-lg">
                  Google Ads
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3]">
                  ID de Conversão (Tag)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: AW-123456789"
                  value={formData.googleAdsId}
                  onChange={(e) => handleInputChange("googleAdsId", e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
          </div>

          {/* Save Button - mobile: full width 44px; desktop: right-aligned */}
          <div className="w-full flex justify-end md:justify-end">
            <Button
              onClick={handleSave}
              variant="default"
              disabled={saving || !isDirty}
              className="w-full md:w-auto px-10 text-base font-bold font-manrope leading-[1.1] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
