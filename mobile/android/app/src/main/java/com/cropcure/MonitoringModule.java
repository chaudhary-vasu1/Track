package com.cropcure;

import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import androidx.annotation.NonNull;

/**
 * MonitoringModule - React Native bridge for MonitoringService
 *
 * Exposes startService() and stopService() to JavaScript so the
 * mobile app can start the foreground service after socket connection.
 */
public class MonitoringModule extends ReactContextBaseJavaModule {

    private static final String TAG = "MonitoringModule";

    public MonitoringModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "MonitoringModule";
    }

    @ReactMethod
    public void startService(Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            Intent intent = new Intent(context, MonitoringService.class);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }

            Log.d(TAG, "MonitoringService start requested from JS");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start MonitoringService: " + e.getMessage());
            promise.reject("SERVICE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            Intent intent = new Intent(context, MonitoringService.class);
            context.stopService(intent);

            Log.d(TAG, "MonitoringService stop requested from JS");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop MonitoringService: " + e.getMessage());
            promise.reject("SERVICE_ERROR", e.getMessage());
        }
    }
}
