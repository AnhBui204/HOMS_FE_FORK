import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import { Input, Button, Spin, Tooltip } from 'antd';
import { SearchOutlined, AimOutlined } from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPicker.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom marker for pickup (green)
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom marker for dropoff (red)
const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom marker for current location (blue)
const currentLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
function LocationMarker({ position, setPosition, icon, detailedAddress, locationType = 'pickup' }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={icon}>
      <Popup maxWidth={300}>
        <div className="location-popup">
          <strong>📍 {locationType === 'pickup' ? 'Địa điểm chuyển đi' : 'Địa điểm chuyển đến'}</strong>
          {detailedAddress && (
            <div className="address-details">
              {detailedAddress.houseNumber && detailedAddress.road && (
                <p><strong>Địa chỉ:</strong> {detailedAddress.houseNumber} {detailedAddress.road}</p>
              )}
              {!detailedAddress.houseNumber && detailedAddress.road && (
                <p><strong>Đường:</strong> {detailedAddress.road}</p>
              )}
              {detailedAddress.suburb && (
                <p><strong>Phường/Xã:</strong> {detailedAddress.suburb}</p>
              )}
              {detailedAddress.district && (
                <p><strong>Quận/Huyện:</strong> {detailedAddress.district}</p>
              )}
              {detailedAddress.city && (
                <p><strong>Thành phố:</strong> {detailedAddress.city}</p>
              )}
              {detailedAddress.postcode && (
                <p><strong>Mã bưu điện:</strong> {detailedAddress.postcode}</p>
              )}
              <p className="coordinates"><strong>Tọa độ:</strong> {detailedAddress.coordinates}</p>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

const LocationPicker = ({ onLocationChange, initialPosition, locationType = 'pickup', otherLocation = null, currentLocationData = null }) => {
  const [position, setPosition] = useState(initialPosition || { lat: 10.762622, lng: 106.660172 }); // Default: Ho Chi Minh City
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [detailedAddress, setDetailedAddress] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const mapRef = useRef(null);

  // Update position and address when initialPosition changes
  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
      // Fly to the new position when switching locations
      if (mapRef.current) {
        mapRef.current.flyTo([initialPosition.lat, initialPosition.lng], 15);
      }
      
      // If we have stored location data, restore the address
      if (currentLocationData) {
        if (currentLocationData.address) {
          setAddress(currentLocationData.address);
        }
        if (currentLocationData.addressDetails) {
          setDetailedAddress(currentLocationData.addressDetails);
        }
      } else {
        // Otherwise fetch the address
        getAddressFromCoordinates(initialPosition.lat, initialPosition.lng);
      }
    }
  }, [initialPosition, currentLocationData]);

  // Get user's current location on component mount (just for reference blue marker)
  useEffect(() => {
    if (!initialPosition && navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentUserLocation(userLocation);
          // Only set as reference, don't auto-select as pickup/dropoff location
          // User must click map or "Get Current Location" button to select
          
          // Center map on user's location for better UX
          if (mapRef.current) {
            mapRef.current.flyTo([userLocation.lat, userLocation.lng], 13);
          }
          
          setGettingLocation(false);
        },
        (error) => {
          console.error('Error getting user location:', error);
          setGettingLocation(false);
          // Keep default Ho Chi Minh City location
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [initialPosition]);
  const getAddressFromCoordinates = async (lat, lng) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
        
        // Extract detailed address components
        const addressDetails = {
          houseNumber: data.address?.house_number || '',
          road: data.address?.road || data.address?.street || '',
          suburb: data.address?.suburb || data.address?.neighbourhood || '',
          district: data.address?.city_district || data.address?.district || '',
          city: data.address?.city || data.address?.town || data.address?.village || '',
          state: data.address?.state || '',
          postcode: data.address?.postcode || '',
          country: data.address?.country || '',
          fullAddress: data.display_name,
          coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        };
        
        setDetailedAddress(addressDetails);
        
        if (onLocationChange) {
          onLocationChange({
            lat,
            lng,
            address: data.display_name,
            addressDetails
          });
        }
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setLoading(false);
    }
  };

  // Forward geocoding: Search address and get coordinates
  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name, address: addr } = data[0];
        const newPosition = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setPosition(newPosition);
        setAddress(display_name);
        
        // Extract detailed address components
        const addressDetails = {
          houseNumber: addr?.house_number || '',
          road: addr?.road || addr?.street || '',
          suburb: addr?.suburb || addr?.neighbourhood || '',
          district: addr?.city_district || addr?.district || '',
          city: addr?.city || addr?.town || addr?.village || '',
          state: addr?.state || '',
          postcode: addr?.postcode || '',
          country: addr?.country || '',
          fullAddress: display_name,
          coordinates: `${lat}, ${lon}`
        };
        
        setDetailedAddress(addressDetails);
        
        // Fly to the new position
        if (mapRef.current) {
          mapRef.current.flyTo([newPosition.lat, newPosition.lng], 15);
        }
        
        if (onLocationChange) {
          onLocationChange({
            lat: newPosition.lat,
            lng: newPosition.lng,
            address: display_name,
            addressDetails
          });
        }
      }
    } catch (error) {
      console.error('Error searching address:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentUserLocation(userLocation);
          setPosition(userLocation);
          
          // Fetch address for current location
          getAddressFromCoordinates(userLocation.lat, userLocation.lng);
          
          // Fly to the current location
          if (mapRef.current) {
            mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15);
          }
          
          setGettingLocation(false);
        },
        (error) => {
          console.error('Error getting user location:', error);
          alert('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập vị trí của trình duyệt.');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Trình duyệt của bạn không hỗ trợ định vị.');
    }
  };

  const handlePositionChange = (newPosition) => {
    setPosition(newPosition);
    // Fetch address for the new position
    getAddressFromCoordinates(newPosition.lat, newPosition.lng);
  };

  const markerIcon = locationType === 'pickup' ? pickupIcon : dropoffIcon;
  const otherMarkerIcon = locationType === 'pickup' ? dropoffIcon : pickupIcon;

  return (
    <div className="location-picker">
      <div className="search-bar">
        <Input
          placeholder="Tìm kiếm địa chỉ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onPressEnter={searchAddress}
          prefix={<SearchOutlined />}
          suffix={loading && <Spin size="small" />}
        />
        <Button type="primary" onClick={searchAddress} loading={loading}>
          Tìm
        </Button>
        <Tooltip title="Lấy vị trí hiện tại">
          <Button 
            icon={<AimOutlined />} 
            onClick={getCurrentLocation}
            loading={gettingLocation}
          />
        </Tooltip>
      </div>

      <div className="map-container">
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Current active location marker */}
          <LocationMarker 
            position={position} 
            setPosition={handlePositionChange}
            icon={markerIcon}
            detailedAddress={detailedAddress}
            locationType={locationType}
          />
          
          {/* Other location marker (pickup or dropoff) */}
          {otherLocation && otherLocation.lat && otherLocation.lng && (
            <Marker 
              position={{ lat: otherLocation.lat, lng: otherLocation.lng }} 
              icon={otherMarkerIcon}
            >
              <Popup maxWidth={300}>
                <div className="location-popup">
                  <strong>📍 {locationType === 'pickup' ? 'Địa điểm chuyển đến' : 'Địa điểm chuyển đi'}</strong>
                  {otherLocation.addressDetails && (
                    <div className="address-details">
                      {otherLocation.addressDetails.houseNumber && otherLocation.addressDetails.road && (
                        <p><strong>Địa chỉ:</strong> {otherLocation.addressDetails.houseNumber} {otherLocation.addressDetails.road}</p>
                      )}
                      {!otherLocation.addressDetails.houseNumber && otherLocation.addressDetails.road && (
                        <p><strong>Đường:</strong> {otherLocation.addressDetails.road}</p>
                      )}
                      {otherLocation.addressDetails.district && (
                        <p><strong>Quận/Huyện:</strong> {otherLocation.addressDetails.district}</p>
                      )}
                      {otherLocation.addressDetails.city && (
                        <p><strong>Thành phố:</strong> {otherLocation.addressDetails.city}</p>
                      )}
                    </div>
                  )}
                  {!otherLocation.addressDetails && otherLocation.address && (
                    <p style={{marginTop: '8px', fontSize: '13px'}}>{otherLocation.address.substring(0, 100)}...</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Current user location marker */}
          {currentUserLocation && (
            <>
              <Marker position={currentUserLocation} icon={currentLocationIcon}>
                <Popup>Vị trí hiện tại của bạn</Popup>
              </Marker>
              <Circle
                center={currentUserLocation}
                radius={50}
                pathOptions={{
                  color: '#4285F4',
                  fillColor: '#4285F4',
                  fillOpacity: 0.2,
                  weight: 2
                }}
              />
            </>
          )}
        </MapContainer>
        
        {/* Map Legend */}
        <div className="map-legend">
          <div className="map-legend-item">
            <div className="map-legend-color green"></div>
            <span>Địa điểm chuyển đi 🟢</span>
          </div>
          <div className="map-legend-item">
            <div className="map-legend-color red"></div>
            <span>Địa điểm chuyển đến 🔴</span>
          </div>
          {currentUserLocation && (
            <div className="map-legend-item">
              <div className="map-legend-color blue"></div>
              <span>Vị trí hiện tại 🔵</span>
            </div>
          )}
        </div>
      </div>

      {address && (
        <div className="selected-address">
          <strong>Địa chỉ đã chọn:</strong>
          {detailedAddress && detailedAddress.houseNumber && detailedAddress.road ? (
            <div className="address-breakdown">
              <p className="street-address">
                {detailedAddress.houseNumber} {detailedAddress.road}
              </p>
              <p className="full-address">{address}</p>
              <p className="coordinates-info">📍 {detailedAddress.coordinates}</p>
            </div>
          ) : (
            <p>{address}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
