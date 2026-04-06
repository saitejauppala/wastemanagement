import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  limit,
  Timestamp
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { WasteBin, WasteLog, UserProfile, OperationType, BinType } from "../types";

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeToBins = (callback: (bins: WasteBin[]) => void) => {
  const path = 'bins';
  return onSnapshot(collection(db, path), (snapshot) => {
    const bins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WasteBin));
    callback(bins);
  }, (error) => handleFirestoreError(error, OperationType.LIST, path));
};

export const subscribeToLogs = (callback: (logs: WasteLog[]) => void) => {
  const path = 'logs';
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WasteLog));
    callback(logs);
  }, (error) => handleFirestoreError(error, OperationType.LIST, path));
};

export const subscribeToLeaderboard = (callback: (users: UserProfile[]) => void) => {
  const path = 'users';
  const q = query(collection(db, path), orderBy('points', 'desc'), limit(10));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    callback(users);
  }, (error) => handleFirestoreError(error, OperationType.LIST, path));
};

export const logWaste = async (binId: string, weight: number, type: string) => {
  const path = 'logs';
  try {
    await addDoc(collection(db, path), {
      binId,
      weight,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateBinLevel = async (binId: string, fillLevel: number) => {
  const path = `bins/${binId}`;
  try {
    await updateDoc(doc(db, 'bins', binId), {
      fillLevel,
      status: fillLevel >= 90 ? 'full' : 'active'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const addBin = async (location: string, type: BinType) => {
  const path = 'bins';
  try {
    await addDoc(collection(db, path), {
      location,
      type,
      fillLevel: 0,
      status: 'active',
      lastEmptied: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateUserPoints = async (uid: string, pointsToAdd: number) => {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentPoints = userSnap.data().points || 0;
      await updateDoc(userRef, {
        points: currentPoints + pointsToAdd
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const seedInitialBins = async () => {
  const initialBins = [
    { location: "Main Library Entrance", type: "recycling", fillLevel: 45, status: "active", lastEmptied: new Date().toISOString() },
    { location: "Student Union Cafe", type: "general", fillLevel: 85, status: "active", lastEmptied: new Date().toISOString() },
    { location: "Engineering Block A", type: "compost", fillLevel: 20, status: "active", lastEmptied: new Date().toISOString() },
    { location: "Science Lab 4", type: "electronic", fillLevel: 10, status: "active", lastEmptied: new Date().toISOString() },
    { location: "Campus Gym", type: "recycling", fillLevel: 95, status: "full", lastEmptied: new Date().toISOString() },
  ];

  for (const bin of initialBins) {
    await addDoc(collection(db, "bins"), bin);
  }
};
