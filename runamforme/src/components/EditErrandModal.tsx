import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { updateErrand } from '../firebase/firestore';
import type { Errand } from '../types';

interface EditErrandModalProps {
  errand: Errand;
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditErrandModal: React.FC<EditErrandModalProps> = ({ errand, show, onClose, onSuccess }) => {
  const [title, setTitle] = useState(errand.title);
  const [description, setDescription] = useState(errand.description);
  const [location, setLocation] = useState(errand.location);
  const [duration, setDuration] = useState(errand.duration);
  const [fee, setFee] = useState(errand.fee.toString());
  const [isPrivate, setIsPrivate] = useState(errand.isPrivate);
  const [isNegotiable, setIsNegotiable] = useState(errand.isNegotiable);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTitle(errand.title || '');
    setDescription(errand.description || '');
    setLocation(errand.location || '');
    setDuration(errand.duration || '');
    setFee(errand.fee.toString() || '0');
    setIsPrivate(errand.isPrivate || false);
    setIsNegotiable(errand.isNegotiable || false);
    setError(null);
  }, [errand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    if (!errand.id) {
      setError('Invalid errand ID.');
      setSubmitting(false);
      return;
    }
    try {
      await updateErrand(errand.id, {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        duration: duration.trim(),
        fee: parseFloat(fee) || 0,
        isPrivate,
        isNegotiable,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to update errand. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismissError = () => {
    setError(null);
  };

  return (
    <Modal show={show} onHide={onClose} centered aria-labelledby="edit-errand-title">
      <Modal.Header closeButton>
        <Modal.Title id="edit-errand-title">Edit Errand</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" onClose={handleDismissError} dismissible aria-live="assertive">
            {error}
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="title">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              aria-describedby="titleHelp"
              disabled={submitting}
            />
            <Form.Text id="titleHelp" muted>Max 100 characters</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="description">
            <Form.Label>Description *</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={500}
              aria-describedby="descriptionHelp"
              disabled={submitting}
            />
            <Form.Text id="descriptionHelp" muted>Max 500 characters</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="location">
            <Form.Label>Location *</Form.Label>
            <Form.Control
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              maxLength={100}
              aria-describedby="locationHelp"
              disabled={submitting}
            />
            <Form.Text id="locationHelp" muted>Where the errand takes place</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="duration">
            <Form.Label>Duration *</Form.Label>
            <Form.Control
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              maxLength={50}
              aria-describedby="durationHelp"
              disabled={submitting}
            />
            <Form.Text id="durationHelp" muted>E.g., 1 hour</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="fee">
            <Form.Label>Fee ({errand.currency}) *</Form.Label>
            <Form.Control
              type="number"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              required
              min={0}
              step={0.01}
              aria-describedby="feeHelp"
              disabled={submitting}
            />
            <Form.Text id="feeHelp" muted>Enter 0 for negotiable fee</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="isPrivate">
            <Form.Check
              type="checkbox"
              label="Private (visible only to you and invited runners)"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={submitting}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="isNegotiable">
            <Form.Check
              type="checkbox"
              label="Negotiable Fee"
              checked={isNegotiable}
              onChange={(e) => setIsNegotiable(e.target.checked)}
              disabled={submitting}
            />
          </Form.Group>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={onClose} disabled={submitting} aria-label="Cancel editing">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} aria-label="Save errand changes">
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Saving...
                </>
              ) : 'Save Changes'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditErrandModal;