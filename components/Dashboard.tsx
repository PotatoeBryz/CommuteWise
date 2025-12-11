import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, ChatMessage, FeedbackItem, Coordinates, TripHistoryItem, RouteStop } from '../types';
import { MapWithRoute, ROUTE_PATH } from './MapWithRoute';
import { getGeminiResponse } from '../services/geminiService';
import { 
  Menu, LogOut, MapPin, Navigation, Send, Loader2, Bot, 
  Search, Info, BarChart3, Route, Warehouse, DollarSign, MessageSquare, LayoutGrid,
  Bug, X, CheckCircle, Clock, CheckSquare, AlertCircle, ArrowUpDown, Crosshair,
  Footprints, Bus, MapPin as MapPinIcon, Pointer, History, Calendar, Trash2, ArrowRight,
  Users, ArrowUpRight, RefreshCw, Download, TrendingUp, Flag, XCircle, Play, Star, ChevronLeft, CreditCard, Save, Edit2, Plus
} from 'lucide-react';

// Hardcoded Terminal Location (Matches Tandang Sora Market in MapWithRoute)
const TERMINAL_LOCATION: Coordinates = { lat: 14.66870, lng: 121.05420 };
const TERMINAL_NAME = "Tandang Sora Market Terminal";

// Default Stops Data (Used if no local storage)
const DEFAULT_STOPS: RouteStop[] = [
  { id: '1', name: 'Tandang Sora Market', coords: { lat: 14.6687, lng: 121.0542 }, description: 'Terminal at Commonwealth' },
  { id: '2', name: 'Visayas Intersection', coords: { lat: 14.6714, lng: 121.0449 }, description: 'Corner Tandang Sora & Visayas' },
  { id: '3', name: 'Congressional Ave', coords: { lat: 14.6625, lng: 121.0473 }, description: 'Sanville / Congressional Cross' },
  { id: '4', name: 'QC City Hall / Kalayaan', coords: { lat: 14.6480, lng: 121.0540 }, description: 'Kalayaan Avenue Drop-off' },
  { id: '5', name: 'Maharlika', coords: { lat: 14.6437, lng: 121.0585 }, description: 'End of Route (Maharlika St)' },
];

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
}

interface FareConfig {
  baseFare: number;
  baseKm: number;
  perKmRate: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'route' | 'chat' | 'history'>('route');
  const [activeAdminMenu, setActiveAdminMenu] = useState('Dashboard');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Route Planning State
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Map Selection State
  const [pickingMode, setPickingMode] = useState<'origin' | 'destination' | null>(null);
  // Admin Map Focus State
  const [focusedLocation, setFocusedLocation] = useState<Coordinates | null>(null);

  const [searchTrigger, setSearchTrigger] = useState<{
      origin: string | Coordinates, 
      destination: string | Coordinates,
      waypoints?: { location: string | Coordinates; stopover: boolean }[]
  } | null>(null);
  
