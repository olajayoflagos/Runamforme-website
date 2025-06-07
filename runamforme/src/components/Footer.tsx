import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { FaEnvelope, FaPhone, FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';

interface FooterProps extends React.HTMLAttributes<HTMLElement> {}

const Footer: React.FC<FooterProps> = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white py-4 mt-auto">
      <Container>
        <Row className="g-4">
          <Col xs={12} md={6} lg={4}>
            <h5 className="fw-bold mb-3">RunAmForMe</h5>
            <p className="text-light">
              Connecting people to get errands done quickly and efficiently.
            </p>
            <div className="d-flex gap-3 mt-3">
              <a href="https://facebook.com" className="text-white" aria-label="Facebook">
                <FaFacebook size={20} />
              </a>
              <a href="https://twitter.com" className="text-white" aria-label="Twitter">
                <FaTwitter size={20} />
              </a>
              <a href="https://instagram.com" className="text-white" aria-label="Instagram">
                <FaInstagram size={20} />
              </a>
            </div>
          </Col>

          <Col xs={6} md={3} lg={2}>
            <h5 className="fw-bold mb-3">Quick Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/about" className="text-white text-decoration-none hover-opacity">
                  About Us
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/errands" className="text-white text-decoration-none hover-opacity">
                  Browse Errands
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/how-it-works" className="text-white text-decoration-none hover-opacity">
                  How It Works
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/faq" className="text-white text-decoration-none hover-opacity">
                  FAQ
                </Link>
              </li>
            </ul>
          </Col>

          <Col xs={6} md={3} lg={2}>
            <h5 className="fw-bold mb-3">Legal</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/terms" className="text-white text-decoration-none hover-opacity">
                  Terms of Service
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/privacy" className="text-white text-decoration-none hover-opacity">
                  Privacy Policy
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/safety" className="text-white text-decoration-none hover-opacity">
                  Safety Tips
                </Link>
              </li>
            </ul>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <h5 className="fw-bold mb-3">Contact Us</h5>
            <ul className="list-unstyled">
              <li className="mb-2 d-flex align-items-center">
                <FaEnvelope className="me-2" />
                <a href="mailto:contact@runamforme.com" className="text-white text-decoration-none hover-opacity">
                  contact@runamforme.com
                </a>
              </li>
              <li className="mb-2 d-flex align-items-center">
                <FaPhone className="me-2" />
                <a href="tel:+2348000000000" className="text-white text-decoration-none hover-opacity">
                  +234 800 000 0000
                </a>
              </li>
            </ul>
          </Col>
        </Row>

        <hr className="my-4 border-light opacity-25" />

        <div className="text-center">
          <small>
            © {currentYear} RunAmForMe. All rights reserved.
          </small>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;