import React, { useEffect, useRef, useState } from 'react';
import { Coordinates, RouteStop } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

// Default Path (Tandang Sora) - Kept for initialization
export const DEFAULT_ROUTE_PATH: Coordinates[] = [
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

export const TANDANG_SORA_LOCATION = DEFAULT_ROUTE_PATH[0];
export const MAHARLIKA_LOCATION = DEFAULT_ROUTE_PATH[DEFAULT_ROUTE_PATH.length - 1];

interface MapProps {
  userLocation: Coordinates | null;
  routePath?: Coordinates[]; // Dynamic path
  stops: RouteStop[]; 
  searchRoute?: {
    origin: string | Coordinates;
    destination: string | Coordinates;
    waypoints?: { location: string | Coordinates; stopover: boolean }[];
  } | null;
  selectionMode?: 'origin' | 'destination' | null;
  focusedLocation?: Coordinates | null; // For admin "Locate" button
  tempOrigin?: Coordinates | null; // Visual feedback for origin selection
  tempDestination?: Coordinates | null; // Visual feedback for dest selection
  onMapClick?: (coords: Coordinates) => void;
  onRouteStatsCalculated?: (stats: { 
    totalDistance: string; 
    totalDuration: string; 
    legs: { distance: { text: string; value: number }, duration: { text: string; value: number } }[]
  }) => void;
}

export const MapWithRoute: React.FC<MapProps> = ({ 
  userLocation, 
  routePath = DEFAULT_ROUTE_PATH,
  stops,
  searchRoute, 
  selectionMode, 
  focusedLocation,
  tempOrigin,
  tempDestination,
  onMapClick, 
  onRouteStatsCalculated 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [userMarker, setUserMarker] = useState<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const tempMarkersRef = useRef<any[]>([]); // For Origin/Dest selection pins
  const routePolylineRef = useRef<any[]>([]); // To track and clear polylines

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
        new window.google.maps.Marker({
            position: focusedLocation,
            map: map,
            animation: window.google.maps.Animation.DROP,
            title: "Selected Stop"
        });
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
        
        infoWindowRef.current.addListener('closeclick', () => {
            activeElementRef.current = null;
        });
    }

    const defaultCenter = { lat: 14.6625, lng: 121.0473 };

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

    const trafficLayer = new window.google.maps.TrafficLayer();
    trafficLayer.setMap(mapInstance);

    mapInstance.addListener("click", (e: any) => {
      if (selectionModeRef.current && onMapClickRef.current) {
        onMapClickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        return;
      }
      if (infoWindowRef.current) {
          infoWindowRef.current.close();
          activeElementRef.current = null;
      }
    });

    setMap(mapInstance);
  }, []);

  // Update Route Polyline when routePath changes
  useEffect(() => {
    if(!map || !routePath) return;

    // Clear previous lines
    routePolylineRef.current.forEach(line => line.setMap(null));
    routePolylineRef.current = [];

    // Draw Outer Border
    const border = new window.google.maps.Polyline({
      path: routePath,
      geodesic: true,
      strokeColor: "#1e3a8a", 
      strokeOpacity: 0.5,
      strokeWeight: 10,
      map: map,
      zIndex: 1,
      clickable: false 
    });

    // Draw Inner Line
    const mainLine = new window.google.maps.Polyline({
      path: routePath,
      geodesic: true,
      strokeColor: "#3b82f6", 
      strokeOpacity: 0.8, 
      strokeWeight: 6,
      map: map,
      zIndex: 2,
      clickable: true,
      cursor: 'pointer'
    });

    routePolylineRef.current.push(border, mainLine);

  }, [map, routePath]);

  // Manage Temp Markers (Selection Pins)
  useEffect(() => {
      if (!map) return;

      // Clear existing temp markers
      tempMarkersRef.current.forEach(marker => marker.setMap(null));
      tempMarkersRef.current = [];

      if (tempOrigin) {
          const startMarker = new window.google.maps.Marker({
              position: tempOrigin,
              map: map,
              icon: {
                  url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png", // Green for Origin
                  scaledSize: new window.google.maps.Size(40, 40)
              },
              title: "Starting Point",
              animation: window.google.maps.Animation.DROP
          });
          tempMarkersRef.current.push(startMarker);
      }

      if (tempDestination) {
          const endMarker = new window.google.maps.Marker({
              position: tempDestination,
              map: map,
              icon: {
                  url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", // Red for Destination
                  scaledSize: new window.google.maps.Size(40, 40)
              },
              title: "Destination",
              animation: window.google.maps.Animation.DROP
          });
          tempMarkersRef.current.push(endMarker);
      }

  }, [map, tempOrigin, tempDestination]);

  // Update Markers when 'stops' prop changes
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add Stops Markers
    stops.forEach((stop) => {
      // Different icon for Terminals vs Regular Stops
      let icon = null;
      if (stop.isTerminal) {
         icon = {
             path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
             scale: 5,
             fillColor: "#ea580c", // Orange for terminal
             fillOpacity: 1,
             strokeColor: "#ffffff",
             strokeWeight: 2,
         };
      } else {
         icon = {
             path: window.google.maps.SymbolPath.CIRCLE,
             scale: 5,
             fillColor: "#3b82f6", // Blue for stop
             fillOpacity: 1,
             strokeColor: "#ffffff",
             strokeWeight: 2,
         }
      }

      const marker = new window.google.maps.Marker({
        position: stop.coords,
        map: map,
        title: stop.name,
        icon: icon,
        animation: window.google.maps.Animation.DROP,
        zIndex: 3
      });

      marker.addListener("click", () => {
         if (selectionModeRef.current) {
            if (onMapClickRef.current) {
                onMapClickRef.current(stop.coords);
            }
            return;
         }

         if (activeElementRef.current === stop.id) {
             infoWindowRef.current.close();
             activeElementRef.current = null;
             return;
         }

         const typeLabel = stop.isTerminal ? "Terminal" : "Stop";
         const color = stop.isTerminal ? "#ea580c" : "#3b82f6";

         const content = `
          <div style="font-family: sans-serif; padding: 8px; min-width: 160px;">
            <div style="display:flex; align-items:center; margin-bottom: 6px;">
               <div style="width: 8px; height: 8px; background: ${color}; border-radius: 50%; margin-right: 6px;"></div>
               <h3 style="font-weight: bold; color: #1e293b; margin:0; font-size: 14px;">${stop.name}</h3>
            </div>
            <span style="font-size: 10px; font-weight: bold; color: white; background: ${color}; padding: 2px 6px; border-radius: 4px; margin-bottom: 4px; display: inline-block;">${typeLabel}</span>
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

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false, // We want the A/B markers from directions service as well
        preserveViewport: false,
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
        travelMode: window.google.maps.TravelMode.DRIVING, 
        provideRouteAlternatives: false,
      },
      (result: any, status: any) => {
        if (status === 'OK' && result) {
          directionsRendererRef.current.setDirections(result);
          
          const route = result.routes[0];
          if (route.bounds) {
             map.fitBounds(route.bounds);
          }

          const legs = route.legs.map((leg: any) => ({
            distance: { text: leg.distance?.text || '', value: leg.distance?.value || 0 },
            duration: { text: leg.duration?.text || '', value: leg.duration?.value || 0 }
          }));

          let totalDistVal = 0;
          let totalDurVal = 0;
          legs.forEach((leg: any) => {
            totalDistVal += leg.distance.value;
            totalDurVal += leg.duration.value;
          });

          const totalDistanceText = legs.length > 1 
             ? (totalDistVal / 1000).toFixed(1) + " km" 
             : legs[0].distance.text;
             
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