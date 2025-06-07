import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, CollectionReference, DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';

initializeApp();

interface UserData {
  username?: string;
}

export const migrateErrands = onRequest(async (req, res) => {
  try {
    const db = getFirestore();
    const errandsRef: CollectionReference = db.collection('errands');
    const errandsSnapshot = await errandsRef.get();
    console.log(`Found ${errandsSnapshot.size} errands to migrate.`);
    let processed = 0;

    for (const errandDoc of errandsSnapshot.docs) {
      const errand = errandDoc.data();
      try {
        const userRef: DocumentReference = db.collection('users').doc(errand.userId);
        const userDoc: DocumentSnapshot<UserData> = await userRef.get();
        const username: string = userDoc.exists && userDoc.data()?.username ? userDoc.data()?.username ?? '' : '';
        await errandDoc.ref.update({ username });
        console.log(`Updated errand ${errandDoc.id} with username: ${username}`);
        processed++;
      } catch (error: unknown) {
        console.error(`Failed to update errand ${errandDoc.id}:`, error);
      }
    }
    res.status(200).send(`Migration complete. Processed ${processed} of ${errandsSnapshot.size} errands.`);
  } catch (error: unknown) {
    console.error('Migration failed:', error);
    res.status(500).send(`Migration failed: ${(error as Error).message}`);
  }
});