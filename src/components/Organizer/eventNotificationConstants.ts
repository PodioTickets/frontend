import { Mail, MessageCircle, Smartphone } from "lucide-react";

export type NotificationChannel = "whatsapp" | "email" | "push";
export type NotificationRowStatus = "review" | "sent" | "denied";

export interface EventNotificationRow {
  id: string;
  occurredAt: string;
  title: string;
  channels: NotificationChannel[];
  status: NotificationRowStatus;
  messageHtml?: string;
  deniedReason?: string | null;
}

export const CHANNEL_META: Record<
  NotificationChannel,
  { label: string; Icon: typeof Mail }
> = {
  whatsapp: { label: "Whatsapp", Icon: Smartphone },
  email: { label: "Email", Icon: Mail },
  push: { label: "Push", Icon: Smartphone },
};

export const STATUS_META: Record<
  NotificationRowStatus,
  { label: string; className: string }
> = {
  review: {
    label: "Em análise",
    className: "bg-yellow-11 text-yellow-1",
  },
  sent: {
    label: "Enviado",
    className: "bg-primary-11 text-primary-1",
  },
  denied: {
    label: "Recusado",
    className: "bg-red-11 text-red-1",
  },
};
