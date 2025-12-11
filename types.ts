export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export type DiscountType = 'None' | 'Student' | 'PWD' | 'Senior Citizen';

export interface User {
  username: string;
  role: UserRole;
  discountType?: DiscountType;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteStop {
  id: string;
  name: string;
  coords: Coordinates;
  description?: string;
  isTerminal?: boolean; // Added to distinguish terminals
}

export interface TransportRoute {
  id: string;
  name: string;
  path: Coordinates[];
  stops: RouteStop[];
  status: 'active' | 'inactive';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isMapResult?: boolean;
}

export interface PlaceResult {
  title: string;
  uri: string;
}

export interface FeedbackItem {
  id: string;
  type: 'bug' | 'suggestion';
  description: string;
  date: string;
  status: 'pending' | 'resolved';
  sender: string;
  adminReply?: string; // Added for admin responses
}

// Updated to include detailed leg info
export interface RouteLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number }; // Raw API value (Driving)
  calculatedWalkingDuration?: string; // Human realistic walking time
}

export interface TripHistoryItem {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  totalDistance: string;
  totalDuration: string;
  fare: string;
  legs: RouteLeg[]; // Added detailed legs
}