package expo.modules.cardcapture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * 카톡·문자 앱의 알림에서 **카드 결제 문자로 보이는 것만** 주워 담는다.
 *
 * 이 서비스는 기기의 모든 알림을 볼 수 있는 자리에 선다. 그래서 문을 좁게
 * 깎았다: ① 정해 둔 앱의 알림만 보고, ② 그중에서도 「승인/취소」와 금액이
 * 같이 있는 것만 담고, ③ 담은 것은 이 기기 안에만 두고 어디로도 보내지 않는다.
 * 나머지 알림은 읽는 즉시 버린다.
 */
class CardNotificationListener : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val notification = sbn?.notification ?: return
    if (sbn.packageName !in WATCHED_PACKAGES) return

    val body = extractText(notification)
    if (!looksLikeCardMessage(body)) return

    CaptureQueue.push(applicationContext, body)
  }

  private fun extractText(notification: Notification): String {
    val extras = notification.extras ?: return ""
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()

    // 긴 글은 EXTRA_BIG_TEXT 에만 온전히 들어 있다. 줄여 놓은 EXTRA_TEXT 만
    // 읽으면 가맹점 이름이 「...」 으로 잘린 채 들어온다.
    val big = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
    val lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
      ?.joinToString("\n") { it.toString() }

    val body = listOfNotNull(big, lines, text).firstOrNull { it.isNotBlank() }.orEmpty()
    return listOf(title, body).filter { it.isNotBlank() }.joinToString("\n")
  }

  companion object {
    private val WATCHED_PACKAGES = setOf(
      "com.kakao.talk",
      "com.samsung.android.messaging",
      "com.google.android.apps.messaging",
      "com.android.mms",
    )

    private val AMOUNT = Regex("""\d[\d,]*\s*원""")

    /** 카드 결제 문자인가. 아니면 읽은 그대로 버린다. */
    fun looksLikeCardMessage(text: String): Boolean {
      if (text.isBlank()) return false
      val mentionsTxn = text.contains("승인") || text.contains("취소")
      return mentionsTxn && AMOUNT.containsMatchIn(text)
    }
  }
}
