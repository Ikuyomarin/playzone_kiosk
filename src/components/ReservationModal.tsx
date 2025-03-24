import React, { useState } from 'react';
import '../styles/Modal.css';

interface ReservationModalProps {
  cell: { row: number; col: number };
  onClose: () => void;
  onConfirm: (name: string, people: number) => void;
}

const ReservationModal: React.FC<ReservationModalProps> = ({ cell, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [people, setPeople] = useState(1);

  const handleConfirm = () => {
    if (!name.trim()) {
      alert("예약자 이름을 입력해주세요.");
      return;
    }
    const hangulRegex = /^[가-힣]+$/;
    if (!hangulRegex.test(name)) {
      alert("한글로 이름을 입력하세요.");
      return;
    }
    if (people < 1 || people > 4) {
      alert("인원수는 1명 이상 4명 이하로 입력해주세요.");
      return;
    }
    onConfirm(name, people);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>예약 정보 입력</h2>
        <div className="form-group">
          <label>예약자 이름:</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 홍길동"
          />
        </div>
        <div className="form-group">
          <label>인원수:</label>
          <input 
            type="number" 
            value={people} 
            onChange={(e) => setPeople(Number(e.target.value))}
            min={1} 
            max={4}
          />
        </div>
        <div className="modal-buttons">
          <button onClick={handleConfirm}>확인</button>
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;
