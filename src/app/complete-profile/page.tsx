"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import toast from "react-hot-toast";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { DateOfBirthPicker } from "@/components/DateOfBirthPicker";
import { CPFIcon } from "@/components/Icons/CPFIcon";
import { Phone } from "lucide-react";
import { isProfileComplete } from "@/utils/checkProfileComplete";
import { Loading } from "@/components/Loading";

const GENDER_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Feminino", label: "Feminino" },
  { value: "Outro", label: "Outro" },
  { value: "Prefiro não dizer", label: "Prefiro não dizer" },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, refetchUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const genderDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize formData with user data
  const initialFormData = useMemo(
    () => ({
      documentNumber: (user as any)?.documentNumber ?? "",
      dateOfBirth: (user as any)?.dateOfBirth ?? "",
      phone: (user as any)?.phone ?? "",
      gender: (user as any)?.gender ?? "",
    }),
    [user]
  );

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update formData when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        documentNumber: (user as any)?.documentNumber ?? "",
        dateOfBirth: (user as any)?.dateOfBirth ?? "",
        phone: (user as any)?.phone ?? "",
        gender: (user as any)?.gender ?? "",
      });
    }
  }, [user]);

  // Close gender dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        genderDropdownRef.current &&
        !genderDropdownRef.current.contains(event.target as Node)
      ) {
        setShowGenderDropdown(false);
      }
    };

    if (showGenderDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showGenderDropdown]);

  // Redirect if profile is already complete
  useEffect(() => {
    if (user && isProfileComplete(user)) {
      const redirectPath =
        typeof window !== "undefined"
          ? sessionStorage.getItem("redirectAfterLogin") || "/"
          : "/";
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("redirectAfterLogin");
      }
      router.push(redirectPath);
    }
  }, [user, router]);

  // Show loading if user is not loaded yet
  if (!user) {
    return <Loading />;
  }

  // Mask functions
  const maskCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  const maskPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
    }
    return value;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "documentNumber") {
      processedValue = maskCPF(value);
    } else if (name === "phone") {
      processedValue = maskPhone(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate CPF
    const cpfNumbers = formData.documentNumber.replace(/\D/g, "");
    if (!cpfNumbers || cpfNumbers.length !== 11) {
      newErrors.documentNumber = "CPF deve ter 11 dígitos";
    }

    // Validate date of birth
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Data de nascimento é obrigatória";
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        newErrors.dateOfBirth = "Data de nascimento não pode ser no futuro";
      } else {
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        const actualAge =
          monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        if (actualAge < 18) {
          newErrors.dateOfBirth = "Você deve ter pelo menos 18 anos";
        }
      }
    }

    // Validate phone
    const phoneNumbers = formData.phone.replace(/\D/g, "");
    if (!phoneNumbers || phoneNumbers.length !== 11) {
      newErrors.phone = "Telefone deve ter 11 dígitos";
    }

    // Validate gender
    if (!formData.gender) {
      newErrors.gender = "Gênero é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, preencha todos os campos corretamente");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare data for update
      const updateData: any = {
        documentNumber: formData.documentNumber.replace(/\D/g, ""),
        dateOfBirth: formData.dateOfBirth,
        phone: formData.phone.replace(/\D/g, ""),
        gender: formData.gender,
      };

      // Normalize gender value
      const genderLower = formData.gender.toLowerCase();
      if (genderLower === "masculino") {
        updateData.gender = "masculino";
      } else if (genderLower === "feminino") {
        updateData.gender = "feminino";
      } else if (genderLower === "outro") {
        updateData.gender = "outro";
      } else if (
        genderLower === "prefiro não dizer" ||
        genderLower === "prefiro-nao-dizer"
      ) {
        updateData.gender = "prefiro-nao-dizer";
      }

      await userService.updateUser(user.id, updateData);
      await refetchUser();

      toast.success("Cadastro finalizado com sucesso!");

      // Redirect to saved path or home
      const redirectPath =
        typeof window !== "undefined"
          ? sessionStorage.getItem("redirectAfterLogin") || "/"
          : "/";
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("redirectAfterLogin");
      }

      setTimeout(() => {
        router.push(redirectPath);
      }, 500);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(
        error?.message || "Erro ao finalizar cadastro. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-2 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[500px]">
        <div className="rounded-xl bg-gray-1 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-gray-12 font-manrope mb-2">
              Finalizar cadastro
            </h1>
            <p className="text-sm text-gray-11 font-dm-sans">
              Preencha os dados obrigatórios para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date of Birth */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-12">
                Data de nascimento *
              </label>
              <DateOfBirthPicker
                value={formData.dateOfBirth}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, dateOfBirth: value }))
                }
                className={errors.dateOfBirth ? "border-red-9" : ""}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-red-11">{errors.dateOfBirth}</p>
              )}
            </div>

            {/* CPF */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-12">CPF *</label>
              <div className="relative">
                <Input
                  name="documentNumber"
                  value={formData.documentNumber}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  className={`pl-10 ${errors.documentNumber ? "border-red-9" : ""}`}
                  maxLength={14}
                />
                <CPFIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
              </div>
              {errors.documentNumber && (
                <p className="text-xs text-red-11">{errors.documentNumber}</p>
              )}
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-12">
                Telefone *
              </label>
              <div className="relative">
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                  className={`pl-10 ${errors.phone ? "border-red-9" : ""}`}
                  maxLength={15}
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-11">{errors.phone}</p>
              )}
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-12">
                Gênero *
              </label>
              <div className="relative" ref={genderDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowGenderDropdown(!showGenderDropdown)}
                  className={`w-full px-4 py-3 rounded-lg border bg-gray-2 text-gray-12 text-left flex items-center justify-between ${
                    errors.gender ? "border-red-9" : "border-gray-6"
                  }`}
                >
                  <span
                    className={
                      formData.gender ? "text-gray-12" : "text-gray-11"
                    }
                  >
                    {formData.gender || "Selecione o gênero"}
                  </span>
                  <svg
                    className={`size-5 text-gray-11 transition-transform ${
                      showGenderDropdown ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {showGenderDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-1 border border-gray-6 rounded-lg shadow-lg">
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            gender: option.value,
                          }));
                          setShowGenderDropdown(false);
                          if (errors.gender) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.gender;
                              return newErrors;
                            });
                          }
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-3 transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.gender && (
                <p className="text-xs text-red-11">{errors.gender}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="default"
              className="w-full h-11 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-base font-manrope mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Finalizar cadastro"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
