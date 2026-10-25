package expo.modules.dailyalarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JavaScript side of the alarm: schedule / cancel the daily alarms, and stop or snooze the one that is ringing. */
class DailyAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DailyAlarm")

    /** itemsJson: [{ id, at (ms), title, body, snoozeMinutes, snoozeLabel, stopLabel }] */
    Function("schedule") { kind: String, itemsJson: String ->
      AlarmStore.schedule(context, kind, AlarmStore.parse(itemsJson))
    }

    Function("cancel") { kind: String ->
      AlarmStore.cancel(context, kind)
    }

    Function("isRinging") { AlarmService.ringing }

    Function("current") {
      if (AlarmService.ringing) {
        mapOf("title" to AlarmService.currentTitle, "body" to AlarmService.currentBody, "snoozeMinutes" to AlarmService.currentSnooze)
      } else {
        null
      }
    }

    Function("stop") { AlarmService.send(context, AlarmService.ACTION_STOP) }

    Function("snooze") { AlarmService.send(context, AlarmService.ACTION_SNOOZE) }

    Function("canScheduleExact") { AlarmStore.canScheduleExact(context) }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }

    Function("canUseFullScreen") {
      if (Build.VERSION.SDK_INT >= 34) {
        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()
      } else {
        true
      }
    }

    Function("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= 34) {
        val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }
  }
}
