"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CreateEventPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
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

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

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
    } else {
      const eventDate = new Date(formData.eventDate);
      if (eventDate < new Date()) {
        newErrors.eventDate = "Data do evento deve ser futura";
      }
    }

    if (formData.registrationStartDate && formData.registrationEndDate) {
      const startDate = new Date(formData.registrationStartDate);
      const endDate = new Date(formData.registrationEndDate);
      const eventDate = new Date(formData.eventDate);

      if (startDate >= endDate) {
        newErrors.registrationEndDate =
          "Data de fim deve ser após data de início";
      }

      if (endDate >= eventDate) {
        newErrors.registrationEndDate =
          "Data de fim deve ser antes da data do evento";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    setLoading(true);
    try {
      const event = await organizerService.createEvent(formData);
      console.log("event", event);
      toast.success("Evento criado com sucesso!");
      router.push(`/organizer/events/${event.id}/edit`);
    } catch (error: any) {
      console.error("Error creating event:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Erro ao criar evento";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-2 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/organizer/events"
          className="inline-flex items-center text-gray-11 hover:text-gray-12 mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Voltar para Eventos
        </Link>

        <div className="bg-gray-1 rounded-lg border border-gray-6 p-8">
          <h1 className="text-3xl font-bold text-gray-12 mb-2">
            Criar Novo Evento
          </h1>
          <p className="text-gray-11 mb-8">
            Preencha os dados básicos do evento. Você poderá adicionar
            modalidades, kits e perguntas depois.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                    className={`pl-10 ${
                      errors.registrationEndDate ? "border-red-10" : ""
                    }`}
                  />
                </div>
                {errors.registrationEndDate && (
                  <p className="mt-1 text-sm text-red-10">
                    {errors.registrationEndDate}
                  </p>
                )}
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

            {/* Banner URL */}
            <div>
              <label className="block text-sm font-medium text-gray-12 mb-2">
                URL do Banner
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                <Input
                  type="url"
                  name="bannerUrl"
                  value={formData.bannerUrl}
                  onChange={handleInputChange}
                  placeholder="https://exemplo.com/banner.jpg"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Criando..." : "Criar Evento"}
              </Button>
              <Link href="/organizer/events">
                <Button
                  type="button"
                  variant="outline"
                  className="text-gray-12"
                >
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
