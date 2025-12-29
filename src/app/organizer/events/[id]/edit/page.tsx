"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Globe,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  Settings,
  Users,
  Package,
  HelpCircle,
  BarChart3,
  Eye,
  Save,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import Image from "next/image";
import { useRef } from "react";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [event, setEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    city: "",
    state: "",
    country: "BR",
    eventDate: "",
    registrationStartDate: "",
    registrationEndDate: "",
    googleMapsLink: "",
    bannerUrl: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    loadEvent();
  }, [eventId, isAuthenticated]);

  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const loadEvent = async () => {
    try {
      setLoading(true);
      const event = await organizerService.getEventById(eventId);
      setEvent(event);

      setFormData({
        name: event.name || "",
        description: event.description || "",
        location: event.location || "",
        city: event.city || "",
        state: event.state || "",
        country: event.country || "BR",
        eventDate: formatDateForInput(event.eventDate),
        registrationStartDate: formatDateForInput(event.registrationStartDate),
        registrationEndDate: formatDateForInput(event.registrationEndDate),
        googleMapsLink: event.googleMapsLink || "",
        bannerUrl: event.bannerUrl || "",
      });

      // Set banner preview if banner exists
      if (event.bannerUrl) {
        setBannerPreview(event.bannerUrl);
      }
    } catch (error: any) {
      console.error("Error loading event:", error);
      toast.error("Erro ao carregar evento");
      router.push("/organizer/events");
    } finally {
      setLoading(false);
    }
  };

  // Upload de banner
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG, GIF ou WebP.");
      return;
    }

    // Validar tamanho (10MB conforme documentação)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo de 10MB.");
      return;
    }

    setUploadingBanner(true);
    try {
      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Fazer upload para o servidor
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
      const response = await fetch(`${apiUrl}/api/v1/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erro ao fazer upload");
      }

      if (result.success && result.imageUrl) {
        // Usar a URL retornada pelo servidor
        setFormData((prev) => ({ ...prev, bannerUrl: apiUrl +result.imageUrl }));
        toast.success("Banner enviado com sucesso!");
      } else {
        throw new Error(result.message || "Erro ao fazer upload");
      }
    } catch (error: any) {
      console.error("Error uploading banner:", error);
      toast.error(error.message || "Erro ao fazer upload do banner");
      setBannerPreview(formData.bannerUrl || "");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome do evento é obrigatório";
    }

    if (!formData.eventDate) {
      newErrors.eventDate = "Data do evento é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    setSaving(true);
    try {
      const updatedEvent = await organizerService.updateEvent(
        eventId,
        formData
      );
      console.log("updatedEvent", updatedEvent);
      setEvent(updatedEvent);
      toast.success("Evento atualizado com sucesso!");
      setFormData({
        name: updatedEvent.name || "",
        description: updatedEvent.description || "",
        location: updatedEvent.location || "",
        city: updatedEvent.city || "",
        state: updatedEvent.state || "",
        country: updatedEvent.country || "BR",
        eventDate: formatDateForInput(updatedEvent.eventDate),
        registrationStartDate: formatDateForInput(
          updatedEvent.registrationStartDate
        ),
        registrationEndDate: formatDateForInput(
          updatedEvent.registrationEndDate
        ),
        googleMapsLink: updatedEvent.googleMapsLink || "",
        bannerUrl: updatedEvent.bannerUrl || "",
      });
    } catch (error: any) {
      console.error("Error updating event:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Erro ao atualizar evento";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (
      !confirm(
        "Tem certeza que deseja publicar este evento? Após publicar, algumas alterações podem ser limitadas."
      )
    ) {
      return;
    }

    try {
      await organizerService.publishEvent(eventId);
      toast.success("Evento publicado com sucesso!");
    } catch (error: any) {
      console.error("Error publishing event:", error);
      toast.error(error.response?.data?.message || "Erro ao publicar evento");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-gray-11">Carregando evento...</div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const navigationItems = [
    {
      label: "Informações Básicas",
      icon: Settings,
      href: `/organizer/events/${eventId}/edit`,
      active: true,
    },
    {
      label: "Tópicos",
      icon: FileText,
      href: `/organizer/events/${eventId}/topics`,
    },
    {
      label: "Modalidades",
      icon: Users,
      href: `/organizer/events/${eventId}/modalities`,
    },
    {
      label: "Kits",
      icon: Package,
      href: `/organizer/events/${eventId}/kits`,
    },
    {
      label: "Perguntas",
      icon: HelpCircle,
      href: `/organizer/events/${eventId}/questions`,
    },
    {
      label: "Inscrições",
      icon: Users,
      href: `/organizer/events/${eventId}/registrations`,
    },
    {
      label: "Estatísticas",
      icon: BarChart3,
      href: `/organizer/events/${eventId}/stats`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-2 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/organizer/events"
          className="inline-flex items-center text-gray-11 hover:text-gray-12 mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Voltar para Eventos
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-12 mb-2">
                {event.name}
              </h1>
              <p className="text-gray-11">
                Status:{" "}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    event.status === "PUBLISHED"
                      ? "bg-green-10/20 text-green-11"
                      : event.status === "DRAFT"
                      ? "bg-yellow-10/20 text-yellow-11"
                      : "bg-gray-10/20 text-gray-11"
                  }`}
                >
                  {event.status === "PUBLISHED"
                    ? "Publicado"
                    : event.status === "DRAFT"
                    ? "Rascunho"
                    : event.status}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              {event.status === "DRAFT" && (
                <Button onClick={handlePublish}>Publicar Evento</Button>
              )}
              <Link href={`/events/${eventId}`} target="_blank">
                <Button
                  variant="outline"
                  className="text-gray-12 border-gray-6"
                >
                  Visualizar
                </Button>
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-gray-6 pb-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-primary-10/20 text-primary-11"
                      : "text-gray-11 hover:text-gray-12 hover:bg-gray-4"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-1 rounded-lg border border-gray-6 p-8">
          <h2 className="text-xl font-bold text-gray-12 mb-6">
            Informações Básicas
          </h2>

          <form className="space-y-6">
            {/* Nome do Evento */}
            <div>
              <label className="block text-sm font-medium text-gray-12 mb-2">
                Nome do Evento *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Maratona de São Paulo 2025"
                  className={`pl-10 ${errors.name ? "border-red-10" : ""}`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-10">{errors.name}</p>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-12 mb-2">
                Descrição
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Descreva seu evento..."
                rows={4}
                className="w-full rounded-lg border border-gray-6 bg-transparent px-3 py-2 text-sm text-gray-12 placeholder:text-gray-11 focus:outline-none focus:ring-2 focus:ring-primary-11/50 focus:border-primary-11"
              />
            </div>

            {/* Localização */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-12 mb-2">
                  Local
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                  <Input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Ex: Parque Ibirapuera"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-12 mb-2">
                  Cidade
                </label>
                <Input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="São Paulo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-12 mb-2">
                  Estado
                </label>
                <Input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>

            {/* País */}
            <div>
              <label className="block text-sm font-medium text-gray-12 mb-2">
                País
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                <Input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="BR"
                  maxLength={2}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-12 mb-2">
                  Data do Evento *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                  <Input
                    type="datetime-local"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleInputChange}
                    className={`pl-10 ${
                      errors.eventDate ? "border-red-10" : ""
                    }`}
                  />
                </div>
                {errors.eventDate && (
                  <p className="mt-1 text-sm text-red-10">{errors.eventDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-12 mb-2">
                  Início das Inscrições
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                  <Input
                    type="datetime-local"
                    name="registrationStartDate"
                    value={formData.registrationStartDate}
                    onChange={handleInputChange}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-12 mb-2">
                  Fim das Inscrições
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                  <Input
                    type="datetime-local"
                    name="registrationEndDate"
                    value={formData.registrationEndDate}
                    onChange={handleInputChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Google Maps Link */}
            <div>
              <label className="block text-sm font-medium text-gray-12 mb-2">
                Link do Google Maps
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                <Input
                  type="url"
                  name="googleMapsLink"
                  value={formData.googleMapsLink}
                  onChange={handleInputChange}
                  placeholder="https://maps.google.com/..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Banner Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-12 mb-2">
                Banner do Evento
              </label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="text-gray-12 border-gray-6"
                  >
                    {uploadingBanner ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="size-4 mr-2" />
                        {formData.bannerUrl
                          ? "Alterar Banner"
                          : "Upload do Banner"}
                      </>
                    )}
                  </Button>
                  {formData.bannerUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, bannerUrl: "" }));
                        setBannerPreview("");
                        if (bannerInputRef.current) {
                          bannerInputRef.current.value = "";
                        }
                      }}
                      className="text-red-10 hover:text-red-11"
                    >
                      <X className="size-4 mr-2" />
                      Remover
                    </Button>
                  )}
                </div>
                {bannerPreview && (
                  <div className="border border-gray-6 rounded-lg p-4 bg-gray-3">
                    <p className="text-sm text-gray-11 mb-2">
                      Preview do Banner:
                    </p>
                    <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-2">
                      <Image
                        src={bannerPreview}
                        alt="Preview do banner"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                  <Input
                    type="url"
                    name="bannerUrl"
                    value={formData.bannerUrl}
                    onChange={handleInputChange}
                    placeholder="URL do banner (preenchida automaticamente após upload)"
                    className="pl-10"
                    disabled={uploadingBanner}
                  />
                </div>
                <p className="text-xs text-gray-10">
                  Faça upload de uma imagem ou cole a URL diretamente. Formatos
                  aceitos: JPG, PNG, GIF, WebP. Máximo: 10MB.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
