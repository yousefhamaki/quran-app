package expo.modules.dailyalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/** One alarm: when it rings and what it says. */
data class AlarmItem(
  val id: String,
  val at: Long,
  val title: String,
  val body: String,
  val snoozeMinutes: Int,
  val snoozeLabel: String = "Snooze",
  val stopLabel: String = "Stop",
)

/**
 * Keeps the alarms that were scheduled (in SharedPreferences, so they can be set again after a reboot) and talks to
 * the AlarmManager. Alarms are grouped by "kind" ("werd", "khatmah", "snooze"); scheduling a kind replaces its old alarms.
 */
object AlarmStore {
  private const val PREFS = "daily_alarm"

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun requestCode(kind: String, id: String) = "$kind|$id".hashCode()

  fun parse(json: String): List<AlarmItem> {
    val array = JSONArray(json)
    return (0 until array.length()).map { i ->
      val o = array.getJSONObject(i)
      AlarmItem(o.getString("id"), o.getLong("at"), o.optString("title"), o.optString("body"), o.optInt("snoozeMinutes", 10), o.optString("snoozeLabel", "Snooze"), o.optString("stopLabel", "Stop"))
    }
  }

  private fun toJson(items: List<AlarmItem>): String {
    val array = JSONArray()
    for (item in items) {
      array.put(
        JSONObject()
          .put("id", item.id)
          .put("at", item.at)
          .put("title", item.title)
          .put("body", item.body)
          .put("snoozeMinutes", item.snoozeMinutes)
          .put("snoozeLabel", item.snoozeLabel)
          .put("stopLabel", item.stopLabel),
      )
    }
    return array.toString()
  }

  private fun load(context: Context, kind: String): List<AlarmItem> {
    val raw = prefs(context).getString("items_$kind", null) ?: return emptyList()
    return try { parse(raw) } catch (_: Exception) { emptyList() }
  }

  private fun firePendingIntent(context: Context, kind: String, item: AlarmItem): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(AlarmReceiver.ACTION_FIRE)
      .putExtra("title", item.title)
      .putExtra("body", item.body)
      .putExtra("snoozeMinutes", item.snoozeMinutes)
      .putExtra("snoozeLabel", item.snoozeLabel)
      .putExtra("stopLabel", item.stopLabel)
    return PendingIntent.getBroadcast(context, requestCode(kind, item.id), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun openAppIntent(context: Context): PendingIntent {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()
    return PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun canScheduleExact(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    return (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
  }

  private fun set(context: Context, kind: String, item: AlarmItem) {
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = firePendingIntent(context, kind, item)
    try {
      if (canScheduleExact(context)) {
        // An "alarm clock" alarm rings on time even in doze mode and shows the alarm icon in the status bar.
        alarms.setAlarmClock(AlarmManager.AlarmClockInfo(item.at, openAppIntent(context)), pending)
      } else {
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.at, pending)
      }
    } catch (_: SecurityException) {
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.at, pending)
    }
  }

  private fun cancelItems(context: Context, kind: String, items: List<AlarmItem>) {
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    for (item in items) alarms.cancel(firePendingIntent(context, kind, item))
  }

  /** Replaces every alarm of `kind` with `items` (past ones are dropped). */
  fun schedule(context: Context, kind: String, items: List<AlarmItem>) {
    cancelItems(context, kind, load(context, kind))
    val now = System.currentTimeMillis()
    val future = items.filter { it.at > now }
    for (item in future) set(context, kind, item)
    prefs(context).edit().putString("items_$kind", toJson(future)).apply()
  }

  fun cancel(context: Context, kind: String) {
    cancelItems(context, kind, load(context, kind))
    prefs(context).edit().remove("items_$kind").apply()
  }

  /** After a reboot or an app update: ring again at the times that are still ahead. */
  fun rescheduleAll(context: Context) {
    for (kind in listOf("werd", "khatmah", "snooze")) {
      val items = load(context, kind)
      if (items.isNotEmpty()) schedule(context, kind, items)
    }
  }
}
