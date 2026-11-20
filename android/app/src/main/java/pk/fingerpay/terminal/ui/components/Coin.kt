package pk.fingerpay.terminal.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.withTransform
import kotlin.math.exp

/** The Ridge Coin, drawn from the same geometry as brand/fingerpay-mark.svg (SYSTEM.md §7).
 *  [ridgeLift] 0..1 flattens the ridges (used by the press); [ridgeAlpha] fades them for the waiting pulse. */
object RidgeCoin {
    private val h = floatArrayOf(3.0f, 4.4f, 5.8f, 7.0f, 8.0f, 8.8f)
    private val sigma = floatArrayOf(12f, 11.4f, 10.8f, 10.3f, 9.9f, 9.6f)
    fun base(i: Int) = 14.5f + (-10f - 14.5f) * i / 5f
    fun y(i: Int, x: Float, scale: Float = 1f) = base(i) - h[i] * scale * exp(-(((x - 1.2f) / sigma[i]).let { it * it }))
    fun ridge(i: Int, scale: Float = 1f) = Path().apply {
        for (k in 0..96) {
            val x = -24f + 48f * k / 96f
            if (k == 0) moveTo(x, y(i, x, scale)) else lineTo(x, y(i, x, scale))
        }
    }
}

@Composable
fun Coin(
    modifier: Modifier = Modifier,
    color: Color,
    ridgeScale: Float = 1f,
    ridgeAlpha: (Int) -> Float = { 1f },
    ring: Boolean = true,
) {
    val ridges = remember(ridgeScale) { List(6) { RidgeCoin.ridge(it, ridgeScale) } }
    val clip = remember { Path().apply { addOval(androidx.compose.ui.geometry.Rect(Offset.Zero, 18.3f)) } }
    Canvas(modifier) {
        val k = size.minDimension / 48f
        withTransform({
            translate(size.width / 2, size.height / 2)
            scale(k, k, Offset.Zero)
        }) {
            if (ring) drawCircle(color, radius = 22f, center = Offset.Zero, style = Stroke(width = 2.2f))
            clipPath(clip) {
                ridges.forEachIndexed { i, p -> drawPath(p, color.copy(alpha = color.alpha * ridgeAlpha(i)), style = Stroke(width = 2.1f)) }
            }
        }
    }
}
