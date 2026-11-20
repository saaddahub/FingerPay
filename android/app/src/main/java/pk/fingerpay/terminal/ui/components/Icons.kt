package pk.fingerpay.terminal.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

enum class Glyph { Home, Sell, List, Settings, Thumb, Snow, Thaw, Refresh, Close, Back, Lock }

/** One drawn icon family, 1.5 dp strokes on a 24-unit grid (matches the web's Lucide weight, SYSTEM.md §8). */
@Composable
fun Icon(glyph: Glyph, tint: Color, size: Dp = 22.dp, modifier: Modifier = Modifier) {
    if (glyph == Glyph.Thumb) return Coin(modifier.size(size), color = tint)
    Canvas(modifier.size(size)) {
        val u = this.size.minDimension / 24f
        val stroke = Stroke(width = 1.5f * u, cap = StrokeCap.Round, join = StrokeJoin.Round)
        fun line(x1: Float, y1: Float, x2: Float, y2: Float) = drawLine(tint, Offset(x1 * u, y1 * u), Offset(x2 * u, y2 * u), stroke.width, StrokeCap.Round)
        fun path(block: Path.() -> Unit) = drawPath(Path().apply(block), tint, style = stroke)
        when (glyph) {
            Glyph.Home -> path { moveTo(4 * u, 11 * u); lineTo(12 * u, 4 * u); lineTo(20 * u, 11 * u); moveTo(6 * u, 9.5f * u); lineTo(6 * u, 20 * u); lineTo(18 * u, 20 * u); lineTo(18 * u, 9.5f * u) }
            Glyph.Sell -> { for (r in 0..2) for (c in 0..2) drawCircle(tint, 1.4f * u, Offset((7 + c * 5) * u, (7 + r * 5) * u)) }
            Glyph.List -> { line(8f, 7f, 20f, 7f); line(8f, 12f, 20f, 12f); line(8f, 17f, 20f, 17f); drawCircle(tint, 1f * u, Offset(4.5f * u, 7 * u)); drawCircle(tint, 1f * u, Offset(4.5f * u, 12 * u)); drawCircle(tint, 1f * u, Offset(4.5f * u, 17 * u)) }
            Glyph.Settings -> { line(4f, 8f, 20f, 8f); line(4f, 16f, 20f, 16f); drawCircle(tint, 2.4f * u, Offset(9 * u, 8 * u), style = stroke); drawCircle(tint, 2.4f * u, Offset(15 * u, 16 * u), style = stroke) }
            Glyph.Snow -> snow(u, tint, stroke)
            Glyph.Thaw -> { snow(u, tint.copy(alpha = 0.45f), stroke); line(5f, 19f, 19f, 5f) }
            Glyph.Refresh -> path { addArc(androidx.compose.ui.geometry.Rect(5 * u, 5 * u, 19 * u, 19 * u), -60f, 300f); moveTo(16 * u, 4 * u); lineTo(18.8f * u, 6.2f * u); lineTo(16 * u, 9 * u) }
            Glyph.Close -> { line(6f, 6f, 18f, 18f); line(18f, 6f, 6f, 18f) }
            Glyph.Back -> path { moveTo(15 * u, 5 * u); lineTo(8 * u, 12 * u); lineTo(15 * u, 19 * u) }
            Glyph.Lock -> { path { addRoundRect(androidx.compose.ui.geometry.RoundRect(5 * u, 11 * u, 19 * u, 20 * u, 2 * u, 2 * u)) }; path { moveTo(8 * u, 11 * u); lineTo(8 * u, 8 * u); cubicTo(8 * u, 3 * u, 16 * u, 3 * u, 16 * u, 8 * u); lineTo(16 * u, 11 * u) } }
            Glyph.Thumb -> Unit
        }
    }
}

private fun DrawScope.snow(u: Float, tint: Color, stroke: Stroke) {
    val c = Offset(12 * u, 12 * u)
    for (i in 0 until 6) {
        val a = i * Math.PI.toFloat() / 3f
        val end = Offset(c.x + cos(a) * 8 * u, c.y + sin(a) * 8 * u)
        drawLine(tint, c, end, stroke.width, StrokeCap.Round)
        val mid = Offset(c.x + cos(a) * 5 * u, c.y + sin(a) * 5 * u)
        drawLine(tint, mid, Offset(mid.x + cos(a + 0.8f) * 2.2f * u, mid.y + sin(a + 0.8f) * 2.2f * u), stroke.width, StrokeCap.Round)
        drawLine(tint, mid, Offset(mid.x + cos(a - 0.8f) * 2.2f * u, mid.y + sin(a - 0.8f) * 2.2f * u), stroke.width, StrokeCap.Round)
    }
}
