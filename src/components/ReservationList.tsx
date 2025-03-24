import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function ReservationList() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReservations() {
      setLoading(true);
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("effective_time", { ascending: true });

      if (error) {
        console.error("예약 불러오기 실패:", error);
      } else {
        setReservations(data || []);
      }

      setLoading(false);
    }

    fetchReservations();
  }, []);

  if (loading) {
    return <p>불러오는 중...</p>;
  }

  return (
    <div>
      <h2>예약 목록</h2>
      {reservations.length === 0 ? (
        <p>예약이 없습니다.</p>
      ) : (
        <ul>
          {reservations.map((r) => (
            <li key={r.id}>
              {r.effective_time} - {r.name} ({r.program}, {r.people}명)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
