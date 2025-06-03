"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initMap = () => {
      if (!mapRef.current || !window.google) return;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!isMounted) return;

            const { latitude, longitude } = position.coords;

            try {
              const map = new window.google.maps.Map(mapRef.current, {
                center: { lat: latitude, lng: longitude },
                zoom: 14,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              });

              new window.google.maps.Marker({
                position: { lat: latitude, lng: longitude },
                map,
                animation: window.google.maps.Animation.DROP,
              });

              setIsLoading(false);
            } catch (err) {
              setError("Failed to initialize map");
              setIsLoading(false);
            }
          },
          (error) => {
            if (!isMounted) return;
            setError("Geolocation permission denied or not available");
            setIsLoading(false);
          }
        );
      } else {
        setError("Geolocation is not supported by this browser");
        setIsLoading(false);
      }
    };

    const loadGoogleMapsScript = () => {
      if (window.google?.maps) {
        initMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => {
        if (!isMounted) return;
        setError("Failed to load Google Maps");
        setIsLoading(false);
      };

      document.head.appendChild(script);
    };

    loadGoogleMapsScript();

    return () => {
      isMounted = false;
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
    <div className="relative w-full h-[500px] rounded-lg shadow-lg">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      <div className="w-full h-full" ref={mapRef}></div>
    </div>
  );
}
