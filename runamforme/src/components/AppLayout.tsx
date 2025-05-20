// src/components/AppLayout.tsx
import React from 'react'; // Import React
// Import Outlet from react-router-dom
import { Outlet } from 'react-router-dom';
// Import your NavBar and Footer components
import Navbar from './NavBar'; // Assuming NavBar is in the same components directory
import Footer from './Footer'; // Assuming Footer is in the same components directory

const AppLayout: React.FC = () => {
  return (
    <div className="app-container"> {/* Optional wrapper div for overall layout (e.g., flexbox for sticky footer) */}
      <Navbar /> {/* Render the navigation bar */}
      {/* The main content area where the routed components will render */}
      <main className="content-wrap"> {/* Add a class for potential styling (e.g., padding to avoid footer overlap) */}
        <Outlet /> {/* This component renders the element of the currently matched child route */}
      </main>
      <Footer /> {/* Render the footer */}
    </div>
  );
};

export default AppLayout;
