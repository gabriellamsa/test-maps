import Map from "@/components/Map";

export default function MapPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Location Map
            </h1>
            <p className="text-gray-600">
              Visit and explore new places with the map!
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4">
            <Map />
          </div>
        </div>
      </div>
    </main>
  );
}
