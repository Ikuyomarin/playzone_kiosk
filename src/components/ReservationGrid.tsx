import React, { useState, useEffect } from 'react';
import ReservationModal from './ReservationModal';
import CancelModal from './CancelModal';
import ProgramDisableModal from './ProgramDisableModal';
import { supabase } from '../lib/supabase';
import { Reservation } from '../types';
import '../styles/grid.css';

const programs = [
  "AR게임", "XR게임", "오락게임A", "오락게임B", "오락게임C",
  "레이싱게임A", "레이싱게임B", "농구게임", "노래방A", "노래방B", "포켓볼"
];
const mergedPrograms = ["노래방A", "노래방B", "포켓볼"];

// "09:00 ~ 09:30", "09:30 ~ 10:00", … 형태의 시간대 배열 생성
const generateTimes = (): string[] => {
  const times: string[] = [];
  for (let h = 9; h < 20; h++) {
    times.push(`${String(h).padStart(2, '0')}:00 ~ ${String(h).padStart(2, '0')}:30`);
    times.push(`${String(h).padStart(2, '0')}:30 ~ ${String(h + 1).padStart(2, '0')}:00`);
  }
  return times;
};
const times = generateTimes();

/**
 * effective_time과 program 정보를 통해 예약이 속한 행(row) 인덱스를 계산합니다.
 * merged 프로그램(노래방, 포켓볼)인 경우, 
 * "09:00 ~ 10:00" 같이 1시간짜리로 계산하여 
 * 시작 시간이 같은 첫 번째 셀의 인덱스를 사용.
 */
const getRowFromEffectiveTime = (effectiveTime: string, program: string): number => {
  if (!mergedPrograms.includes(program)) {
    const index = times.indexOf(effectiveTime);
    return index !== -1 ? index : 0;
  } else {
    const startTime = effectiveTime.split(' ~ ')[0];
    const index = times.findIndex(t => t.startsWith(startTime));
    return index !== -1 ? index : 0;
  }
};

/**
 * 예약 제한 체크 함수
 * - 동일 이름 사용자는 최대 2건 예약
 * - 예약 시간이 겹치거나 바로 인접하면 안 됨
 * - 노래방/레이싱 그룹은 각각 한 건만 허용
 */
const checkReservationLimit = (
  name: string,
  newEffectiveTime: string,
  currentProgram: string,
  reservations: Record<string, Reservation>
): boolean => {
  const [newStartStr, newEndStr] = newEffectiveTime.split(' ~ ');
  const newStart = parseInt(newStartStr.split(':')[0]) * 60 + parseInt(newStartStr.split(':')[1]);
  const newEnd = parseInt(newEndStr.split(':')[0]) * 60 + parseInt(newEndStr.split(':')[1]);
  let count = 0;

  for (const key in reservations) {
    const res = reservations[key];
    if (res.name === name) {
      count++;
      const [resStartStr, resEndStr] = res.effective_time.split(' ~ ');
      const resStart = parseInt(resStartStr.split(':')[0]) * 60 + parseInt(resStartStr.split(':')[1]);
      const resEnd = parseInt(resEndStr.split(':')[0]) * 60 + parseInt(resEndStr.split(':')[1]);
      // 시간이 겹치면 안 됨
      if (!(newEnd <= resStart || resEnd <= newStart)) {
        return false;
      }
      // 같은 프로그램이면 인접 예약도 안 됨
      if (res.program === currentProgram && (newStart === resEnd || newEnd === resStart)) {
        return false;
      }
    }
  }

  // 노래방 그룹은 한 번만 예약 가능
  if (currentProgram === "노래방A" || currentProgram === "노래방B") {
    for (const key in reservations) {
      const res = reservations[key];
      if (res.name === name && (res.program === "노래방A" || res.program === "노래방B")) {
        return false;
      }
    }
  }
  // 레이싱 그룹은 한 번만 예약 가능
  if (currentProgram === "레이싱게임A" || currentProgram === "레이싱게임B") {
    for (const key in reservations) {
      const res = reservations[key];
      if (res.name === name && (res.program === "레이싱게임A" || res.program === "레이싱게임B")) {
        return false;
      }
    }
  }

  if (count >= 2) return false;
  return true;
};

interface ToggleModal {
  program: string;
  mode: 'disable' | 'enable';
}

