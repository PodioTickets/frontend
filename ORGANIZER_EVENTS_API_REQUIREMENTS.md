# 📊 Requisitos de API - Páginas do Organizador

## 📋 Índice

1. [Dashboard](#dashboard)
2. [Financeiro](#financeiro)
3. [Inscrições (Registrations)](#inscrições-registrations)
4. [Considerações de Performance](#considerações-de-performance)
5. [Segurança](#segurança)
6. [Estrutura de Resposta](#estrutura-de-resposta)

---

## 🎯 Dashboard

**Endpoint:** `GET /api/v1/events/:eventId/dashboard`

### Autenticação
- ✅ Requerida (JWT Token)
- ✅ Verificar se usuário é membro da organização do evento (OWNER ou EMPLOYEE)

### Query Parameters

```typescript
{
  period?: "geral" | "24h" | "7d" | "15d" | "1m" | "2m";  // Filtro de período
  ticketIds?: string[];  // IDs dos ingressos para filtrar (opcional, array)
  page?: number;  // Para paginação de rankings (opcional, default: 1)
  limit?: number;  // Limite de itens por página (opcional, default: 10)
}
```

### Resposta Esperada

```typescript
{
  message: "Dashboard data fetched successfully",
  data: {
    // Métricas principais
    metrics: {
      netRevenue: number;  // Receita líquida (após taxas)
      netRevenueChange: number;  // % de mudança vs. semana passada
      averageTicket: number;  // Ticket médio
      averageTicketChange: number;  // % de mudança vs. semana passada
      totalRegistrations: number;  // Total de inscrições
      totalRegistrationsChange: number;  // % de mudança vs. semana passada
      cancellations: number;  // Total de cancelamentos
      cancellationsStatus: "Normal" | "Atenção" | "Crítico";  // Status baseado em threshold
      refunds: number;  // Total de estornos
      refundsStatus: "Normal" | "Atenção" | "Crítico";
    },
    
    // Tendência de inscrições (para gráfico)
    registrationsTrend: {
      amount: number;  // Valor total no período
      change: number;  // % vs. semana passada
      confirmed: number;  // Confirmadas
      canceled: number;  // Canceladas
      refunded: number;  // Estornadas
      // Dados para o gráfico de linha
      chartData: {
        labels: string[];  // ["Jan", "Fev", "Mar", ...]
        revenue: number[];  // [4000, 12000, 8000, ...]
        // Opcional: dados detalhados por data
        dailyData?: Array<{
          date: string;  // ISO date
          revenue: number;
          confirmed: number;
          canceled: number;
          refunded: number;
        }>;
      }
    },
    
    // Ranking de ingressos (top N)
    ticketRanking: Array<{
      ticketId: string;
      name: string;  // Nome do ingresso
      category: string;  // Nome da categoria (se houver)
      quantity: number;  // Quantidade vendida
      total: number;  // Receita total (R$)
    }>,
    
    // Top cidades com mais compradores
    topCities: Array<{
      city: string;
      state?: string;  // Opcional
      buyers: number;  // Quantidade de compradores únicos
    }>,
    
    // Lotes próximos de esgotamento
    lotsNearDepletion: Array<{
      lotId: string;
      name: string;  // Nome do lote
      status: "Normal" | "Atenção" | "Crítico";  // Calculado baseado em % vendido
      sold: number;  // Quantidade vendida
      total: number;  // Quantidade total
      remaining: number;  // Quantidade restante
      percentageSold: number;  // % vendido (0-100)
    }>,
    
    // Heatmap de vendas (dias e horários)
    salesHeatmap: Array<{
      day: string;  // "Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"
      hour: number;  // 0-23
      sales: number;  // Quantidade de vendas neste dia/hora
    }>
  }
}
```

### Performance
- ⚡ Usar cache para métricas calculadas (TTL: 5 minutos)
- ⚡ Agregar dados em queries otimizadas (evitar N+1)
- ⚡ Usar índices em `purchaseDate`, `status`, `ticketId`
- ⚡ Calcular métricas em background job (se possível)

---

## 💰 Financeiro

**Endpoint:** `GET /api/v1/events/:eventId/financial`

### Autenticação
- ✅ Requerida (JWT Token)
- ✅ Verificar se usuário é membro da organização do evento (OWNER ou EMPLOYEE)

### Query Parameters

```typescript
{
  period?: "hoje" | "7d" | "15d" | "1m" | "2m";  // Filtro de período para gráfico
  page?: number;  // Para paginação da tabela de ingressos/lotes
  limit?: number;  // Limite de itens por página (default: 20)
}
```

### Resposta Esperada

```typescript
{
  message: "Financial data fetched successfully",
  data: {
    // Resumo financeiro
    summary: {
      availableBalance: number;  // Saldo disponível para repasse
      installmentsToReceive: number;  // Parcelados a receber
      awaitingRelease: number;  // Aguardando liberação (prazo de retenção)
      totalTransferred: number;  // Total já repassado
      refunded: number;  // Total estornado
      chargebacks: number;  // Total de chargebacks
      grossRevenue: number;  // Receita bruta
      revenueChange: number;  // % vs. semana passada
    },
    
    // Dados para gráfico de faturamento
    revenueChart: {
      labels: string[];  // Labels do eixo X (período)
      revenue: number[];  // Valores de receita
      // Opcional: dados detalhados
      dailyData?: Array<{
        date: string;  // ISO date
        revenue: number;
      }>;
    },
    
    // Tabela de ingressos/lotes (paginação)
    tickets: {
      items: Array<{
        id: string;
        type: "category" | "lot";  // Tipo: categoria ou lote
        name: string;  // Nome do ingresso/lote
        subtitle?: string;  // Subtítulo (ex: "Kit inscrição 3K")
        categoryId?: string;  // ID da categoria pai (se for lote)
        sold: string;  // Formato: "1240-2414" (vendidos/total) ou "20" (apenas vendidos)
        revenue: number;  // Receita bruta (R$)
        createdAt: string;  // ISO date
        // Se for categoria, incluir lotes filhos
        lots?: Array<{
          id: string;
          name: string;
          sold: string;
          revenue: number;
          createdAt: string;
        }>;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }
  }
}
```

### Endpoints Adicionais

#### Histórico de Repasses
**Endpoint:** `GET /api/v1/events/:eventId/financial/transfers`

```typescript
{
  message: "Transfer history fetched successfully",
  data: {
    transfers: Array<{
      id: string;
      amount: number;
      status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
      requestedAt: string;  // ISO date
      completedAt?: string;  // ISO date
      paymentMethod: "PIX" | "TED" | "DOC";
      bankAccount?: {
        bankName: string;
        account: string;
        agency: string;
      };
    }>;
    totalTransferred: number;
  }
}
```

#### Parcelas a Receber
**Endpoint:** `GET /api/v1/events/:eventId/financial/installments`

```typescript
{
  message: "Installments fetched successfully",
  data: {
    installments: Array<{
      id: string;
      amount: number;
      dueDate: string;  // ISO date
      status: "PENDING" | "RECEIVED";
      releaseToday?: number;  // Valor sendo liberado hoje
    }>;
    totalPending: number;
    releaseToday: number;
    totalTransactions: number;
  }
}
```

#### Aguardando Liberação
**Endpoint:** `GET /api/v1/events/:eventId/financial/pending`

```typescript
{
  message: "Pending releases fetched successfully",
  data: {
    pending: Array<{
      id: string;
      registrationId: string;
      amount: number;
      purchaseDate: string;  // ISO date
      releaseDate: string;  // ISO date (quando será liberado)
      daysUntilRelease: number;
    }>;
    totalPending: number;
    releaseToday: number;  // Valor sendo liberado hoje
    totalTransactions: number;
  }
}
```

### Performance
- ⚡ Cache de resumo financeiro (TTL: 2 minutos - dados sensíveis)
- ⚡ Calcular saldos em background job
- ⚡ Usar índices em campos de data e status de pagamento

---

## 📝 Inscrições (Registrations)

**Endpoint:** `GET /api/v1/events/:eventId/registrations`

### Autenticação
- ✅ Requerida (JWT Token)
- ✅ Verificar se usuário é membro da organização do evento (OWNER ou EMPLOYEE)

### Query Parameters

```typescript
{
  page?: number;  // Default: 1
  limit?: number;  // Default: 20
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "CHARGEBACK" | "REFUNDED";  // Filtro de status
  search?: string;  // Busca por nome, CPF, ID do pedido, ticket
  ticketIds?: string[];  // IDs dos ingressos para filtrar
  startDate?: string;  // ISO date - início do range
  endDate?: string;  // ISO date - fim do range
  sortBy?: "purchaseDate" | "amount" | "status";  // Campo para ordenação
  sortOrder?: "asc" | "desc";  // Ordem (default: "desc")
}
```

### Resposta Esperada

```typescript
{
  message: "Registrations fetched successfully",
  data: {
    registrations: Array<{
      id: string;
      userId: string;
      eventId: string;
      status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "CHARGEBACK" | "REFUNDED";
      totalAmount: number;  // Valor total
      serviceFee: number;  // Taxa de serviço
      finalAmount: number;  // Valor final (totalAmount - serviceFee)
      qrCode: string;  // Código QR
      purchaseDate: string;  // ISO date
      createdAt: string;
      updatedAt: string;
      
      // Dados do usuário
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        documentNumber?: string;  // CPF
        avatarUrl?: string;
      };
      
      // Modalidades/Ingressos comprados
      modalities: Array<{
        id: string;
        modality: {
          id: string;
          name: string;
          price: number;
          ticketId?: string;  // ID do ticket relacionado
        };
        quantity?: number;
      }>;
      
      // Itens de kit (se houver)
      kitItems?: Array<{
        id: string;
        kitItem: {
          id: string;
          name: string;
        };
        selectedSize: string;
        quantity: number;
      }>;
      
      // Respostas do questionário (se houver)
      questionAnswers?: Array<{
        id: string;
        question: {
          id: string;
          question: string;
          type: string;
        };
        answer: string;
      }>;
    }>;
    
    // Estatísticas agregadas
    stats: {
      total: number;  // Total de inscrições
      paid: number;  // Pagas (CONFIRMED + COMPLETED)
      cancelled: number;  // Canceladas
      totalCollected: number;  // Total arrecadado (soma de finalAmount das pagas)
      // Opcional: % de mudança vs. semana passada
      totalChange?: number;
      paidChange?: number;
      cancelledChange?: number;
      totalCollectedChange?: number;
    };
    
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }
}
```

### Endpoint de Estatísticas (Opcional - para cards)
**Endpoint:** `GET /api/v1/events/:eventId/registrations/stats`

```typescript
{
  message: "Registration stats fetched successfully",
  data: {
    total: number;
    paid: number;
    cancelled: number;
    totalCollected: number;
    // Mudanças vs. semana passada
    totalChange: number;
    paidChange: number;
    cancelledChange: number;
    totalCollectedChange: number;
  }
}
```

### Performance
- ⚡ Usar índices em: `eventId`, `status`, `purchaseDate`, `userId`
- ⚡ Índice full-text para busca (nome, CPF, email)
- ⚡ Paginação obrigatória (máximo 100 itens por página)
- ⚡ Cache de estatísticas (TTL: 3 minutos)

---

## ⚡ Considerações de Performance

### 1. Cache Strategy

```typescript
// Estratégia de cache recomendada
{
  dashboard: {
    ttl: 300,  // 5 minutos
    key: `dashboard:${eventId}:${period}:${ticketIds.join(',')}`
  },
  financial: {
    ttl: 120,  // 2 minutos (dados mais sensíveis)
    key: `financial:${eventId}:${period}`
  },
  registrations: {
    ttl: 180,  // 3 minutos
    key: `registrations:${eventId}:${page}:${status}:${search}`
  },
  stats: {
    ttl: 180,  // 3 minutos
    key: `stats:${eventId}`
  }
}
```

### 2. Database Indexes

```sql
-- Índices recomendados para performance
CREATE INDEX idx_registrations_event_status ON registrations(event_id, status);
CREATE INDEX idx_registrations_event_date ON registrations(event_id, purchase_date);
CREATE INDEX idx_registrations_user_search ON registrations USING gin(to_tsvector('portuguese', user_first_name || ' ' || user_last_name || ' ' || user_email || ' ' || user_document));
CREATE INDEX idx_registrations_ticket ON registration_modalities(ticket_id);
CREATE INDEX idx_payments_event_status ON payments(event_id, status);
CREATE INDEX idx_transfers_event ON transfers(event_id, created_at);
```

### 3. Query Optimization

- ✅ Usar `SELECT` específico (não `SELECT *`)
- ✅ Usar `JOIN` ao invés de múltiplas queries
- ✅ Agregar dados no banco (SUM, COUNT, AVG)
- ✅ Usar `LIMIT` e `OFFSET` para paginação
- ✅ Evitar N+1 queries (usar eager loading)

### 4. Background Jobs

Para cálculos pesados, considerar jobs assíncronos:

```typescript
// Exemplo de job para calcular métricas
{
  job: "calculate-dashboard-metrics",
  schedule: "*/5 * * * *",  // A cada 5 minutos
  data: { eventId }
}
```

---

## 🔐 Segurança

### 1. Autenticação e Autorização

```typescript
// Middleware de autenticação
{
  required: true,
  verifyToken: true,
  checkOrganizationMembership: true,
  allowedRoles: ["OWNER", "EMPLOYEE"]
}
```

### 2. Validação de Input

```typescript
// Validações necessárias
{
  eventId: {
    type: "uuid",
    required: true,
    validate: "exists_in_organization"
  },
  period: {
    type: "enum",
    values: ["geral", "24h", "7d", "15d", "1m", "2m"],
    default: "geral"
  },
  page: {
    type: "integer",
    min: 1,
    default: 1
  },
  limit: {
    type: "integer",
    min: 1,
    max: 100,
    default: 20
  },
  ticketIds: {
    type: "array",
    items: "uuid",
    validate: "belongs_to_event"
  }
}
```

### 3. Rate Limiting

```typescript
// Limites recomendados
{
  dashboard: "30 requests/minute",
  financial: "20 requests/minute",  // Mais restritivo (dados sensíveis)
  registrations: "60 requests/minute"
}
```

### 4. Dados Sensíveis

- ✅ Não retornar dados financeiros completos em logs
- ✅ Mascarar CPF em respostas (apenas últimos 4 dígitos)
- ✅ Validar permissões antes de retornar dados
- ✅ Usar HTTPS obrigatório

### 5. Auditoria

```typescript
// Logs de auditoria recomendados
{
  action: "view_dashboard" | "view_financial" | "view_registrations",
  eventId: string,
  userId: string,
  timestamp: string,
  ipAddress?: string
}
```

---

## 📦 Estrutura de Resposta

### Formato Padrão

Todas as respostas devem seguir este formato:

```typescript
{
  message: string;  // Mensagem descritiva
  data: T;  // Dados específicos do endpoint
  meta?: {  // Metadados opcionais
    cached?: boolean;
    cacheExpiresAt?: string;
    requestId?: string;
  };
  errors?: Array<{  // Erros (se houver)
    field?: string;
    message: string;
    code: string;
  }>;
}
```

### Códigos de Status HTTP

- `200 OK` - Sucesso
- `400 Bad Request` - Parâmetros inválidos
- `401 Unauthorized` - Token inválido ou ausente
- `403 Forbidden` - Sem permissão para acessar o evento
- `404 Not Found` - Evento não encontrado
- `429 Too Many Requests` - Rate limit excedido
- `500 Internal Server Error` - Erro do servidor

### Tratamento de Erros

```typescript
// Exemplo de resposta de erro
{
  message: "Validation failed",
  errors: [
    {
      field: "period",
      message: "Invalid period value. Must be one of: geral, 24h, 7d, 15d, 1m, 2m",
      code: "INVALID_PERIOD"
    }
  ]
}
```

---

## 🚀 Implementação Recomendada

### Prioridade de Implementação

1. **Alta Prioridade:**
   - Dashboard básico (métricas principais)
   - Lista de inscrições com filtros básicos
   - Resumo financeiro básico

2. **Média Prioridade:**
   - Gráficos e visualizações
   - Rankings e top cidades
   - Histórico de repasses

3. **Baixa Prioridade:**
   - Heatmap de vendas
   - Exportação de dados
   - Filtros avançados

### Versionamento

Usar versionamento de API:

```
/api/v1/events/:eventId/dashboard
/api/v1/events/:eventId/financial
/api/v1/events/:eventId/registrations
```

---

## 📝 Notas Finais

- Todos os valores monetários devem estar em centavos (inteiros) ou com 2 casas decimais
- Todas as datas devem estar em formato ISO 8601
- Considerar timezone do evento/organização
- Implementar paginação em todas as listas
- Retornar apenas dados necessários (evitar over-fetching)
- Considerar implementar GraphQL no futuro para queries mais flexíveis

---

## 🔗 Relacionados

- [Documentação de Organizações](./ORGANIZATIONS_API.md)
- [Documentação de Eventos](./FRONTEND_EVENT_CONFIG.md)
- [Documentação de Pagamentos](./PAYMENT_DOCUMENTATION.md)
