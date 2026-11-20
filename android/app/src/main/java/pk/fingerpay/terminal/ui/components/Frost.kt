package pk.fingerpay.terminal.ui.components

import android.graphics.RenderEffect
import android.graphics.RuntimeShader
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asComposeRenderEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.random.Random

// The freeze (client's "freeze card"): ice spreads from the touch point across the card. On Android 13+ an AGSL
// shader refracts the card through frost crystals; older phones get a blur (12+) or a tint, plus the same
// crystal lines drawn on top, so every phone sees the card freeze.
private const val FROST_AGSL = """
uniform shader content;
uniform float2 size;
uniform float2 origin;
uniform float progress;   // 0 = clear, 1 = fully frozen
float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float noise(float2 p) {
  float2 i = floor(p); float2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1, 0)), f.x), mix(hash(i + float2(0, 1)), hash(i + float2(1, 1)), f.x), f.y);
}
half4 main(float2 p) {
  float reach = progress * length(size) * 1.15;
  float d = distance(p, origin);
  float edge = smoothstep(reach, reach - 90.0, d);             // 1 inside the frozen area
  float grain = noise(p / 9.0) * 0.6 + noise(p / 3.0) * 0.4;
  float2 offs = (float2(noise(p / 14.0), noise(p / 14.0 + 7.3)) - 0.5) * 18.0 * edge;
  half4 c = content.eval(p + offs);
  half3 ice = half3(0.86, 0.92, 1.0);
  float rim = smoothstep(0.0, 1.0, 1.0 - abs(d - reach) / 70.0) * step(0.001, progress) * (1.0 - progress * 0.6);
  half3 col = mix(c.rgb, ice, edge * (0.38 + grain * 0.22)) + half3(rim * 0.35);
  return half4(col, c.a);
}
"""

/** Apply to the card's content. [progress] 0..1, [origin] in px within the card. */
fun Modifier.frost(progress: Float, origin: Offset): Modifier = graphicsLayer {
    if (progress <= 0.001f) {
        renderEffect = null
        return@graphicsLayer
    }
    renderEffect = when {
        Build.VERSION.SDK_INT >= 33 -> {
            val s = FrostCache.shader
            s.setFloatUniform("size", size.width, size.height)
            s.setFloatUniform("origin", origin.x, origin.y)
            s.setFloatUniform("progress", progress)
            RenderEffect.createRuntimeShaderEffect(s, "content").asComposeRenderEffect()
        }
        Build.VERSION.SDK_INT >= 31 -> RenderEffect.createBlurEffect(10f * progress, 10f * progress, android.graphics.Shader.TileMode.CLAMP).asComposeRenderEffect()
        else -> null
    }
}

@RequiresApi(33)
private object FrostCache {
    val shader: RuntimeShader by lazy { RuntimeShader(FROST_AGSL) }
}

/** Ice crystals drawn over the card: branching lines that grow outward from the touch point with [progress]. */
@Composable
fun FrostCrystals(progress: Float, origin: Offset, modifier: Modifier = Modifier, color: Color = Color.White) {
    val crystals = remember {
        val r = Random(7)
        List(26) {
            val angle = r.nextFloat() * 6.2832f
            val dist = 0.1f + r.nextFloat() * 0.95f
            val len = 10f + r.nextFloat() * 26f
            Triple(angle, dist, len)
        }
    }
    Canvas(modifier.fillMaxSize()) {
        if (progress <= 0.01f) return@Canvas
        val reach = progress * hypot(size.width, size.height) * 1.15f
        val tint = if (Build.VERSION.SDK_INT < 31) Color(0xFFDCEBFF).copy(alpha = 0.32f * progress) else Color.Transparent
        if (tint.alpha > 0f) drawRect(tint)
        crystals.forEach { (angle, dist, len) ->
            val cx = origin.x + cos(angle) * dist * size.width
            val cy = origin.y + sin(angle) * dist * size.height
            val seen = ((reach - hypot(cx - origin.x, cy - origin.y)) / 60f).coerceIn(0f, 1f)
            if (seen <= 0f) return@forEach
            val l = len * seen
            val a = color.copy(alpha = 0.55f * seen)
            for (arm in 0 until 6) {
                val t = angle + arm * 1.0472f
                val ex = cx + cos(t) * l
                val ey = cy + sin(t) * l
                drawLine(a, Offset(cx, cy), Offset(ex, ey), strokeWidth = 1.2f, cap = StrokeCap.Round)
                // a pair of short barbs halfway along each arm: reads as frost, not as a star
                val mx = cx + cos(t) * l * 0.55f
                val my = cy + sin(t) * l * 0.55f
                drawLine(a, Offset(mx, my), Offset(mx + cos(t + 0.7f) * l * 0.3f, my + sin(t + 0.7f) * l * 0.3f), strokeWidth = 1f, cap = StrokeCap.Round)
                drawLine(a, Offset(mx, my), Offset(mx + cos(t - 0.7f) * l * 0.3f, my + sin(t - 0.7f) * l * 0.3f), strokeWidth = 1f, cap = StrokeCap.Round)
            }
        }
        drawCircle(Color.White.copy(alpha = 0.18f * (1f - progress)), radius = reach, center = origin, style = Stroke(width = 2f))
    }
}
