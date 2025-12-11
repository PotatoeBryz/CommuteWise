import React, { useEffect, useRef, useState } from 'react';
import { Coordinates, RouteStop } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

// Detailed Polyline from Tandang Sora (Commonwealth) to Maharlika (QC)
export const ROUTE_PATH: Coordinates[] = [
  { lat: 14.66870, lng: 121.05420 }, // Start: Tandang Sora Market (Commonwealth)
  { lat: 14.66930, lng: 121.05200 }, // Along Tandang Sora
  { lat: 14.67010, lng: 121.04950 },
  { lat: 14.67080, lng: 121.04700 },
  { lat: 14.67140, lng: 121.04490 }, // Intersection Tandang Sora / Visayas Ave
  { lat: 14.66900, lng: 121.04560 }, // Turning left onto Visayas Ave
  { lat: 14.66700, lng: 121.04610 }, // Along Visayas
  { lat: 14.66480, lng: 121.04680 },
  { lat: 14.66250, lng: 121.04730 }, // Visayas / Congressional (Approx)
  { lat: 14.66000, lng: 121.04800 },
  { lat: 14.65800, lng: 121.04850 },
  { lat: 14.65550, lng: 121.04950 }, // Approaching Elliptical
  { lat: 14.65340, lng: 121.05030 }, // Entering Elliptical Rd
  { lat: 14.65250, lng: 121.05150 }, // Circle Curve
  { lat: 14.65200, lng: 121.05280 },
  { lat: 14.65000, lng: 121.05350 }, // Exit to Kalayaan Ave
  { lat: 14.64800, lng: 121.05400 }, // Along Kalayaan
  { lat: 14.64600, lng: 121.05550 },
  { lat: 14.64500, lng: 121.05650 },
  { lat: 14.64400, lng: 121.05800 }, // Near City Hall / Housing
  { lat: 14.64370, lng: 121.05850 }, // End: Maharlika St Area
];

interface MapProps {
  userLocation: Coordinates | null;
  stops: RouteStop[]; // Now dynamic
  searchRoute?: {
    origin: string | Coordinates;
    destination: string | Coordinates;
    waypoints?: { location: string | Coordinates; stopover: boolean }[];
  } | null;
  selectionMode?: 'origin' | 'destination' | null;
  focusedLocation?: Coordinates | null; // For admin "Locate" button
  onMapClick?: (coords: Coordinates) => void;
  onRouteStatsCalculated?: (stats: { 
    totalDistance: string; 
    totalDuration: string; 
    legs: { distance: { text: string; value: number }, duration: { text: string; value: number } }[]
  }) => void;
}

