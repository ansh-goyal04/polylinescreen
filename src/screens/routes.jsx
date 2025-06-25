import React, { useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';


const nodes = [
  { latitude: 28.6139, longitude: 77.2090, name: 'Delhi' },
  { latitude: 26.9124, longitude: 75.7873, name: 'Jaipur' },
  { latitude: 22.7196, longitude: 75.8577, name: 'Indore' },
  { latitude: 21.1458, longitude: 79.0882, name: 'Nagpur' },
  { latitude: 17.3850, longitude: 78.4867, name: 'Hyderabad' },
  { latitude: 12.9716, longitude: 77.5946, name: 'Bangalore' },
];

export default function RouteDelhiToBangalore() {
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(10); // initial zoom
  const centerPoint = nodes[Math.floor(nodes.length / 2)];

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
                ? "Start: " + node.name
                : index === nodes.length - 1
                ? "End: " + node.name
                : node.name
            }
            pinColor={index === 0 ? "green" : index === nodes.length - 1 ? "red" : "orange"}
          />
        ))}
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
