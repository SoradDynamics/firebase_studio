// student/StudentComponent.tsx

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { databases } from "~/utils/appwrite"; // Assuming you're using Appwrite SDK
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";

const StudentComponent = () => {
  const [allDrivers, setAllDrivers] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllDrivers = async () => {
      try {
        const drivers = await databases.listDocuments("your-database-id", "coll-drivers");
        setAllDrivers(drivers.documents);
      } catch (error) {
        toast.error("Failed to fetch drivers' locations");
        console.error(error);
      }
    };

    fetchAllDrivers();
  }, []);

  return (
    <div className="p-4 border border-gray-300 rounded-md">
      <h2 className="text-xl font-semibold">Student Location Viewer</h2>
      <div className="h-96">
        <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {allDrivers.map((driver, index) => {
            const position: LatLngExpression = [driver.latitude, driver.longitude];
            return (
              <Marker key={index} position={position}>
                <Popup>
                  Driver {index + 1}: {driver.latitude}, {driver.longitude}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default StudentComponent;
