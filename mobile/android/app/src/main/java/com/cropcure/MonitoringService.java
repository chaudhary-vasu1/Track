package com.cropcure;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;

/**
 * MonitoringService - Android Foreground Service
 *
 * Purpose: Keeps the React Native JS thread alive when the app is backgrounded.
 * Without this, Android 13+ aggressively kills backgrounded apps, severing the
 * Socket.IO WebSocket connection (reason: "transport close").
 *
 * This service:
 * 1. Shows a persistent notification (required by Android for foreground services)
 * 2. Acquires a partial WakeLock to prevent CPU sleep
 * 3. Runs with foregroundServiceType="location|camera|microphone" for full hardware access
 */
public class MonitoringService extends Service {

    private static final String TAG = "MonitoringService";
    private static final String CHANNEL_ID = "cropcure_monitoring";
    private static final int NOTIFICATION_ID = 1001;

    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "MonitoringService created");
        createNotificationChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "MonitoringService started");

        Notification notification = buildNotification();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION |
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA |
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service: " + e.getMessage());
            startForeground(NOTIFICATION_ID, notification);
        }

        // If the system kills this service, restart it automatically
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "MonitoringService destroyed");
        releaseWakeLock();
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Device Monitoring",
                NotificationManager.IMPORTANCE_LOW // Low = no sound, shows in shade
            );
            channel.setDescription("Keeps device monitoring active in background");
            channel.setShowBadge(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        return builder
            .setContentTitle("Device Protection Active")
            .setContentText("Monitoring is running in background")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .build();
    }

    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "CropCure::MonitoringWakeLock"
                );
                wakeLock.acquire(24 * 60 * 60 * 1000L); // 24 hours max
                Log.d(TAG, "WakeLock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to acquire WakeLock: " + e.getMessage());
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                Log.d(TAG, "WakeLock released");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to release WakeLock: " + e.getMessage());
        }
    }
}
