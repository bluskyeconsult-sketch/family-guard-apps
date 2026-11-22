package com.odusbaba.familyguard.guardnative

import android.app.admin.DevicePolicyManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

// The native side of Family Guard on Android. Every method is defensive: if
// the phone is not device owner, the control methods return false or no-op
// rather than throwing, so the parent still gets location, status and usage.
class FamilyGuardNativeModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "No Android context" }

  private fun dpm(): DevicePolicyManager =
    context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

  private fun admin(): ComponentName = GuardAdminReceiver.component(context)

  private fun isOwner(): Boolean =
    dpm().isDeviceOwnerApp(context.packageName)

  override fun definition() = ModuleDefinition {
    Name("FamilyGuardNative")

    AsyncFunction("isDeviceOwner") { -> isOwner() }

    // Lock the Private DNS to the family content-filter host. Device owner
    // only. On older Android this is unavailable and returns false.
    AsyncFunction("setPrivateDns") { hostname: String ->
      if (!isOwner() || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return@AsyncFunction false
      try {
        val result = dpm().setGlobalPrivateDnsModeSpecifiedHost(admin(), hostname)
        result == DevicePolicyManager.PRIVATE_DNS_SET_NO_ERROR
      } catch (e: Throwable) {
        false
      }
    }

    // Which packages may run while the launcher pins the screen.
    AsyncFunction("setLockTaskPackages") { packages: List<String> ->
      if (!isOwner()) return@AsyncFunction
      try {
        dpm().setLockTaskPackages(admin(), packages.toTypedArray())
      } catch (_: Throwable) { }
    }

    AsyncFunction("startLockTask") {
      try { appContext.currentActivity?.startLockTask() } catch (_: Throwable) { }
    }
    AsyncFunction("stopLockTask") {
      try { appContext.currentActivity?.stopLockTask() } catch (_: Throwable) { }
    }

    AsyncFunction("launchApp") { packageName: String ->
      val intent = context.packageManager.getLaunchIntentForPackage(packageName)
      if (intent == null) {
        false
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
      }
    }

    AsyncFunction("getDeviceStatus") { -> deviceStatus() }

    AsyncFunction("getUsageToday") { -> usageToday() }

    AsyncFunction("startLocationService") { apiBase: String, token: String, intervalSec: Int ->
      val intent = Intent(context, LocationForegroundService::class.java).apply {
        putExtra("apiBase", apiBase)
        putExtra("token", token)
        putExtra("intervalSec", intervalSec)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    AsyncFunction("stopLocationService") {
      context.stopService(Intent(context, LocationForegroundService::class.java))
    }

    // Make this launcher the default HOME, so the phone always returns here.
    AsyncFunction("setAsHomeLauncher") {
      if (!isOwner()) return@AsyncFunction
      try {
        val filter = IntentFilter(Intent.ACTION_MAIN).apply {
          addCategory(Intent.CATEGORY_HOME)
          addCategory(Intent.CATEGORY_DEFAULT)
        }
        val launcher = ComponentName(context.packageName, "${context.packageName}.MainActivity")
        dpm().addPersistentPreferredActivity(admin(), filter, launcher)
      } catch (_: Throwable) { }
    }
  }

  // ---- status ---------------------------------------------------------
  private fun deviceStatus(): Map<String, Any?> {
    val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    val battery = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    val charging = bm.isCharging
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val screenOn = pm.isInteractive

    val resolver = context.contentResolver
    val mode = try { Settings.Global.getString(resolver, "private_dns_mode") } catch (_: Throwable) { null }
    val host = try { Settings.Global.getString(resolver, "private_dns_specifier") } catch (_: Throwable) { null }
    val dnsOk = mode == "hostname" && !host.isNullOrBlank()

    val vpnActive = vpnActive()

    val lastBoot = run {
      val bootMillis = System.currentTimeMillis() - SystemClock.elapsedRealtime()
      val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
      fmt.timeZone = TimeZone.getTimeZone("UTC")
      fmt.format(java.util.Date(bootMillis))
    }

    val appVersion = try {
      context.packageManager.getPackageInfo(context.packageName, 0).versionName
    } catch (_: Throwable) { null }

    return mapOf(
      "battery" to battery,
      "charging" to charging,
      "screen_on" to screenOn,
      "dns_private_host" to host,
      "dns_ok" to dnsOk,
      "vpn_active" to vpnActive,
      "os_version" to Build.VERSION.RELEASE,
      "app_version" to (appVersion ?: ""),
      "last_boot_at" to lastBoot
    )
  }

  private fun vpnActive(): Boolean {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val net = cm.activeNetwork ?: return false
    val caps = cm.getNetworkCapabilities(net) ?: return false
    return caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
  }

  // ---- usage ----------------------------------------------------------
  private fun usageToday(): List<Map<String, Any>> {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val cal = Calendar.getInstance()
    cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
    val start = cal.timeInMillis
    val now = System.currentTimeMillis()
    val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, now) ?: emptyList()
    val pm = context.packageManager
    val out = ArrayList<Map<String, Any>>()
    for (s in stats) {
      val minutes = (s.totalTimeInForeground / 60000L).toInt()
      if (minutes <= 0) continue
      val label = try {
        pm.getApplicationLabel(pm.getApplicationInfo(s.packageName, 0)).toString()
      } catch (_: Throwable) { s.packageName }
      out.add(mapOf("package_name" to s.packageName, "label" to label, "minutes" to minutes))
    }
    return out
  }
}
