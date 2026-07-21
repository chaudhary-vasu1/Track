package com.cropcure;

import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import java.util.List;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class UsageStatsModule extends ReactContextBaseJavaModule {

    public UsageStatsModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "UsageStatsModule";
    }

    @ReactMethod
    public void checkUsagePermission(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            android.app.AppOpsManager appOps = (android.app.AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
            int mode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                mode = appOps.unsafeCheckOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.getPackageName()
                );
            } else {
                mode = appOps.checkOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.getPackageName()
                );
            }
            boolean granted = (mode == android.app.AppOpsManager.MODE_ALLOWED);
            promise.resolve(granted);
        } catch (Exception e) {
            promise.reject("CHECK_PERMISSION_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void openUsageSettings(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.setData(Uri.fromParts("package", context.getPackageName(), null));
            context.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            try {
                Context context = getReactApplicationContext();
                Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                promise.resolve(true);
            } catch (Exception ex) {
                promise.reject("OPEN_SETTINGS_FAILED", ex.getMessage());
            }
        }
    }

    @ReactMethod
    public void getAppUsageStats(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                Context context = getReactApplicationContext();
                UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
                long endTime = System.currentTimeMillis();
                long startTime = endTime - (1000 * 60 * 60 * 24); // Past 24 hours

                List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
                WritableArray array = Arguments.createArray();

                if (stats != null) {
                    for (UsageStats usageStats : stats) {
                        long totalTimeInForeground = usageStats.getTotalTimeInForeground();
                        if (totalTimeInForeground > 1000 * 60) { // Apps used > 1 minute
                            WritableMap map = Arguments.createMap();
                            String packageName = usageStats.getPackageName();
                            String appName = getAppNameFromPackage(packageName);
                            int minutes = (int) (totalTimeInForeground / (1000 * 60));
                            map.putString("packageName", packageName);
                            map.putString("appName", appName);
                            map.putInt("minutes", minutes);
                            array.pushMap(map);
                        }
                    }
                }
                promise.resolve(array);
            } else {
                promise.resolve(Arguments.createArray());
            }
        } catch (Exception e) {
            promise.reject("USAGE_STATS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getForegroundApp(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                Context context = getReactApplicationContext();
                UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
                long time = System.currentTimeMillis();
                UsageEvents events = usm.queryEvents(time - 60000, time);
                String currentApp = "";
                UsageEvents.Event event = new UsageEvents.Event();

                while (events.hasNextEvent()) {
                    events.getNextEvent(event);
                    if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        currentApp = event.getPackageName();
                    }
                }

                if (!currentApp.isEmpty()) {
                    String appName = getAppNameFromPackage(currentApp);
                    promise.resolve(appName);
                } else {
                    promise.resolve(null);
                }
            } else {
                promise.resolve(null);
            }
        } catch (Exception e) {
            promise.reject("USAGE_STATS_ERROR", e.getMessage());
        }
    }

    private String getAppNameFromPackage(String packageName) {
        try {
            Context context = getReactApplicationContext();
            PackageManager pm = context.getPackageManager();
            ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            return pm.getApplicationLabel(info).toString();
        } catch (Exception e) {
            return packageName;
        }
    }
}
