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

// 09:00 ~ 09:30, 09:30 ~ 10:00, … (9시부터 21시까지) 형태의 시간대 배열 생성
const generateTimes = (): string[] => {
  const times: string[] = [];
  for (let h = 9; h < 21; h++) {
    times.push(`${String(h).padStart(2, '0')}:00 ~ ${String(h).padStart(2, '0')}:30`);
    times.push(`${String(h).padStart(2, '0')}:30 ~ ${String(h + 1).padStart(2, '0')}:00`);
  }
  return times;
};
const times = generateTimes();

/**
 * effective_time과 program 정보를 통해 예약이 속한 행(row) 인덱스를 계산합니다.
 * merged 프로그램(노래방, 포켓볼)은 1시간짜리로 계산하여 시작 시간이 같은 첫 번째 셀의 인덱스를 사용합니다.
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
      if (!(newEnd <= resStart || resEnd <= newStart)) {
        return false;
      }
      if (res.program === currentProgram && (newStart === resEnd || newEnd === resStart)) {
        return false;
      }
    }
  }

  if (currentProgram === "노래방A" || currentProgram === "노래방B") {
    for (const key in reservations) {
      const res = reservations[key];
      if (res.name === name && (res.program === "노래방A" || res.program === "노래방B")) {
        return false;
      }
    }
  }
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
  // --- 좌측 시간대 비활성화 관련 상태 및 함수 ---
  const [disabledTimes, setDisabledTimes] = useState<string[]>([]);
  const fetchDisabledTimes = async () => {
    const { data, error } = await supabase.from('disabled_times').select('time');
    if (error) {
      console.error("비활성화 시간대 불러오기 오류:", error.message);
    } else if (data) {
      setDisabledTimes(data.map((item: any) => item.time));
    }
  };
  const handleTimeCellDoubleClick = async (time: string) => {
    const entered = window.prompt("관리자 비밀번호를 입력하세요:");
    if (entered !== "0924") {
      alert("비밀번호가 틀렸습니다.");
      return;
    }
    if (disabledTimes.includes(time)) {
      // 활성화: 삭제
      const { error } = await supabase.from('disabled_times').delete().eq('time', time);
      if (error) {
        alert("시간대 활성화 중 오류가 발생했습니다.");
      }
    } else {
      // 비활성화: 삽입
      const { error } = await supabase.from('disabled_times').insert({ time });
      if (error) {
        alert("시간대 비활성화 중 오류가 발생했습니다.");
      }
    }
    fetchDisabledTimes();
  };
  // --- 여기까지 추가 ---

  /**
   * 자정 초기화: reset_logs 테이블을 기준으로 하루에 한 번만 초기화
   */
  const resetReservationsIfNewDay = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data: logs, error: logError } = await supabase
      .from("reset_logs")
      .select("*")
      .eq("date", today);
    if (logError) {
      console.error("reset_logs 조회 오류:", logError.message);
      return;
    }
    if (logs && logs.length === 0) {
      const { error: deleteError } = await supabase
        .from("reservations")
        .delete()
        .neq("id", 0);
      if (deleteError) {
        console.error("예약 초기화 오류:", deleteError.message);
      } else {
        const { error: insertError } = await supabase
          .from("reset_logs")
          .insert({ date: today });
        if (insertError) {
          console.error("reset_logs 기록 오류:", insertError.message);
        } else {
          console.log("자정 예약 초기화 및 reset_logs 기록 완료:", today);
        }
      }
    }
  };

  /**
   * 만료된 예약 자동 삭제 함수
   * - 일반 프로그램(30분)과 노래방/포켓볼(1시간)은 effective_time의 종료 시각 기준으로 삭제
   */
  const cleanUpExpiredReservations = async () => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const { data, error } = await supabase.from('reservations').select('*');
    if (error || !data) {
      console.error("예약 데이터 불러오기 오류 (만료 삭제 전):", error);
      return;
    }
    const expiredIds: number[] = [];
    (data as any[]).forEach((r) => {
      const [, endStr] = r.effective_time.split(" ~ ");
      const endMinutes = parseInt(endStr.split(":")[0]) * 60 + parseInt(endStr.split(":")[1]);
      if (nowMinutes >= endMinutes) {
        expiredIds.push(r.id);
      }
    });
    if (expiredIds.length > 0) {
      const { error: deleteError } = await supabase.from('reservations').delete().in('id', expiredIds);
      if (deleteError) {
        console.error("만료 예약 삭제 오류:", deleteError.message);
      } else {
        console.log(`만료된 ${expiredIds.length}건의 예약 삭제 완료`);
        fetchReservations();
      }
    }
  };

  // 상태 선언
  const [reservations, setReservations] = useState<Record<string, Reservation>>({});
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [cancelCell, setCancelCell] = useState<{ row: number; col: number } | null>(null);
  const [toggleProgramModal, setToggleProgramModal] = useState<ToggleModal | null>(null);
  const [disabledPrograms, setDisabledPrograms] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 컴포넌트 마운트 시 초기 실행: 자정 초기화 및 데이터 불러오기 (예약, 프로그램, 시간대)
  useEffect(() => {
    resetReservationsIfNewDay();
    fetchReservations();
    fetchDisabledPrograms();
    fetchDisabledTimes();
  }, []);

  // 매 1초마다 예약 데이터와 현재 시간 업데이트, 자정 초기화 체크
  useEffect(() => {
    const interval = setInterval(() => {
      resetReservationsIfNewDay();
      fetchReservations();
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 매 1분마다 만료된 예약 자동 삭제
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanUpExpiredReservations();
    }, 60000);
    return () => clearInterval(cleanupInterval);
  }, []);

  // 매 10초마다 비활성화된 시간대 업데이트
  useEffect(() => {
    const dtInterval = setInterval(() => {
      fetchDisabledTimes();
    }, 10000);
    return () => clearInterval(dtInterval);
  }, []);

  const fetchReservations = async () => {
    const { data, error } = await supabase.from('reservations').select('*');
    if (error) {
      console.error('예약 데이터 불러오기 오류:', error);
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

  const fetchDisabledPrograms = async () => {
    const { data, error } = await supabase.from('disabled_programs').select('program');
    if (error) {
      console.error('비활성화 프로그램 불러오기 오류:', error);
    } else if (data) {
      setDisabledPrograms(data.map((item: any) => item.program));
    }
  };

  const parseTimeRange = (timeStr: string): [string, string] => {
    const parts = timeStr.split(' ~ ');
    return [parts[0], parts[1]];
  };

  // merged 프로그램의 경우, 홀수 행이면 상위(짝수) 행으로 조정하여 1시간 단위로 표현
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

  // 이름 마스킹 제거: 이름 그대로 반환
  const maskName = (name: string): string => {
    return name;
  };

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
    // 해당 시간대가 비활성화되었는지 검사 (disabledTimes 배열 기준)
    const cellTime = times[adjustedRow];
    if (disabledTimes.includes(cellTime)) {
      alert("해당 시간대는 비활성화되었습니다.");
      return;
    }
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

  // 예약 모달 확인 시 (예약 생성 후 즉시 최신 데이터 반영)
  const handleReservationConfirm = async (name: string, people: number) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const effectiveTime = getEffectiveTimeForCell(row, col);
    if (!checkReservationLimit(name, effectiveTime, programs[col], reservations)) {
      alert("동일 시간대, 연속 예약 또는 최대 예약 수 초과입니다.");
      return;
    }
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
      console.error("예약 생성 오류:", error);
      alert("예약 생성 중 오류가 발생했습니다. 관리자에게 문의하세요.");
    } else if (data) {
      await fetchReservations();
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

  // 예약 취소 확인 시
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
      console.error("예약 취소 오류:", error);
      alert("예약 취소 중 오류가 발생했습니다.");
    } else {
      const updated = { ...reservations };
      delete updated[key];
      setReservations(updated);
      alert("예약이 취소되었습니다.");
    }
    setCancelCell(null);
  };

  // 헤더 더블클릭 시 (프로그램 비활성/활성 토글)
  const handleHeaderDoubleClick = (program: string) => {
    if (disabledPrograms.includes(program)) {
      setToggleProgramModal({ program, mode: 'enable' });
    } else {
      setToggleProgramModal({ program, mode: 'disable' });
    }
  };

  // 프로그램 비활성화/활성 토글 확인 시
  const handleProgramToggleConfirm = async (mode: 'disable' | 'enable') => {
    if (!toggleProgramModal) return;
    const program = toggleProgramModal.program;
    if (mode === 'disable') {
      const { error } = await supabase.from('disabled_programs').insert({ program });
      if (error) {
        console.error('프로그램 비활성화 오류:', error);
        alert("프로그램 비활성화 중 오류가 발생했습니다.");
      } else {
        setDisabledPrograms(prev => [...prev, program]);
        alert(`${program} 프로그램이 비활성화되었습니다.`);
      }
    } else {
      const { error } = await supabase.from('disabled_programs').delete().eq('program', program);
      if (error) {
        console.error('프로그램 활성화 오류:', error);
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
              <th key={colIndex} onDoubleClick={() => handleHeaderDoubleClick(prog)}>
                {prog} {disabledPrograms.includes(prog) ? "(비활성화)" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((time, rowIndex) => (
            <tr key={rowIndex}>
              <td
                className={`time-cell ${disabledTimes.includes(time) ? 'disabled-time' : ''}`}
                onDoubleClick={() => handleTimeCellDoubleClick(time)}
              >
                {time}
              </td>
              {programs.map((prog, colIndex) => {
                if (mergedPrograms.includes(prog) && rowIndex % 2 === 1) return null;
                const key = `${rowIndex}-${colIndex}`;
                const reservation = reservations[key];
                const expired = isExpired(rowIndex, colIndex);
                return (
                  <td
                    key={colIndex}
                    rowSpan={mergedPrograms.includes(prog) ? 2 : 1}
                    className={`grid-cell ${reservation ? 'reserved' : ''} ${disabledPrograms.includes(prog) ? 'disabled' : ''} ${expired ? 'expired' : ''} ${disabledTimes.includes(times[rowIndex]) ? 'disabled-time' : ''}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onContextMenu={(e) => handleCellRightClick(rowIndex, colIndex, e)}
                  >
                    {reservation ? (
                      <div className="cell-content">
                        예약중<br />
                        예약자: {reservation.name}<br />
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
