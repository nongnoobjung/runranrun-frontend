import "server-only";
import { notFound, redirect } from "next/navigation";
import { api } from "./api";
import type { Order } from "./types";

/** Loads one of the signed-in buyer's orders, sending them to log in or to 404 otherwise. */
export async function loadOrder(id: string, next: string): Promise<Order> {
  const res = await api<Order>(`/v1/orders/${encodeURIComponent(id)}`, { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=${next}`);
    notFound();
  }
  return res.data;
}