  const [routeStats, setRouteStats] = useState<{
      totalDistance: string;
      totalDuration: string;
      fare: string;
      legs?: { distance: { text: string; value: number }, duration: { text: string; value: number } }[]
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
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion'>('bug');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Trip History State
  const [tripHistory, setTripHistory] = useState<TripHistoryItem[]>([]);

  // Analytics State
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
      totalSearches: 0,
      totalRevenue: 0,
      topLocations: {}
  });

  // Fare Configuration State (Editable by Admin)
  const [fareConfig, setFareConfig] = useState<FareConfig>({
      baseFare: 13.00,
      baseKm: 4,
      perKmRate: 1.75
  });
  const [isEditingFare, setIsEditingFare] = useState(false);
  const [tempFareConfig, setTempFareConfig] = useState<FareConfig>(fareConfig);

  // Stops State (Editable by Admin)
  const [stops, setStops] = useState<RouteStop[]>(DEFAULT_STOPS);
  const [isEditingStops, setIsEditingStops] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [tempStopData, setTempStopData] = useState<{name: string, description: string}>({ name: '', description: '' });
  // View Details Toggle for Routes
  const [showRouteDetails, setShowRouteDetails] = useState(false);

  // Load Data on mount
  useEffect(() => {
    // Feedbacks
    const storedFeedbacks = localStorage.getItem('commutewise_feedbacks');
    if (storedFeedbacks) {
      setFeedbacks(JSON.parse(storedFeedbacks));
    }

    // History (User Specific)
    if (user.role !== UserRole.GUEST) {
        const historyKey = `commutewise_history_${user.username}`;
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

    // Stops Config
    const storedStops = localStorage.getItem('commutewise_stops');
    if (storedStops) {
        setStops(JSON.parse(storedStops));
    }
  }, [user]);

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

  const handleCalculateRoute = () => {
    if (originInput.trim() && destinationInput.trim()) {
      setIsCalculating(true);
      // Reset previous stats when calculating a new route
      setRouteStats(null);
      
      const origin = originInput === "Your Location" && userLocation ? userLocation : originInput;
      const destination = destinationInput === "Your Location" && userLocation ? userLocation : destinationInput;

      // Enforce the logic: Origin -> Terminal -> Destination
      // We pass the Terminal as a waypoint
      setSearchTrigger({
        origin,
        destination,
        waypoints: [{ location: TERMINAL_LOCATION, stopover: true }]
      });
    }
  };

  const handleSwapLocations = () => {
    const temp = originInput;
    setOriginInput(destinationInput);
    setDestinationInput(temp);
  };
  
  const handleCancelRoute = () => {
    setRouteStats(null);
    setSearchTrigger(null);
    setIsNavigating(false);
  };

  // --- Map Picking Logic ---
  const handleStartPick = (mode: 'origin' | 'destination') => {
      setPickingMode(mode);
      if (window.innerWidth < 768) {
        setSidebarOpen(false); // Close sidebar on mobile to see map
      }
  };

  const handleCancelPick = () => {
      setPickingMode(null);
      setSidebarOpen(true);
  };

  const handleMapClick = (coords: Coordinates) => {
      if (!pickingMode || !window.google || !window.google.maps) return;

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: coords }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
              const address = results[0].formatted_address;
              if (pickingMode === 'origin') setOriginInput(address);
              if (pickingMode === 'destination') setDestinationInput(address);
          } else {
              // Fallback if address not found
              const str = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
              if (pickingMode === 'origin') setOriginInput(str);
              if (pickingMode === 'destination') setDestinationInput(str);
          }
          
          setPickingMode(null);
          setSidebarOpen(true); // Re-open sidebar
      });
  };

  const calculateJeepneyFare = (distanceMeters: number): string => {
    // Fare Matrix (Uses Admin Configured Values)
    const baseFare = fareConfig.baseFare;
    const baseKm = fareConfig.baseKm * 1000; // convert km to meters
    const costPerKm = fareConfig.perKmRate;
    
    if (distanceMeters <= 0) return "₱0.00";
    if (distanceMeters <= baseKm) {
        return `₱${baseFare.toFixed(2)}`;
    }

    const extraMeters = distanceMeters - baseKm;
    const extraKm = Math.ceil(extraMeters / 1000); // Usually rounded up to next km
    const totalFare = baseFare + (extraKm * costPerKm);
    
    return `₱${totalFare.toFixed(2)}`;
  };

  const updateGlobalStats = (fareStr: string) => {
     const fareValue = parseFloat(fareStr.replace('₱', '')) || 0;
     const newStats = {
         ...globalStats,
         totalSearches: globalStats.totalSearches + 1,
         totalRevenue: globalStats.totalRevenue + fareValue,
         // Rudimentary location tracking (would need better cleaning in real app)
         topLocations: {
             ...globalStats.topLocations,
             [destinationInput]: (globalStats.topLocations[destinationInput] || 0) + 1
         }
     };
     setGlobalStats(newStats);
     localStorage.setItem('commutewise_stats', JSON.stringify(newStats));
  };

  const handleResetAnalytics = () => {
     if(confirm("Are you sure you want to reset all analytics data?")) {
         const reset = { totalSearches: 0, totalRevenue: 0, topLocations: {} };
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

  // --- Stop Management Functions ---
  const handleEditStop = (stop: RouteStop) => {
      setEditingStopId(stop.id);
      setTempStopData({ name: stop.name, description: stop.description || '' });
  };

  const handleSaveStop = (id: string) => {
      const updatedStops = stops.map(s => 
          s.id === id ? { ...s, name: tempStopData.name, description: tempStopData.description } : s
      );
      setStops(updatedStops);
      localStorage.setItem('commutewise_stops', JSON.stringify(updatedStops));
      setEditingStopId(null);
  };

  const handleDeleteStop = (id: string) => {
      if(confirm("Are you sure you want to delete this stop?")) {
          const updatedStops = stops.filter(s => s.id !== id);
          setStops(updatedStops);
          localStorage.setItem('commutewise_stops', JSON.stringify(updatedStops));
      }
  };

  const handleAddStop = () => {
      // In a real app, this would probably let you pick from the map.
      // For this demo, we'll just add a placeholder at the current map center (approx)
      // or at the user location.
      const newStop: RouteStop = {
          id: Date.now().toString(),
          name: "New Stop",
          coords: userLocation || TERMINAL_LOCATION, // Default to terminal if no loc
          description: "Description of new stop"
      };
      const updatedStops = [...stops, newStop];
      setStops(updatedStops);
      localStorage.setItem('commutewise_stops', JSON.stringify(updatedStops));
      
      // Immediately edit the new stop
      setEditingStopId(newStop.id);
      setTempStopData({ name: newStop.name, description: newStop.description || '' });
  };

  const handleLocateStop = (coords: Coordinates) => {
      setFocusedLocation(coords);
      // Close sidebar or minimize functionality to show map
      setActiveAdminMenu('Locations'); // This hides the overlay in our render logic
  };

  const handleRouteStatsCalculated = (stats: { 
    totalDistance: string; 
    totalDuration: string; 
    legs: { distance: { text: string; value: number }, duration: { text: string; value: number } }[] 
  }) => {
    
    // Logic: 
    // Leg 0: Origin -> Terminal (Access leg, no jeep fare)
    // Leg 1: Terminal -> Destination (Jeepney leg)
    
    let fare = "N/A";
    
    // Check if we have the expected 2 legs from the waypoint routing
    if (stats.legs && stats.legs.length >= 2) {
        const jeepLeg = stats.legs[1]; // The second leg is the jeepney ride
        fare = calculateJeepneyFare(jeepLeg.distance.value);
    } else if (stats.legs && stats.legs.length === 1) {
        // Fallback for some reason, calculate on total
        fare = calculateJeepneyFare(stats.legs[0].distance.value);
    }

    setRouteStats({
        totalDistance: stats.totalDistance,
        totalDuration: stats.totalDuration,
        fare: fare,
        legs: stats.legs
    });
    setIsCalculating(false);

    // Update Global Analytics
    updateGlobalStats(fare);

    // --- SAVE TO HISTORY (If not Guest) ---
    if (user.role !== UserRole.GUEST) {
        saveTripToHistory(stats.totalDistance, stats.totalDuration, fare);
    }
  };

  const saveTripToHistory = (distance: string, duration: string, fare: string) => {
    const newHistoryItem: TripHistoryItem = {
        id: Date.now().toString(),
        origin: originInput === "Your Location" ? "My Location" : originInput,
        destination: destinationInput === "Your Location" ? "My Location" : destinationInput,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        totalDistance: distance,
        totalDuration: duration,
        fare: fare
    };

    const updatedHistory = [newHistoryItem, ...tripHistory].slice(0, 50); // Limit to 50 items
    setTripHistory(updatedHistory);
    localStorage.setItem(`commutewise_history_${user.username}`, JSON.stringify(updatedHistory));
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your trip history?")) {
        setTripHistory([]);
        localStorage.removeItem(`commutewise_history_${user.username}`);
    }
  };

  const handleReuseHistory = (item: TripHistoryItem) => {
      setOriginInput(item.origin === "My Location" ? "Your Location" : item.origin);
      setDestinationInput(item.destination === "My Location" ? "Your Location" : item.destination);
      setActiveTab('route');
      // Optional: Auto-trigger calculation, but better to let user review first
  };
  
  const handleStartJourney = () => {
     setIsNavigating(true);
  };
  
  const handleEndNavigation = (completed: boolean) => {
     setIsNavigating(false);
     setRouteStats(null);
     setSearchTrigger(null);
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
    
    // Create new feedback item
    const newFeedback: FeedbackItem = {
      id: Date.now().toString(),
      type: feedbackType,
      description: feedbackText,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
      sender: user.username
    };

    // Update state and local storage
    const updatedFeedbacks = [newFeedback, ...feedbacks];
    setFeedbacks(updatedFeedbacks);
    localStorage.setItem('commutewise_feedbacks', JSON.stringify(updatedFeedbacks));
    
    // Simulate API delay
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setShowFeedbackModal(false);
      setFeedbackText('');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }, 1000);
  };

  const handleResolveFeedback = (id: string) => {
    const updatedFeedbacks = feedbacks.map(f => 
      f.id === id ? { ...f, status: 'resolved' as const } : f
    );
    setFeedbacks(updatedFeedbacks);
    localStorage.setItem('commutewise_feedbacks', JSON.stringify(updatedFeedbacks));
  };

  const isAdmin = user.role === UserRole.ADMIN;

  // Admin Render Logic
  const renderAdminContent = () => {
    switch (activeAdminMenu) {
      case 'Dashboard':
        const pendingBugs = feedbacks.filter(f => f.type === 'bug' && f.status === 'pending').length;
        const pendingSuggestions = feedbacks.filter(f => f.type === 'suggestion' && f.status === 'pending').length;
        return (
          <div className="p-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Total Feedback</p>
                    <h3 className="text-2xl font-bold text-slate-800">{feedbacks.length}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                    <Bug className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Pending Bugs</p>
                    <h3 className="text-2xl font-bold text-slate-800">{pendingBugs}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Resolved Issues</p>
                    <h3 className="text-2xl font-bold text-slate-800">{feedbacks.filter(f => f.status === 'resolved').length}</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {feedbacks.slice(0, 5).map(f => (
                  <div key={f.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${f.type === 'bug' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{f.sender} submitted a {f.type}</p>
                        <p className="text-xs text-slate-400">{f.date}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {f.status}
                    </span>
                  </div>
                ))}
                {feedbacks.length === 0 && <p className="text-slate-400 text-sm">No activity yet.</p>}
              </div>
            </div>
          </div>
        );

      case 'Feedbacks':
        return (
          <div className="p-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">User Feedbacks</h2>
            <div className="space-y-4">
              {feedbacks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No feedbacks received yet.</p>
                </div>
              ) : (
                feedbacks.map(f => (
                  <div key={f.id} className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${f.status === 'pending' ? 'border-l-4 border-l-blue-500 border-y-slate-200 border-r-slate-200' : 'border-slate-200 opacity-75'}`}>
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
                      {f.status === 'pending' && (
                        <button 
                          onClick={() => handleResolveFeedback(f.id)}
                          className="flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                        >
                          <CheckSquare className="w-3 h-3" /> Mark Resolved
                        </button>
                      )}
                      {f.status === 'resolved' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                           <CheckCircle className="w-3 h-3" /> Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">{f.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'Analytic Reports':
        // Calculate dynamic top location
        const topLoc = Object.entries(globalStats.topLocations)
           .sort((a, b) => b[1] - a[1])[0];

        return (
          <div className="p-8 h-full overflow-y-auto bg-slate-50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Analytic Reports</h2>
                <p className="text-slate-500 text-sm mt-1">Real-time data from user interactions</p>
              </div>
              <div className="flex items-center gap-3 mt-4 md:mt-0">
                <button 
                  onClick={handleResetAnalytics}
                  className="p-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-bold"
                  title="Reset Data"
                >
                  <RefreshCw className="w-4 h-4" /> Reset
                </button>
                <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Live
                </div>
              </div>
            </div>
      
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Searches */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Searches</p>
                       <h3 className="text-3xl font-bold text-slate-800 mt-2">{globalStats.totalSearches}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                       <BarChart3 className="w-5 h-5" />
                    </div>
                 </div>
                 <p className="text-slate-400 text-xs font-medium">
                    Route calculations processed
                 </p>
              </div>
      
              {/* Est. Revenue */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Est. Revenue</p>
                       <h3 className="text-3xl font-bold text-slate-800 mt-2">₱{globalStats.totalRevenue.toFixed(2)}</h3>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                       <DollarSign className="w-5 h-5" />
                    </div>
                 </div>
                 <p className="text-slate-400 text-xs">Total fare value calculated</p>
              </div>
      
              {/* Top Location */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-2">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Top Destination</p>
                       <h3 className="text-lg font-bold text-slate-800 mt-2 leading-tight">
                         {topLoc ? topLoc[0] : 'N/A'}
                       </h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                       <MapPin className="w-5 h-5" />
                    </div>
                 </div>
                 <p className="text-slate-400 text-xs">Most searched destination ({topLoc ? topLoc[1] : 0} times)</p>
              </div>
            </div>
      
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Demo Chart */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-sm">
                     <Clock className="w-4 h-4 text-green-600" /> Hourly Activity (Mock)
                  </h4>
                  <div className="h-64 w-full relative opacity-50 pointer-events-none grayscale">
                     <svg viewBox="0 0 400 200" className="w-full h-full overflow-visible">
                        {[0, 45, 90, 135, 180].map((val, i) => (
                          <line key={i} x1="30" y1={200 - (i * 40)} x2="400" y2={200 - (i * 40)} stroke="#f1f5f9" strokeDasharray="4" />
                        ))}
                        <polyline 
                           points="30,150 80,120 130,111 180,88 230,111 280,77 330,60 380,144"
                           fill="none"
                           stroke="#16a34a"
                           strokeWidth="2.5"
                           strokeLinecap="round"
                           strokeLinejoin="round"
                        />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">
                        Visual placeholder
                     </div>
                  </div>
               </div>
            </div>
          </div>
        );

      case 'Routes': 
        return (
            <div className="p-8 h-full overflow-y-auto bg-slate-50">
               <h2 className="text-2xl font-bold text-slate-800 mb-6">Route Management</h2>
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                       <span className="font-bold text-slate-700">Active Routes</span>
                       <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">1 Active</span>
                   </div>
                   <div className="p-6">
                       <div className="flex items-center gap-4 mb-4">
                           <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                               <Route className="w-6 h-6" />
                           </div>
                           <div>
                               <h3 className="font-bold text-slate-800">Tandang Sora - Maharlika</h3>
                               <p className="text-sm text-slate-500">Standard Jeepney Route • {ROUTE_PATH.length} path segments</p>
                           </div>
                           <div className="ml-auto">
                               <button 
                                 onClick={() => setShowRouteDetails(!showRouteDetails)}
                                 className="text-sm text-blue-600 font-medium hover:underline"
                               >
                                 {showRouteDetails ? 'Hide Details' : 'View Details'}
                               </button>
                           </div>
                       </div>
                       
                       {/* Expanded Route Details */}
                       {showRouteDetails && (
                           <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 animate-in fade-in slide-in-from-top-2">
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Route Segments (Path)</p>
                               <div className="bg-slate-50 rounded-lg p-3 max-h-60 overflow-y-auto text-xs font-mono text-slate-600 space-y-1">
                                   {ROUTE_PATH.map((point, i) => (
                                       <div key={i} className="flex gap-4">
                                           <span className="text-slate-400 w-6">#{i+1}</span>
                                           <span>Lat: {point.lat.toFixed(5)}, Lng: {point.lng.toFixed(5)}</span>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}
                   </div>
               </div>
            </div>
        );

      case 'Terminals':
        return (
            <div className="p-8 h-full overflow-y-auto bg-slate-50">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-slate-800">Terminal & Stops</h2>
                   <button 
                     onClick={handleAddStop}
                     className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                   >
                      <Plus className="w-4 h-4" /> Add Stop
                   </button>
               </div>
               
               <div className="grid gap-4">
                   {stops.map((stop) => (
                       <div key={stop.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-start gap-4 group">
                           <div className="bg-orange-100 p-2 rounded-lg text-orange-600 mt-1">
                               <MapPin className="w-5 h-5" />
                           </div>
                           <div className="flex-1">
                               {editingStopId === stop.id ? (
                                   <div className="space-y-2 mb-2">
                                       <input 
                                         type="text" 
                                         value={tempStopData.name}
                                         onChange={(e) => setTempStopData({...tempStopData, name: e.target.value})}
                                         className="w-full p-2 border border-slate-300 rounded text-sm font-bold"
                                         placeholder="Stop Name"
                                       />
                                       <textarea 
                                         value={tempStopData.description}
                                         onChange={(e) => setTempStopData({...tempStopData, description: e.target.value})}
                                         className="w-full p-2 border border-slate-300 rounded text-xs"
                                         placeholder="Description"
                                         rows={2}
                                       />
                                       <div className="flex gap-2 justify-end">
                                           <button onClick={() => setEditingStopId(null)} className="text-xs text-slate-500 px-2 py-1">Cancel</button>
                                           <button onClick={() => handleSaveStop(stop.id)} className="text-xs bg-green-600 text-white px-3 py-1 rounded">Save</button>
                                       </div>
                                   </div>
                               ) : (
                                   <>
                                       <h4 className="font-bold text-slate-800">{stop.name}</h4>
                                       <p className="text-sm text-slate-500">{stop.description}</p>
                                       <div className="mt-2 flex gap-2 text-xs font-mono text-slate-400">
                                           <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Lat: {stop.coords.lat.toFixed(4)}</span>
                                           <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Lng: {stop.coords.lng.toFixed(4)}</span>
                                       </div>
                                   </>
                               )}
                           </div>
                           <div className="flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                               {editingStopId !== stop.id && (
                                   <>
                                       <button 
                                         onClick={() => handleLocateStop(stop.coords)}
                                         className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" 
                                         title="Locate on Map"
                                       >
                                           <ArrowUpRight className="w-4 h-4" />
                                       </button>
                                       <button 
                                         onClick={() => handleEditStop(stop)}
                                         className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded"
                                         title="Edit"
                                       >
                                           <Edit2 className="w-4 h-4" />
                                       </button>
                                       <button 
                                         onClick={() => handleDeleteStop(stop.id)}
                                         className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                         title="Delete"
                                       >
                                           <Trash2 className="w-4 h-4" />
                                       </button>
                                   </>
                               )}
                           </div>
                       </div>
                   ))}
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
                                  <th className="p-4 font-bold text-slate-600">Value (PHP)</th>
                                  <th className="p-4 font-bold text-slate-600">Description</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              <tr>
                                  <td className="p-4 font-medium text-slate-800">Base Fare</td>
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
                                  <td className="p-4 font-medium text-slate-800">Succeeding Rate</td>
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
                                  <td className="p-4 font-medium text-slate-800">Base Distance</td>
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

      case 'Locations': // Fallthrough for map
        return null;

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
                    <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Route Management</p>
                    <button 
                       onClick={() => setActiveAdminMenu('Routes')}
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeAdminMenu === 'Routes' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                       <Route className="w-5 h-5" /> Routes
                    </button>
                    <button 
                       onClick={() => setActiveAdminMenu('Terminals')}
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeAdminMenu === 'Terminals' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                       <Warehouse className="w-5 h-5" /> Terminals
                    </button>
                    <button 
                       onClick={() => setActiveAdminMenu('Locations')}
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeAdminMenu === 'Locations' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                       <MapPin className="w-5 h-5" /> Locations (Map)
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
                                         <p className="text-xs text-slate-500 mb-1">Fare</p>
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
                      
                      {/* Visual Connector Lines */}
                      <div className="absolute left-7 top-10 bottom-10 flex flex-col items-center">
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

                        {/* TERMINAL STOPOVER INDICATOR */}
                        <div className="pl-12 pr-2 py-1">
                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 flex items-center gap-3">
                                <div className="bg-orange-100 p-1.5 rounded-full text-orange-600">
                                    <Warehouse className="w-3 h-3" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">Via Terminal</p>
                                    <p className="text-[10px] text-orange-600 font-medium">Tandang Sora Market</p>
                                </div>
                            </div>
                        </div>

                        {/* Swap Button (Floating) */}
                        <div className="absolute right-0 top-12 z-10">
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
                    /* NEW JOURNEY DETAILS UI (Replaces Search Form when route found & !navigating) */
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
                                <div className="text-[10px] text-green-600 uppercase tracking-wide">Total Fare</div>
                            </div>
                        </div>

                        <h3 className="text-sm font-medium text-slate-600 mb-4">Journey Details (2 rides)</h3>

                        {/* Timeline Container */}
                        <div className="space-y-0 relative pl-2">
                            
                            {/* LEG 1: START */}
                            <div className="flex gap-3 relative z-10">
                                <div className="flex flex-col items-center">
                                    <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white">1</div>
                                    <div className="w-0.5 flex-1 bg-slate-200 my-1"></div>
                                </div>
                                <div className="flex-1 pb-6 bg-white border border-slate-100 rounded-xl p-3 shadow-sm mb-4">
                                    <div className="flex justify-between font-bold text-sm mb-1">
                                        <span className="text-slate-800">Start Journey</span>
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
                                            <p className="text-xs text-slate-600 line-clamp-2">{originInput}</p>
                                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                                <span>To: {TERMINAL_NAME}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                                               <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {routeStats.legs?.[0]?.duration?.text || '10m'}</span>
                                               <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3"/> {routeStats.legs?.[0]?.distance?.text || '1km'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TRANSFER BUTTON (Visual Only) */}
                            <div className="flex justify-center mb-4 relative z-20 -mt-2">
                                <div className="bg-white border border-orange-200 text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3" /> Transfer to next ride
                                </div>
                            </div>

                            {/* LEG 2: JEEPNEY CARD */}
                            <div className="flex gap-3 relative z-10">
                                <div className="flex flex-col items-center">
                                    {/* Connector line from top */}
                                    <div className="absolute top-0 bottom-0 left-[11px] w-0.5 bg-slate-200 -z-10"></div> 
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
                                                   <p className="text-xs font-medium text-slate-700">Tandang Sora Route</p>
                                               </div>
                                            </div>
                                            <div className="font-bold text-green-600 text-sm">{routeStats.fare}</div>
                                        </div>
                                        
                                        {/* Timeline dots inside card */}
                                        <div className="relative pl-3 space-y-4">
                                            <div className="absolute left-[5.5px] top-1.5 bottom-1.5 w-0.5 bg-slate-200 border-l border-dashed border-slate-300"></div>
                                            
                                            <div className="relative">
                                                <div className="absolute -left-3 top-1 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white"></div>
                                                <div className="ml-2">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">From</p>
                                                    <p className="text-xs font-medium text-slate-800">{TERMINAL_NAME}</p>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-3 top-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white"></div>
                                                <div className="ml-2">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">To</p>
                                                    <p className="text-xs font-medium text-slate-800">{destinationInput}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-50">
                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                <Clock className="w-3 h-3" /> {routeStats.legs?.[1]?.duration?.text || 'N/A'}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                <MapPinIcon className="w-3 h-3" /> {routeStats.legs?.[1]?.distance?.text || 'N/A'}
                                            </span>
                                            <span className="text-xs text-slate-400 ml-auto">Est. High Traffic</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* END NODE */}
                            <div className="flex gap-3 relative z-10 mt-2">
                                <div className="flex flex-col items-center">
                                    <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white">2</div>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <div className="flex justify-between font-bold text-sm">
                                        <span className="text-slate-800">Final Ride / Arrived</span>
                                        <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded">{routeStats.fare}</span>
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
                             {tripHistory.length > 0 && (
                                <button 
                                    onClick={handleClearHistory}
                                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium bg-red-50 px-2 py-1 rounded"
                                >
                                    <Trash2 className="w-3 h-3" /> Clear
                                </button>
                             )}
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
                                        onClick={() => handleReuseHistory(item)}
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
         {/* min-w-0 is crucial for flex children to shrink properly */}

         {/* Mobile/Desktop Header Toggle (Visible only when sidebar closed?) 
             We can show it only when sidebar is closed to avoid duplication with the sidebar's internal close button.
         */}
         
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
         {isAdmin && (['Routes', 'Terminals', 'Locations'].indexOf(activeAdminMenu) === -1) && (
             <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-sm z-10 animate-in fade-in duration-300 overflow-y-auto">
                 {renderAdminContent()}
             </div>
         )}
         
         {/* Map */}
         <div className="flex-1 h-full w-full relative">
            <MapWithRoute 
               userLocation={userLocation} 
               stops={stops}
               searchRoute={searchTrigger}
               onRouteStatsCalculated={handleRouteStatsCalculated}
               selectionMode={pickingMode}
               onMapClick={handleMapClick}
               focusedLocation={focusedLocation}
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

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="absolute inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                            Send Feedback
                        </h3>
                        <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
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
    </div>
  );
};