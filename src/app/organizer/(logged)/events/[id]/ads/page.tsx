"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { EventPageHeader } from "@/components/Organizer/EventPageHeader";
import { EventMobileHeader } from "@/components/Organizer/EventMobileHeader";
import { Loading } from "@/components/Loading";
import toast from "react-hot-toast";
import { GoogleIcon } from "@/components/Icons/GoogleIcon";
import { MetaIcon } from "@/components/Icons/Organizer/MetaIcon";
import { ArrowButton } from "@/components/ArrowButton";

interface AdsTrackingData {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
}

export default function AdsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [formData, setFormData] = useState<AdsTrackingData>({
    metaPixelId: "",
    googleAnalyticsId: "",
    googleAdsId: "",
  });

  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      router.push("/");
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
        const eventData = await organizerService.getEventById(eventId);
        setEvent(eventData);

        // TODO: Carregar dados de tracking da API quando disponível
        // Por enquanto, usando dados vazios
        // const trackingData = await organizerService.getEventTracking(eventId);
        // setFormData(trackingData);
      } catch (error: any) {
        console.error("Error loading event:", error);
        toast.error("Erro ao carregar evento");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authChecked, eventId]);

  const handleInputChange = (field: keyof AdsTrackingData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!eventId) {
      toast.error("Evento não encontrado");
      return;
    }

    setSaving(true);
    try {
      // TODO: Implementar API call quando disponível
      // await organizerService.updateEventTracking(eventId, formData);

      // Simulação de sucesso
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Configurações de rastreamento salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving tracking data:", error);
      toast.error("Erro ao salvar configurações de rastreamento");
    } finally {
      setSaving(false);
    }
  };

  const eventTabs = [
    { label: "Dashboard", href: `/organizer/events/${eventId}/dashboard` },
    { label: "Editar", href: `/organizer/events/${eventId}/edit` },
    { label: "Inscrições", href: `/organizer/events/${eventId}/registrations` },
    { label: "Financeiro", href: `/organizer/events/${eventId}/financial` },
    { label: "Desconto", href: `/organizer/events/${eventId}/discount/cupom` },
    { label: "Ads", href: `/organizer/events/${eventId}/ads` },
  ];

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-2">
        <div className="hidden md:block">
          <EventPageHeader eventName={event?.name} />
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2">
      {/* Desktop header */}
      <div className="hidden md:block">
        <EventPageHeader eventName={event?.name} />
      </div>

      <EventMobileHeader
        eventId={eventId}
        eventName={event?.name}
        activeHref={`/organizer/events/${eventId}/ads`}
        backHref={`/organizer/events/${eventId}/dashboard`}
        backLinkClassName="rotate-180"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-4 lg:px-0 py-6 md:py-6">
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
              disabled={saving}
              className="w-full md:w-auto h-11 md:h-auto text-base font-bold font-manrope leading-[1.1] px-6 py-5 md:px-8"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
