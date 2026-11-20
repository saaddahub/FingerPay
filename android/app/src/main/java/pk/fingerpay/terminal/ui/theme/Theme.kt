package pk.fingerpay.terminal.ui.theme

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import pk.fingerpay.terminal.R
import kotlin.math.PI
import kotlin.math.pow

/** Paper & Ink (docs/design/SYSTEM.md §1): two grounds, one state colour, no brand accent. */
object Fp {
    val paper = Color(0xFFFFFFFF)
    val paper2 = Color(0xFFF5F5F7)
    val ink = Color(0xFF0A0A0B)
    val ink2 = Color(0xFF6E6E73)
    val ink3 = Color(0xFFA1A1A6)
    val rule = Color(0x1A0A0A0B)
    val nightText = Color(0xFFF5F5F7)
    val night2 = Color(0xFF8E8E93)
    val nightRule = Color(0x1FF5F5F7)
    val settle = Color(0xFF0A7F4B)
    val settleNight = Color(0xFF3DDC97)
    val ice = Color(0xFFDCEBFF)
}

@OptIn(ExperimentalTextApi::class)
private fun inter(weight: Int, opsz: Float) = Font(
    R.font.inter, FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight), FontVariation.Setting("opsz", opsz)),
)

@OptIn(ExperimentalTextApi::class)
private fun mono(weight: Int) = Font(R.font.geist_mono, FontWeight(weight), variationSettings = FontVariation.Settings(FontVariation.weight(weight)))

val Display = FontFamily(inter(400, 32f), inter(500, 32f))
val Text = FontFamily(inter(400, 16f), inter(500, 16f))
val Mono = FontFamily(mono(400), mono(500))

/** Type scale (SYSTEM.md §2), tightened for a phone at arm's length on a counter. */
object Type {
    val hero = TextStyle(fontFamily = Display, fontSize = 56.sp, lineHeight = 56.sp, letterSpacing = (-0.045).em, fontWeight = FontWeight(400))
    val amount = TextStyle(fontFamily = Display, fontSize = 64.sp, lineHeight = 64.sp, letterSpacing = (-0.04).em, fontWeight = FontWeight(400))
    val display = TextStyle(fontFamily = Display, fontSize = 34.sp, lineHeight = 36.sp, letterSpacing = (-0.035).em)
    val title = TextStyle(fontFamily = Display, fontSize = 24.sp, lineHeight = 28.sp, letterSpacing = (-0.03).em)
    val lead = TextStyle(fontFamily = Text, fontSize = 17.sp, lineHeight = 24.sp, letterSpacing = (-0.014).em)
    val body = TextStyle(fontFamily = Text, fontSize = 15.sp, lineHeight = 21.sp, letterSpacing = (-0.011).em)
    val label = TextStyle(fontFamily = Text, fontSize = 13.sp, lineHeight = 17.sp, letterSpacing = (-0.006).em, fontWeight = FontWeight(500))
    val mono = TextStyle(fontFamily = Mono, fontSize = 14.sp, lineHeight = 20.sp)
    val monoSmall = TextStyle(fontFamily = Mono, fontSize = 11.sp, lineHeight = 14.sp, letterSpacing = 0.06.em)
}

/** Apple's damping/response pairs (MOTION.md §1.1) as Compose springs: stiffness = (2π / response)². */
object Motion {
    private fun stiffness(response: Float) = ((2 * PI / response).pow(2)).toFloat()
    fun <T> ui() = spring<T>(dampingRatio = 1f, stiffness = stiffness(0.4f))
    fun <T> sheet() = spring<T>(dampingRatio = 0.85f, stiffness = stiffness(0.35f))
    fun <T> release() = spring<T>(dampingRatio = 0.8f, stiffness = stiffness(0.3f))
    fun <T> slow() = spring<T>(dampingRatio = 1f, stiffness = stiffness(0.7f))
    fun <T> snap() = spring<T>(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMediumLow)
}

@Composable
fun FingerPayTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(primary = Fp.ink, onPrimary = Fp.paper, background = Fp.paper, surface = Fp.paper, onSurface = Fp.ink),
        content = content,
    )
}
