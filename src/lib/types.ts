export interface GeoPosition {
  lat: number;
  lng: number;
}

export interface NearbyUser {
  id: string;
  position: GeoPosition;
  avatarSeed: number;
  lastSeen?: string;
}

export interface SafeZone {
  center: GeoPosition;
  radius: number; // in meters
}

export type GeofenceStatus = 'inside' | 'outside' | 'unknown';
export type TrackingState = 'idle' | 'tracking' | 'error';

export interface CommunityEvent {
  id: string;
  title: string;
  location: string;
  time: string;
  description: string;
  joined: boolean;
  coordinates?: GeoPosition;
  interestedCount?: number;
  isInterested?: boolean;
}

export interface FinanceTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  date: string; // ISO string
}

export type ParsedReport = {
  medicationSchedule: {
    medicineName: string;
    dosage: string;
    timeOfDay: string;
    instructions: string;
  }[];
  locations: {
    action: string;
    location: string;
  }[];
  safetyGuardrails: {
    rule: string;
  }[];
};
