package expo.modules.dailyalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat

/**
 * The ringing alarm. It runs as a foreground service so the sound keeps looping until the user presses Stop (or Snooze):
 * nothing stops it on its own.
 */
class AlarmService : Service() {
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null

  private var title = ""
  private var body = ""
  private var snoozeMinutes = 10
  private var snoozeLabel = "Snooze"
  private var stopLabel = "Stop"

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> shutDown()
      ACTION_SNOOZE -> {
        val at = System.currentTimeMillis() + snoozeMinutes * 60_000L
        AlarmStore.schedule(
          this,
          "snooze",
          listOf(AlarmItem("snooze", at, title, body, snoozeMinutes, snoozeLabel, stopLabel)),
        )
        shutDown()
      }
      else -> start(intent)
    }
    return START_NOT_STICKY
  }

  private fun start(intent: Intent?) {
    title = intent?.getStringExtra("title") ?: title
    body = intent?.getStringExtra("body") ?: body
    snoozeMinutes = intent?.getIntExtra("snoozeMinutes", snoozeMinutes) ?: snoozeMinutes
    snoozeLabel = intent?.getStringExtra("snoozeLabel") ?: snoozeLabel
    stopLabel = intent?.getStringExtra("stopLabel") ?: stopLabel

    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    ringing = true
    currentTitle = title
    currentBody = body
    currentSnooze = snoozeMinutes
    startSound()
    startVibration()
    holdWakeLock()
  }

  private fun buildNotification(): Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Alarm", NotificationManager.IMPORTANCE_HIGH).apply {
        setSound(null, null)
        enableVibration(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        setBypassDnd(true)
      }
      manager.createNotificationChannel(channel)
    }

    val launch = (packageManager.getLaunchIntentForPackage(packageName) ?: Intent())
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      .putExtra("dailyAlarm", true)
    val open = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val stop = actionIntent(ACTION_STOP, 1)
    val snooze = actionIntent(ACTION_SNOOZE, 2)

    val icon = resources.getIdentifier("notification_icon", "drawable", packageName).takeIf { it != 0 } ?: applicationInfo.icon

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(icon)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(open)
      .setFullScreenIntent(open, true)
      .addAction(0, "$snoozeLabel ($snoozeMinutes)", snooze)
      .addAction(0, stopLabel, stop)
      .build()
  }

  private fun actionIntent(action: String, code: Int): PendingIntent {
    val intent = Intent(this, AlarmService::class.java).setAction(action)
    return PendingIntent.getService(this, code, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun startSound() {
    stopSound()
    val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    try {
      player = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build(),
        )
        setDataSource(this@AlarmService, uri)
        isLooping = true
        prepare()
        start()
      }
    } catch (_: Exception) {
      player = null
    }
  }

  private fun stopSound() {
    try { player?.stop() } catch (_: Exception) { /* not started */ }
    player?.release()
    player = null
  }

  private fun startVibration() {
    val v = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
    vibrator = v
    val pattern = longArrayOf(0, 700, 700)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) v.vibrate(VibrationEffect.createWaveform(pattern, 0))
    else @Suppress("DEPRECATION") v.vibrate(pattern, 0)
  }

  private fun holdWakeLock() {
    if (wakeLock?.isHeld == true) return
    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
    // Released when the alarm is stopped; the timeout is only a safety net for a stuck service.
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "dailyalarm:ring").apply { acquire(12 * 60 * 60 * 1000L) }
  }

  private fun shutDown() {
    stopSound()
    vibrator?.cancel()
    vibrator = null
    if (wakeLock?.isHeld == true) wakeLock?.release()
    wakeLock = null
    ringing = false
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onDestroy() {
    stopSound()
    vibrator?.cancel()
    if (wakeLock?.isHeld == true) wakeLock?.release()
    ringing = false
    super.onDestroy()
  }

  companion object {
    const val ACTION_START = "expo.modules.dailyalarm.START"
    const val ACTION_STOP = "expo.modules.dailyalarm.STOP"
    const val ACTION_SNOOZE = "expo.modules.dailyalarm.SNOOZE"
    private const val CHANNEL_ID = "daily-alarm"
    private const val NOTIFICATION_ID = 7421

    @Volatile var ringing = false
    @Volatile var currentTitle = ""
    @Volatile var currentBody = ""
    @Volatile var currentSnooze = 10

    /** Starts the service, or sends it a Stop / Snooze command. */
    fun send(context: Context, action: String) {
      val intent = Intent(context, AlarmService::class.java).setAction(action)
      context.startService(intent)
    }
  }
}
