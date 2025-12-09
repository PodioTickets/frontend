"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  Save,
  User,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function OrganizerSettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizer, setOrganizer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    loadOrganizer();
  }, [isAuthenticated]);

  const loadOrganizer = async () => {
    try {
      setLoading(true);
      const org = await organizerService.getOrganizer();
      setOrganizer(org);
      setFormData({
        name: org.name || "",
        email: org.email || "",
        phone: org.phone || "",
        description: org.description || "",
      });
    } catch (error: any) {
      console.error("Error loading organizer:", error);
      if (error.response?.status === 404) {
        router.push("/organizer/create");
        return;
      }
      toast.error("Erro ao carregar dados do organizador");
    } finally {
      setLoading(false);
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
      newErrors.name = "Nome é obrigatório";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Telefone é obrigatório";
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

    setSaving(true);
    try {
      await organizerService.updateOrganizer(organizer.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone.replace(/\D/g, ""),
        description: formData.description || undefined,
      });

      toast.success("Configurações atualizadas com sucesso!");
      loadOrganizer();
    } catch (error: any) {
      console.error("Error updating organizer:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Erro ao atualizar configurações";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  if (!organizer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-2 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/organizer"
          className="inline-flex items-center text-gray-11 hover:text-gray-12 mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Voltar ao Dashboard
        </Link>

        <div className="bg-gray-1 rounded-lg border border-gray-6 p-8">
          <h1 className="text-3xl font-bold text-gray-12 mb-2">
            Configurações do Organizador
          </h1>
          <p className="text-gray-11 mb-8">
            Atualize as informações do seu perfil de organizador
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-12 mb-2">
                Nome do Organizador *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Maratona São Paulo"
                  className={`pl-10 ${errors.name ? "border-red-10" : ""}`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-10">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-12 mb-2">
                Email de Contato *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contato@organizador.com"
                  className={`pl-10 ${errors.email ? "border-red-10" : ""}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-10">{errors.email}</p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-12 mb-2">
                Telefone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                  className={`pl-10 ${errors.phone ? "border-red-10" : ""}`}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-10">{errors.phone}</p>
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
                placeholder="Descreva seu organizador..."
                rows={4}
                className="w-full rounded-lg border border-gray-6 bg-transparent px-3 py-2 text-sm text-gray-12 placeholder:text-gray-11 focus:outline-none focus:ring-2 focus:ring-primary-11/50 focus:border-primary-11"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving} className="flex-1">
                <Save className="size-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Link href="/organizer">
                <Button type="button" variant="outline">
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

