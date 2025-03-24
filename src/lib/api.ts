import { supabase } from "./supabase";
import { Reservation } from "../types";

export async function getReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("row", { ascending: true });

  if (error || !data) {
    console.error("예약 불러오기 실패:", error?.message);
    return [];
  }

  return data;
}
