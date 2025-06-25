import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';

 const PolylineScreen=()=> {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(0.01);

  // Threshold filter to avoid GPS jitter
  const isSignificantMove = (prev, next, threshold = 0.00005) => {
    const latDiff = Math.abs(prev.latitude - next.latitude);
    const lonDiff = Math.abs(prev.longitude - next.longitude);
    return latDiff > threshold || lonDiff > threshold;
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const newPoint = { latitude, longitude };

          setCurrentLocation(newPoint);

          setRouteCoordinates((prev) => {
            if (prev.length === 0 || isSignificantMove(prev[prev.length - 1], newPoint)) {
              return [...prev, newPoint];
            }
            return prev;
          });
        }
      );

      return () => subscription.remove();
    })();
  }, []);

  const handleZoom = (type) => {
    const newZoom = type === 'in' ? zoom / 2 : zoom * 2;
    setZoom(newZoom);

    if (currentLocation && mapRef.current) {
      const region = {
        ...currentLocation,
        latitudeDelta: newZoom,
        longitudeDelta: newZoom,
      };
      mapRef.current.animateToRegion(region, 500);
    }
  };

  const recenter = () => {
    if (currentLocation && mapRef.current) {
      const region = {
        ...currentLocation,
        latitudeDelta: zoom,
        longitudeDelta: zoom,
      };
      mapRef.current.animateToRegion(region, 500);
    }
  };

  return (
    <View style={styles.container}>
      {currentLocation && (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              ...currentLocation,
              latitudeDelta: zoom,
              longitudeDelta: zoom,
            }}
            showsCompass={true}
            showsUserLocation={true}
          >
            <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor="blue" />
            {routeCoordinates.length > 0 && (
              <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} />
            )}
          </MapView>

          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom('in')}>
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom('out')}>
              <Text style={styles.zoomText}>−</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
            <Text style={styles.recenterText}>📍</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
export default PolylineScreen
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
  },
  zoomText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 30,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 12,
    elevation: 4,
  },
  recenterText: {
    fontSize: 20,
  },
});
