package com.odusbaba.familyguard.guardnative

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.concurrent.thread

// One foreground service, deliberately gentle on the battery:
//  - BALANCED_POWER_ACCURACY (cell/wifi, not constant GPS)
//  - a long interval (set by the app, default 10 minutes)
//  - a minimum movement before a new fix, so a still phone sends nothing
// Each fix is posted straight to the Family Guard API with the device token.
class LocationForegroundService : Service() {

  private lateinit var client: FusedLocationProviderClient
  private var apiBase: String = ""
  private var token: String = ""
  private var callback: LocationCallback? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    apiBase = intent?.getStringExtra("apiBase") ?: apiBase
    token = intent?.getStringExtra("token") ?: token
    val intervalSec = intent?.getIntExtra("intervalSec", 600) ?: 600

    startInForeground()
    if (token.isNotEmpty()) startLocationUpdates(intervalSec.toLong())
    return START_STICKY
  }

  private fun startInForeground() {
    val channelId = "family_guard_location"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(NotificationManager::class.java)
      if (nm.getNotificationChannel(channelId) == null) {
        nm.createNotificationChannel(
          NotificationChannel(channelId, "Family Guard", NotificationManager.IMPORTANCE_MIN)
        )
      }
    }
    val notification: Notification = Notification.Builder(this, channelId)
      .setContentTitle("Family Guard")
      .setContentText("Keeping this phone safe")
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setOngoing(true)
      .build()
    startForeground(4711, notification)
  }

  private fun startLocationUpdates(intervalSec: Long) {
    client = LocationServices.getFusedLocationProviderClient(this)
    val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, intervalSec * 1000)
      .setMinUpdateIntervalMillis((intervalSec / 2) * 1000)
      .setMinUpdateDistanceMeters(50f)
      .build()

    callback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        val loc = result.lastLocation ?: return
        postLocation(loc.latitude, loc.longitude, loc.accuracy.toDouble(), loc.speed.toDouble())
      }
    }
    try {
      client.requestLocationUpdates(request, callback!!, mainLooper)
    } catch (_: SecurityException) {
      // Location permission not granted yet; the app will prompt and restart.
    }
  }

  private fun postLocation(lat: Double, lng: Double, accuracy: Double, speed: Double) {
    val base = apiBase
    val tok = token
    if (base.isEmpty() || tok.isEmpty()) return
    thread {
      try {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        val point = JSONObject()
          .put("lat", lat).put("lng", lng)
          .put("accuracy_m", accuracy).put("speed_mps", speed)
          .put("captured_at", fmt.format(Date()))
        val body = JSONObject().put("locations", JSONArray().put(point))

        val url = URL("$base/api/device/ingest")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 15000
        conn.readTimeout = 15000
        conn.doOutput = true
        conn.setRequestProperty("content-type", "application/json")
        conn.setRequestProperty("x-device-token", tok)
        val out: OutputStream = conn.outputStream
        out.write(body.toString().toByteArray(Charsets.UTF_8))
        out.flush(); out.close()
        conn.responseCode // trigger the request
        conn.disconnect()
      } catch (_: Throwable) {
        // Offline or transient error: the next fix will try again.
      }
    }
  }

  override fun onDestroy() {
    callback?.let { client.removeLocationUpdates(it) }
    super.onDestroy()
  }
}
