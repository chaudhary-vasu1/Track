package com.cropcure

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class UsageStatsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "UsageStatsModule"
    }

    @ReactMethod
    fun checkUsagePermission(promise: Promise) {
        try {
            val context = reactApplicationContext
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            } else {
                appOps.checkOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            }
            val granted = mode == android.app.AppOpsManager.MODE_ALLOWED
            promise.resolve(granted)
        } catch (e: Exception) {
            promise.reject("CHECK_PERMISSION_FAILED", e.message)
        }
    }

    @ReactMethod
    fun openUsageSettings(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = android.content.Intent(android.provider.Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                data = android.net.Uri.fromParts("package", context.packageName, null)
            }
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            try {
                val intent = android.content.Intent(android.provider.Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } catch (ex: Exception) {
                promise.reject("OPEN_SETTINGS_FAILED", ex.message)
            }
        }
    }

    @ReactMethod
    fun getForegroundApp(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val usm = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
                val time = System.currentTimeMillis()
                val events = usm.queryEvents(time - 1000 * 60, time)
                var currentApp = ""
                val event = UsageEvents.Event()

                while (events.hasNextEvent()) {
                    events.getNextEvent(event)
                    if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        currentApp = event.packageName
                    }
                }

                if (currentApp.isNotEmpty()) {
                    val appName = getAppNameFromPackage(currentApp)
                    promise.resolve(appName)
                } else {
                    promise.resolve(null)
                }
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("USAGE_STATS_ERROR", e.message)
        }
    }

    private fun getAppNameFromPackage(packageName: String): String {
        return try {
            val pm = reactApplicationContext.packageManager
            val info = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(info).toString()
        } catch (e: Exception) {
            packageName
        }
    }
}
