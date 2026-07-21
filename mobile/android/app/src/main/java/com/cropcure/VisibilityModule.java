package com.cropcure;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class VisibilityModule extends ReactContextBaseJavaModule {

    public VisibilityModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "VisibilityModule";
    }

    @ReactMethod
    public void disableLauncher(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            PackageManager packageManager = context.getPackageManager();
            ComponentName componentName = new ComponentName(context, context.getPackageName() + ".MainActivity");

            packageManager.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            );
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("DISABLE_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void enableLauncher(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            PackageManager packageManager = context.getPackageManager();
            ComponentName componentName = new ComponentName(context, context.getPackageName() + ".MainActivity");

            packageManager.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ENABLE_FAILED", e.getMessage());
        }
    }
}