export const MapWithRoute: React.FC<MapProps> = ({ 
  userLocation, 
  stops,
  searchRoute, 
  selectionMode, 
  focusedLocation,
  onMapClick, 
  onRouteStatsCalculated 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [userMarker, setUserMarker] = useState<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Refs for event listeners to avoid stale closures
  const onMapClickRef = useRef(onMapClick);
  const selectionModeRef = useRef(selectionMode);
  
  // Shared InfoWindow ref and active element tracker
  const infoWindowRef = useRef<any>(null);
  const activeElementRef = useRef<string | null>(null);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
    selectionModeRef.current = selectionMode;
  }, [onMapClick, selectionMode]);

  // Handle cursor changes based on selection mode
  useEffect(() => {
    if (map) {
      map.setOptions({
        draggableCursor: selectionMode ? 'crosshair' : null,
        clickableIcons: !selectionMode // Disable POI clicking when selecting to prevent confusion
      });
    }
  }, [map, selectionMode]);

  // Handle Focus Location (Admin Locate)
  useEffect(() => {
    if (map && focusedLocation) {
        map.panTo(focusedLocation);
        map.setZoom(17);
        // Optional: Add a temporary bounce animation or highlight effect here if desired
    }
  }, [map, focusedLocation]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Check if Google Maps script is loaded
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.error("Google Maps API not loaded");
      return;
    }

    // Initialize Shared InfoWindow
    if (!infoWindowRef.current) {
        infoWindowRef.current = new window.google.maps.InfoWindow({
            pixelOffset: new window.google.maps.Size(0, -5),
        });
        
        // When closed manually (clicking X), reset active tracker
        infoWindowRef.current.addListener('closeclick', () => {
            activeElementRef.current = null;
        });
    }

    // Center closer to the middle of the new route (Visayas Ave)
    const defaultCenter = { lat: 14.6625, lng: 121.0473 };

    // Create Map Instance with better styling
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 14,
      disableDefaultUI: false, 
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: "poi.business",
          stylers: [{ visibility: "simplified" }],
        },
        {
          featureType: "transit.station.bus",
          stylers: [{ visibility: "on" }],
        },
      ],
    });

    // --- ADD TRAFFIC LAYER ---
    const trafficLayer = new window.google.maps.TrafficLayer();
    trafficLayer.setMap(mapInstance);

    // Click Listener for Map Selection & Clearing Selection
    mapInstance.addListener("click", (e: any) => {
      // Priority 1: Picking Mode
      if (selectionModeRef.current && onMapClickRef.current) {
        onMapClickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        return;
      }

      // Priority 2: Clear InfoWindow if clicking empty map space
      if (infoWindowRef.current) {
          infoWindowRef.current.close();
          activeElementRef.current = null;
      }
    });

    // Draw the Jeepney Route Line with border for better visibility
    // Outer border (simulated width)
    new window.google.maps.Polyline({
      path: ROUTE_PATH,
      geodesic: true,
      strokeColor: "#1e3a8a", // Dark Blue Border
      strokeOpacity: 0.5,
      strokeWeight: 10,
      map: mapInstance,
      zIndex: 1,
      clickable: false // Outer border doesn't need to be clickable
    });

    // Inner Line - Interactive
    const routeLine = new window.google.maps.Polyline({
      path: ROUTE_PATH,
      geodesic: true,
      strokeColor: "#3b82f6", // Bright Blue
      strokeOpacity: 0.8, // Slightly transparent to let traffic layer shine through if underneath
      strokeWeight: 6,
      map: mapInstance,
      zIndex: 2,
      clickable: true,
      cursor: 'pointer'
    });

    setMap(mapInstance);
  }, []);

  // Update Markers when 'stops' prop changes
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Helper to find nearest stop (used for RouteLine click)
    // We attach this logic to the route line click event dynamically or keep it simple
    // For now, re-attaching listeners is complex, so we will skip the route-line click "nearest stop" logic update 
    // or assume the component remounts. Ideally, we use a ref for 'stops' inside the listener.
    
    // Add Stops Markers
    stops.forEach((stop) => {
      const marker = new window.google.maps.Marker({
        position: stop.coords,
        map: map,
        title: stop.name,
        animation: window.google.maps.Animation.DROP,
        zIndex: 3
      });

      marker.addListener("click", () => {
         // Prevent if selecting
         if (selectionModeRef.current) {
            if (onMapClickRef.current) {
                onMapClickRef.current(stop.coords);
            }
            return;
         }

         // Toggle Logic for Markers
         if (activeElementRef.current === stop.id) {
             infoWindowRef.current.close();
             activeElementRef.current = null;
             return;
         }

         const content = `
          <div style="font-family: sans-serif; padding: 8px; min-width: 160px;">
            <div style="display:flex; align-items:center; margin-bottom: 6px;">
               <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; margin-right: 6px;"></div>
               <h3 style="font-weight: bold; color: #1e293b; margin:0; font-size: 14px;">${stop.name}</h3>
            </div>
            <p style="font-size: 12px; color: #64748b; margin:0;">${stop.description}</p>
          </div>
        `;
        
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open({
          anchor: marker,
          map: map,
          shouldFocus: false,
        });
        activeElementRef.current = stop.id;
      });

      markersRef.current.push(marker);
    });

  }, [map, stops]);

  // Handle Directions Service (User Route Calculation)
  useEffect(() => {
    if (!map || !searchRoute || !searchRoute.origin || !searchRoute.destination) return;

    // Initialize DirectionsRenderer if not exists
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
        preserveViewport: false, // Allow renderer to change viewport (default), but we will also enforce it below
        polylineOptions: {
          strokeColor: "#8b5cf6", // Purple for calculated user trip
          strokeOpacity: 0.7,
          strokeWeight: 5,
        }
      });
    }

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: searchRoute.origin,
        destination: searchRoute.destination,
        waypoints: searchRoute.waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING, // Approximation for Jeepney/Road traffic
        provideRouteAlternatives: false,
      },
      (result: any, status: any) => {
        if (status === 'OK' && result) {
          directionsRendererRef.current.setDirections(result);
          
          // --- FORCE FOCUS ON ROUTE ---
          // Explicitly fit bounds to the calculated route to ensure user sees the "Find Route" result clearly
          const route = result.routes[0];
          if (route.bounds) {
             map.fitBounds(route.bounds);
          }

          const legs = route.legs.map((leg: any) => ({
            distance: { text: leg.distance?.text || '', value: leg.distance?.value || 0 },
            duration: { text: leg.duration?.text || '', value: leg.duration?.value || 0 }
          }));

          // Calculate totals manually to be safe
          let totalDistVal = 0;
          let totalDurVal = 0;
          legs.forEach((leg: any) => {
            totalDistVal += leg.distance.value;
            totalDurVal += leg.duration.value;
          });

          // Convert back to text (rough approx or usage of response)
          // For simplicity, we can use the sum of values if legs > 1
          const totalDistanceText = legs.length > 1 
             ? (totalDistVal / 1000).toFixed(1) + " km" 
             : legs[0].distance.text;
             
          // Simple formatting for duration
          const totalDurationMinutes = Math.round(totalDurVal / 60);
          const totalDurationText = totalDurationMinutes > 60 
            ? Math.floor(totalDurationMinutes / 60) + " hr " + (totalDurationMinutes % 60) + " min"
            : totalDurationMinutes + " mins";

          if (onRouteStatsCalculated) {
            onRouteStatsCalculated({
              totalDistance: totalDistanceText,
              totalDuration: totalDurationText,
              legs: legs
            });
          }
        } else {
          console.error('Directions request failed due to ' + status);
          if (status === 'ZERO_RESULTS') {
             alert("Could not find a route between these locations. Please try nearby landmarks.");
          }
        }
      }
    );

  }, [map, searchRoute]);

  // Handle User Location Updates
  useEffect(() => {
    if (!map || !userLocation) return;

    if (userMarker) {
      userMarker.setPosition(userLocation);
    } else {
      // Create user marker with a blue dot style
      const marker = new window.google.maps.Marker({
        position: userLocation,
        map: map,
        title: "You are here",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        },
        zIndex: 4
      });
      setUserMarker(marker);
    }
  }, [map, userLocation]);

  return <div ref={mapRef} className="h-full w-full" />;
};