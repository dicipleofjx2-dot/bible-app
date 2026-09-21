package expo.modules.cardcapture

import android.content.Context
import org.json.JSONArray

/**
 * 알림으로 주운 문자를 담아 두는 줄.
 *
 * 앱은 대개 꺼져 있다. 알림은 그때 온다. 그래서 자바스크립트로 바로 넘기지
 * 않고 **기기에 적어 두었다가 앱이 열릴 때 넘긴다** — 이것이 이 파일이
 * 따로 있는 이유다.
 */
object CaptureQueue {
  private const val PREFS = "card_capture_queue"
  private const val KEY = "messages"

  /** 줄이 끝없이 길어지지 않게. 여기까지 쌓였으면 앱을 한참 안 연 것이다. */
  private const val MAX = 500

  @Synchronized
  fun push(context: Context, text: String) {
    if (text.isBlank()) return
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val array = read(prefs.getString(KEY, null))

    // 같은 알림이 고쳐 뜨면 안드로이드는 onNotificationPosted 를 다시 부른다.
    // 바로 앞에 담은 것과 같으면 담지 않는다.
    if (array.length() > 0 && array.optString(array.length() - 1) == text) return

    array.put(text)
    while (array.length() > MAX) array.remove(0)
    prefs.edit().putString(KEY, array.toString()).apply()
  }

  @Synchronized
  fun drain(context: Context): List<String> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val array = read(prefs.getString(KEY, null))
    prefs.edit().remove(KEY).apply()
    return (0 until array.length()).mapNotNull { array.optString(it).takeIf { s -> s.isNotBlank() } }
  }

  private fun read(raw: String?): JSONArray =
    try {
      if (raw.isNullOrBlank()) JSONArray() else JSONArray(raw)
    } catch (e: Exception) {
      JSONArray()
    }
}
