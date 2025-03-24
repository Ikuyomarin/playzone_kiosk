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
      <div className="modal-content" style={{ padding: '2rem', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>예약 정보 입력</h2>
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>예약자 이름:</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 홍길동"
            style={{ fontSize: '1.5rem', padding: '0.75rem', width: '100%' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>인원수:</label>
          <input 
            type="number" 
            value={people} 
            onChange={(e) => setPeople(Number(e.target.value))}
            min={1} 
            max={4}
            style={{ fontSize: '1.5rem', padding: '0.75rem', width: '100%' }}
          />
        </div>
        <div className="modal-buttons" style={{ textAlign: 'center' }}>
          <button onClick={handleConfirm} style={{ fontSize: '1.5rem', padding: '1rem 2rem', marginRight: '1rem' }}>확인</button>
          <button onClick={onClose} style={{ fontSize: '1.5rem', padding: '1rem 2rem' }}>취소</button>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;
