// firebase/firestore.ts
// Import the initialized db instance from your config file
import { db } from "./config";

// Re-export the db instance if components still import it from here
export { db };

// Note: Any complex Firestore queries or operations could potentially
// be defined as functions here and exported, but for now, importing
// db directly in components is common.
