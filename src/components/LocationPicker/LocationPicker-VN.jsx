import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import { Input, Button, Spin, Tooltip, Select, message } from 'antd';
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
    const GEOAPIFY_API_KEY = process.env.REACT_APP_GEOAPIFY_API_KEY;
    const GOONG_API_KEY = process.env.REACT_APP_GOONG_API_KEY;
    const OPENCAGE_API_KEY = process.env.REACT_APP_OPENCAGE_API_KEY;
    const LOCATIONIQ_API_KEY = process.env.REACT_APP_LOCATIONIQ_API_KEY;
    const MAPBOX_API_KEY = process.env.REACT_APP_MAPBOX_API_KEY;

    const [position, setPosition] = useState(initialPosition || { lat: 16.023779, lng: 108.228200 }); // Default: Da Nang
    const [currentUserLocation, setCurrentUserLocation] = useState(null);
    const [address, setAddress] = useState('');
    const [detailedAddress, setDetailedAddress] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchCandidates, setSearchCandidates] = useState([]);
    const [selectedCandidateKey, setSelectedCandidateKey] = useState(undefined);
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const mapRef = useRef(null);
    const forwardSearchCacheRef = useRef(new Map());
    const reverseGeocodeCacheRef = useRef(new Map());

    const hasGeoapifyKey = Boolean(GEOAPIFY_API_KEY);
    const hasGoongKey = Boolean(GOONG_API_KEY);
    const hasOpenCageKey = Boolean(OPENCAGE_API_KEY);
    const hasLocationIqKey = Boolean(LOCATIONIQ_API_KEY);
    const hasMapboxKey = Boolean(MAPBOX_API_KEY);

    const fetchJsonWithTimeout = async (url, timeoutMs = 3200) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    };

    const normalizeDiacritics = (value = '') => value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');

    const normalizeWhitespace = (value = '') => value
        .replace(/[|;]+/g, ',')
        .replace(/\s+/g, ' ')
        .trim();

    const expandVietnameseAbbreviations = (value = '') => value
        .replace(/\btp\.?\b/gi, 'thành phố')
        .replace(/\bq\.?\b/gi, 'quận')
        .replace(/\bp\.?\b/gi, 'phường');

    const extractAddressTokens = (rawQuery = '') => {
        const normalized = normalizeDiacritics(rawQuery.toLowerCase());
        return normalized
            .split(/[^a-z0-9]+/)
            .filter(token => token && token.length > 1)
            .filter(token => ![
                'duong', 'phuong', 'quan', 'huyen', 'thanh', 'pho', 'viet', 'nam',
                'ki', 'hem', 'ngo', 'ngach', 'so', 'tp'
            ].includes(token));
    };

    const buildVietnameseQueryVariants = (rawQuery = '') => {
        const base = normalizeWhitespace(rawQuery);
        if (!base) return [];

        const expanded = expandVietnameseAbbreviations(base);
        const noDiacritics = normalizeDiacritics(expanded);
        const parts = expanded.split(',').map(part => part.trim()).filter(Boolean);
        const streetPart = parts[0] || expanded;
        const areaPart = parts.slice(1).join(', ');

        const variants = new Set([
            base,
            expanded,
            noDiacritics,
            `${expanded}, Việt Nam`,
            `${noDiacritics}, Viet Nam`
        ]);

        const alleyMatch = streetPart.match(/^(kiệt|kiet|hẻm|hem|ngõ|ngo|ngách|ngach)\s*(\d+[a-zA-Z0-9\-/]*)\s+(.+)$/i);
        if (alleyMatch) {
            const alleyNumber = alleyMatch[2];
            const mainStreet = alleyMatch[3];

            variants.add(`${alleyNumber} ${mainStreet}${areaPart ? `, ${areaPart}` : ''}`);
            variants.add(`${mainStreet} ${alleyNumber}${areaPart ? `, ${areaPart}` : ''}`);
            variants.add(`${mainStreet}${areaPart ? `, ${areaPart}` : ''}`);
            variants.add(`${normalizeDiacritics(mainStreet)} ${alleyNumber}${areaPart ? `, ${normalizeDiacritics(areaPart)}` : ''}`);
            variants.add(`hem ${alleyNumber} ${normalizeDiacritics(mainStreet)}${areaPart ? `, ${normalizeDiacritics(areaPart)}` : ''}`);
        }

        if (!/viet\s*nam|việt\s*nam/i.test(expanded)) {
            variants.add(`${expanded}, Đà Nẵng, Việt Nam`);
            variants.add(`${noDiacritics}, Da Nang, Viet Nam`);
        }

        return Array.from(variants).map(normalizeWhitespace).filter(Boolean);
    };

    const scoreNominatimCandidate = (result, originalQuery, variantIndex) => {
        const queryTokens = extractAddressTokens(originalQuery);
        const display = normalizeDiacritics((result.display_name || '').toLowerCase());
        const address = result.address || {};

        let score = 0;
        score += (result.importance || 0) * 100;
        score += Math.max(0, 40 - variantIndex * 6);

        queryTokens.forEach(token => {
            if (display.includes(token)) score += 4;
        });

        const houseNumberToken = queryTokens.find(token => /^\d+[a-z0-9\-/]*$/i.test(token));
        if (houseNumberToken && display.includes(houseNumberToken)) {
            score += 12;
        }

        if (address.road) score += 5;
        if (address.house_number) score += 8;
        if (address.city || address.town || address.village) score += 4;

        const originalNormalized = normalizeDiacritics(originalQuery.toLowerCase());
        const asksDaNang = originalNormalized.includes('da nang') || originalQuery.toLowerCase().includes('đà nẵng');
        const cityValue = normalizeDiacritics(`${address.city || ''} ${address.state || ''}`.toLowerCase());
        if (asksDaNang && cityValue.includes('da nang')) {
            score += 14;
        }

        if (/(ki[eẹ]t|h[eẻ]m|ng[oõ]\\?|ng[aá]ch)/i.test(originalQuery)) {
            if (address.house_number) score += 8;
            if (display.includes('hem') || display.includes('kiet') || display.includes('ngo') || display.includes('ngach')) {
                score += 8;
            }
        }

        if (result.class === 'building' || result.class === 'highway' || result.type === 'residential') {
            score += 5;
        }

        return score;
    };

    const rankNominatimResults = (results, originalQuery) => {
        const byCoordinate = new Map();

        results.forEach(result => {
            const lat = Number(result.lat).toFixed(6);
            const lon = Number(result.lon).toFixed(6);
            const key = `${lat},${lon}`;

            const currentScore = scoreNominatimCandidate(result, originalQuery, result.__variantIndex || 0);
            const existing = byCoordinate.get(key);

            if (!existing || currentScore > existing.__score) {
                byCoordinate.set(key, {
                    ...result,
                    __key: key,
                    __score: currentScore
                });
            }
        });

        return Array.from(byCoordinate.values()).sort((a, b) => b.__score - a.__score);
    };

    const mapCandidateAddressDetails = (result) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        let addr = result.address || {};

        // Standardize between Geoapify/Nominatim format and Goong/OpenCage format
        if (result.__provider === 'goong' && result.__originalAddressContext) {
            addr = { ...addr, ...result.__originalAddressContext };
        }

        return {
            houseNumber: addr?.house_number || '',
            road: addr?.road || addr?.street || '',
            suburb: addr?.suburb || addr?.neighbourhood || '',
            district: addr?.city_district || addr?.district || '',
            city: addr?.city || addr?.town || addr?.village || '',
            state: addr?.state || '',
            postcode: addr?.postcode || '',
            country: addr?.country || '',
            fullAddress: result.display_name,
            coordinates: `${lat.toFixed(6)}, ${lon.toFixed(6)}`
        };
    };

    const mapGeoapifyFeatureToCandidate = (feature, variantIndex = 0) => {
        const properties = feature?.properties || {};
        const lat = properties?.lat;
        const lon = properties?.lon;

        if (lat === undefined || lon === undefined) return null;

        return {
            lat: String(lat),
            lon: String(lon),
            display_name: properties.formatted || '',
            address: {
                house_number: properties.housenumber || '',
                road: properties.street || '',
                suburb: properties.suburb || properties.neighbourhood || '',
                city_district: properties.district || '',
                district: properties.county || properties.district || '',
                city: properties.city || properties.state_district || '',
                state: properties.state || '',
                postcode: properties.postcode || '',
                country: properties.country || ''
            },
            importance: properties.rank?.importance || 0,
            class: properties.result_type || '',
            type: properties.result_type || '',
            __variantIndex: variantIndex,
            __provider: 'geoapify'
        };
    };

    const mapGoongFeatureToCandidate = (result, variantIndex = 0) => {
        if (!result?.geometry?.location) return null;
        const { lat, lng } = result.geometry.location;
        return {
            lat: String(lat),
            lon: String(lng),
            display_name: result.formatted_address || '',
            address: {},
            __variantIndex: variantIndex,
            __provider: 'goong',
            __originalAddressContext: result.address_components
        };
    };

    const mapOpenCageFeatureToCandidate = (result, variantIndex = 0) => {
        if (!result?.geometry) return null;
        const { lat, lng } = result.geometry;
        const comps = result.components || {};
        return {
            lat: String(lat),
            lon: String(lng),
            display_name: result.formatted || '',
            address: {
                house_number: comps.house_number || '',
                road: comps.road || comps.street || '',
                suburb: comps.suburb || comps.neighbourhood || '',
                district: comps.county || comps.city_district || '',
                city: comps.city || comps.town || comps.state || '',
            },
            __variantIndex: variantIndex,
            __provider: 'opencage'
        };
    };

    const mapLocationIqFeatureToCandidate = (result, variantIndex = 0) => {
        if (!result?.lat || !result?.lon) return null;
        const comps = result.address || {};
        return {
            lat: String(result.lat),
            lon: String(result.lon),
            display_name: result.display_name || '',
            address: comps,
            __variantIndex: variantIndex,
            __provider: 'locationiq'
        };
    };

    const mapMapboxFeatureToCandidate = (feature, variantIndex = 0) => {
        if (!feature?.center) return null;
        const [lon, lat] = feature.center;
        let context = {};
        if (feature.context) {
            feature.context.forEach(c => {
                if (c.id.startsWith('neighborhood')) context.suburb = c.text;
                else if (c.id.startsWith('postcode')) context.postcode = c.text;
                else if (c.id.startsWith('place')) context.city = c.text;
                else if (c.id.startsWith('region')) context.state = c.text;
            });
        }
        return {
            lat: String(lat),
            lon: String(lon),
            display_name: feature.place_name || '',
            address: {
                house_number: feature.address || '',
                road: feature.text || '',
                ...context
            },
            __variantIndex: variantIndex,
            __provider: 'mapbox'
        };
    };

    const fetchGeoapifyForwardCandidates = async (queryVariants) => {
        if (!hasGeoapifyKey) return [];

        const variants = Array.from(new Set(queryVariants)).slice(0, 4);
        const allCandidates = [];

        const loadGeoapifyByVariant = async (variant, variantIndex) => {
            const requestUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(variant)}&filter=countrycode:vn&lang=vi&limit=6&apiKey=${GEOAPIFY_API_KEY}`;
            const data = await fetchJsonWithTimeout(requestUrl, 3000);
            const features = Array.isArray(data?.features) ? data.features : [];
            return features
                .map(feature => mapGeoapifyFeatureToCandidate(feature, variantIndex))
                .filter(Boolean);
        };

        if (variants.length === 0) return [];

        try {
            const primaryCandidates = await loadGeoapifyByVariant(variants[0], 0);
            allCandidates.push(...primaryCandidates);
        } catch (error) {
            console.warn('Geoapify primary variant failed:', error?.message || error);
        }

        if (allCandidates.length < 3 && variants.length > 1) {
            const fallbackVariants = variants.slice(1);
            const fallbackResults = await Promise.allSettled(
                fallbackVariants.map((variant, offset) => loadGeoapifyByVariant(variant, offset + 1))
            );

            fallbackResults.forEach(result => {
                if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                    allCandidates.push(...result.value);
                }
            });
        }

        return allCandidates;
    };

    const fetchGoongForwardCandidates = async (queryVariants) => {
        if (!hasGoongKey || queryVariants.length === 0) return [];
        try {
            const variant = queryVariants[0]; // Usually exact match best
            const data = await fetchJsonWithTimeout(
                `https://rsapi.goong.io/geocode?address=${encodeURIComponent(variant)}&api_key=${GOONG_API_KEY}`,
                2800
            );
            if (data?.results?.length > 0) {
                return data.results.map(r => mapGoongFeatureToCandidate(r, 0)).filter(Boolean);
            }
        } catch (e) { console.warn('Goong failed:', e); }
        return [];
    };

    const fetchOpenCageForwardCandidates = async (queryVariants) => {
        if (!hasOpenCageKey || queryVariants.length === 0) return [];
        try {
            const data = await fetchJsonWithTimeout(
                `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(queryVariants[0])}&key=${OPENCAGE_API_KEY}&limit=3&countrycode=vn`,
                2800
            );
            if (data?.results?.length > 0) {
                return data.results.map(r => mapOpenCageFeatureToCandidate(r, 0)).filter(Boolean);
            }
        } catch (e) { console.warn('OpenCage failed:', e); }
        return [];
    };

    const fetchLocationIqForwardCandidates = async (queryVariants) => {
        if (!hasLocationIqKey || queryVariants.length === 0) return [];
        try {
            const data = await fetchJsonWithTimeout(
                `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(queryVariants[0])}&format=json&limit=3&countrycodes=vn`,
                2800
            );
            if (Array.isArray(data) && data.length > 0) {
                return data.map(r => mapLocationIqFeatureToCandidate(r, 0)).filter(Boolean);
            }
        } catch (e) { console.warn('LocationIQ failed:', e); }
        return [];
    };

    const fetchMapboxForwardCandidates = async (queryVariants) => {
        if (!hasMapboxKey || queryVariants.length === 0) return [];
        try {
            const data = await fetchJsonWithTimeout(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(queryVariants[0])}.json?access_token=${MAPBOX_API_KEY}&limit=3&country=vn`,
                2800
            );
            if (data?.features?.length > 0) {
                return data.features.map(r => mapMapboxFeatureToCandidate(r, 0)).filter(Boolean);
            }
        } catch (e) { console.warn('Mapbox failed:', e); }
        return [];
    };

    const fetchNominatimForwardCandidates = async (queryVariants) => {
        const variants = Array.from(new Set(queryVariants)).slice(0, 3);
        if (variants.length === 0) return [];

        const settled = await Promise.allSettled(
            variants.map((variant, index) => fetchJsonWithTimeout(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(variant)}&limit=6&addressdetails=1&countrycodes=vn&accept-language=vi`,
                2800
            ).then(data => ({ data, index })))
        );

        const allCandidates = [];
        settled.forEach(result => {
            if (result.status !== 'fulfilled') return;
            const { data, index } = result.value;
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(item => allCandidates.push({ ...item, __variantIndex: index, __provider: 'nominatim' }));
            }
        });

        return allCandidates;
    };

    const fetchGeoapifyReverse = useCallback(async (lat, lng) => {
        if (!hasGeoapifyKey) return null;

        const requestUrl = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&lang=vi&limit=1&apiKey=${GEOAPIFY_API_KEY}`;
        const data = await fetchJsonWithTimeout(requestUrl, 2800);
        const firstFeature = Array.isArray(data?.features) ? data.features[0] : null;
        return firstFeature ? mapGeoapifyFeatureToCandidate(firstFeature, 0) : null;
    }, [hasGeoapifyKey, GEOAPIFY_API_KEY]);

    const fetchGoongReverse = useCallback(async (lat, lng) => {
        if (!hasGoongKey) return null;
        try {
            const requestUrl = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`;
            const data = await fetchJsonWithTimeout(requestUrl, 2800);
            const result = data?.results?.[0];
            return result ? mapGoongFeatureToCandidate(result, 0) : null;
        } catch (e) { return null; }
    }, [hasGoongKey, GOONG_API_KEY]);

    const fetchOpenCageReverse = useCallback(async (lat, lng) => {
        if (!hasOpenCageKey) return null;
        try {
            const data = await fetchJsonWithTimeout(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&limit=1`, 2800);
            return data?.results?.[0] ? mapOpenCageFeatureToCandidate(data.results[0], 0) : null;
        } catch (e) { return null; }
    }, [hasOpenCageKey, OPENCAGE_API_KEY]);

    const fetchLocationIqReverse = useCallback(async (lat, lng) => {
        if (!hasLocationIqKey) return null;
        try {
            const data = await fetchJsonWithTimeout(`https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lng}&format=json`, 2800);
            return data ? mapLocationIqFeatureToCandidate(data, 0) : null;
        } catch (e) { return null; }
    }, [hasLocationIqKey, LOCATIONIQ_API_KEY]);

    const fetchMapboxReverse = useCallback(async (lat, lng) => {
        if (!hasMapboxKey) return null;
        try {
            const data = await fetchJsonWithTimeout(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_API_KEY}&limit=1`, 2800);
            return data?.features?.[0] ? mapMapboxFeatureToCandidate(data.features[0], 0) : null;
        } catch (e) { return null; }
    }, [hasMapboxKey, MAPBOX_API_KEY]);

    const fetchNominatimReverse = useCallback(async (lat, lng) => {
        const data = await fetchJsonWithTimeout(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            2800
        );
        if (!data?.display_name) return null;

        return {
            lat: String(lat),
            lon: String(lng),
            display_name: data.display_name,
            address: data.address || {},
            __provider: 'nominatim'
        };
    }, []);

    const applySearchCandidate = (result) => {
        if (!result) return;

        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const newPosition = { lat, lng: lon };
        const displayName = result.display_name || '';
        const addressDetails = mapCandidateAddressDetails(result);

        setPosition(newPosition);
        setAddress(displayName);
        setDetailedAddress(addressDetails);
        setSelectedCandidateKey(result.__key || `${lat.toFixed(6)},${lon.toFixed(6)}`);

        if (mapRef.current) {
            mapRef.current.flyTo([newPosition.lat, newPosition.lng], 15);
        }

        if (onLocationChange) {
            onLocationChange({
                lat: newPosition.lat,
                lng: newPosition.lng,
                address: displayName,
                addressDetails
            });
        }
    };

    const getAddressFromCoordinates = useCallback(async (lat, lng) => {
        const cacheKey = `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
        const cachedCandidate = reverseGeocodeCacheRef.current.get(cacheKey);
        if (cachedCandidate) {
            setAddress(cachedCandidate.display_name);
            setSelectedCandidateKey(undefined);
            setSearchCandidates([]);
            const cachedDetails = mapCandidateAddressDetails(cachedCandidate);
            setDetailedAddress(cachedDetails);
            if (onLocationChange) {
                onLocationChange({ lat, lng, address: cachedCandidate.display_name, addressDetails: cachedDetails });
            }
            return;
        }

        setLoading(true);
        try {
            let reverseCandidate = null;

            // Sequential generic fallback loop for reverse geocoding
            reverseCandidate = await fetchGoongReverse(lat, lng);
            if (!reverseCandidate) reverseCandidate = await fetchGeoapifyReverse(lat, lng);
            if (!reverseCandidate) reverseCandidate = await fetchOpenCageReverse(lat, lng);
            if (!reverseCandidate) reverseCandidate = await fetchMapboxReverse(lat, lng);
            if (!reverseCandidate) reverseCandidate = await fetchLocationIqReverse(lat, lng);
            if (!reverseCandidate) reverseCandidate = await fetchNominatimReverse(lat, lng);

            if (!reverseCandidate) return;

            reverseGeocodeCacheRef.current.set(cacheKey, reverseCandidate);

            setAddress(reverseCandidate.display_name);
            setSelectedCandidateKey(undefined);
            setSearchCandidates([]);

            const addressDetails = mapCandidateAddressDetails(reverseCandidate);
            setDetailedAddress(addressDetails);

            if (onLocationChange) {
                onLocationChange({
                    lat,
                    lng,
                    address: reverseCandidate.display_name,
                    addressDetails
                });
            }
        } catch (error) {
            console.error('Error fetching address:', error);
        } finally {
            setLoading(false);
        }
    }, [onLocationChange, fetchGeoapifyReverse, fetchNominatimReverse]);

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
                    setSearchQuery(currentLocationData.address); // Sync the search input
                } else {
                    setSearchQuery('');
                }
                if (currentLocationData.addressDetails) {
                    setDetailedAddress(currentLocationData.addressDetails);
                }
            } else {
                // Otherwise fetch the address
                setSearchQuery(''); // Clear search input if no data
                getAddressFromCoordinates(initialPosition.lat, initialPosition.lng);
            }
        }
    }, [initialPosition, currentLocationData, getAddressFromCoordinates]);

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
    }, []); // Run ONLY once on mount, regardless of initialPosition changing
    // Forward geocoding: Search address and get coordinates
    const searchAddress = async () => {
        if (!searchQuery.trim()) return;

        const normalizedSearchKey = normalizeWhitespace(searchQuery).toLowerCase();
        const cachedTopCandidates = forwardSearchCacheRef.current.get(normalizedSearchKey);
        if (cachedTopCandidates && cachedTopCandidates.length > 0) {
            setSearchCandidates(cachedTopCandidates);
            applySearchCandidate(cachedTopCandidates[0]);
            return;
        }

        setLoading(true);
        try {
            const queryVariants = buildVietnameseQueryVariants(searchQuery);
            let allCandidates = [];

            // Forward Cascading Geocoding Fallbacks
            allCandidates = await fetchGoongForwardCandidates(queryVariants);

            if (allCandidates.length === 0) {
                allCandidates = await fetchGeoapifyForwardCandidates(queryVariants);
            }

            if (allCandidates.length === 0) {
                allCandidates = await fetchOpenCageForwardCandidates(queryVariants);
            }

            if (allCandidates.length === 0) {
                allCandidates = await fetchMapboxForwardCandidates(queryVariants);
            }

            if (allCandidates.length === 0) {
                allCandidates = await fetchLocationIqForwardCandidates(queryVariants);
            }

            if (allCandidates.length === 0) {
                allCandidates = await fetchNominatimForwardCandidates(queryVariants);
            }

            const rankedCandidates = rankNominatimResults(allCandidates, searchQuery);
            if (rankedCandidates.length > 0) {
                const topCandidates = rankedCandidates.slice(0, 3);
                forwardSearchCacheRef.current.set(normalizedSearchKey, topCandidates);
                setSearchCandidates(topCandidates);
                applySearchCandidate(topCandidates[0]);
            } else {
                setSearchCandidates([]);
                setSelectedCandidateKey(undefined);
                message.warning('Không tìm thấy địa chỉ phù hợp. Hãy thêm quận/thành phố hoặc kéo ghim trên bản đồ để chọn chính xác.');
            }
        } catch (error) {
            console.error('Error searching address:', error);
            setSearchCandidates([]);
            setSelectedCandidateKey(undefined);
            message.error('Có lỗi khi tìm địa chỉ. Vui lòng thử lại hoặc chọn vị trí trực tiếp trên bản đồ.');
        } finally {
            setLoading(false);
        }
    };

    const handleCandidateChange = (candidateKey) => {
        const selected = searchCandidates.find(candidate => candidate.__key === candidateKey);
        if (selected) {
            applySearchCandidate(selected);
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
        setSearchCandidates([]);
        setSelectedCandidateKey(undefined);
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

            {searchCandidates.length > 1 && (
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <Select
                        style={{ width: '100%' }}
                        value={selectedCandidateKey}
                        onChange={handleCandidateChange}
                        placeholder="Chọn địa chỉ gần đúng hơn"
                        options={searchCandidates.map((candidate, index) => ({
                            value: candidate.__key,
                            label: `#${index + 1} ${candidate.display_name}`
                        }))}
                    />
                </div>
            )}

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
                                        <p style={{ marginTop: '8px', fontSize: '13px' }}>{otherLocation.address.substring(0, 100)}...</p>
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
