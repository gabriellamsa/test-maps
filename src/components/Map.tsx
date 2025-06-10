"use client";

import { useEffect, useRef, useState } from "react";

interface MapInstance {
  setCenter: (location: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  controls: any;
}

interface MarkerInstance {
  setMap: (map: MapInstance | null) => void;
}

declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: any) => MapInstance;
        Marker: new (options: any) => MarkerInstance;
        Animation: {
          DROP: number;
        };
        ControlPosition: any;
        DirectionsService: new () => any;
        DirectionsRenderer: new () => any;
        places: {
          Autocomplete: new (input: HTMLInputElement, options: any) => {
            addListener: (event: string, callback: () => void) => void;
            getPlace: () => {
              geometry?: {
                location: { lat: () => number; lng: () => number };
              };
            };
          };
        };
      };
    };
  }
}

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentMarkerRef = useRef<MarkerInstance | null>(null);
  const isMountedRef = useRef(true);
  const autocompleteRef = useRef<any>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const directionsRendererRef = useRef<any>(null);
  const currentPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const [travelMode, setTravelMode] = useState<
    "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT"
  >("DRIVING");
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);

  const createMarker = (
    position: { lat: number; lng: number },
    mapInstance: MapInstance
  ) => {
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setMap(null);
    }

    currentMarkerRef.current = new window.google.maps.Marker({
      position,
      map: mapInstance,
      animation: window.google.maps.Animation.DROP,
    });
  };

  const handlePlaceSelect = (place: any, mapInstance: MapInstance) => {
    if (!place.geometry) return;

    const location = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    const origin = currentPositionRef.current;
    const destination = location;

    if (
      origin &&
      window.google?.maps?.DirectionsService &&
      window.google?.maps?.DirectionsRenderer
    ) {
      const directionsService = new window.google.maps.DirectionsService();
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      directionsRendererRef.current =
        new window.google.maps.DirectionsRenderer();
      directionsRendererRef.current.setMap(mapInstance as any);
      directionsService.route(
        {
          origin,
          destination,
          travelMode,
        },
        (result: any, status: string) => {
          if (status === "OK") {
            directionsRendererRef.current.setDirections(result);
            const leg = result.routes[0]?.legs[0];
            if (leg) {
              setRouteInfo({
                distance: leg.distance.text,
                duration: leg.duration.text,
              });
            }
          } else {
            setRouteInfo(null);
            mapInstance.setCenter(location);
            mapInstance.setZoom(15);
            createMarker(location, mapInstance);
          }
        }
      );
    } else {
      setRouteInfo(null);
      mapInstance.setCenter(location);
      mapInstance.setZoom(15);
      createMarker(location, mapInstance);
    }

    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  };

  const handleTravelModeChange = (
    mode: "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT"
  ) => {
    setTravelMode(mode);
    if (
      directionsRendererRef.current &&
      directionsRendererRef.current.getDirections
    ) {
      const directions = directionsRendererRef.current.getDirections();
      const destination = directions?.routes[0]?.legs[0]?.end_location;
      if (destination && currentPositionRef.current && mapInstanceRef.current) {
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
          {
            origin: currentPositionRef.current,
            destination,
            travelMode: mode,
          },
          (result: any, status: string) => {
            if (status === "OK") {
              directionsRendererRef.current.setDirections(result);
              const leg = result.routes[0]?.legs[0];
              if (leg) {
                setRouteInfo({
                  distance: leg.distance.text,
                  duration: leg.duration.text,
                });
              }
            } else {
              setRouteInfo(null);
            }
          }
        );
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === "Enter" &&
      autocompleteRef.current &&
      mapInstanceRef.current
    ) {
      const place = autocompleteRef.current.getPlace();
      handlePlaceSelect(place, mapInstanceRef.current);
    }
  };

  const handleRecenter = async () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;

    setIsLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        }
      );

      const { latitude, longitude } = position.coords;
      const location = { lat: latitude, lng: longitude };

      mapInstanceRef.current.setCenter(location);
      mapInstanceRef.current.setZoom(14);
      createMarker(location, mapInstanceRef.current);

      currentPositionRef.current = { lat: latitude, lng: longitude };
    } catch (err) {
      console.error("Error getting location:", err);
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google?.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        if (!isMountedRef.current) return;
        setError("Failed to load Google Maps");
        setIsLoading(false);
      };

      document.head.appendChild(script);
    };

    const initializeMap = async () => {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by this browser");
        setIsLoading(false);
        return;
      }

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          }
        );

        if (!isMountedRef.current || !mapRef.current) return;

        const { latitude, longitude } = position.coords;
        currentPositionRef.current = { lat: latitude, lng: longitude };
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = mapInstance;
        createMarker({ lat: latitude, lng: longitude }, mapInstance);

        const locationButton = document.createElement("button");
        locationButton.className =
          "bg-white w-10 h-10 rounded-xl shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors";
        locationButton.title = "Centralize at current location";
        locationButton.innerHTML = `<span class='material-symbols-outlined' style='color:#2563eb;font-size:24px;'>my_location</span>`;
        locationButton.style.margin = "8px";
        locationButton.style.padding = "0";

        locationButton.onclick = async () => {
          locationButton.disabled = true;
          locationButton.innerHTML = `<span class='material-symbols-outlined animate-spin' style='color:#2563eb;font-size:24px;'>my_location</span>`;
          try {
            const pos = await new Promise<GeolocationPosition>(
              (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
              }
            );
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            mapInstance.setCenter(loc);
            mapInstance.setZoom(14);
            createMarker(loc, mapInstance);
          } catch (e) {
          } finally {
            locationButton.disabled = false;
            locationButton.innerHTML = `<span class='material-symbols-outlined' style='color:#2563eb;font-size:24px;'>my_location</span>`;
          }
        };
        mapInstance.controls[
          window.google.maps.ControlPosition.RIGHT_BOTTOM
        ].push(locationButton);

        if (searchInputRef.current) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            searchInputRef.current,
            {
              types: ["geocode", "establishment"],
              fields: ["formatted_address", "geometry", "name"],
            }
          );

          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current.getPlace();
            handlePlaceSelect(place, mapInstance);
          });
        }

        setIsLoading(false);
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("Map initialization error:", err);
        setError("Failed to initialize map");
        setIsLoading(false);
      }
    };

    loadGoogleMapsScript();

    return () => {
      isMountedRef.current = false;
      if (currentMarkerRef.current) {
        currentMarkerRef.current.setMap(null);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="w-full h-[500px] rounded-lg shadow-lg bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for a location..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyPress={handleKeyPress}
        />
      </div>
      <div className="relative w-full h-[500px] rounded-lg shadow-lg">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
        <div className="w-full h-full" ref={mapRef}></div>
      </div>
      <div className="flex items-center gap-2">
        <label className="font-medium">Routes:</label>
        <select
          value={travelMode}
          onChange={(e) => handleTravelModeChange(e.target.value as any)}
          className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="DRIVING">Car</option>
          <option value="WALKING">Walking</option>
          <option value="BICYCLING">Bike</option>
          <option value="TRANSIT">Public Transport </option>
        </select>
        {routeInfo && (
          <div className="ml-4 text-sm text-gray-700">
            <span className="font-semibold">Distance:</span>{" "}
            {routeInfo.distance} &nbsp;|
            <span className="font-semibold ml-2">Duration:</span>{" "}
            {routeInfo.duration}
          </div>
        )}
      </div>
    </div>
  );
}
