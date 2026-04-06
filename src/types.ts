export type BinType = "general" | "recycling" | "compost" | "electronic";
export type BinStatus = "active" | "maintenance" | "full";
export type UserRole = "admin" | "staff" | "student";

export interface WasteBin {
  id: string;
  location: string;
  type: BinType;
  fillLevel: number;
  lastEmptied: string;
  status: BinStatus;
}

export interface WasteLog {
  id: string;
  binId: string;
  timestamp: string;
  weight: number;
  type: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  points: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
