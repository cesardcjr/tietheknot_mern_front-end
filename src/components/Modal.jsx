import React from 'react';

export default function Modal({ title, onClose, wide, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
      <div className={`modal-box${wide ? ' modal-wide' : ''}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><i className="fa fa-times" /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
