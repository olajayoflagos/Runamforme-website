// src/components/OpenErrandsList.tsx
import  { useState, useEffect } from "react"; // Import React and hooks
// Import only the necessary Firestore functions
import { query, collection, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase/config"; // Import db from config
import type { Errand } from "../types"; // Import the centralized type
// Link import is removed as it's not used in the current rendering loop
// import { Link } from 'react-router-dom'; // Keep this in mind for future detail pages

export default function OpenErrandsList() { // Functional component using React.FC type implicitly
  const [openErrands, setOpenErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Query for errands with status 'open', ordered by creation time
    const q = query(
      collection(db, 'errands'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc') // Order by newest first
      // limit() is not used here, so the import is removed
    );

    // Set up a real-time listener
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const errandsList = snapshot.docs.map(doc => ({
          id: doc.id,
          // Use the updated Errand type which accommodates FieldValue during writes,
          // but doc.data() returns Timestamp when reading.
          ...doc.data() as Omit<Errand, 'id'>
        }));
        setOpenErrands(errandsList);
        setLoading(false); // Data received
        setError(null); // Clear any previous errors
      },
      (err) => {
        console.error("Error fetching open errands:", err);
        setError("Failed to load errands. Please try again later."); // User-friendly error
        setLoading(false); // Stop loading on error
      }
    );

    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, []); // Empty dependency array for listener setup on mount

  // Render logic
  if (loading) {
    return (
       <div className="container mt-4">
          <div className="alert alert-info">Loading open errands...</div>
       </div>
    );
  }

  if (error) {
    return (
       <div className="container mt-4">
          <div className="alert alert-danger" role="alert">{error}</div>
       </div>
    );
  }

  if (openErrands.length === 0) {
    return (
       <div className="container mt-4">
          <div className="alert alert-info">No open errands found at the moment. Check back later!</div>
       </div>
    );
  }

  return (
    <div className="container my-5 open-errands-section"> {/* Container with vertical margin, custom class */}
      <h3 className="mb-4 text-center">Available Errands</h3> {/* Centered heading with bottom margin */}
      <div className="row"> {/* Bootstrap grid row */}
        {openErrands.map(errand => (
          <div key={errand.id} className="col-sm-6 col-md-4 col-lg-3 mb-4"> {/* Responsive grid columns */}
             {/* Card for each errand */}
             <div className="card h-100 shadow-sm d-flex flex-column"> {/* Card styling, equal height, flex column */}
              <div className="card-body d-flex flex-column"> {/* Card body, flex column */}
                 {/* Use strong tag for description */}
                 <h5 className="card-title text-primary mb-2">{errand.description}</h5> {/* Title with theme color */}
                 {/* Muted text for details */}
                 <p className="card-text text-muted mb-1">📍 {errand.location}</p>
                 <p className="card-text text-muted mb-1">⏱️ Duration: {errand.duration}</p>
                 {/* Fee stands out */}
                 <p className="card-text fw-bold mt-2">
                   💰 Fee: ₦{errand.fee != null ? errand.fee.toLocaleString() : "N/A"}
                 </p> {/* Bold fee, top margin */}
                 {/* Action button pushed to bottom */}
                 <div className="mt-auto"> {/* Push button to the bottom */}
                    {/* Replace with Link to errand detail page later if implemented */}
                     <button className="btn btn-success w-100">View & Accept</button> {/* Success button, full width */}
                 </div>
              </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
