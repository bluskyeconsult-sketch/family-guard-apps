package com.odusbaba.familyguard.guardnative

import android.app.admin.DeviceAdminReceiver
import android.content.ComponentName
import android.content.Context

// The device-admin component. Making Family Guard the device OWNER of the
// child phone (a one-time adb step during setup, see the install guide)
// unlocks Private DNS enforcement, the app allowlist and the hard stop.
class GuardAdminReceiver : DeviceAdminReceiver() {
  companion object {
    fun component(context: Context): ComponentName =
      ComponentName(context.applicationContext, GuardAdminReceiver::class.java)
  }
}
