import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const nodes = [
  { latitude: 28.6139, longitude: 77.2090, speed: 60 }, // km/h
  { latitude: 26.9124, longitude: 75.7873, speed: 80 },
  { latitude: 22.7196, longitude: 75.8577, speed: 70 },
  { latitude: 21.1458, longitude: 79.0882, speed: 75 },
  { latitude: 17.3850, longitude: 78.4867, speed: 65 },
  { latitude: 12.9716, longitude: 77.5946, speed: 50 },
];

export default function RouteDelhiToBangalore() {
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(10);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [travelStartTime, setTravelStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [nodeDistances, setNodeDistances] = useState([]);
  const [estimatedTimes, setEstimatedTimes] = useState([]);
  
  const centerPoint = nodes[Math.floor(nodes.length / 2)];

  useEffect(() => {
    requestLocationPermission();
    calculateDistancesAndTimes();
    
    // Cleanup location subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Timer effect for tracking elapsed time
  useEffect(() => {
    let interval;
    if (isTracking && travelStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - travelStartTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, travelStartTime]);

  // Calculate distances between consecutive nodes and estimated travel times
  const calculateDistancesAndTimes = () => {
    const distances = [];
    const times = [];
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const distance = calculateDistance(
        nodes[i].latitude,
        nodes[i].longitude,
        nodes[i + 1].latitude,
        nodes[i + 1].longitude
      );
      distances.push(distance);
      
      // Time = Distance / Speed (in hours), then convert to minutes
      const timeInHours = distance / nodes[i].speed;
      const timeInMinutes = timeInHours * 60;
      times.push(timeInMinutes);
    }
    
    setNodeDistances(distances);
    setEstimatedTimes(times);
  };

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Find closest node to user's current location
  const findClosestNode = (userLat, userLon) => {
    let closestIndex = 0;
    let minDistance = calculateDistance(userLat, userLon, nodes[0].latitude, nodes[0].longitude);
    
    for (let i = 1; i < nodes.length; i++) {
      const distance = calculateDistance(userLat, userLon, nodes[i].latitude, nodes[i].longitude);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  // Format time in HH:MM:SS
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Format estimated time in hours and minutes
  const formatEstimatedTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        Alert.alert(
          'Location Permission',
          'Location permission is required to track your position on the map.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const startLocationTracking = async () => {
    if (!locationPermission) {
      Alert.alert('Permission Required', 'Location permission is required for live tracking.');
      return;
    }

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(newLocation);
          
          // Update current node index based on proximity
          const closestNodeIndex = findClosestNode(
            location.coords.latitude,
            location.coords.longitude
          );
          setCurrentNodeIndex(closestNodeIndex);
        }
      );
      
      setLocationSubscription(subscription);
      setIsTracking(true);
      setTravelStartTime(Date.now()); // Start travel timer
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking.');
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsTracking(false);
    setTravelStartTime(null);
    setElapsedTime(0);
  };

  const centerOnUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleZoom = (type) => {
    const newZoom = type === 'in' ? zoom / 2 : zoom * 2;
    setZoom(newZoom);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...centerPoint,
        latitudeDelta: newZoom,
        longitudeDelta: newZoom,
      }, 500);
    }
  };

  const recenter = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...centerPoint,
        latitudeDelta: zoom,
        longitudeDelta: zoom,
      }, 500);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsCompass={true}
        showsUserLocation={false} // We'll handle user location manually
        initialRegion={{
          ...centerPoint,
          latitudeDelta: zoom,
          longitudeDelta: zoom,
        }}
      >
        <Polyline
          coordinates={nodes.map(n => ({ latitude: n.latitude, longitude: n.longitude }))}
          strokeWidth={5}
          strokeColor="blue"
        />

        {nodes.map((node, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: node.latitude, longitude: node.longitude }}
            title={
              index === 0
                ? `Start Point`
                : index === nodes.length - 1
                ? `End Point`
                : `Waypoint ${index}`
            }
            description={
              index < nodes.length - 1
                ? `Speed: ${node.speed} km/h | To next: ${nodeDistances[index] ? Math.round(nodeDistances[index]) : 0} km | ETA: ${estimatedTimes[index] ? formatEstimatedTime(estimatedTimes[index]) : 'N/A'}`
                : `Final destination (Speed: ${node.speed} km/h)`
            }
            pinColor={index === 0 ? "green" : index === nodes.length - 1 ? "red" : "orange"}
          />
        ))}

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="Current GPS Position"
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationDot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom('in')}>
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom('out')}>
          <Text style={styles.zoomText}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Location Controls */}
      <View style={styles.locationControls}>
        <TouchableOpacity 
          style={[styles.controlBtn, isTracking && styles.activeBtn]} 
          onPress={isTracking ? stopLocationTracking : startLocationTracking}
        >
          <Text style={[styles.controlText, isTracking && styles.activeText]}>
            {isTracking ? '⏹️' : '📍'}
          </Text>
        </TouchableOpacity>
        
        {userLocation && (
          <TouchableOpacity style={styles.controlBtn} onPress={centerOnUserLocation}>
            <Text style={styles.controlText}>🎯</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recenter Button */}
      <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
        <Text style={styles.recenterText}>🗺️</Text>
      </TouchableOpacity>

      {/* Status Indicator */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {isTracking ? '🟢 Live Tracking' : userLocation ? '🟡 Location Found' : '🔴 No Location'}
        </Text>
        {isTracking && (
          <Text style={styles.travelTimeText}>
            Travel Time: {formatTime(elapsedTime)}
          </Text>
        )}
      </View>

      {/* Route Info Panel */}
      {userLocation && (
        <View style={styles.routeInfoContainer}>
          <Text style={styles.routeInfoTitle}>Route Progress</Text>
          <Text style={styles.routeInfoText}>
            Closest to: {currentNodeIndex === 0 ? 'Start Point' : currentNodeIndex === nodes.length - 1 ? 'End Point' : `Waypoint ${currentNodeIndex}`}
          </Text>
          {currentNodeIndex < nodes.length - 1 && (
            <>
              <Text style={styles.routeInfoText}>
                Next: {currentNodeIndex + 1 === nodes.length - 1 ? 'End Point' : `Waypoint ${currentNodeIndex + 1}`}
              </Text>
              <Text style={styles.routeInfoText}>
                Distance: {nodeDistances[currentNodeIndex] ? Math.round(nodeDistances[currentNodeIndex]) : 0} km
              </Text>
              <Text style={styles.routeInfoText}>
                ETA: {estimatedTimes[currentNodeIndex] ? formatEstimatedTime(estimatedTimes[currentNodeIndex]) : 'N/A'}
              </Text>
              <Text style={styles.routeInfoText}>
                Speed: {nodes[currentNodeIndex].speed} km/h
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  zoomControls: {
    position: 'absolute',
    right: 10,
    top: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBtn: {
    backgroundColor: 'white',
    padding: 10,
    marginVertical: 5,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  zoomText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  locationControls: {
    position: 'absolute',
    left: 10,
    top: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtn: {
    backgroundColor: 'white',
    padding: 10,
    marginVertical: 5,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  activeBtn: {
    backgroundColor: '#4CAF50',
  },
  controlText: {
    fontSize: 20,
  },
  activeText: {
    color: 'white',
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 30,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recenterText: {
    fontSize: 20,
  },
  statusContainer: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  travelTimeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 2,
  },
  routeInfoContainer: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  routeInfoText: {
    fontSize: 13,
    marginBottom: 3,
    color: '#666',
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
});