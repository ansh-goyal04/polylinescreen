import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function App() {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [region, setRegion] = useState(null);
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(0.01); 

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
          const newRegion = {
            latitude,
            longitude,
            latitudeDelta: zoom,
            longitudeDelta: zoom,
          };

          setRouteCoordinates((prev) => [...prev, { latitude, longitude }]);
          setRegion(newRegion);

          if (mapRef.current) {
            mapRef.current.animateToRegion(newRegion, 500);
          }
        }
      );

      return () => subscription.remove();
    })();
  }, [zoom]);

  const handleZoom = (type) => {
    const newZoom = type === 'in' ? zoom / 2 : zoom * 2;
    setZoom(newZoom);
  };

  const recenter = async () => {
    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    const newRegion = {
      latitude,
      longitude,
      latitudeDelta: zoom,
      longitudeDelta: zoom,
    };
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 500);
    }
  };

  return (
    <View style={styles.container}>
      {region && (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
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
