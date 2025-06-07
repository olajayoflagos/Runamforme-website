import React, { useState } from 'react';
import { Modal, Button, Toast } from 'react-bootstrap';

interface ShareModalProps {
  show: boolean;
  onHide: () => void;
  errandUrl: string;
  title?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ show, onHide, errandUrl, title }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(errandUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Share "{title}"</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Button variant="outline-primary" onClick={copyToClipboard}>Copy Link</Button>
            <a
              className="btn btn-outline-success"
              href={`https://wa.me/?text=${encodeURIComponent(title + '\n' + errandUrl)}`}
              target="_blank" rel="noopener noreferrer"
            >WhatsApp</a>
            <a
              className="btn btn-outline-info"
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title + ' ' + errandUrl)}`}
              target="_blank" rel="noopener noreferrer"
            >Twitter/X</a>
            <a
              className="btn btn-outline-primary"
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(errandUrl)}`}
              target="_blank" rel="noopener noreferrer"
            >Facebook</a>
            <a
              className="btn btn-outline-dark"
              href={`mailto:?subject=${encodeURIComponent(title ?? '')}&body=${encodeURIComponent(errandUrl)}`}
            >Email</a>
          </div>
        </Modal.Body>
      </Modal>

      <Toast
        show={copied}
        onClose={() => setCopied(false)}
        delay={3000}
        autohide
        className="position-fixed bottom-0 start-50 translate-middle-x mb-3 bg-success text-white"
      >
        <Toast.Body>Link copied to clipboard!</Toast.Body>
      </Toast>
    </>
  );
};

export default ShareModal;
