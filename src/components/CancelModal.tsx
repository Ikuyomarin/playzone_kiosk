import React, { useState } from 'react';
import '../styles/Modal.css';

interface CancelModalProps {
  cell: { row: number; col: number };
  onClose: () => void;
  onConfirm: () => void;
}

const CancelModal: React.FC<CancelModalProps> = ({ cell, onClose, onConfirm }) => {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    if (password.trim() === '0924') {
      onConfirm();
    } else {
      alert("잘못된 비밀번호입니다.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>예약 취소</h2>
        <div className="form-group">
          <label>관리자 비밀번호:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
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

export default CancelModal;
