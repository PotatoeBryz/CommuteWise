import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, ChatMessage, FeedbackItem, Coordinates, TripHistoryItem, RouteStop, RouteLeg, TransportRoute } from '../types';
import { MapWithRoute, DEFAULT_ROUTE_PATH, TANDANG_SORA_LOCATION, MAHARLIKA_LOCATION } from './MapWithRoute';
import { getGeminiResponse } from '../services/geminiService';
import { 
  Menu, LogOut, MapPin, Navigation, Send, Loader2, Bot, 
  Search, Info, BarChart3, Route, Warehouse, DollarSign, MessageSquare, LayoutGrid,
  Bug, X, CheckCircle, Clock, CheckSquare, AlertCircle, ArrowUpDown, Crosshair,
  Footprints, Bus, MapPin as MapPinIcon, Pointer, History, Calendar, Trash2, ArrowRight,
  Users, ArrowUpRight, RefreshCw, Download, TrendingUp, Flag, XCircle, Play, Star, ChevronLeft, CreditCard, Save, Edit2, Plus, ArrowLeftRight, Repeat, Map, Undo, Eraser, Filter, MessageCircle,
  Activity, PieChart, ThumbsUp, AlertTriangle, Lightbulb, Percent, Shield, Zap
} from 'lucide-react';

const TANDANG_SORA_NAME = "Tandang Sora Market";
const MAHARLIKA_NAME = "Maharlika (Teacher's Village)";

// Default Stops Data (Used if no local storage)
const DEFAULT_STOPS: RouteStop[] = [
  { id: '1', name: 'Tandang Sora Market', coords: TANDANG_SORA_LOCATION, description: 'Terminal at Commonwealth', isTerminal: true },
  { id: '2', name: 'Visayas Intersection', coords: { lat: 14.6714, lng: 121.0449 }, description: 'Corner Tandang Sora & Visayas', isTerminal: false },
  { id: '3', name: 'Congressional Ave', coords: { lat: 14.6625, lng: 121.0473 }, description: 'Sanville / Congressional Cross', isTerminal: false },
  { id: '4', name: 'QC City Hall / Kalayaan', coords: { lat: 14.6480, lng: 121.0540 }, description: 'Kalayaan Avenue Drop-off', isTerminal: false },
  { id: '5', name: 'Maharlika', coords: MAHARLIKA_LOCATION, description: 'End of Route (Maharlika St)', isTerminal: true },
];

const INITIAL_ROUTES: TransportRoute[] = [
    {
        id: '1',
        name: 'Tandang Sora - Maharlika',
        path: DEFAULT_ROUTE_PATH,
        stops: DEFAULT_STOPS,
        status: 'active'
    }
];

// --- Helper Functions for Geometry ---
const getDistanceSq = (p1: Coordinates, p2: Coordinates) => {
    return Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2);
};

const findNearestPointOnRoute = (target: Coordinates, path: Coordinates[]) => {
    let nearest = path[0];
    let minDist = Infinity;
    path.forEach(p => {
        const d = getDistanceSq(target, p);
        if (d < minDist) {
            minDist = d;
            nearest = p;
        }
    });
    return nearest;
};

