// src/components/Footer.tsx
import React from 'react'; // Import React

const Footer: React.FC = () => { // Explicitly type the component
  return (

    <footer className="bg-dark text-light py-5"> {/* Increased vertical padding, text-light for better contrast */}
      <div className="container">
        <div className="row">
          {/* Branding/About section */}
          <div className="col-md-6 mb-4 mb-md-0"> {/* Added bottom margin for small screens, removed on medium+ */}
            {/* Use Bootstrap utility for font weight */}
            <h5 className="fw-bold">RunAmForMe</h5>
            <p className="text-secondary"> {/* Slightly muted text color */}
              Get your errands done quickly and efficiently.
            </p>
          </div>
          {/* Links section */}
          <div className="col-md-3 mb-4 mb-md-0"> {/* Added bottom margin for small screens */}
            <h5 className="fw-bold">Links</h5>
            <ul className="list-unstyled"> {/* Remove default list styling */}
              {/* Use Bootstrap utility for text color on links and subtle hover effect */}
              <li><a href="/about" className="text-decoration-none text-light link-opacity-75 link-opacity-100-hover">About Us</a></li>
              <li><a href="/contact" className="text-decoration-none text-light link-opacity-75 link-opacity-100-hover">Contact</a></li>
              <li><a href="/terms" className="text-decoration-none text-light link-opacity-75 link-opacity-100-hover">Terms</a></li>
              {/* Add more links here as needed (e.g., Privacy Policy, FAQ) */}
              {/* If you had a dedicated "Browse Errands" page that wasn't the home page index: */}
              {/* <li><a href="/errands" className="text-decoration-none text-light link-opacity-75 link-opacity-100-hover">Browse Errands</a></li> */}
            </ul>
          </div>
          {/* Contact section */}
          <div className="col-md-3">
            <h5 className="fw-bold">Contact</h5>
            <p className="text-secondary mb-1">contact@runamforme.com</p> {/* Muted text, smaller bottom margin */}
            <p className="text-secondary">+234 800 000 0000</p> {/* Muted text */}
          </div>
        </div>
        {/* Divider */}
        {/* Use Bootstrap utility for margin and border color */}
        <hr className="my-4 border-secondary" /> {/* Adjusted vertical margin, set border color */}
        {/* Copyright text */}
        <div className="text-center text-secondary"> {/* Centered text, muted color */}
          <small>&copy; {new Date().getFullYear()} RunAmForMe. All rights reserved.</small>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
