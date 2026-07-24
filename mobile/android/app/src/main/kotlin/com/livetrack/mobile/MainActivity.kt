package com.livetrack.mobile

import android.content.Context
import android.net.wifi.WifiManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "livetrack/wifi_scan").setMethodCallHandler { call, result ->
            if (call.method != "scanWifi") {
                result.notImplemented()
                return@setMethodCallHandler
            }

            try {
                result.success(scanWifi())
            } catch (error: SecurityException) {
                result.success(emptyList<Map<String, Any?>>())
            } catch (error: Exception) {
                result.success(emptyList<Map<String, Any?>>())
            }
        }
    }

    private fun scanWifi(): List<Map<String, Any?>> {
        val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION")
        wifiManager.startScan()
        return wifiManager.scanResults.map {
            mapOf(
                "bssid" to it.BSSID,
                "ssid" to it.SSID,
                "rssi" to it.level,
                "frequencyMhz" to it.frequency
            )
        }
    }
}
