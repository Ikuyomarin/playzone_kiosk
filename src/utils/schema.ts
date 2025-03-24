// src/utils/schema.ts

export const programs = [
    "AR게임", "XR게임", "오락게임A", "오락게임B", "오락게임C",
    "레이싱게임A", "레이싱게임B", "농구게임", "노래방A", "노래방B", "포켓볼"
  ];
  
  export const hourlyPrograms = new Set(["노래방A", "노래방B", "포켓볼"]);
  
  export const times = Array.from({ length: 22 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = i % 2 === 0 ? 0 : 30;
    const endHour = minute === 0 ? hour : hour + 1;
    const endMinute = minute === 0 ? 30 : 0;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ~ ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  });
  
  export function parseTimeRange(timeStr: string): [number, number] {
    const [startStr, endStr] = timeStr.split(" ~ ");
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);
    return [sh * 60 + sm, eh * 60 + em];
  }
  
  export function maskName(name: string): string {
    if (name.length <= 2) return name;
    return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
  }
  