// --- Real Walking Estimate Helper ---
// Average walking speed ~4.8km/h = ~80 meters per minute
const calculateWalkingTime = (distanceMeters: number): string => {
    if (distanceMeters <= 0) return "0 min";
    const minutes = Math.ceil(distanceMeters / 80);
    if (minutes >= 60) {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs} hr ${mins} min`;
    }
    return `${minutes} min`;
};


// --- Sub-component: Autocomplete Input ---
interface LocationAutocompleteProps {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  userLocation: { lat: number; lng: number } | null;
  className?: string;
  onFocus?: () => void;
  autoFocus?: boolean;
  onPickMap?: () => void;
}

const LocationAutocompleteInput: React.FC<LocationAutocompleteProps> = ({ 
  icon, value, onChange, placeholder, userLocation, className, onFocus, autoFocus, onPickMap
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(true); // Show "Your Location" even if empty
      return;
    }

    if (window.google && window.google.maps && window.google.maps.places) {
      const service = new window.google.maps.places.AutocompleteService();
      const request = {
        input: val,
        componentRestrictions: { country: 'ph' }, // Restrict to Philippines
        locationBias: userLocation ? {
            radius: 10000, // 10km bias
            center: userLocation
        } : undefined,
      };

      service.getPlacePredictions(request, (predictions: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      });
    }
  };

  const handleSelect = (description: string) => {
    onChange(description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
        <div className="shrink-0 text-slate-400">
           {icon}
        </div>
        <input 
          type="text" 
          value={value}
          onChange={handleInput}
          onFocus={() => { 
            if (onFocus) onFocus();
            setShowSuggestions(true); 
          }}
          placeholder={placeholder} 
          className="flex-1 min-w-0 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          autoComplete="off"
          autoFocus={autoFocus}
        />
        {onPickMap && (
           <button 
             type="button" 
             onClick={onPickMap}
             className="shrink-0 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
             title="Pick location on map"
           >
             <MapPinIcon className="w-4 h-4" />
           </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white rounded-lg shadow-xl border border-slate-100 mt-1 max-h-60 overflow-y-auto">
          {/* Your Location Option */}
          {userLocation && (
             <button
                onClick={() => handleSelect("Your Location")}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 flex items-center gap-3 transition-colors group"
             >
                <div className="p-1.5 bg-blue-100 rounded-full text-blue-600">
                   <Crosshair className="w-4 h-4" />
                </div>
                <div>
                   <p className="text-sm font-semibold text-blue-600">Your Location</p>
                </div>
             </button>
          )}

          {suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelect(prediction.description)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-start gap-3 transition-colors group"
            >
              <div className="mt-0.5 p-1.5 bg-slate-100 rounded-full text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                 <MapPin className="w-3 h-3" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 line-clamp-1">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
          <div className="px-2 py-1 bg-slate-50 text-[10px] text-slate-400 text-right">
             powered by Google
          </div>
        </div>
      )}
    </div>
  );
};


interface DashboardProps {
  user: User;
  onLogout: () => void;
}

// Global Stats Interface for Admin
interface GlobalStats {
    totalSearches: number;
    totalRevenue: number; // Simulated based on fares
    topLocations: Record<string, number>;
    hourlyActivity: Record<number, number>; // Hour (0-23) -> Count
}

interface FareConfig {
  baseFare: number;
  baseKm: number;
  perKmRate: number;
  discountRate: number; // Percentage (e.g., 20)
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'route' | 'chat' | 'history'>('route');
  const [activeAdminMenu, setActiveAdminMenu] = useState('Dashboard');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Routes State (Scalable)
  const [routes, setRoutes] = useState<TransportRoute[]>(INITIAL_ROUTES);
  const [selectedAdminRouteId, setSelectedAdminRouteId] = useState<string>(INITIAL_ROUTES[0].id);

  // Route Planning State (User side uses first route for now)
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  // Temp coordinates for pins before calculation
  const [selectedOriginCoords, setSelectedOriginCoords] = useState<Coordinates | null>(null);
  const [selectedDestinationCoords, setSelectedDestinationCoords] = useState<Coordinates | null>(null);

  const [isNavigating, setIsNavigating] = useState(false);
  const [routeDirection, setRouteDirection] = useState<'forward' | 'backward'>('forward'); // Forward = TS -> Maharlika
  
  // Map Selection State
  const [pickingMode, setPickingMode] = useState<'origin' | 'destination' | null>(null);
  // Admin Map States
  const [focusedLocation, setFocusedLocation] = useState<Coordinates | null>(null);
  const [adminMapMode, setAdminMapMode] = useState<'view' | 'edit_path' | 'add_stop'>('view');

  const [searchTrigger, setSearchTrigger] = useState<{
      origin: string | Coordinates, 
      destination: string | Coordinates,
      waypoints?: { location: string | Coordinates; stopover: boolean }[]
  } | null>(null);
  
  const [routeStats, setRouteStats] = useState<{
      totalDistance: string;
      totalDuration: string;
      fare: string;
      legs: RouteLeg[] 
  } | null>(null);

  const [isCalculating, setIsCalculating] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'model', 
      text: 'Hi! I\'m CommuteWise AI. Ask me about the Tandang Sora - Maharlika route or landmarks nearby.' 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Feedback State (Shared)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackModalTab, setFeedbackModalTab] = useState<'new' | 'history'>('new');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion'>('bug');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Admin Feedback Reply State
  const [adminReplyText, setAdminReplyText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  // Trip History State
  const [tripHistory, setTripHistory] = useState<TripHistoryItem[]>([]);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<TripHistoryItem | null>(null);

  // Analytics State
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
      totalSearches: 0,
      totalRevenue: 0,
      topLocations: {},
      hourlyActivity: {}
  });

  // Fare Configuration State (Editable by Admin)
  const [fareConfig, setFareConfig] = useState<FareConfig>({
      baseFare: 13.00,
      baseKm: 4,
      perKmRate: 1.75,
      discountRate: 20 // Default 20%
  });
  const [isEditingFare, setIsEditingFare] = useState(false);
  const [tempFareConfig, setTempFareConfig] = useState<FareConfig>(fareConfig);

  // Admin Route Editing State
  const [isEditingStops, setIsEditingStops] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [tempStopData, setTempStopData] = useState<{name: string, description: string, isTerminal: boolean}>({ name: '', description: '', isTerminal: false });
  // View Details Toggle for Routes
  const [showRouteDetails, setShowRouteDetails] = useState(false);

  // Helper to get active route data for admin
  const activeAdminRoute = routes.find(r => r.id === selectedAdminRouteId) || routes[0];

  // Helper to get active route for user (assuming single route for now)
  const userActiveRoute = routes[0]; 

  // Load Data on mount
  useEffect(() => {
    // Feedbacks
    const storedFeedbacks = localStorage.getItem('commutewise_feedbacks');
    if (storedFeedbacks) {
      setFeedbacks(JSON.parse(storedFeedbacks));
    }

    // History (User Specific)
    if (user.role !== UserRole.GUEST) {
        // CHANGED KEY to reset mock data
        const historyKey = `commutewise_history_v2_${user.username}`;
        const storedHistory = localStorage.getItem(historyKey);
        if (storedHistory) {
            setTripHistory(JSON.parse(storedHistory));
        }
    }

    // Global Stats (Simulated persistence)
    const storedStats = localStorage.getItem('commutewise_stats');
    if (storedStats) {
        setGlobalStats(JSON.parse(storedStats));
    }

    // Fare Config
    const storedFareConfig = localStorage.getItem('commutewise_fare_config');
    if (storedFareConfig) {
        setFareConfig(JSON.parse(storedFareConfig));
        setTempFareConfig(JSON.parse(storedFareConfig));
    }

    // Routes Config
    const storedRoutes = localStorage.getItem('commutewise_routes');
    if (storedRoutes) {
        setRoutes(JSON.parse(storedRoutes));
    }
  }, [user]);

  // Persist routes whenever they change
  useEffect(() => {
      localStorage.setItem('commutewise_routes', JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    // Mock getting location - Quezon City default if permission denied
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        console.warn("Location permission denied", err);
        setUserLocation({ lat: 14.6625, lng: 121.0473 }); // Center on route (Visayas)
      }
    );
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    const response = await getGeminiResponse(
        chatHistory, 
        userMsg.text, 
        userLocation || undefined
    );
    
    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response.text,
      isMapResult: response.places && response.places.length > 0
    };

    setChatHistory(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  const geocodeLocation = (location: string | Coordinates): Promise<Coordinates> => {
      return new Promise((resolve, reject) => {
          if (typeof location !== 'string') {
              resolve(location);
              return;
          }
          if (location === "Your Location" && userLocation) {
              resolve(userLocation);
              return;
          }
          if (!window.google || !window.google.maps) {
              reject("Google Maps not loaded");
              return;
          }
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: location, componentRestrictions: { country: 'ph' } }, (results: any, status: any) => {
              if (status === 'OK' && results[0]) {
                  resolve({
                      lat: results[0].geometry.location.lat(),
                      lng: results[0].geometry.location.lng()
                  });
              } else {
                  reject(status);
              }
          });
      });
  };

  const handleCalculateRoute = async () => {
    if (!originInput.trim() || !destinationInput.trim()) return;

    setIsCalculating(true);
    setRouteStats(null);

    try {
        const originCoords = await geocodeLocation(originInput);
        const destinationCoords = await geocodeLocation(destinationInput);

        // Update selected coordinates for map visualization
        setSelectedOriginCoords(originCoords);
        setSelectedDestinationCoords(destinationCoords);

        const pickupPoint = findNearestPointOnRoute(originCoords, userActiveRoute.path);
        const dropoffPoint = findNearestPointOnRoute(destinationCoords, userActiveRoute.path);

        setSearchTrigger({
            origin: originCoords,
            destination: destinationCoords,
            waypoints: [
                { location: pickupPoint, stopover: true },
                { location: dropoffPoint, stopover: true }
            ]
        });

    } catch (error) {
        console.error("Routing error:", error);
        alert("Could not find locations. Please try being more specific.");
        setIsCalculating(false);
    }
  };

  const handleSwapLocations = () => {
    const temp = originInput;
    setOriginInput(destinationInput);
    setDestinationInput(temp);
    // Swap coords too
    const tempCoords = selectedOriginCoords;
    setSelectedOriginCoords(selectedDestinationCoords);
    setSelectedDestinationCoords(tempCoords);
  };
  
  const handleCancelRoute = () => {
    setRouteStats(null);
    setSearchTrigger(null);
    setSelectedOriginCoords(null);
    setSelectedDestinationCoords(null);
    setIsNavigating(false);
  };

  const handleStartPick = (mode: 'origin' | 'destination') => {
      setPickingMode(mode);
      if (window.innerWidth < 768) {
        setSidebarOpen(false); 
      }
  };

  const handleCancelPick = () => {
      setPickingMode(null);
      setSidebarOpen(true);
  };

  const handleMapClick = (coords: Coordinates) => {
      if (isAdmin && adminMapMode === 'edit_path') {
          const updatedRoutes = routes.map(route => {
              if (route.id === selectedAdminRouteId) {
                  return { ...route, path: [...route.path, coords] };
              }
              return route;
          });
          setRoutes(updatedRoutes);
          return;
      }

      if (isAdmin && adminMapMode === 'add_stop') {
          const newStop: RouteStop = {
              id: Date.now().toString(),
              name: "New Stop",
              coords: coords,
              description: "New stop description",
              isTerminal: false
          };
          const updatedRoutes = routes.map(route => {
              if (route.id === selectedAdminRouteId) {
                  return { ...route, stops: [...route.stops, newStop] };
              }
              return route;
          });
          setRoutes(updatedRoutes);
          setAdminMapMode('view');
          
          setEditingStopId(newStop.id);
          setTempStopData({ name: newStop.name, description: newStop.description || '', isTerminal: false });
          return;
      }

      if (pickingMode && window.google && window.google.maps) {
          // Immediately set coordinates to show pin
          if (pickingMode === 'origin') setSelectedOriginCoords(coords);
          if (pickingMode === 'destination') setSelectedDestinationCoords(coords);

          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: coords }, (results: any, status: any) => {
              if (status === 'OK' && results[0]) {
                  const address = results[0].formatted_address;
                  if (pickingMode === 'origin') setOriginInput(address);
                  if (pickingMode === 'destination') setDestinationInput(address);
              } else {
                  const str = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
                  if (pickingMode === 'origin') setOriginInput(str);
                  if (pickingMode === 'destination') setDestinationInput(str);
              }
              
              setPickingMode(null);
              setSidebarOpen(true); 
          });
      }
  };

  const calculateJeepneyFare = (distanceMeters: number): string => {
    const baseFare = fareConfig.baseFare;
    const baseKm = fareConfig.baseKm * 1000; 
    const costPerKm = fareConfig.perKmRate;
    
    if (distanceMeters <= 0) return "₱0.00";
    
    let totalFare = 0;

    if (distanceMeters <= baseKm) {
        totalFare = baseFare;
    } else {
        const extraMeters = distanceMeters - baseKm;
        const extraKm = Math.ceil(extraMeters / 1000); 
        totalFare = baseFare + (extraKm * costPerKm);
    }

    if (user.role === UserRole.USER && user.discountType && user.discountType !== 'None') {
        const discountAmount = totalFare * (fareConfig.discountRate / 100);
        totalFare = totalFare - discountAmount;
    }
    
    return `₱${totalFare.toFixed(2)}`;
  };

  const updateGlobalStats = (fareStr: string) => {
     const fareValue = parseFloat(fareStr.replace('₱', '')) || 0;
     const currentHour = new Date().getHours();

     const newStats = {
         totalSearches: globalStats.totalSearches + 1,
         totalRevenue: globalStats.totalRevenue + fareValue,
         topLocations: {
             ...globalStats.topLocations,
             [destinationInput]: (globalStats.topLocations[destinationInput] || 0) + 1
         },
         hourlyActivity: {
             ...globalStats.hourlyActivity,
             [currentHour]: (globalStats.hourlyActivity[currentHour] || 0) + 1
         }
     };
     setGlobalStats(newStats);
     localStorage.setItem('commutewise_stats', JSON.stringify(newStats));
  };

  const handleResetAnalytics = () => {
     if(confirm("Are you sure you want to reset all analytics data?")) {
         const reset = { totalSearches: 0, totalRevenue: 0, topLocations: {}, hourlyActivity: {} };
         setGlobalStats(reset);
         localStorage.setItem('commutewise_stats', JSON.stringify(reset));
     }
  };

  const handleSaveFareConfig = (e: React.FormEvent) => {
      e.preventDefault();
      setFareConfig(tempFareConfig);
      localStorage.setItem('commutewise_fare_config', JSON.stringify(tempFareConfig));
      setIsEditingFare(false);
      alert("Fare matrix updated successfully!");
  };

  const handleEditStop = (stop: RouteStop) => {
      setEditingStopId(stop.id);
      setTempStopData({ name: stop.name, description: stop.description || '', isTerminal: stop.isTerminal || false });
  };

  const handleSaveStop = (stopId: string) => {
      const updatedRoutes = routes.map(route => {
          if (route.id === selectedAdminRouteId) {
              return {
                  ...route,
                  stops: route.stops.map(s => 
                      s.id === stopId ? { ...s, name: tempStopData.name, description: tempStopData.description, isTerminal: tempStopData.isTerminal } : s
                  )
              };
          }
          return route;
      });
      setRoutes(updatedRoutes);
      setEditingStopId(null);
  };

  const handleDeleteStop = (stopId: string) => {
      if(confirm("Are you sure you want to delete this stop?")) {
          const updatedRoutes = routes.map(route => {
             if (route.id === selectedAdminRouteId) {
                 return { ...route, stops: route.stops.filter(s => s.id !== stopId) };
             }
             return route;
          });
          setRoutes(updatedRoutes);
      }
  };

  const handleStartAddStop = () => {
      setAdminMapMode('add_stop');
  };
  
  const handleAddRoute = () => {
      const newRoute: TransportRoute = {
          id: Date.now().toString(),
          name: "New Route",
          path: [],
          stops: [],
          status: 'active'
      };
      setRoutes([...routes, newRoute]);
      setSelectedAdminRouteId(newRoute.id);
      setAdminMapMode('edit_path');
  };

  const handleClearPath = () => {
      if(confirm("Clear the entire route path?")) {
          const updatedRoutes = routes.map(r => r.id === selectedAdminRouteId ? { ...r, path: [] } : r);
          setRoutes(updatedRoutes);
      }
  };

  const handleUndoPathPoint = () => {
      const updatedRoutes = routes.map(r => {
          if (r.id === selectedAdminRouteId && r.path.length > 0) {
              const newPath = [...r.path];
              newPath.pop();
              return { ...r, path: newPath };
          }
          return r;
      });
      setRoutes(updatedRoutes);
  };

  const handleLocateStop = (coords: Coordinates) => {
      setFocusedLocation(coords);
  };

  const handleRouteStatsCalculated = (stats: { 
    totalDistance: string; 
    totalDuration: string; 
    legs: { distance: { text: string; value: number }, duration: { text: string; value: number } }[] 
  }) => {
    
    let fare = "N/A";
    let legsData: RouteLeg[] = [];

    if (stats.legs) {
        legsData = stats.legs.map((leg, index) => {
            if (index === 0 || (stats.legs.length > 2 && index === stats.legs.length - 1)) {
                return {
                    ...leg,
                    calculatedWalkingDuration: calculateWalkingTime(leg.distance.value)
                };
            }
            return leg;
        });
    }

    if (legsData.length >= 2) {
        fare = calculateJeepneyFare(legsData[1].distance.value);
    } else if (legsData.length === 1) {
        fare = calculateJeepneyFare(legsData[0].distance.value);
    }

    setRouteStats({
        totalDistance: stats.totalDistance,
        totalDuration: stats.totalDuration,
        fare: fare,
        legs: legsData
    });
    setIsCalculating(false);

    updateGlobalStats(fare);

    if (user.role !== UserRole.GUEST) {
        saveTripToHistory(stats.totalDistance, stats.totalDuration, fare, legsData);
    }
  };

  const saveTripToHistory = (distance: string, duration: string, fare: string, legs: RouteLeg[]) => {
    const newHistoryItem: TripHistoryItem = {
        id: Date.now().toString(),
        origin: originInput === "Your Location" ? "My Location" : originInput,
        destination: destinationInput === "Your Location" ? "My Location" : destinationInput,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        totalDistance: distance,
        totalDuration: duration,
        fare: fare,
        legs: legs 
    };

    const updatedHistory = [newHistoryItem, ...tripHistory].slice(0, 50); 
    setTripHistory(updatedHistory);
    // Use v2 key to effectively clear previous mock history
    localStorage.setItem(`commutewise_history_v2_${user.username}`, JSON.stringify(updatedHistory));
  };

  const handleReuseHistory = (item: TripHistoryItem) => {
      setOriginInput(item.origin === "My Location" ? "Your Location" : item.origin);
      setDestinationInput(item.destination === "My Location" ? "Your Location" : item.destination);
      setViewingHistoryItem(null); 
      setActiveTab('route');
  };
  
  const handleStartJourney = () => {
     setIsNavigating(true);
  };
  
  const handleEndNavigation = (completed: boolean) => {
     setIsNavigating(false);
     setRouteStats(null);
     setSearchTrigger(null);
     setSelectedOriginCoords(null);
     setSelectedDestinationCoords(null);
     setOriginInput('');
     setDestinationInput('');
     
     if (completed) {
        alert("You have arrived at your destination!");
     }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    
    setIsSubmittingFeedback(true);
    
    const newFeedback: FeedbackItem = {
      id: Date.now().toString(),
      type: feedbackType,
      description: feedbackText,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
      sender: user.username
    };

    const updatedFeedbacks = [newFeedback, ...feedbacks];
    setFeedbacks(updatedFeedbacks);
    localStorage.setItem('commutewise_feedbacks', JSON.stringify(updatedFeedbacks));
    
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setShowFeedbackModal(false);
      setFeedbackText('');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }, 1000);
  };

  const handleResolveFeedback = (id: string, reply: string) => {
    const updatedFeedbacks = feedbacks.map(f => 
      f.id === id ? { ...f, status: 'resolved' as const, adminReply: reply } : f
    );
    setFeedbacks(updatedFeedbacks);
    localStorage.setItem('commutewise_feedbacks', JSON.stringify(updatedFeedbacks));
    setReplyingToId(null);
    setAdminReplyText('');
  };

  const isAdmin = user.role === UserRole.ADMIN;

  const filteredFeedbacks = feedbacks.filter(f => {
      if (feedbackFilter === 'all') return true;
      return f.status === feedbackFilter;
  });

  const renderAdminContent = () => {
    switch (activeAdminMenu) {
      case 'Dashboard':
        const pendingBugs = feedbacks.filter(f => f.type === 'bug' && f.status === 'pending').length;
        return (
          <div className="p-8 h-full overflow-y-auto bg-slate-50">
            {/* Enhanced Admin Dashboard Header */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
                <h2 className="text-3xl font-bold mb-2">System Overview</h2>
                <p className="text-slate-300">Welcome back, Admin. Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Card 1: Feedbacks */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Reports</span>
                </div>
                <h3 className="text-4xl font-bold text-slate-800 mb-1">{feedbacks.length}</h3>
                <p className="text-sm text-slate-500">Total feedbacks received</p>
              </div>

              {/* Card 2: Pending Issues */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-100 transition-colors">
                    <Bug className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Action Needed</span>
                </div>
                <h3 className="text-4xl font-bold text-slate-800 mb-1">{pendingBugs}</h3>
                <p className="text-sm text-slate-500">Pending bug reports</p>
              </div>

              {/* Card 3: System Status */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-100 transition-colors">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Status</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <h3 className="text-xl font-bold text-slate-800">Operational</h3>
                </div>
                <p className="text-sm text-slate-500">All systems normal</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-slate-400" /> Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {feedbacks.slice(0, 5).map(f => (
                      <div key={f.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg px-2 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${f.type === 'bug' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{f.sender} submitted a {f.type}</p>
                            <p className="text-xs text-slate-400">{f.date}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${f.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {f.status}
                        </span>
                      </div>
                    ))}
                    {feedbacks.length === 0 && <p className="text-slate-400 text-sm italic">No recent activity recorded.</p>}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setActiveAdminMenu('Route Management')}
                            className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                        >
                            <Map className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-2 transition-colors" />
                            <p className="font-bold text-slate-700 group-hover:text-blue-700">Manage Routes</p>
                            <p className="text-xs text-slate-400">Edit stops & paths</p>
                        </button>
                        <button 
                            onClick={() => setActiveAdminMenu('Fares')}
                            className="p-4 rounded-xl border border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                        >
                            <DollarSign className="w-6 h-6 text-slate-400 group-hover:text-green-600 mb-2 transition-colors" />
                            <p className="font-bold text-slate-700 group-hover:text-green-700">Update Fares</p>
                            <p className="text-xs text-slate-400">Adjust pricing matrix</p>
                        </button>
                        <button 
                            onClick={() => setActiveAdminMenu('Feedbacks')}
                            className="p-4 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-all text-left group"
                        >
                            <MessageSquare className="w-6 h-6 text-slate-400 group-hover:text-orange-600 mb-2 transition-colors" />
                            <p className="font-bold text-slate-700 group-hover:text-orange-700">Check Reports</p>
                            <p className="text-xs text-slate-400">View user feedback</p>
                        </button>
                        <button 
                            onClick={() => setActiveAdminMenu('Analytic Reports')}
                            className="p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                        >
                            <BarChart3 className="w-6 h-6 text-slate-400 group-hover:text-purple-600 mb-2 transition-colors" />
                            <p className="font-bold text-slate-700 group-hover:text-purple-700">View Analytics</p>
                            <p className="text-xs text-slate-400">See performance data</p>
                        </button>
                    </div>
                </div>
            </div>
          </div>
        );

      case 'Feedbacks':
        return (
          <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">User Feedbacks</h2>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                    <button 
                      onClick={() => setFeedbackFilter('all')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${feedbackFilter === 'all' ? 'bg-slate-100 text-slate-800 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setFeedbackFilter('pending')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${feedbackFilter === 'pending' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Pending
                    </button>
                    <button 
                      onClick={() => setFeedbackFilter('resolved')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${feedbackFilter === 'resolved' ? 'bg-green-100 text-green-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Resolved
                    </button>
                </div>
            </div>
            
            <div className="space-y-4">
              {filteredFeedbacks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No feedbacks found.</p>
                </div>
              ) : (
                filteredFeedbacks.map(f => (
                  <div key={f.id} className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${f.status === 'pending' ? 'border-l-4 border-l-orange-500 border-y-slate-200 border-r-slate-200' : 'border-l-4 border-l-green-500 border-y-slate-200 border-r-slate-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide ${f.type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {f.type}
                        </span>
                        <span className="text-sm text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {f.date}
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                           by {f.sender}
                        </span>
                      </div>
                      {f.status === 'resolved' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                           <CheckCircle className="w-3 h-3" /> Resolved
                        </span>
                      )}
                    </div>
                    
                    <p className="text-slate-700 text-sm leading-relaxed mb-4">{f.description}</p>
                    
                    {/* Admin Reply Section */}
                    {f.status === 'pending' ? (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            {replyingToId === f.id ? (
                                <div className="space-y-3">
                                    <textarea 
                                        value={adminReplyText}
                                        onChange={(e) => setAdminReplyText(e.target.value)}
                                        className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="Type your reply or resolution note..."
                                        rows={2}
                                        autoFocus
                                    ></textarea>
                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            onClick={() => { setReplyingToId(null); setAdminReplyText(''); }}
                                            className="text-xs font-bold text-slate-500 px-3 py-1.5 hover:bg-slate-200 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => handleResolveFeedback(f.id, adminReplyText)}
                                            className="text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 flex items-center gap-1"
                                        >
                                            <CheckCircle className="w-3 h-3" /> Reply & Resolve
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                  onClick={() => { setReplyingToId(f.id); setAdminReplyText(''); }}
                                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-green-600 transition-colors py-2 rounded-lg hover:bg-green-50"
                                >
                                  <MessageCircle className="w-4 h-4" /> Add Reply & Resolve
                                </button>
                            )}
                        </div>
                    ) : (
                        f.adminReply && (
                            <div className="mt-3 pl-4 border-l-2 border-green-200 bg-green-50/50 p-3 rounded-r-xl">
                                <p className="text-xs font-bold text-green-800 mb-1">Admin Response</p>
                                <p className="text-sm text-slate-600">{f.adminReply}</p>
                            </div>
                        )
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'Analytic Reports':
        // Real Data Calculations
        // 1. Top Destinations (sorted by frequency)
        const sortedLocations = Object.entries(globalStats.topLocations)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5); // Top 5
        
        const maxLocCount = (sortedLocations[0]?.[1] as number) || 1;
        
        const topDestinations = sortedLocations.map(([name, count]) => ({
            name,
            count: count as number,
            percent: ((count as number) / maxLocCount) * 100
        }));

        // 2. Peak Hours (0-23 hours bucket)
        const timeSlots = [6, 9, 12, 15, 18, 21];
        const values = Object.values(globalStats.hourlyActivity) as number[];
        const maxActivity = Math.max(...values, 1);
        
        const peakHoursData = timeSlots.map(hour => {
            const count = globalStats.hourlyActivity[hour] || 0;
            const label = hour > 12 ? `${hour - 12}PM` : hour === 12 ? '12PM' : `${hour}AM`;
            return {
                label,
                value: count,
                height: `${(count / maxActivity) * 100}%`
            };
        });

        // 3. Satisfaction Rate
        const resolvedCount = feedbacks.filter(f => f.status === 'resolved').length;
        const totalFeedbacks = feedbacks.length || 1;
        const satisfactionRate = feedbacks.length === 0 ? 100 : Math.round((resolvedCount / totalFeedbacks) * 100);

        return (
          <div className="p-8 h-full overflow-y-auto bg-slate-50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Analytic Reports</h2>
                <p className="text-slate-500 text-sm mt-1">Operational insights and real-time metrics</p>
              </div>
              <div className="flex items-center gap-3 mt-4 md:mt-0">
                <button 
                  onClick={handleResetAnalytics}
                  className="p-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-bold flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Data
                </button>
                <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Live System
                </div>
              </div>
            </div>
      
            {/* Metric Cards Grid - Expanded */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Searches */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Searches</p>
                       <h3 className="text-3xl font-bold text-slate-800 mt-2">{globalStats.totalSearches}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                       <BarChart3 className="w-5 h-5" />
                    </div>
                 </div>
                 <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                    <TrendingUp className="w-3 h-3" /> Real-time Count
                 </div>
              </div>
      
              {/* Est. Revenue */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-green-300 transition-colors">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Est. Revenue</p>
                       <h3 className="text-3xl font-bold text-slate-800 mt-2">₱{globalStats.totalRevenue.toFixed(2)}</h3>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                       <DollarSign className="w-5 h-5" />
                    </div>
                 </div>
                 <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                 </div>
                 <p className="text-xs text-slate-400 mt-2">Accumulated Value</p>
              </div>
      
              {/* User Satisfaction */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-orange-300 transition-colors">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">User Satisfaction</p>
                       <h3 className="text-3xl font-bold text-slate-800 mt-2">{satisfactionRate}%</h3>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                       <ThumbsUp className="w-5 h-5" />
                    </div>
                 </div>
                 <p className="text-xs text-slate-400">Based on resolved tickets</p>
              </div>

              {/* Active Routes */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-300 transition-colors">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Active Routes</p>
                       <h3 className="text-3xl font-bold text-slate-800 mt-2">{routes.length}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                       <Route className="w-5 h-5" />
                    </div>
                 </div>
                 <p className="text-xs text-slate-400">{routes.reduce((acc, r) => acc + r.stops.length, 0)} total stops active</p>
              </div>
            </div>

            {/* Visual Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* Peak Hours Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            Activity by Hour (Today)
                        </h4>
                        <span className="text-xs text-slate-400">User Searches</span>
                    </div>
                    <div className="h-48 flex items-end gap-2 sm:gap-6 justify-center px-4">
                        {peakHoursData.map((d, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 group w-full">
                                <div className="w-full bg-blue-50/50 rounded-t-lg relative h-40 flex items-end hover:bg-blue-100 transition-colors">
                                    <div 
                                        style={{ height: d.value === 0 ? '4px' : d.height }} 
                                        className={`w-full rounded-t-lg relative transition-all duration-500 ${d.value === 0 ? 'bg-slate-200' : 'bg-blue-500 group-hover:bg-blue-600'}`}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            {d.value} searches
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-500">{d.label}</span>
                            </div>
                        ))}
                    </div>
                    {peakHoursData.every(d => d.value === 0) && (
                        <p className="text-center text-xs text-slate-400 mt-2">No activity recorded yet for these time slots.</p>
                    )}
                </div>

                {/* Top Destinations List */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-500" />
                        Top Destinations
                    </h4>
                    <div className="space-y-5">
                        {topDestinations.map((dest, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{dest.name}</span>
                                    <span className="font-bold text-slate-900">{dest.count}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div 
                                        className={`h-2 rounded-full ${i === 0 ? 'bg-red-500' : 'bg-slate-400'}`} 
                                        style={{ width: `${dest.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {topDestinations.length === 0 && <p className="text-sm text-slate-400 italic text-center py-10">No search data available yet.</p>}
                    </div>
                </div>
            </div>
          </div>
        );

      case 'Route Management': 
        return (
            <div className="p-8 h-full overflow-y-auto bg-slate-50 flex flex-col">
               <div className="flex justify-between items-center mb-6 shrink-0">
                   <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                       <Map className="w-6 h-6 text-blue-600" />
                       Route Management
                   </h2>
                   <div className="flex gap-2">
                       {/* Dropdown for Routes */}
                       <select 
                          value={selectedAdminRouteId}
                          onChange={(e) => setSelectedAdminRouteId(e.target.value)}
                          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-bold"
                       >
                           {routes.map(r => (
                               <option key={r.id} value={r.id}>{r.name}</option>
                           ))}
                       </select>
                       
                       <button 
                         onClick={handleAddRoute}
                         className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                       >
                          <Plus className="w-4 h-4" /> New Route
                       </button>
                   </div>
               </div>

               <div className="flex-1 flex gap-6 overflow-hidden">
                   {/* Left: Stops List & Config */}
                   <div className="w-96 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                       <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                           <h3 className="font-bold text-slate-700">Stops & Terminals</h3>
                           <button 
                             onClick={handleStartAddStop}
                             disabled={adminMapMode !== 'view'}
                             className={`text-xs px-2 py-1 rounded font-bold transition-colors flex items-center gap-1 ${adminMapMode === 'add_stop' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                           >
                              <Plus className="w-3 h-3" /> {adminMapMode === 'add_stop' ? 'Click Map...' : 'Add Stop'}
                           </button>
                       </div>
                       
                       <div className="flex-1 overflow-y-auto p-4 space-y-3">
                           {activeAdminRoute.stops.map((stop) => (
                               <div key={stop.id} className={`p-3 rounded-xl border transition-all hover:shadow-sm ${stop.isTerminal ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-100'}`}>
                                   <div className="flex items-start gap-3">
                                       <div className={`p-1.5 rounded-full mt-0.5 ${stop.isTerminal ? 'bg-orange-200 text-orange-700' : 'bg-blue-100 text-blue-600'}`}>
                                           {stop.isTerminal ? <Warehouse className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                       </div>
                                       
                                       <div className="flex-1">
                                           {editingStopId === stop.id ? (
                                               <div className="space-y-2">
                                                   <input 
                                                     type="text" 
                                                     value={tempStopData.name}
                                                     onChange={(e) => setTempStopData({...tempStopData, name: e.target.value})}
                                                     className="w-full p-1.5 border border-slate-300 rounded text-sm font-bold"
                                                     placeholder="Name"
                                                   />
                                                   <input 
                                                     type="text" 
                                                     value={tempStopData.description}
                                                     onChange={(e) => setTempStopData({...tempStopData, description: e.target.value})}
                                                     className="w-full p-1.5 border border-slate-300 rounded text-xs"
                                                     placeholder="Desc"
                                                   />
                                                   <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                                       <input 
                                                         type="checkbox"
                                                         checked={tempStopData.isTerminal}
                                                         onChange={(e) => setTempStopData({...tempStopData, isTerminal: e.target.checked})}
                                                       />
                                                       Is Terminal?
                                                   </label>
                                                   <div className="flex gap-2 justify-end mt-1">
                                                       <button onClick={() => setEditingStopId(null)} className="text-xs text-slate-500 px-2">Cancel</button>
                                                       <button onClick={() => handleSaveStop(stop.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Save</button>
                                                   </div>
                                               </div>
                                           ) : (
                                               <>
                                                   <div className="flex justify-between items-start">
                                                       <h4 className="font-bold text-slate-800 text-sm">{stop.name}</h4>
                                                       <div className="flex gap-1">
                                                           <button onClick={() => handleLocateStop(stop.coords)} className="text-slate-400 hover:text-blue-500"><Crosshair className="w-3 h-3" /></button>
                                                           <button onClick={() => handleEditStop(stop)} className="text-slate-400 hover:text-blue-500"><Edit2 className="w-3 h-3" /></button>
                                                           <button onClick={() => handleDeleteStop(stop.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                       </div>
                                                   </div>
                                                   <p className="text-xs text-slate-500 line-clamp-1">{stop.description}</p>
                                                   {stop.isTerminal && (
                                                       <span className="inline-block mt-1 text-[10px] bg-orange-200 text-orange-800 px-1.5 rounded font-bold uppercase">Terminal</span>
                                                   )}
                                               </>
                                           )}
                                       </div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>

                   {/* Right: Map Preview with Editing Controls */}
                   <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
                       <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center relative z-10">
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Route Map Visualization</span>
                           
                           {/* Route Path Controls */}
                           <div className="flex items-center gap-2">
                               {adminMapMode === 'edit_path' ? (
                                   <>
                                      <span className="text-xs font-bold text-orange-600 animate-pulse mr-2">Click map to add points</span>
                                      <button 
                                        onClick={handleUndoPathPoint}
                                        className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium hover:bg-slate-300 flex items-center gap-1"
                                      >
                                         <Undo className="w-3 h-3" /> Undo
                                      </button>
                                      <button 
                                        onClick={handleClearPath}
                                        className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-medium hover:bg-red-200 flex items-center gap-1"
                                      >
                                         <Eraser className="w-3 h-3" /> Clear
                                      </button>
                                      <button 
                                        onClick={() => setAdminMapMode('view')}
                                        className="text-xs bg-green-600 text-white px-3 py-1 rounded font-bold hover:bg-green-700 flex items-center gap-1"
                                      >
                                         <CheckCircle className="w-3 h-3" /> Done
                                      </button>
                                   </>
                               ) : (
                                   <>
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">{activeAdminRoute.path.length} Path Points</span>
                                      <button 
                                        onClick={() => setAdminMapMode('edit_path')}
                                        disabled={adminMapMode === 'add_stop'}
                                        className="text-xs border border-blue-200 text-blue-600 px-2 py-1 rounded font-medium hover:bg-blue-50 flex items-center gap-1"
                                      >
                                         <Edit2 className="w-3 h-3" /> Edit Path
                                      </button>
                                   </>
                               )}
                           </div>
                       </div>
                       
                       {/* Map Banner for modes */}
                       {adminMapMode === 'add_stop' && (
                           <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 animate-bounce">
                               <MapPin className="w-4 h-4" /> Click map to place new stop
                               <button onClick={() => setAdminMapMode('view')} className="ml-2 bg-white/20 rounded-full p-0.5 hover:bg-white/40"><X className="w-3 h-3"/></button>
                           </div>
                       )}

                       <div className="flex-1 relative">
                           {/* Using MapWithRoute but with specific props for admin view */}
                           <MapWithRoute 
                               userLocation={null}
                               routePath={activeAdminRoute.path}
                               stops={activeAdminRoute.stops}
                               focusedLocation={focusedLocation}
                               onMapClick={handleMapClick}
                               selectionMode={adminMapMode === 'add_stop' ? 'destination' : adminMapMode === 'edit_path' ? 'origin' : null} 
                               searchRoute={null} 
                           />
                       </div>
                   </div>
               </div>
            </div>
        );

      case 'Fares':
         return (
            <div className="p-8 h-full overflow-y-auto bg-slate-50">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-slate-800">Fare Matrix</h2>
                   {!isEditingFare ? (
                      <button 
                        onClick={() => setIsEditingFare(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                         <Edit2 className="w-4 h-4" /> Edit Rates
                      </button>
                   ) : (
                      <div className="flex gap-2">
                         <button 
                           onClick={() => { setIsEditingFare(false); setTempFareConfig(fareConfig); }}
                           className="text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                         >
                           Cancel
                         </button>
                         <button 
                           onClick={handleSaveFareConfig}
                           className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                         >
                            <Save className="w-4 h-4" /> Save Changes
                         </button>
                      </div>
                   )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <form onSubmit={handleSaveFareConfig}>
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-100">
                              <tr>
                                  <th className="p-4 font-bold text-slate-600">Metric</th>
                                  <th className="p-4 font-bold text-slate-600">Value</th>
                                  <th className="p-4 font-bold text-slate-600">Description</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              <tr>
                                  <td className="p-4 font-medium text-slate-800">Base Fare (PHP)</td>
                                  <td className="p-4">
                                     {isEditingFare ? (
                                        <input 
                                          type="number" step="0.25"
                                          value={tempFareConfig.baseFare}
                                          onChange={(e) => setTempFareConfig({...tempFareConfig, baseFare: parseFloat(e.target.value)})}
                                          className="w-24 p-2 border border-slate-300 rounded font-bold text-green-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                     ) : (
                                        <span className="font-bold text-green-600">₱{fareConfig.baseFare.toFixed(2)}</span>
                                     )}
                                  </td>
                                  <td className="p-4 text-slate-500">
                                     Minimum fare for the first <span className="font-bold">{fareConfig.baseKm}km</span>
                                  </td>
                              </tr>
                              <tr>
                                  <td className="p-4 font-medium text-slate-800">Succeeding Rate (PHP)</td>
                                  <td className="p-4">
                                     {isEditingFare ? (
                                        <input 
                                          type="number" step="0.25"
                                          value={tempFareConfig.perKmRate}
                                          onChange={(e) => setTempFareConfig({...tempFareConfig, perKmRate: parseFloat(e.target.value)})}
                                          className="w-24 p-2 border border-slate-300 rounded font-bold text-green-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                     ) : (
                                        <span className="font-bold text-green-600">+ ₱{fareConfig.perKmRate.toFixed(2)}</span>
                                     )}
                                  </td>
                                  <td className="p-4 text-slate-500">Add-on cost per kilometer</td>
                              </tr>
                              <tr>
                                  <td className="p-4 font-medium text-slate-800">Base Distance (km)</td>
                                  <td className="p-4">
                                     {isEditingFare ? (
                                        <div className="flex items-center gap-2">
                                           <input 
                                             type="number" step="1"
                                             value={tempFareConfig.baseKm}
                                             onChange={(e) => setTempFareConfig({...tempFareConfig, baseKm: parseFloat(e.target.value)})}
                                             className="w-24 p-2 border border-slate-300 rounded font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                           />
                                           <span className="text-slate-400 text-xs">km</span>
                                        </div>
                                     ) : (
                                        <span className="font-bold text-slate-700">{fareConfig.baseKm} km</span>
                                     )}
                                  </td>
                                  <td className="p-4 text-slate-500">Distance covered by base fare</td>
                              </tr>
                              <tr>
                                  <td className="p-4 font-medium text-slate-800">Discount Rate (%)</td>
                                  <td className="p-4">
                                     {isEditingFare ? (
                                        <div className="flex items-center gap-2">
                                           <input 
                                             type="number" step="1"
                                             value={tempFareConfig.discountRate}
                                             onChange={(e) => setTempFareConfig({...tempFareConfig, discountRate: parseFloat(e.target.value)})}
                                             className="w-24 p-2 border border-slate-300 rounded font-bold text-orange-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                           />
                                           <span className="text-slate-400 text-xs">%</span>
                                        </div>
                                     ) : (
                                        <span className="font-bold text-orange-600">{fareConfig.discountRate}%</span>
                                     )}
                                  </td>
                                  <td className="p-4 text-slate-500">Percentage off for Students, PWDs, and Seniors</td>
                              </tr>
                          </tbody>
                      </table>
                    </form>
                    <div className="p-4 bg-yellow-50 text-yellow-800 text-xs border-t border-yellow-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Changes to these values will immediately affect all new route calculations.
                    </div>
                </div>
            </div>
         );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      
      {/* Sidebar Panel */}
      <aside 
        className={`
          bg-white shadow-2xl flex flex-col transition-[width] duration-300 ease-in-out z-[2000] overflow-hidden
          fixed inset-y-0 left-0 md:static md:h-full
          ${sidebarOpen ? 'w-full md:w-80' : 'w-0'}
        `}
      >
        <div className="w-full md:w-80 flex flex-col h-full overflow-hidden min-w-[20rem]">
            {/* Sidebar Header */}
            <div className={`p-6 ${isAdmin ? 'bg-green-700' : 'bg-slate-900'} text-white flex justify-between items-center shrink-0`}>
              <div className="flex items-center gap-3">
                 {/* Close Button (Visible inside sidebar) */}
                 <button 
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    title="Close Sidebar"
                 >
                    <ChevronLeft className="w-5 h-5" />
                 </button>
                 <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                       CommuteWise
                    </h2>
                    <p className="text-slate-200 text-xs mt-1">
                      {isAdmin ? 'Admin Panel' : `Welcome, ${user.username}`}
                    </p>
                    {user.role === UserRole.USER && user.discountType && user.discountType !== 'None' && (
                        <span className="inline-block mt-1 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white border border-white/30">
                            {user.discountType}
                        </span>
                    )}
                 </div>
              </div>
              <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-lg text-slate-200 hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
              
              {/* Admin Menu */}
              {isAdmin ? (
                 <div className="p-4 space-y-2">
                    <button 
                      onClick={() => setActiveAdminMenu('Dashboard')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeAdminMenu === 'Dashboard' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                       <LayoutGrid className="w-5 h-5" /> Dashboard
                    </button>
                    <button 
                       onClick={() => setActiveAdminMenu('Feedbacks')}
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeAdminMenu === 'Feedbacks' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                       <MessageSquare className="w-5 h-5" /> Feedbacks
                    </button>
                    <div className="h-px bg-slate-200 my-2 mx-4"></div>
                    
                    {/* Consolidated Route Management */}
                    <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Logistics</p>
                    <button 
                       onClick={() => setActiveAdminMenu('Route Management')}
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeAdminMenu === 'Route Management' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                       <Route className="w-5 h-5" /> Route Management
                    </button>
                    
                    <button 
                       onClick={() => setActiveAdminMenu('Fares')}
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeAdminMenu === 'Fares' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                       <DollarSign className="w-5 h-5" /> Fares
                    </button>
                    <button 
                       onClick={() => setActiveAdminMenu('Analytic Reports')}
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeAdminMenu === 'Analytic Reports' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                       <BarChart3 className="w-5 h-5" /> Analytic Reports
                    </button>
                 </div>
              ) : (
                /* User/Guest Tabs */
                <>
                <div className="flex border-b border-slate-200 shrink-0 bg-white">
                  <button 
                    onClick={() => setActiveTab('route')}
                    className={`flex-1 py-4 text-xs md:text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'route' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Route
                  </button>
                  {user.role !== UserRole.GUEST && (
                     <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-4 text-xs md:text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                     >
                        History
                     </button>
                  )}
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-4 text-xs md:text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'chat' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    AI Assistant
                  </button>
                </div>
                
                {/* Route Tab Content */}
                {activeTab === 'route' && (
                  <div className="p-6 space-y-6">
                    {/* Live Navigation Mode UI */}
                    {isNavigating && routeStats ? (
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200 space-y-6 animate-in fade-in zoom-in duration-300">
                             {/* ... (Existing Nav UI) ... */}
                             <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    Live Navigation
                                </h2>
                                <div className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded uppercase tracking-wider">
                                    On Route
                                </div>
                            </div>
                            {/* Trip Details Card */}
                            <div className="space-y-4">
                                 {/* Origin -> Dest */}
                                 <div className="flex flex-col gap-2">
                                     <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                             <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                                         </div>
                                         <div>
                                             <p className="text-xs text-slate-500 uppercase font-bold">From</p>
                                             <p className="text-sm font-medium text-slate-800 line-clamp-1">{originInput}</p>
                                         </div>
                                     </div>
                                     <div className="pl-4 ml-0.5 h-6 border-l-2 border-dashed border-slate-300"></div>
                                     <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                                             <MapPin className="w-4 h-4 text-red-500" />
                                         </div>
                                         <div>
                                             <p className="text-xs text-slate-500 uppercase font-bold">To</p>
                                             <p className="text-sm font-medium text-slate-800 line-clamp-1">{destinationInput}</p>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Stats */}
                                 <div className="grid grid-cols-2 gap-3 pt-2">
                                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                         <p className="text-xs text-slate-500 mb-1">Est. Time</p>
                                         <p className="text-lg font-bold text-slate-800">{routeStats.totalDuration}</p>
                                     </div>
                                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                         <p className="text-xs text-slate-500 mb-1">Fare {user.discountType && user.discountType !== 'None' && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded ml-1 font-bold">-{fareConfig.discountRate}%</span>}</p>
                                         <p className="text-lg font-bold text-green-600">{routeStats.fare}</p>
                                     </div>
                                 </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button 
                                    onClick={() => handleEndNavigation(false)}
                                    className="py-3 px-4 rounded-xl border border-red-100 bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" /> Cancel
                                </button>
                                <button 
                                    onClick={() => handleEndNavigation(true)}
                                    className="py-3 px-4 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-500 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Flag className="w-4 h-4" /> Arrived
                                </button>
                            </div>
                        </div>
                    ) : !routeStats ? (
                    /* Default Search Form */
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative">
                      
                      {/* Route Direction Toggle */}
                      <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                        <button 
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition-all ${routeDirection === 'forward' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setRouteDirection('forward')}
                        >
                            <span>Forward (To Maharlika)</span>
                        </button>
                        <button 
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition-all ${routeDirection === 'backward' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setRouteDirection('backward')}
                        >
                            <span>Backward (To T.Sora)</span>
                        </button>
                      </div>

                      {/* Visual Connector Lines */}
                      <div className="absolute left-7 top-[5.5rem] bottom-10 flex flex-col items-center">
                          <div className="w-0.5 grow border-l-2 border-dotted border-slate-300"></div>
                      </div>

                      <div className="relative space-y-3">
                        {/* Origin */}
                        <LocationAutocompleteInput
                          icon={<div className="w-4 h-4 rounded-full border-[3px] border-slate-600 bg-white"></div>}
                          value={originInput}
                          onChange={setOriginInput}
                          placeholder="Starting point"
                          userLocation={userLocation}
                          autoFocus
                          onPickMap={() => handleStartPick('origin')}
                        />

                        {/* SMART ROUTING INDICATOR */}
                        <div className="pl-12 pr-2 py-1 animate-in fade-in duration-300">
                            <div className="bg-green-50 border border-green-100 rounded-lg p-2 flex items-center gap-3">
                                <div className="bg-green-100 p-1.5 rounded-full text-green-600">
                                    <Route className="w-3 h-3" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Smart Routing</p>
                                    <p className="text-[10px] text-green-600 font-medium">
                                        Boarding at nearest route point
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Swap Button (Floating) */}
                        <div className="absolute right-0 top-[4.5rem] z-10">
                            <button 
                               onClick={handleSwapLocations}
                               className="p-2 bg-white rounded-full border border-slate-200 text-blue-600 hover:bg-blue-50 shadow-sm transition-all"
                               title="Swap locations"
                            >
                               <ArrowUpDown className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Destination */}
                        <LocationAutocompleteInput
                          icon={<MapPin className="w-5 h-5 text-red-500" />}
                          value={destinationInput}
                          onChange={setDestinationInput}
                          placeholder="Destination"
                          userLocation={userLocation}
                          onPickMap={() => handleStartPick('destination')}
                        />
                      </div>

                      <div className="mt-4 pt-2">
                        <button 
                          onClick={handleCalculateRoute}
                          disabled={isCalculating || !originInput || !destinationInput}
                          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium shadow-md hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                          {isCalculating ? 'Calculating...' : 'Find Route & Estimate'}
                        </button>
                      </div>
                    </div>
                    ) : (
                    /* NEW JOURNEY DETAILS UI */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <Send className="w-4 h-4 text-green-600 -rotate-45" />
                                    <h2 className="text-lg font-bold text-slate-800">Journey Details</h2>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Review your route before starting</p>
                            </div>
                        </div>

                        {/* Summary Cards Row */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center mb-6">
                            <div className="text-center flex-1 border-r border-slate-100">
                                <MapPin className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                                <div className="font-bold text-slate-800">{routeStats.totalDistance}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Distance</div>
                            </div>
                            <div className="text-center flex-1 border-r border-slate-100">
                                <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                                <div className="font-bold text-slate-800">{routeStats.totalDuration}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Duration</div>
                            </div>
                            <div className="text-center flex-1">
                                <DollarSign className="w-4 h-4 text-green-600 mx-auto mb-1" />
                                <div className="font-bold text-green-600">{routeStats.fare}</div>
                                <div className="text-[10px] text-green-600 uppercase tracking-wide flex justify-center items-center gap-1">
                                    Total Fare
                                    {user.discountType && user.discountType !== 'None' && (
                                        <span className="bg-green-100 text-green-700 px-1 rounded text-[8px]">-{fareConfig.discountRate}%</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <h3 className="text-sm font-medium text-slate-600 mb-4">Journey Details (3 Legs)</h3>

                        {/* Timeline Container */}
                        <div className="space-y-0 relative pl-2">
                            
                            {/* LEG 1: WALK TO PICKUP */}
                            <div className="flex gap-3 relative z-10">
                                <div className="flex flex-col items-center">
                                    <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white">1</div>
                                    <div className="w-0.5 flex-1 bg-slate-200 my-1"></div>
                                </div>
                                <div className="flex-1 pb-6 bg-white border border-slate-100 rounded-xl p-3 shadow-sm mb-4">
                                    <div className="flex justify-between font-bold text-sm mb-1">
                                        <span className="text-slate-800">Walk to Pickup</span>
                                        <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded">Free</span>
                                    </div>
                                    
                                    <div className="flex gap-3 mt-3">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg h-fit">
                                           <Footprints className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded">Walk / Tricycle</span>
                                                <span className="text-[10px] border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Access</span>
                                            </div>
                                            <p className="text-xs text-slate-600 line-clamp-2">From: {originInput}</p>
                                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                                               <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {routeStats.legs?.[0]?.calculatedWalkingDuration || '10m'}</span>
                                               <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3"/> {routeStats.legs?.[0]?.distance?.text || '1km'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LEG 2: JEEPNEY RIDE */}
                            <div className="flex gap-3 relative z-10">
                                <div className="flex flex-col items-center">
                                    {/* Connector line from top */}
                                    <div className="absolute top-0 bottom-0 left-[11px] w-0.5 bg-slate-200 -z-10"></div> 
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white z-10">2</div>
                                    <div className="w-0.5 flex-1 bg-slate-200 my-1"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-2 relative">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                               <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                  <Bus className="w-6 h-6" />
                                               </div>
                                               <div>
                                                   <div className="flex items-center gap-2 mb-1">
                                                       <span className="text-xs font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">Jeepney</span>
                                                       <span className="text-[10px] border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Public</span>
                                                   </div>
                                                   <p className="text-xs font-medium text-slate-700">
                                                       {routeDirection === 'forward' ? 'To Maharlika' : 'To Tandang Sora'}
                                                   </p>
                                               </div>
                                            </div>
                                            <div className="font-bold text-green-600 text-sm">{routeStats.fare}</div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-50">
                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                <Clock className="w-3 h-3" /> {routeStats.legs?.[1]?.duration?.text || 'N/A'}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                <MapPinIcon className="w-3 h-3" /> {routeStats.legs?.[1]?.distance?.text || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LEG 3: WALK TO DESTINATION */}
                            <div className="flex gap-3 relative z-10 mt-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white">3</div>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                                        <div className="flex justify-between font-bold text-sm mb-1">
                                            <span className="text-slate-800">Walk to Destination</span>
                                        </div>
                                        <div className="flex gap-3 mt-2">
                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg h-fit">
                                                <Footprints className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-600">Arrive at: {destinationInput}</p>
                                                 <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                                                   <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {routeStats.legs?.[2]?.calculatedWalkingDuration || '5m'}</span>
                                                   <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3"/> {routeStats.legs?.[2]?.distance?.text || '200m'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Fixed Bottom Actions */}
                        <div className="mt-8 pt-4 border-t border-slate-100 flex gap-3">
                            <button 
                               onClick={handleCancelRoute}
                               className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
                            >
                               Cancel
                            </button>
                            <button 
                               onClick={handleStartJourney}
                               className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                            >
                               <Play className="w-4 h-4 fill-current" /> Start
                            </button>
                        </div>

                    </div>
                    )}
                  </div>
                )}

                {/* History Tab Content */}
                {activeTab === 'history' && user.role !== UserRole.GUEST && (
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                 <History className="w-5 h-5 text-blue-600" /> Trip History
                             </h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                            {tripHistory.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                    <Calendar className="w-10 h-10 mb-2 opacity-50" />
                                    <p className="text-sm">No trips calculated yet.</p>
                                </div>
                            ) : (
                                tripHistory.map((item) => (
                                    <button 
                                        key={item.id}
                                        onClick={() => setViewingHistoryItem(item)} // OPEN DETAILED MODAL
                                        className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left group"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{item.date} • {item.time}</span>
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                        
                                        <div className="space-y-1 mb-3">
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <div className="w-2 h-2 rounded-full border-2 border-slate-600"></div>
                                                <span className="truncate w-full font-medium">{item.origin}</span>
                                            </div>
                                            <div className="ml-1 pl-3 border-l border-slate-200 h-2"></div>
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <MapPin className="w-3 h-3 text-red-500" />
                                                <span className="truncate w-full font-medium">{item.destination}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs border-t border-slate-50 pt-2">
                                            <span className="flex items-center gap-1 text-slate-500">
                                                <Clock className="w-3 h-3" /> {item.totalDuration}
                                            </span>
                                            <span className="flex items-center gap-1 font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                                {item.fare}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Chat Tab Content */}
                {activeTab === 'chat' && (
                  <div className="flex flex-col h-full">
                    {/* ... (Existing Chat UI) ... */}
                    <div className="flex-1 p-4 space-y-4">
                      {chatHistory.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                            msg.role === 'user' 
                              ? 'bg-blue-600 text-white rounded-br-none' 
                              : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                          }`}>
                            {msg.role === 'model' && (
                              <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider opacity-50">
                                <Bot className="w-3 h-3" />
                                CommuteWise AI
                              </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            {msg.isMapResult && (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Locations found on map
                                  </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    
                    <div className="p-4 bg-white border-t border-slate-200 mt-auto">
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask about stops..."
                          className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button 
                          type="submit"
                          disabled={isTyping || !chatInput.trim()}
                          className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
                </>
              )}

            </div>

            {/* Commuter Footer: Feedback Button */}
            {!isAdmin && (
              <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                <button 
                  onClick={() => setShowFeedbackModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  <Bug className="w-4 h-4" />
                  Report Issue / Feedback
                </button>
              </div>
            )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative h-full w-full flex flex-col min-w-0"> 
         {/* ... (Main Content: Map/Dashboard Overlays) ... */}
         
         {/* Mobile/Desktop Header Toggle */}
         {!sidebarOpen && !pickingMode && (
             <div className="absolute top-4 left-4 z-[1000]">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-3 bg-white rounded-xl shadow-lg hover:bg-slate-50 text-slate-700 transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
             </div>
         )}

         {/* Admin Dashboard Overlay (Now relative to this flex-1 container) */}
         {isAdmin && (['Route Management'].indexOf(activeAdminMenu) === -1) && (
             <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-sm z-10 animate-in fade-in duration-300 overflow-y-auto">
                 {renderAdminContent()}
             </div>
         )}
         
         {/* Map */}
         <div className="flex-1 h-full w-full relative">
             {/* Map renders the userActiveRoute path */}
            <MapWithRoute 
               userLocation={userLocation}
               routePath={userActiveRoute.path} 
               stops={userActiveRoute.stops}    
               searchRoute={searchTrigger}
               onRouteStatsCalculated={handleRouteStatsCalculated}
               selectionMode={pickingMode}
               onMapClick={handleMapClick}
               focusedLocation={focusedLocation}
               tempOrigin={selectedOriginCoords}
               tempDestination={selectedDestinationCoords}
            />
             
             {/* Map Selection Overlay Banner */}
             {pickingMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex flex-col items-center animate-in slide-in-from-top-4 fade-in duration-300">
                   <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 border border-slate-700">
                      <div className="flex items-center gap-2">
                         <Pointer className="w-4 h-4 animate-bounce" />
                         <span className="font-medium text-sm">
                            Click on map to select {pickingMode === 'origin' ? 'Starting Point' : 'Destination'}
                         </span>
                      </div>
                      <div className="h-4 w-px bg-slate-600"></div>
                      <button 
                        onClick={handleCancelPick}
                        className="text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wide transition-colors"
                      >
                        Cancel
                      </button>
                   </div>
                </div>
             )}
         </div>
         
      </main>

      {/* Feedback Modal (Upgraded) */}
      {showFeedbackModal && (
        <div className="absolute inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex gap-4">
                        <button 
                           onClick={() => setFeedbackModalTab('new')}
                           className={`text-sm font-bold pb-2 border-b-2 transition-colors ${feedbackModalTab === 'new' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                        >
                           Report Issue
                        </button>
                        <button 
                           onClick={() => setFeedbackModalTab('history')}
                           className={`text-sm font-bold pb-2 border-b-2 transition-colors ${feedbackModalTab === 'history' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                        >
                           My Reports
                        </button>
                    </div>
                    <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {feedbackModalTab === 'new' ? (
                        <form onSubmit={handleFeedbackSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Issue Type</label>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setFeedbackType('bug')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${feedbackType === 'bug' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        Bug Report
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFeedbackType('suggestion')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${feedbackType === 'suggestion' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        Suggestion
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                                <textarea 
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder={feedbackType === 'bug' ? "Describe the error you encountered..." : "Share your ideas with us..."}
                                    required
                                ></textarea>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmittingFeedback || !feedbackText.trim()}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Feedback'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {feedbacks.filter(f => f.sender === user.username).length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">You haven't submitted any reports yet.</p>
                                </div>
                            ) : (
                                feedbacks.filter(f => f.sender === user.username).map(f => (
                                    <div key={f.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${f.type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{f.type}</span>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${f.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{f.status}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 mb-2">{f.description}</p>
                                        <p className="text-[10px] text-slate-400 text-right">{f.date}</p>
                                        
                                        {/* User View of Admin Reply */}
                                        {f.adminReply && (
                                            <div className="mt-3 pt-3 border-t border-slate-200">
                                                <div className="flex items-start gap-2">
                                                    <div className="mt-0.5 p-1 bg-green-100 rounded-full text-green-600">
                                                        <MessageCircle className="w-3 h-3" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Support Response</p>
                                                        <p className="text-xs text-slate-600 mt-0.5">{f.adminReply}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2001] bg-green-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium text-sm">Feedback sent successfully!</span>
          </div>
      )}

      {/* Trip History Detail Modal */}
      {viewingHistoryItem && (
         <div className="absolute inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <History className="w-5 h-5 text-blue-600" />
                     Trip Details
                  </h3>
                  <button onClick={() => setViewingHistoryItem(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="p-6 overflow-y-auto">
                   <div className="flex justify-between items-center mb-6">
                       <div>
                           <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Date</div>
                           <div className="text-slate-800 font-medium">{viewingHistoryItem.date}</div>
                       </div>
                       <div className="text-right">
                           <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Time</div>
                           <div className="text-slate-800 font-medium">{viewingHistoryItem.time}</div>
                       </div>
                   </div>

                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex justify-around text-center">
                       <div>
                           <div className="text-lg font-bold text-slate-800">{viewingHistoryItem.totalDuration}</div>
                           <div className="text-[10px] uppercase font-bold text-slate-400">Duration</div>
                       </div>
                       <div className="w-px bg-slate-200"></div>
                       <div>
                           <div className="text-lg font-bold text-slate-800">{viewingHistoryItem.totalDistance}</div>
                           <div className="text-[10px] uppercase font-bold text-slate-400">Distance</div>
                       </div>
                       <div className="w-px bg-slate-200"></div>
                       <div>
                           <div className="text-lg font-bold text-green-600">{viewingHistoryItem.fare}</div>
                           <div className="text-[10px] uppercase font-bold text-green-600">Total Fare</div>
                       </div>
                   </div>

                   <h4 className="font-bold text-slate-700 mb-4 text-sm">Detailed Itinerary</h4>
                   <div className="space-y-0 relative pl-2">
                        {/* Start Leg */}
                        <div className="flex gap-3 relative z-10 pb-6">
                             <div className="flex flex-col items-center">
                                 <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white">1</div>
                                 <div className="w-0.5 flex-1 bg-slate-200 my-1 absolute top-6 bottom-0"></div>
                             </div>
                             <div className="flex-1">
                                 <div className="text-sm font-bold text-slate-800 mb-1">Walk to Pickup</div>
                                 <div className="text-xs text-slate-500 mb-2">{viewingHistoryItem.origin}</div>
                                 <div className="flex gap-2">
                                     <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                        <Footprints className="w-3 h-3" /> Walk
                                     </span>
                                     <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                        {viewingHistoryItem.legs?.[0]?.calculatedWalkingDuration || 'N/A'}
                                     </span>
                                     <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                        {viewingHistoryItem.legs?.[0]?.distance?.text || 'N/A'}
                                     </span>
                                 </div>
                             </div>
                        </div>

                        {/* Jeep Leg */}
                        <div className="flex gap-3 relative z-10 pb-6">
                             <div className="flex flex-col items-center">
                                 <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white">2</div>
                                 <div className="w-0.5 flex-1 bg-slate-200 my-1 absolute top-6 bottom-0"></div>
                             </div>
                             <div className="flex-1">
                                 <div className="text-sm font-bold text-slate-800 mb-1">Jeepney Ride</div>
                                 <div className="text-xs text-slate-500 mb-2">Tandang Sora Route</div>
                                 <div className="flex gap-2">
                                     <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                        <Bus className="w-3 h-3" /> Jeepney
                                     </span>
                                     <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                        {viewingHistoryItem.fare}
                                     </span>
                                     <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                        {viewingHistoryItem.legs?.[1]?.duration?.text || 'N/A'}
                                     </span>
                                 </div>
                             </div>
                        </div>

                        {/* End Leg */}
                        <div className="flex gap-3 relative z-10">
                             <div className="flex flex-col items-center">
                                 <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white">3</div>
                             </div>
                             <div className="flex-1">
                                 <div className="text-sm font-bold text-slate-800 mb-1">Arrive at Destination</div>
                                 <div className="text-xs text-slate-500 mb-2">{viewingHistoryItem.destination}</div>
                                 <div className="flex gap-2">
                                     <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                        <Footprints className="w-3 h-3" /> Walk
                                     </span>
                                     <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                        {viewingHistoryItem.legs?.[2]?.calculatedWalkingDuration || 'N/A'}
                                     </span>
                                     <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                        {viewingHistoryItem.legs?.[2]?.distance?.text || 'N/A'}
                                     </span>
                                 </div>
                             </div>
                        </div>
                   </div>
               </div>
               
               <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <button 
                     onClick={() => handleReuseHistory(viewingHistoryItem)}
                     className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                     <Repeat className="w-4 h-4" /> Reuse Route
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};