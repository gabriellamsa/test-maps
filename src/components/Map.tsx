"use client";

import { useEffect, useRef, useState } from "react";

interface MapInstance {
  setCenter: (location: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
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

    mapInstance.setCenter(location);
    mapInstance.setZoom(15);
    createMarker(location, mapInstance);

    // Limpa o input após a seleção
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
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
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = mapInstance;
        createMarker({ lat: latitude, lng: longitude }, mapInstance);

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
    </div>
  );
}
