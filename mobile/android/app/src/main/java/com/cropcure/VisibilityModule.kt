package com.cropcure

import android.content.ComponentName
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class VisibilityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "VisibilityModule"
    }

    @ReactMethod
    fun disableLauncher(promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageManager = context.packageManager
            val componentName = ComponentName(context, "${context.packageName}.MainActivity")

            packageManager.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISABLE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun enableLauncher(promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageManager = context.packageManager
            val componentName = ComponentName(context, "${context.packageName}.MainActivity")

            packageManager.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ENABLE_FAILED", e.message)
        }
    }
}
