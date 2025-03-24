import { useState } from "react";
import { supabase } from "../lib/supabase";

export function ReservationForm() {
  const [name, setName] = useState("");
  const [program, setProgram] = useState("");
  const [people, setPeople] = useState(1);
  const [effectiveTime, setEffectiveTime] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !program || !effectiveTime) {
      setMessage("모든 항목을 입력해주세요.");
      return;
    }

    const { error } = await supabase.from("reservations").insert([
      {
        name,
        program,
        people,
        effective_time: effectiveTime,
      },
    ]);

    if (error) {
      setMessage("❌ 예약 실패: " + error.message);
    } else {
      setMessage("✅ 예약 완료!");
      setName("");
      setProgram("");
      setPeople(1);
      setEffectiveTime("");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <h2>예약하기</h2>

      <div>
        <label>이름:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label>프로그램:</label>
        <input
          type="text"
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          required
        />
      </div>

      <div>
        <label>인원 수:</label>
        <input
          type="number"
          min={1}
          max={10}
          value={people}
          onChange={(e) => setPeople(Number(e.target.value))}
          required
        />
      </div>

      <div>
        <label>예약 시간:</label>
        <input
          type="text"
          placeholder="예: 13:30 ~ 13:55"
          value={effectiveTime}
          onChange={(e) => setEffectiveTime(e.target.value)}
          required
        />
      </div>

      <button type="submit">예약하기</button>

      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </form>
  );
}

