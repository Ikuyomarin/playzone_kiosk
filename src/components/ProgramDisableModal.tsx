import React, { useState } from 'react';
import '../styles/Modal.css';

interface ProgramDisableModalProps {
  program: string;
  mode: 'disable' | 'enable';
  onClose: () => void;
  onConfirm: (mode: 'disable' | 'enable') => void;
}

const ProgramDisableModal: React.FC<ProgramDisableModalProps> = ({ program, mode, onClose, onConfirm }) => {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    if (password.trim() === '0924') {
      onConfirm(mode);
    } else {
      alert("잘못된 비밀번호입니다.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{mode === 'disable' ? `${program} 프로그램 비활성화` : `${program} 프로그램 활성화`}</h2>
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

export default ProgramDisableModal;
