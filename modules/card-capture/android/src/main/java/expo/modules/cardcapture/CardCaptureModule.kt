package expo.modules.cardcapture

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CardCaptureModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private val activity: Activity?
    get() = appContext.currentActivity

  override fun definition() = ModuleDefinition {
    Name("CardCapture")

    Function("isListenerEnabled") {
      // 사용자가 안드로이드 설정에서 언제든 끌 수 있다. 앱이 켰다고 믿지 않고
      // 그때그때 물어본다.
      val enabled = Settings.Secure.getString(context.contentResolver, ENABLED_LISTENERS).orEmpty()
      enabled.split(":").any { it.contains(context.packageName) }
    }

    Function("openListenerSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("drainCaptured") {
      CaptureQueue.drain(context)
    }

    Function("consumeSharedText") {
      // 「공유 → 이 앱」은 ACTION_SEND 인텐트로 온다. 앱이 이미 떠 있을 때는
      // 안드로이드가 onNewIntent 로 넘기고 ReactActivity 가 setIntent 해 주므로,
      // 여기서 그때그때의 인텐트를 보면 된다.
      val current = activity?.intent
      val text = current?.takeIf { it.action == Intent.ACTION_SEND }
        ?.getStringExtra(Intent.EXTRA_TEXT)

      // 한 번 꺼낸 글은 지운다. 안 지우면 앱을 다시 볼 때마다 같은 문자가
      // 또 들어와 미리보기 화면이 계속 열린다.
      if (text != null) current.removeExtra(Intent.EXTRA_TEXT)
      text
    }
  }

  companion object {
    private const val ENABLED_LISTENERS = "enabled_notification_listeners"
  }
}
