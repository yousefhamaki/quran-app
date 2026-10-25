package expo.modules.dailyalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/** Wakes up when an alarm is due (starts the ringing service) and after a reboot (sets the alarms again). */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_FIRE -> {
        val service = Intent(context, AlarmService::class.java)
          .setAction(AlarmService.ACTION_START)
          .putExtra("title", intent.getStringExtra("title") ?: "")
          .putExtra("body", intent.getStringExtra("body") ?: "")
          .putExtra("snoozeMinutes", intent.getIntExtra("snoozeMinutes", 10))
          .putExtra("snoozeLabel", intent.getStringExtra("snoozeLabel") ?: "Snooze")
          .putExtra("stopLabel", intent.getStringExtra("stopLabel") ?: "Stop")
        ContextCompat.startForegroundService(context, service)
      }
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> AlarmStore.rescheduleAll(context)
    }
  }

  companion object {
    const val ACTION_FIRE = "expo.modules.dailyalarm.FIRE"
  }
}
