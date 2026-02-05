"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService, organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/cache/QueryClient";
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
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { TrashIcon } from "@/components/Icons/TrashIcon";
import type { ModalityTemplate, ModalityGroup } from "@/services/organizer/OrganizerService";
import { useCreateProductModal, useAddExistingProductsModal } from "@/stores/modalStore";

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

export default function EditTicketPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.ticketId as string;
  const { formData } = useCreateEvent();
  const queryClient = useQueryClient();
  const { openCreateProductModal, setOnModalSave: setOnCreateProductSave } = useCreateProductModal();
  const { openAddExistingProductsModal, setOnModalSave: setOnAddProductsSave } = useAddExistingProductsModal();

  // Use refs to store stable references to the setter functions
  const setOnCreateProductSaveRef = useRef(setOnCreateProductSave);
  const setOnAddProductsSaveRef = useRef(setOnAddProductsSave);

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticketLoaded, setTicketLoaded] = useState(false);

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
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Data
  const [modalityTemplates, setModalityTemplates] = useState<ModalityTemplate[]>([]);
  const [ticketCategories, setTicketCategories] = useState<ModalityGroup[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const productsRef = useRef(products);
  const isProcessingRef = useRef(false);

  // Keep productsRef in sync with products state
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const [batches, setBatches] = useState<Batch[]>([
    { id: "1", quantity: "", price: "", startType: "date" }
  ]);

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

  // Carregar dados (templates e categorias)
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
          const groups = await organizerService.getTicketCategories(formData.createdEventId).catch(() => []);
          setTicketCategories(Array.isArray(groups) ? groups : []);
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

  // Load ticket data
  useEffect(() => {
    const loadTicket = async () => {
      if (!ticketId || !formData.createdEventId || !authChecked || ticketLoaded) return;

      setLoading(true);
      try {
        console.log("Loading ticket with ID:", ticketId);
        const { ticket } = await organizerService.getTicketById(ticketId);
        console.log("Ticket loaded from API:", ticket);

        if (!ticket) {
          console.error("Ticket is null or undefined");
          toast.error("Ingresso não encontrado");
          router.push("/organizer/events/new/tickets");
          return;
        }

        // Preencher campos do formulário
        if (ticket.name) setTicketName(ticket.name);

        // Encontrar modalidade
        if (modalityTemplates.length > 0) {
          const modalityTemplate = modalityTemplates.find(t => t.label === ticket.modality);
          if (modalityTemplate) {
            setSelectedModality(modalityTemplate.id);
          }
        }

        if (ticket.distance !== undefined && ticket.distance !== null) {
          setDistance(ticket.distance.toString());
        }
        if (ticket.distanceUnit) {
          setDistanceUnit(ticket.distanceUnit);
        }
        if (ticket.gender) {
          setGender(ticket.gender);
        }

        if (ticket.ageLimit) {
          setHasAgeRestriction(true);
          if (ticket.ageLimit.min !== undefined && ticket.ageLimit.min !== null) {
            setMinAge(ticket.ageLimit.min.toString());
          }
          if (ticket.ageLimit.max !== undefined && ticket.ageLimit.max !== null) {
            setMaxAge(ticket.ageLimit.max.toString());
          }
        }

        if (ticket.batches && Array.isArray(ticket.batches) && ticket.batches.length > 0) {
          const formattedBatches = ticket.batches.map((b: any, idx: number) => ({
            id: b.id || (idx + 1).toString(),
            quantity: b.quantity?.toString() || "",
            price: typeof b.price === 'number'
              ? `R$${b.price.toFixed(2).replace('.', ',')}`
              : (b.price?.toString() || ""),
            startType: "date" as const,
            startDate: b.startDate || undefined,
            startTime: b.startTime || undefined,
            endDate: b.endDate || undefined,
            endTime: b.endTime || undefined,
          }));
          setBatches(formattedBatches);
        }

        if (ticket.categoryId) {
          setSelectedGroupId(ticket.categoryId);
        }
        if (ticket.hasKit !== undefined) {
          setHasKit(ticket.hasKit);
        }

        // Carregar produtos vinculados
        if (ticket.productIds && Array.isArray(ticket.productIds) && ticket.productIds.length > 0 && formData.createdEventId) {
          try {
            const productsResponse = await organizerService.getProducts(formData.createdEventId);
            if (productsResponse.products && Array.isArray(productsResponse.products)) {
              const ticketProducts = productsResponse.products.filter((p: any) =>
                ticket.productIds.includes(p.id)
              );
              setProducts(ticketProducts);
            }
          } catch (error) {
            console.error("Error loading products:", error);
          }
        }

        setTicketLoaded(true);
        setLoading(false);
        console.log("Ticket data loaded successfully");
      } catch (error: any) {
        console.error("Error loading ticket:", error);
        console.error("Error details:", error.response?.data || error.message);
        toast.error(error.response?.data?.message || "Erro ao carregar ingresso");
        setLoading(false);
        router.push("/organizer/events/new/tickets");
      }
    };

    if (authChecked && formData.createdEventId && modalityTemplates.length > 0) {
      loadTicket();
    }
  }, [ticketId, formData.createdEventId, authChecked, modalityTemplates, ticketLoaded, router]);

  // Atualizar modalidade quando templates forem carregados
  useEffect(() => {
    if (ticketLoaded && modalityTemplates.length > 0 && !selectedModality && ticketId) {
      organizerService.getTicketById(ticketId).then((ticket) => {
        const modalityTemplate = modalityTemplates.find(t => t.label === ticket.modality);
        if (modalityTemplate) {
          setSelectedModality(modalityTemplate.id);
        }
      }).catch(console.error);
    }
  }, [modalityTemplates, ticketLoaded, selectedModality, ticketId]);

  // Setup modal callbacks
  useEffect(() => {
    const createProductCallback = async (data: any) => {
      console.log("createProductCallback called with:", data);
      try {
        if (data?.product) {
          const { product } = data;
          setProducts((prevProducts) => {
            const existingIndex = prevProducts.findIndex((p: any) => p.id === product.id);
            if (existingIndex >= 0) {
              const updated = [...prevProducts];
              updated[existingIndex] = product;
              return updated;
            } else {
              return [...prevProducts, product];
            }
          });
        }
      } catch (error) {
        console.error("Error in createProductCallback:", error);
      }
    };

    const addProductsCallback = async (data: any) => {
      console.log("addProductsCallback called with:", data);

      if (isProcessingRef.current) {
        console.warn("addProductsCallback: Already processing, ignoring duplicate call");
        return;
      }

      isProcessingRef.current = true;

      try {
        if (data?.products && Array.isArray(data.products) && data.products.length > 0) {
          const currentProducts = productsRef.current;
          const existingIds = new Set(currentProducts.map((p: any) => p.id));
          const newProducts = data.products.filter((p: any) => p && p.id && !existingIds.has(p.id));

          if (newProducts.length > 0) {
            setProducts((prevProducts) => {
              const prevIds = new Set(prevProducts.map((p: any) => p.id));
              const finalNewProducts = newProducts.filter((p: any) => !prevIds.has(p.id));
              if (finalNewProducts.length > 0) {
                return [...prevProducts, ...finalNewProducts];
              }
              return prevProducts;
            });
            toast.success(`${newProducts.length} produto(s) adicionado(s) ao ingresso`);
          } else {
            toast.error("Produto(s) já adicionado(s) ao ingresso");
          }
        } else {
          toast.error("Erro: formato de dados inválido");
          throw new Error("Invalid data format");
        }
      } catch (error) {
        console.error("Error in addProductsCallback:", error);
        throw error;
      } finally {
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 100);
      }
    };

    setOnCreateProductSaveRef.current(createProductCallback);
    setOnAddProductsSaveRef.current(addProductsCallback);

    return () => {
      setOnCreateProductSaveRef.current(undefined);
      setOnAddProductsSaveRef.current(undefined);
    };
  }, []);

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

    if (!formData.createdEventId) {
      toast.error("Evento não encontrado");
      return;
    }

    setSaving(true);
    try {
      const modalityLabel = modalityTemplates.find(t => t.id === selectedModality)?.label || selectedModality;

      const ticketData = {
        name: ticketName.trim(),
        categoryId: selectedGroupId || undefined,
        modality: modalityLabel,
        distance: distance || undefined,
        distanceUnit: distanceUnit || "KM",
        gender: gender || undefined,
        ageLimit: hasAgeRestriction && (minAge || maxAge) ? {
          min: minAge ? parseInt(minAge) : undefined,
          max: maxAge ? parseInt(maxAge) : undefined,
        } : undefined,
        hasKit: hasKit || false,
        kitId: hasKit ? undefined : undefined,
        productIds: products.map((p: any) => p.id),
        batches: batches.map(b => ({
          quantity: parseInt(b.quantity) || 0,
          price: parseFloat(b.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
          startDate: b.startDate || undefined,
          endDate: b.endDate || undefined,
        })),
      };

      // Atualizar ticket existente
      await organizerService.updateTicket(formData.createdEventId, ticketId, ticketData);
      toast.success("Ingresso atualizado com sucesso!");

      // Invalidar e refetch queries
      await queryClient.invalidateQueries({
        queryKey: queryKeys.events.tickets(formData.createdEventId),
      });

      await queryClient.refetchQueries({
        queryKey: queryKeys.events.tickets(formData.createdEventId),
      });

      window.dispatchEvent(new CustomEvent("ticketCreated"));

      router.push("/organizer/events/new/tickets");
    } catch (error: any) {
      console.error("Error saving ticket:", error);
      toast.error(error.response?.data?.message || "Erro ao salvar ingresso");
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

  const groupOptions: DropdownOption[] = [
    { id: "", label: "Sem categoria", onClick: () => setSelectedGroupId("") },
    ...(Array.isArray(ticketCategories) ? ticketCategories.map(group => ({
      id: group.id,
      label: group.name,
      onClick: () => setSelectedGroupId(group.id)
    })) : [])
  ];

  const selectedGroupLabel = Array.isArray(ticketCategories)
    ? (ticketCategories.find(g => g.id === selectedGroupId)?.name || "Sem categoria")
    : "Sem categoria";

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
            Edição de ingresso
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

          {/* Categoria */}
          {Array.isArray(ticketCategories) && ticketCategories.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
                Categoria (opcional)
              </label>
              <Dropdown
                options={groupOptions}
                trigger={(isOpen) => (
                  <button className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors">
                    <span className={`text-base font-dm-sans ${selectedGroupId ? "text-gray-12" : "text-gray-11"}`}>
                      {selectedGroupId ? selectedGroupLabel : "Sem categoria"}
                    </span>
                    <ArrowButton isOpen={isOpen} />
                  </button>
                )}
                onSelect={(option) => setSelectedGroupId(option.id || "")}
              />
            </div>
          )}

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
                    className="h-auto border-0 p-0 focus-visible:ring-0 focus-visible:border-0 shadow-none text-base font-dm-sans text-gray-11 placeholder:text-gray-11 focus:outline-none focus:border-0 rounded-none"
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
          <div className="flex flex-col gap-2 ">
            <label className="text-gray-12 text-base font-family-dm-sans leading-[1.1]">
              Gênero
            </label>
            <p className="text-gray-11 text-sm font-dm-sans leading-[1.3]">
              Selecione um gênero para restringir este ingresso ou deixe em geral para todos
            </p>
            <Dropdown
              options={genderOptions}
              trigger={(isOpen) => (
                <button className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-[250px] hover:bg-gray-3 transition-colors">
                  <span className={`text-base font-dm-sans ${gender ? "text-gray-12" : "text-gray-11"}`}>
                    {selectedGenderLabel}
                  </span>
                  <ArrowButton isOpen={isOpen} />
                </button>
              )}
              onSelect={(option) => setGender(option.id || "")}
            />

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
              <h2 className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.1]">
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

          {hasKit && (
            <div className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <h2 className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.1]">
                    Produtos do Ingresso
                  </h2>
                  <p className="text-gray-11 text-base font-dm-sans leading-[1.3]">
                    Adicione e gerencie os produtos que ficarão disponíveis neste ingresso
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-gray-6 text-gray-12"
                    onClick={() => {
                      if (!formData.createdEventId) {
                        toast.error("Evento não encontrado");
                        return;
                      }
                      openAddExistingProductsModal({
                        eventId: formData.createdEventId,
                      });
                    }}
                  >
                    Adicionar produtos existentes
                  </Button>
                  <Button
                    onClick={() => {
                      if (!formData.createdEventId) {
                        toast.error("Evento não encontrado");
                        return;
                      }
                      openCreateProductModal({
                        eventId: formData.createdEventId,
                      });
                    }}
                  >
                    <Plus className="size-5" />
                    Criar um novo produto
                  </Button>
                </div>
              </div>

              {/* Grid de produtos */}
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-gray-6 rounded-xl">
                  <p className="text-gray-11 text-base font-dm-sans">
                    Nenhum produto adicionado ainda
                  </p>
                </div>
              ) : (
                <div className="bg-gray-2 border border-gray-6 rounded-xl p-5">
                  <div className="flex flex-wrap gap-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col flex-1 min-w-[287px] max-w-[368px]"
                      >
                        {/* Header com imagem e informações */}
                        <div className="border-b border-gray-6 flex gap-3 items-center p-4">
                          <div className="relative size-[100px] rounded border border-gray-6 overflow-hidden bg-gray-3 shrink-0">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-4" />
                            )}
                          </div>
                          <div className="flex flex-col justify-between h-full py-2 gap-2 flex-1 min-w-0">
                            <h3 className="text-gray-12 text-base font-semibold font-dm-sans leading-[1.1]">
                              {product.name}
                            </h3>
                            <p className="text-gray-11 text-sm font-semibold font-dm-sans leading-[1.3]">
                              {product.isIncludedInTicket
                                ? "Valor incluso no ingresso"
                                : `R$ ${product.basePrice || "0,00"}`}
                            </p>
                          </div>
                        </div>

                        {/* Footer com botões de ação */}
                        <div className="flex flex-col items-end justify-center p-4">
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => {
                                if (!formData.createdEventId) {
                                  toast.error("Evento não encontrado");
                                  return;
                                }
                                openCreateProductModal({
                                  eventId: formData.createdEventId,
                                  productId: product.id,
                                  product: product,
                                });
                              }}
                              className="bg-gray-2 border border-gray-6 rounded-lg size-9 flex items-center justify-center hover:bg-gray-3 transition-colors"
                            >
                              <PencilIcon className="size-5 text-gray-11" />
                            </button>
                            <button
                              onClick={() => {
                                setProducts(products.filter((p) => p.id !== product.id));
                                toast.success("Produto removido do ingresso");
                              }}
                              className="bg-red-2 border border-red-6 rounded-lg size-9 flex items-center justify-center hover:bg-red-3 transition-colors"
                            >
                              <TrashIcon className="size-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="text-xl font-bold px-11 h-[52px]"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
