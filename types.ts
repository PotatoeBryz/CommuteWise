export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  username: string;
  role: UserRole;
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
}