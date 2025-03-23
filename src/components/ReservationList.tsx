import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function ReservationList() {
    const [reservations, setReservations] = useState<any[]>([]);


  useEffect(() => {
    async function fetchReservations() {
      const { data, error } = await supabase
        .from("reservations")
        .select("*");

      if (error) {
        console.error("에러:", error);
      } else {
        setReservations(data);
      }
    }

    fetchReservations();
  }, []);

  return (
    <div>
      <h2>예약 목록</h2>
      {reservations.length > 0 ? (
        reservations.map((res: any) => (
          <div key={res.id}>
            {res.name} - {res.program} ({res.effective_time})
          </div>
        ))
      ) : (
        <p>예약 데이터가 없습니다.</p>
      )}
    </div>
  );
}
