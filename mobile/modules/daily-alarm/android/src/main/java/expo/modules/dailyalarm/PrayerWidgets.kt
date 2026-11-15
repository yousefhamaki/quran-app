package expo.modules.dailyalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

/**
 * The prayer home-screen widgets (countdown ring, next prayer, prayer times). They are native so that the countdown can
 * be a system Chronometer: it ticks every second by itself, which a widget drawn by JavaScript (refreshed every 30
 * minutes at best) can never do. The app saves a snapshot of the coming prayers (see `setPrayerWidgetData`); the widgets
 * work out from it which prayer is next, and an alarm redraws them at each prayer time, so they stay right with the app closed.
 */
object PrayerWidgets {
  private const val PREFS = "daily_alarm_widgets"
  private const val KEY = "prayer"
  const val ACTION_REFRESH = "expo.modules.dailyalarm.PRAYER_WIDGET_REFRESH"

  class Upcoming(val key: String, val label: String, val time: String, val at: Long, val prevAt: Long)
  class Row(val key: String, val label: String, val short: String, val time: String)
  class Day(val y: Int, val m: Int, val d: Int, val rows: List<Row>)
  class Snapshot(val ready: Boolean, val setup: String, val upcoming: List<Upcoming>, val days: List<Day>)
  class State(val next: Upcoming, val prevAt: Long, val rows: List<Row>, val progress: Float)

  private const val TAG = "PrayerWidgets"

  fun save(context: Context, json: String) {
    Log.i(TAG, "save ${json.length} bytes")
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
    updateAll(context)
  }

  private fun load(context: Context): Snapshot? {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return null
    return try {
      val o = JSONObject(raw)
      val up = o.optJSONArray("upcoming")
      val days = o.optJSONArray("days")
      Snapshot(
        ready = o.optBoolean("ready", false),
        setup = o.optString("setup", ""),
        upcoming = (0 until (up?.length() ?: 0)).map {
          val u = up!!.getJSONObject(it)
          Upcoming(u.getString("key"), u.getString("label"), u.getString("time"), u.getLong("at"), u.getLong("prevAt"))
        },
        days = (0 until (days?.length() ?: 0)).map {
          val d = days!!.getJSONObject(it)
          val rows = d.getJSONArray("rows")
          Day(d.getInt("y"), d.getInt("m"), d.getInt("d"), (0 until rows.length()).map { r ->
            val row = rows.getJSONObject(r)
            Row(row.getString("key"), row.getString("label"), row.getString("short"), row.getString("time"))
          })
        },
      )
    } catch (e: Exception) {
      Log.w(TAG, "could not read the saved snapshot", e)
      null
    }
  }

  /** Which prayer is next right now, how far through the wait we are, and the day's times to show. */
  private fun state(snap: Snapshot, now: Long): State? {
    if (!snap.ready) return null
    val idx = snap.upcoming.indexOfFirst { it.at > now }
    if (idx < 0) return null
    val next = snap.upcoming[idx]
    val prevAt = if (idx > 0) snap.upcoming[idx - 1].at else next.prevAt
    val cal = Calendar.getInstance().apply { timeInMillis = next.at }
    val day = snap.days.firstOrNull { it.y == cal.get(Calendar.YEAR) && it.m == cal.get(Calendar.MONTH) + 1 && it.d == cal.get(Calendar.DAY_OF_MONTH) }
    val span = (next.at - prevAt).coerceAtLeast(1)
    val progress = ((now - prevAt).toFloat() / span).coerceIn(0f, 1f)
    return State(next, prevAt, day?.rows ?: emptyList(), progress)
  }

  fun updateAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val snap = load(context)
    val st = snap?.let { state(it, System.currentTimeMillis()) }
    Log.i(TAG, "update: snapshot=${snap != null} ready=${snap?.ready} upcoming=${snap?.upcoming?.size} days=${snap?.days?.size} state=${st != null}")
    val providers = listOf(PrayerRingProvider(), NextPrayerProvider(), PrayerTimesProvider())
    for (p in providers) {
      val ids = manager.getAppWidgetIds(ComponentName(context, p.javaClass))
      if (ids.isEmpty()) continue
      manager.updateAppWidget(ids, p.build(context, snap, st))
    }
    scheduleRefresh(context, st)
  }

  /** Redraw at the moment the next prayer arrives, so the widgets move on to the following prayer by themselves. */
  private fun scheduleRefresh(context: Context, st: State?) {
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = PendingIntent.getBroadcast(
      context, 7001, Intent(context, PrayerWidgetRefreshReceiver::class.java).setAction(ACTION_REFRESH),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    if (st == null) {
      alarms.cancel(pi)
      return
    }
    alarms.setAndAllowWhileIdle(AlarmManager.RTC, st.next.at + 1000, pi)
  }

  // ---- drawing helpers ----

  fun openApp(context: Context, uri: String, requestCode: Int): PendingIntent =
    PendingIntent.getActivity(
      context, requestCode,
      Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  /** Count down to `at` with the system Chronometer (ticks every second without any update from us). */
  fun countdown(views: RemoteViews, id: Int, at: Long) {
    val left = (at - System.currentTimeMillis()).coerceAtLeast(0)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      views.setChronometerCountDown(id, true)
      views.setChronometer(id, SystemClock.elapsedRealtime() + left, null, true)
    } else {
      views.setChronometer(id, SystemClock.elapsedRealtime(), null, false)
    }
  }

  fun ringBitmap(progress: Float): Bitmap {
    val size = 260
    val stroke = 20f
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val rect = RectF(stroke, stroke, size - stroke, size - stroke)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = stroke
      strokeCap = Paint.Cap.ROUND
      color = Color.argb(60, 255, 255, 255)
    }
    canvas.drawArc(rect, 0f, 360f, false, paint)
    paint.color = Color.parseColor("#e0b65a")
    canvas.drawArc(rect, -90f, 360f * progress.coerceIn(0.01f, 1f), false, paint)
    return bmp
  }
}

