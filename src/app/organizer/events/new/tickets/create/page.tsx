"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService, organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import Image from "next/image";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import type { ModalityTemplate, ModalityGroup } from "@/services/organizer/OrganizerService";

interface Batch {
  id: string;
  quantity: string;
  price: string;
  startType: "date" | "previous";
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}

export default function CreateTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const { isAuthenticated } = useAuth();
  const { formData } = useCreateEvent();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [ticketName, setTicketName] = useState("");
  const [selectedModality, setSelectedModality] = useState<string>("");
  const [distance, setDistance] = useState("");
  const [distanceUnit, setDistanceUnit] = useState("KM");
  const [gender, setGender] = useState<string>("");
  const [hasAgeRestriction, setHasAgeRestriction] = useState(false);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [hasKit, setHasKit] = useState(false);

  // Data
  const [modalityTemplates, setModalityTemplates] = useState<ModalityTemplate[]>([]);
  const [modalityGroups, setModalityGroups] = useState<ModalityGroup[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Batches
  const [batches, setBatches] = useState<Batch[]>([
    { id: "1", quantity: "", price: "", startType: "date" }
  ]);

  // Load form data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("createTicketFormData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.ticketName) setTicketName(parsed.ticketName);
        if (parsed.selectedModality) setSelectedModality(parsed.selectedModality);
        if (parsed.distance) setDistance(parsed.distance);
        if (parsed.distanceUnit) setDistanceUnit(parsed.distanceUnit);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.hasAgeRestriction !== undefined) setHasAgeRestriction(parsed.hasAgeRestriction);
        if (parsed.minAge) setMinAge(parsed.minAge);
        if (parsed.maxAge) setMaxAge(parsed.maxAge);
        if (parsed.hasKit !== undefined) setHasKit(parsed.hasKit);
        if (parsed.batches && Array.isArray(parsed.batches)) setBatches(parsed.batches);
      } catch (e) {
        console.error("Error loading ticket form data from localStorage:", e);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const formDataToSave = {
      ticketName,
      selectedModality,
      distance,
      distanceUnit,
      gender,
      hasAgeRestriction,
      minAge,
      maxAge,
      hasKit,
      batches
    };
    localStorage.setItem("createTicketFormData", JSON.stringify(formDataToSave));
  }, [ticketName, selectedModality, distance, distanceUnit, gender, hasAgeRestriction, minAge, maxAge, hasKit, batches]);

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

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      if (!authChecked) return;

      setLoading(true);
      try {
        // Templates são globais, não dependem do evento
        const templates = await organizerService.getModalityTemplates().catch(() => []);
        setModalityTemplates(templates);

        // Groups dependem do evento, só carrega se houver createdEventId
        if (formData.createdEventId) {
          const groups = await organizerService.getModalityGroups(formData.createdEventId).catch(() => []);
          setModalityGroups(groups);
        }
      } catch (error: any) {
        console.error("Error loading data:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authChecked, formData.createdEventId]);

  const handleBack = () => {
    router.push("/organizer/events/new/tickets");
  };

  const handleAddBatch = () => {
    const newBatch: Batch = {
      id: Date.now().toString(),
      quantity: "",
      price: "",
      startType: "date"
    };
    setBatches([...batches, newBatch]);
  };

  const handleRemoveBatch = (batchId: string) => {
    if (batches.length === 1) {
      toast.error("Pelo menos um lote é obrigatório");
      return;
    }
    setBatches(batches.filter(b => b.id !== batchId));
  };

  const handleBatchChange = (batchId: string, field: keyof Batch, value: any) => {
    setBatches(batches.map(b =>
      b.id === batchId ? { ...b, [field]: value } : b
    ));
  };

  const handleSubmit = async () => {
    if (!ticketName.trim()) {
      toast.error("Nome do ingresso é obrigatório");
      return;
    }

    if (ticketName.length > 25) {
      toast.error("Nome do ingresso deve ter no máximo 25 caracteres");
      return;
    }

    if (!selectedModality) {
      toast.error("Selecione uma modalidade");
      return;
    }

    if (!batches[0]?.quantity || !batches[0]?.price) {
      toast.error("Lote 1 deve ter quantidade e preço preenchidos");
      return;
    }

    setSaving(true);
    try {
      // Aqui você implementaria a lógica de criação do ingresso
      // Por enquanto, apenas redireciona
      toast.success("Ingresso criado com sucesso!");
      // Clear saved form data after successful submission
      localStorage.removeItem("createTicketFormData");
      router.push("/organizer/events/new/tickets");
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      toast.error(error.response?.data?.message || "Erro ao criar ingresso");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-11">Carregando...</div>
      </div>
    );
  }

  const modalityOptions: DropdownOption[] = modalityTemplates.map(template => ({
    id: template.id,
    label: template.label,
    icon: template.icon,
    onClick: () => setSelectedModality(template.id)
  }));

  const genderOptions: DropdownOption[] = [
    { id: "all", label: "Geral", onClick: () => setGender("all") },
    { id: "male", label: "Masculino", onClick: () => setGender("male") },
    { id: "female", label: "Feminino", onClick: () => setGender("female") }
  ];

  const selectedModalityLabel = modalityTemplates.find(t => t.id === selectedModality)?.label || "Selecione";
  const selectedGenderLabel = genderOptions.find(g => g.id === gender)?.label || "Selecione";

  return (
    <div className="bg-gray-2 flex-1 pb-[176px] px-5 md:px-[124px] pt-[52px]">
      <div className="max-w-[1192px] mx-auto flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex gap-3 items-center">
          <button
            onClick={handleBack}
            className="border border-gray-6 rounded-[52px] rotate-180 size-9 flex items-center justify-center hover:bg-gray-3 transition-colors cursor-pointer"
          >
            <ArrowButton isOpen={false} />
          </button>
          <h1 className="text-gray-12 text-[28px] font-bold font-family-dm-sans leading-[1.1]">
            Criação de ingresso
          </h1>
        </div>

        {/* Form Section */}
        <div className="flex flex-col gap-9">
          {/* Nome do ingresso */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Nome do ingresso
            </label>
            <Input
              value={ticketName}
              onChange={(e) => setTicketName(e.target.value)}
              placeholder="Ex: 5K"
              maxLength={25}
              className="h-12"
            />
            <p className="text-gray-11 text-sm font-dm-sans leading-[1.3]">
              Limite de 25 Caracteres
            </p>
          </div>

          <div className="flex gap-4">
            {/* Modalidades */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Modalidades
              </label>
              <Dropdown
                options={modalityOptions}
                trigger={(isOpen) => (
                  <button className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-[250px] hover:bg-gray-3 transition-colors">
                    <span className={`text-base font-dm-sans ${selectedModality ? "text-gray-12" : "text-gray-11"}`}>
                      {selectedModalityLabel}
                    </span>
                    <ArrowButton isOpen={isOpen} />
                  </button>
                )}
                onSelect={(option) => setSelectedModality(option.id || "")}
              />
            </div>

            {/* Distância de prova */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Distância de prova
              </label>
              <div className="border border-gray-6 rounded-lg flex gap-[10px] items-center px-3 py-4 h-12 w-max">
                <div className="flex flex-1 gap-1 items-center min-w-0">
                  <Input
                    type="text"
                    value={distance}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setDistance(value);
                    }}
                    placeholder="10"
                    className="h-auto border-0 p-0 focus-visible:ring-0 focus-visible:border-0 text-base font-dm-sans text-gray-11 placeholder:text-gray-11"
                  />
                </div>
                <div className="relative shrink-0">
                  <Dropdown
                    options={[
                      { id: "KM", label: "KM", onClick: () => setDistanceUnit("KM") },
                      { id: "M", label: "M", onClick: () => setDistanceUnit("M") }
                    ]}
                    trigger={(isOpen) => (
                      <div className="border border-gray-7 rounded-lg flex gap-2 items-center px-3 py-2 cursor-pointer hover:bg-gray-3 transition-colors">
                        <div className="flex gap-1 items-center">
                          <p className="text-gray-11 text-sm font-dm-sans leading-[1.3]">
                            {distanceUnit}
                          </p>
                        </div>
                        <div className="flex items-center justify-center shrink-0">
                          <ArrowButton isOpen={isOpen} />
                        </div>
                      </div>
                    )}
                    onSelect={(option) => setDistanceUnit(option.id || "KM")}
                    position="bottom"
                    align="end"
                    className="right-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Gênero */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Gênero
            </label>
            <Dropdown
              options={genderOptions}
              trigger={(isOpen) => (
                <button className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors">
                  <span className={`text-base font-dm-sans ${gender ? "text-gray-12" : "text-gray-11"}`}>
                    {selectedGenderLabel}
                  </span>
                  <ArrowButton isOpen={isOpen} />
                </button>
              )}
              onSelect={(option) => setGender(option.id || "")}
            />
            <p className="text-gray-11 text-sm font-dm-sans leading-[1.3]">
              Selecione um gênero para restringir este ingresso ou deixe em geral para todos
            </p>
          </div>

          {/* Restrição de idade */}
          <div className="flex flex-col gap-4">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Restrição de idade (opcional)
            </label>
            <div className="flex flex-col gap-2">
              <p className="text-gray-12 text-base font-dm-sans leading-[1.3]">
                Esse evento tem restrição de idade?
              </p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Radio
                    name="ageRestriction"
                    checked={hasAgeRestriction}
                    onChange={() => setHasAgeRestriction(true)}
                  />
                  <span className="text-gray-12 text-base font-dm-sans">Sim</span>
                </div>
                <div className="flex items-center gap-2">
                  <Radio
                    name="ageRestriction"
                    checked={!hasAgeRestriction}
                    onChange={() => setHasAgeRestriction(false)}
                  />
                  <span className="text-gray-12 text-base font-dm-sans">Não</span>
                </div>
              </div>
            </div>
            {hasAgeRestriction && (
              <div className="flex gap-3">
                <div className="flex flex-col gap-2 w-max">
                  <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">Idade mínima</label>
                  <Input
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                    placeholder="Ex: 21 anos"
                    className="h-12"
                  />
                </div>
                <div className="flex flex-col gap-2 w-max">
                  <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">Idade máxima</label>
                  <Input
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    placeholder="Ex: 35 anos"
                    className="h-12"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lotes do ingresso */}
          <div className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-gray-12 text-xl font-bold font-family-dm-sans leading-[1.1]">
                Lotes do ingresso
              </h2>
              <p className="text-gray-11 text-base font-dm-sans leading-[1.3]">
                Defina quantas vagas terá cada lote, quando ele será vendido e o valor. Você pode criar mais de um lote
              </p>
            </div>

            {batches.map((batch, index) => (
              <div key={batch.id} className="flex flex-col gap-4 p-5 bg-gray-2 border border-gray-6 rounded-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-gray-12 text-lg font-bold font-family-dm-sans leading-[1.1]">
                    Lote {index + 1} {index === 0 && "(Obrigatório)"}
                  </h3>
                  {index > 0 && (
                    <button
                      onClick={() => handleRemoveBatch(batch.id)}
                      className="text-red-11 hover:text-red-12 transition-colors"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-12 text-sm font-family-dm-sans">
                      Quantidade de vagas
                    </label>
                    <Input
                      type="number"
                      value={batch.quantity}
                      onChange={(e) => handleBatchChange(batch.id, "quantity", e.target.value)}
                      placeholder="Ex: 500"
                      className="h-12"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-12 text-sm font-family-dm-sans">
                      Preço do ingresso
                    </label>
                    <Input
                      type="text"
                      value={batch.price}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        const formatted = value ? `R$${(parseInt(value) / 100).toFixed(2).replace(".", ",")}` : "";
                        handleBatchChange(batch.id, "price", formatted);
                      }}
                      placeholder="R$00,00"
                      className="h-12"
                    />
                  </div>
                </div>

                {index > 0 && (
                  <>
                    <div className="flex flex-col gap-2">
                      <p className="text-gray-12 text-sm font-family-dm-sans">
                        Como este lote começa a ser vendido?
                      </p>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Radio
                            name={`startType-${batch.id}`}
                            checked={batch.startType === "date"}
                            onChange={() => handleBatchChange(batch.id, "startType", "date")}
                          />
                          <span className="text-gray-12 text-sm font-dm-sans">Por data</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Radio
                            name={`startType-${batch.id}`}
                            checked={batch.startType === "previous"}
                            onChange={() => handleBatchChange(batch.id, "startType", "previous")}
                          />
                          <span className="text-gray-12 text-sm font-dm-sans">Quando esgotar o lote anterior</span>
                        </div>
                      </div>
                    </div>

                    {batch.startType === "date" && (
                      <div className="flex gap-10">
                        <div className="flex flex-col gap-2 w-max">
                          <label className="text-gray-12 text-sm font-family-dm-sans">
                            Data de início
                          </label>
                          <div className="flex gap-2">
                            <DatePicker
                              value={batch.startDate}
                              onChange={(value) => handleBatchChange(batch.id, "startDate", value)}
                              className="w-max"
                            />
                            <TimePicker
                              value={batch.startTime}
                              onChange={(value) => handleBatchChange(batch.id, "startTime", value)}
                              className="w-max"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-gray-12 text-sm font-family-dm-sans">
                            Data de Término
                          </label>
                          <div className="flex gap-2">
                            <DatePicker
                              value={batch.endDate}
                              onChange={(value) => handleBatchChange(batch.id, "endDate", value)}
                              className="w-max"
                            />
                            <TimePicker
                              value={batch.endTime}
                              onChange={(value) => handleBatchChange(batch.id, "endTime", value)}
                              className="w-max"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            <div className="flex justify-center w-full">
              <Button
                variant="outline"
                onClick={handleAddBatch}
                className="border-gray-6 text-gray-12 w-full"
              >
                <Plus className="size-5" />
                Adicionar lote
              </Button>
            </div>
          </div>

          {/* Este produto possui kit? */}
          <div className="flex flex-col gap-4">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Este produto possui kit?
            </label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Radio
                  name="hasKit"
                  checked={hasKit}
                  onChange={() => setHasKit(true)}
                />
                <span className="text-gray-12 text-base font-dm-sans">Sim</span>
              </div>
              <div className="flex items-center gap-2">
                <Radio
                  name="hasKit"
                  checked={!hasKit}
                  onChange={() => setHasKit(false)}
                />
                <span className="text-gray-12 text-base font-dm-sans">Não</span>
              </div>
            </div>
          </div>

          {/* Produtos do Ingresso */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <h2 className="text-gray-12 text-xl font-bold font-family-dm-sans leading-[1.1]">
                  Produtos do Ingresso
                </h2>
                <p className="text-gray-11 text-base font-dm-sans leading-[1.3]">
                  Adicione e gerencie os produtos que ficarão disponíveis neste ingresso
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-gray-6 text-gray-12">
                  Adicionar produtos existentes
                </Button>
                <Button>
                  <Plus className="size-5" />
                  Criar um novo produto
                </Button>
              </div>
            </div>

            {/* Grid de produtos - placeholder */}
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-gray-6 rounded-xl">
                <p className="text-gray-11 text-base font-dm-sans">
                  Nenhum produto adicionado ainda
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="border border-gray-6 rounded-lg p-4">
                    {/* Product card content */}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="text-xl font-bold px-11 h-[52px]"
          >
            {saving ? "Criando..." : "Criar ingresso"}
          </Button>
        </div>
      </div>
    </div>
  );
}
