import { describe, it, expect } from "vitest";
import {
  isTicketsCheckoutPreviewPath,
  isTopicsPreviewPath,
  isEventFullscreenPreviewPath,
} from "../ticketsCheckoutPreviewRoute";

describe("preview route predicates", () => {
  const ticketPaths = [
    "/organizer/events/new/tickets/preview",
    "/organizer/events/abc/edit/tickets/preview",
    "/admin/events/abc/edit/tickets/preview",
    "/admin/events/abc/review/tickets/preview/",
    "/organizer/events/new/tickets/preview?x=1#h",
  ];
  const topicPaths = [
    "/organizer/events/new/topics/preview",
    "/organizer/events/abc/edit/topics/preview",
    "/admin/events/abc/edit/topics/preview",
    "/admin/events/abc/review/topics/preview/",
    "/organizer/events/new/topics/preview?y=2",
  ];
  const nonPreview = [
    "/organizer/events/new/tickets",
    "/organizer/events/abc/edit/topics",
    "/organizer/events/abc/edit",
    "/admin/events/abc/review/information",
    null,
    undefined,
    "",
  ];

  it("isTicketsCheckoutPreviewPath casa só com /tickets/preview", () => {
    ticketPaths.forEach((p) => expect(isTicketsCheckoutPreviewPath(p)).toBe(true));
    topicPaths.forEach((p) => expect(isTicketsCheckoutPreviewPath(p)).toBe(false));
  });

  it("isTopicsPreviewPath casa só com /topics/preview", () => {
    topicPaths.forEach((p) => expect(isTopicsPreviewPath(p)).toBe(true));
    ticketPaths.forEach((p) => expect(isTopicsPreviewPath(p)).toBe(false));
  });

  it("isEventFullscreenPreviewPath casa com AMBAS as prévias", () => {
    [...ticketPaths, ...topicPaths].forEach((p) =>
      expect(isEventFullscreenPreviewPath(p)).toBe(true),
    );
  });

  it("rotas fora de prévia → todos false", () => {
    nonPreview.forEach((p) => {
      expect(isTicketsCheckoutPreviewPath(p)).toBe(false);
      expect(isTopicsPreviewPath(p)).toBe(false);
      expect(isEventFullscreenPreviewPath(p)).toBe(false);
    });
  });
});