abstract class PrayerProvider : AppWidgetProvider() {
  abstract fun build(context: Context, snap: PrayerWidgets.Snapshot?, st: PrayerWidgets.State?): RemoteViews

  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = PrayerWidgets.updateAll(context)
  override fun onEnabled(context: Context) = PrayerWidgets.updateAll(context)
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: android.os.Bundle) = PrayerWidgets.updateAll(context)

  /** "Open the app" (or "set your location") instead of times, before the app has sent anything. */
  protected fun empty(context: Context, layout: Int, snap: PrayerWidgets.Snapshot?): RemoteViews {
    val v = RemoteViews(context.packageName, layout)
    v.setViewVisibility(R.id.content, android.view.View.GONE)
    v.setViewVisibility(R.id.empty, android.view.View.VISIBLE)
    v.setTextViewText(R.id.empty, snap?.setup?.takeIf { it.isNotEmpty() } ?: "افتح التطبيق · Open the app")
    v.setOnClickPendingIntent(R.id.root, PrayerWidgets.openApp(context, "quranapp://prayer", 7010))
    return v
  }
}

/** Countdown ring: the time left ticking in the middle, the other four prayers in the corners. */
class PrayerRingProvider : PrayerProvider() {
  override fun build(context: Context, snap: PrayerWidgets.Snapshot?, st: PrayerWidgets.State?): RemoteViews {
    if (st == null) return empty(context, R.layout.dailyalarm_widget_prayer_ring, snap)
    val v = RemoteViews(context.packageName, R.layout.dailyalarm_widget_prayer_ring)
    v.setViewVisibility(R.id.empty, android.view.View.GONE)
    v.setViewVisibility(R.id.content, android.view.View.VISIBLE)
    v.setImageViewBitmap(R.id.ring, PrayerWidgets.ringBitmap(st.progress))
    PrayerWidgets.countdown(v, R.id.countdown, st.next.at)
    v.setTextViewText(R.id.label, st.next.label)
    v.setTextViewText(R.id.time, st.next.time)
    val corners = st.rows.filter { it.key != "sunrise" && it.key != st.next.key }
    val ids = intArrayOf(R.id.corner0, R.id.corner1, R.id.corner2, R.id.corner3)
    for (i in ids.indices) v.setTextViewText(ids[i], corners.getOrNull(i)?.let { "${it.short} ${it.time}" } ?: "")
    v.setOnClickPendingIntent(R.id.root, PrayerWidgets.openApp(context, "quranapp://prayer", 7011))
    return v
  }
}

/** The next prayer with a bar that fills until it arrives, and the ticking countdown. */
class NextPrayerProvider : PrayerProvider() {
  override fun build(context: Context, snap: PrayerWidgets.Snapshot?, st: PrayerWidgets.State?): RemoteViews {
    if (st == null) return empty(context, R.layout.dailyalarm_widget_next_prayer, snap)
    val v = RemoteViews(context.packageName, R.layout.dailyalarm_widget_next_prayer)
    v.setViewVisibility(R.id.empty, android.view.View.GONE)
    v.setViewVisibility(R.id.content, android.view.View.VISIBLE)
    v.setTextViewText(R.id.label, st.next.label)
    v.setTextViewText(R.id.time, st.next.time)
    v.setProgressBar(R.id.bar, 1000, (st.progress * 1000).toInt(), false)
    PrayerWidgets.countdown(v, R.id.countdown, st.next.at)
    v.setOnClickPendingIntent(R.id.root, PrayerWidgets.openApp(context, "quranapp://prayer", 7012))
    return v
  }
}

/** The day's six times, the next one highlighted, with the ticking countdown. */
class PrayerTimesProvider : PrayerProvider() {
  override fun build(context: Context, snap: PrayerWidgets.Snapshot?, st: PrayerWidgets.State?): RemoteViews {
    if (st == null) return empty(context, R.layout.dailyalarm_widget_prayer_times, snap)
    val v = RemoteViews(context.packageName, R.layout.dailyalarm_widget_prayer_times)
    v.setViewVisibility(R.id.empty, android.view.View.GONE)
    v.setViewVisibility(R.id.content, android.view.View.VISIBLE)
    v.setTextViewText(R.id.label, st.next.label)
    v.setTextViewText(R.id.time, st.next.time)
    PrayerWidgets.countdown(v, R.id.countdown, st.next.at)
    val rows = intArrayOf(R.id.row0, R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5)
    val names = intArrayOf(R.id.name0, R.id.name1, R.id.name2, R.id.name3, R.id.name4, R.id.name5)
    val times = intArrayOf(R.id.time0, R.id.time1, R.id.time2, R.id.time3, R.id.time4, R.id.time5)
    for (i in rows.indices) {
      val row = st.rows.getOrNull(i)
      val isNext = row != null && row.key == st.next.key
      v.setTextViewText(names[i], row?.label ?: "")
      v.setTextViewText(times[i], row?.time ?: "")
      v.setInt(rows[i], "setBackgroundColor", if (isNext) Color.argb(60, 255, 255, 255) else Color.TRANSPARENT)
      v.setTextColor(times[i], if (isNext) Color.parseColor("#e0b65a") else Color.WHITE)
    }
    v.setOnClickPendingIntent(R.id.root, PrayerWidgets.openApp(context, "quranapp://prayer", 7013))
    return v
  }
}

/** Fires at each prayer time to move the widgets on to the next prayer. */
class PrayerWidgetRefreshReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    PrayerWidgets.updateAll(context)
  }
}