const ReservationGrid: React.FC = () => {
  /**
   * 자정이 지나면 예약 테이블을 완전히 리셋하는 함수
   * - Supabase 'reservations' 테이블 전체 삭제
   * - localStorage에 마지막 리셋 날짜 저장 → 하루 한 번만 실행
   */
  const resetReservationsIfNewDay = async () => {
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const lastReset = localStorage.getItem("lastResetDate");

    // 날짜가 다르면 새벽을 넘겼다고 판단
    if (lastReset !== today) {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .neq("id", 0); // 전체 삭제
      if (!error) {
        localStorage.setItem("lastResetDate", today);
        console.log("자정이 지나 예약 데이터를 초기화했습니다.");
      } else {
        console.error("초기화 오류:", error.message);
      }
    }
  };

  // 예약 로컬 상태
  const [reservations, setReservations] = useState<Record<string, Reservation>>({});
  // UI 상태
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [cancelCell, setCancelCell] = useState<{ row: number; col: number } | null>(null);
  const [toggleProgramModal, setToggleProgramModal] = useState<ToggleModal | null>(null);
  const [disabledPrograms, setDisabledPrograms] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  /**
   * Supabase에서 예약 목록을 불러오는 함수
   */
  const fetchReservations = async () => {
    const { data, error } = await supabase.from('reservations').select('*');
    if (error) {
      console.error('Error fetching reservations:', error);
    } else if (data) {
      const resMap: Record<string, Reservation> = {};
      (data as any[]).forEach((r) => {
        const computedRow = getRowFromEffectiveTime(r.effective_time, r.program);
        const key = `${computedRow}-${r.col}`;
        resMap[key] = r;
      });
      setReservations(resMap);
    }
  };

  /**
   * 비활성화된 프로그램 목록 불러오기
   */
  const fetchDisabledPrograms = async () => {
    const { data, error } = await supabase
      .from('disabled_programs')
      .select('program');
    if (error) {
      console.error('Error fetching disabled programs:', error);
    } else if (data) {
      setDisabledPrograms(data.map((item: any) => item.program));
    }
  };

  // 초기 실행 (컴포넌트 마운트 시)
  useEffect(() => {
    // 자정 체크 → 초기화
    resetReservationsIfNewDay();
    // 예약 데이터, 비활성화 데이터 가져오기
    fetchReservations();
    fetchDisabledPrograms();
  }, []);

  // 매 10초마다 재검사 → "자정 지나면" 체크 & 예약 목록 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      resetReservationsIfNewDay(); // 자정 자동 초기화
      fetchReservations();         // 최신 예약 정보 반영
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // 1초마다 현재 시간 업데이트 (UI 표시용)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const parseTimeRange = (timeStr: string): [string, string] => {
    const parts = timeStr.split(' ~ ');
    return [parts[0], parts[1]];
  };

  // merged 프로그램인 경우, 홀수 행을 상위 짝수 행에 붙여서 1시간 단위로 표현
  const getEffectiveTimeForCell = (row: number, col: number): string => {
    const program = programs[col];
    let adjustedRow = row;
    if (mergedPrograms.includes(program) && row % 2 === 1) {
      adjustedRow = row - 1;
    }
    const time = times[adjustedRow];
    if (mergedPrograms.includes(program)) {
      const [start, ] = time.split(' ~ ');
      const [startHourStr, startMinuteStr] = start.split(':');
      const startHour = parseInt(startHourStr);
      return `${String(startHour).padStart(2, '0')}:${startMinuteStr} ~ ${String(startHour + 1).padStart(2, '0')}:${startMinuteStr}`;
    }
    return time;
  };

  // 이름 마스킹 (예: "홍길동" -> "홍*동")
  const maskName = (name: string): string => {
    if (name.length <= 1) return name;
    return name[0] + "*" + name[name.length - 1];
  };

  // 이미 지난 시간인지 판단 (UI에 만료 표시)
  const isExpired = (row: number, col: number): boolean => {
    const effectiveTime = getEffectiveTimeForCell(row, col);
    const [, endStr] = parseTimeRange(effectiveTime);
    const [endHour, endMinute] = endStr.split(':').map(Number);
    const endTimeMinutes = endHour * 60 + endMinute;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return nowMinutes >= endTimeMinutes;
  };

  // 셀 클릭 시 (예약 생성)
  const handleCellClick = (row: number, col: number) => {
    const program = programs[col];
    let adjustedRow = row;
    if (mergedPrograms.includes(program) && row % 2 === 1) {
      adjustedRow = row - 1;
    }
    const key = `${adjustedRow}-${col}`;
    if (disabledPrograms.includes(program)) {
      alert("해당 프로그램은 비활성화되어 예약이 불가능합니다.");
      return;
    }
    if (isExpired(adjustedRow, col)) {
      alert("이미 지난 시간입니다. 예약할 수 없습니다.");
      return;
    }
    if (reservations[key]) {
      alert("이미 예약된 시간입니다.");
      return;
    }
    setSelectedCell({ row: adjustedRow, col });
  };

  // 예약 모달 확인 시
  const handleReservationConfirm = async (name: string, people: number) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const effectiveTime = getEffectiveTimeForCell(row, col);

    // 예약 제한 확인
    if (!checkReservationLimit(name, effectiveTime, programs[col], reservations)) {
      alert("동일 시간대, 연속 예약 또는 최대 예약 수 초과입니다.");
      return;
    }

    // Supabase에 추가
    const reservationData = {
      col,
      name,
      people,
      program: programs[col],
      effective_time: effectiveTime,
    };

    const { data, error } = await supabase
      .from('reservations')
      .insert(reservationData)
      .single();

    if (error) {
      console.error("Error creating reservation:", error);
      alert("예약 생성 중 오류가 발생했습니다. 관리자에게 문의하세요.");
    } else if (data) {
      // row를 로컬 상태에 반영
      data.row = row;
      const key = `${row}-${col}`;
      setReservations(prev => ({ ...prev, [key]: data }));
      alert(`${programs[col]} 프로그램은 ${effectiveTime}에 예약되었습니다.\n예약자: ${maskName(name)}\n인원수: ${people}명`);
    }
    setSelectedCell(null);
  };

  // 셀 우클릭 시 (예약 취소)
  const handleCellRightClick = (row: number, col: number, event: React.MouseEvent) => {
    event.preventDefault();
    const program = programs[col];
    let adjustedRow = row;
    if (mergedPrograms.includes(program) && row % 2 === 1) {
      adjustedRow = row - 1;
    }
    const key = `${adjustedRow}-${col}`;
    if (!reservations[key]) {
      alert("예약이 없는 셀입니다.");
      return;
    }
    setCancelCell({ row: adjustedRow, col });
  };

  // 예약 취소 확인
  const handleCancelConfirm = async () => {
    if (!cancelCell) return;
    const { row, col } = cancelCell;
    const key = `${row}-${col}`;
    const reservation = reservations[key];
    if (!reservation) return;

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservation.id);

    if (error) {
      console.error("Error cancelling reservation:", error);
      alert("예약 취소 중 오류가 발생했습니다.");
    } else {
      const updated = { ...reservations };
      delete updated[key];
      setReservations(updated);
      alert("예약이 취소되었습니다.");
    }
    setCancelCell(null);
  };

  // 헤더 더블클릭 시 프로그램 비활성/활성
  const handleHeaderDoubleClick = (program: string) => {
    if (disabledPrograms.includes(program)) {
      setToggleProgramModal({ program, mode: 'enable' });
    } else {
      setToggleProgramModal({ program, mode: 'disable' });
    }
  };

  // 프로그램 비활성화 모달 확인
  const handleProgramToggleConfirm = async (mode: 'disable' | 'enable') => {
    if (!toggleProgramModal) return;
    const program = toggleProgramModal.program;

    if (mode === 'disable') {
      const { error } = await supabase
        .from('disabled_programs')
        .insert({ program });
      if (error) {
        console.error('Error disabling program:', error);
        alert("프로그램 비활성화 중 오류가 발생했습니다.");
      } else {
        setDisabledPrograms(prev => [...prev, program]);
        alert(`${program} 프로그램이 비활성화되었습니다.`);
      }
    } else {
      const { error } = await supabase
        .from('disabled_programs')
        .delete()
        .eq('program', program);
      if (error) {
        console.error('Error enabling program:', error);
        alert("프로그램 활성화 중 오류가 발생했습니다.");
      } else {
        setDisabledPrograms(prev => prev.filter(p => p !== program));
        alert(`${program} 프로그램이 활성화되었습니다.`);
      }
    }
    setToggleProgramModal(null);
  };

  return (
    <div className="reservation-grid-container">
      <div className="header">
        <h2>{currentTime.toLocaleString()}</h2>
      </div>
      <table className="reservation-grid">
        <thead>
          <tr>
            <th className="time-header">시간</th>
            {programs.map((prog, colIndex) => (
              <th 
                key={colIndex} 
                onDoubleClick={() => handleHeaderDoubleClick(prog)}
              >
                {prog} {disabledPrograms.includes(prog) ? "(비활성화)" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((time, rowIndex) => (
            <tr key={rowIndex}>
              <td className="time-cell">{time}</td>
              {programs.map((prog, colIndex) => {
                // merged 프로그램이면, 홀수 행은 렌더링하지 않고 짝수 행만
                if (mergedPrograms.includes(prog) && rowIndex % 2 === 1) {
                  return null;
                }
                const key = `${rowIndex}-${colIndex}`;
                const reservation = reservations[key];
                const expired = isExpired(rowIndex, colIndex);

                return (
                  <td
                    key={colIndex}
                    rowSpan={mergedPrograms.includes(prog) ? 2 : 1}
                    className={`grid-cell ${reservation ? 'reserved' : ''} ${disabledPrograms.includes(prog) ? 'disabled' : ''} ${expired ? 'expired' : ''}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onContextMenu={(e) => handleCellRightClick(rowIndex, colIndex, e)}
                  >
                    {reservation ? (
                      <div className="cell-content">
                        예약중<br />
                        예약자: {maskName(reservation.name)}<br />
                        인원수: {reservation.people}명<br />
                        시간: {reservation.effective_time}
                      </div>
                    ) : (
                      <div className="cell-content"></div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selectedCell && (
        <ReservationModal
          cell={selectedCell}
          onClose={() => setSelectedCell(null)}
          onConfirm={handleReservationConfirm}
        />
      )}

      {cancelCell && (
        <CancelModal
          cell={cancelCell}
          onClose={() => setCancelCell(null)}
          onConfirm={handleCancelConfirm}
        />
      )}

      {toggleProgramModal && (
        <ProgramDisableModal
          program={toggleProgramModal.program}
          mode={toggleProgramModal.mode}
          onClose={() => setToggleProgramModal(null)}
          onConfirm={handleProgramToggleConfirm}
        />
      )}
    </div>
  );
};

export default ReservationGrid;
