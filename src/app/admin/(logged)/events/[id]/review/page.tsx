import { redirect } from "next/navigation";

export default function ReviewEventPage({ params }: { params: { id: string } }) {
  redirect(`/admin/events/${params.id}/review/information`);
}
