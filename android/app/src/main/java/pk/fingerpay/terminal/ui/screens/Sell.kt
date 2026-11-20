package pk.fingerpay.terminal.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import pk.fingerpay.terminal.Sell
import pk.fingerpay.terminal.UiState
import pk.fingerpay.terminal.bannerFor
import pk.fingerpay.terminal.data.Shopper
import pk.fingerpay.terminal.ui.components.Coin
import pk.fingerpay.terminal.ui.theme.Fp
import pk.fingerpay.terminal.ui.theme.Type
import kotlin.math.sin

@Composable
fun SellScreen(
    state: UiState,
    onKey: (String) -> Unit,
    onPreset: (Int) -> Unit,
    onCharge: () -> Unit,
    onTap: (Shopper?) -> Unit,
    onCancel: () -> Unit,
    onNewSale: () -> Unit,
) {
    val frozen = state.terminal?.frozen == true
    AnimatedContent(
        targetState = state.sell,
        contentKey = { it::class },
        transitionSpec = { (fadeIn(tween(220)) + scaleIn(initialScale = 0.98f, animationSpec = tween(220))) togetherWith fadeOut(tween(140)) },
        label = "sell",
    ) { sell ->
        when (sell) {
            is Sell.Idle -> Keypad(sell.entry, frozen, onKey, onPreset, onCharge)
            is Sell.Opening -> Waiting(sell.amount, null, state.tray, onTap, onCancel, opening = true)
            is Sell.Waiting -> Waiting(sell.charge.amount, sell.startedAt, state.tray, onTap, onCancel)
            is Sell.Paying -> Checking(sell.charge.amount, sell.shopper)
            is Sell.Done -> Result(sell, onNewSale)
            is Sell.TakeCash -> TakeCash(sell.amount, onNewSale)
            is Sell.Failed -> Failure(sell.message, onNewSale)
        }
    }
}

@Composable
private fun Keypad(entry: String, frozen: Boolean, onKey: (String) -> Unit, onPreset: (Int) -> Unit, onCharge: () -> Unit) {
    val haptic = LocalHapticFeedback.current
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(36.dp))
        Text("Amount", style = Type.monoSmall, color = Fp.ink2)
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text("PKR ", style = Type.title, color = Fp.ink2, modifier = Modifier.padding(bottom = 10.dp))
            Text(entry.ifEmpty { "0" }, style = Type.amount.copy(fontSize = 72.sp, lineHeight = 72.sp), color = if (entry.isEmpty()) Fp.ink3 else Fp.ink,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        }
        Spacer(Modifier.height(18.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(80, 150, 180, 500).forEach { p ->
                Box(Modifier.clip(RoundedCornerShape(50)).background(Fp.paper2).clickable { onPreset(p) }.padding(horizontal = 14.dp, vertical = 8.dp)) {
                    Text("PKR $p", style = Type.label, color = Fp.ink)
                }
            }
        }
        Spacer(Modifier.weight(1f))
        val rows = listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf(".", "0", "⌫"))
        rows.forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                row.forEach { k ->
                    Box(
                        Modifier.size(width = 96.dp, height = 64.dp).clip(RoundedCornerShape(18.dp))
                            .clickable { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); onKey(k) }
                            .semantics { contentDescription = if (k == "⌫") "Delete" else k },
                        contentAlignment = Alignment.Center,
                    ) { Text(k, style = Type.title.copy(fontSize = 28.sp), color = Fp.ink) }
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        val enabled = !frozen && entry.trimEnd('.').any { it in '1'..'9' }
        Box(
            Modifier.fillMaxWidth().height(60.dp).clip(RoundedCornerShape(50)).background(if (enabled) Fp.ink else Fp.paper2)
                .clickable(enabled = enabled) { haptic.performHapticFeedback(HapticFeedbackType.LongPress); onCharge() },
            contentAlignment = Alignment.Center,
        ) {
            Text(if (frozen) "Terminal frozen" else "Charge", style = Type.lead, color = if (enabled) Fp.paper else Fp.ink3)
        }
        Spacer(Modifier.height(112.dp))
    }
}

/** Waiting for a thumb: the coin's ridges ripple outward like a press on glass; a hairline ring counts 120 s. */
@Composable
private fun Waiting(amount: String, startedAt: Long?, tray: List<Shopper>, onTap: (Shopper?) -> Unit, onCancel: () -> Unit, opening: Boolean = false) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(startedAt) { while (true) { now = System.currentTimeMillis(); delay(250) } }
    val left = startedAt?.let { (120_000 - (now - it)).coerceAtLeast(0) / 1000 } ?: 120
    val wave = rememberInfiniteTransition(label = "wave").animateFloat(0f, 1f, infiniteRepeatable(tween(1800, easing = LinearEasing), RepeatMode.Restart), label = "w")

    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(36.dp))
        Text("PKR $amount", style = Type.display, color = Fp.ink)
        Text(if (opening) "Opening the sale…" else "Ask the shopper to place a thumb", style = Type.body, color = Fp.ink2)
        Spacer(Modifier.height(32.dp))
        Box(Modifier.size(220.dp), contentAlignment = Alignment.Center) {
            Canvas(Modifier.fillMaxSize()) {
                drawCircle(Fp.rule, radius = size.minDimension / 2 - 2, style = Stroke(1.5f))
                val sweep = 360f * (left / 120f)
                drawArc(Fp.ink, -90f, sweep, false, style = Stroke(2f, cap = StrokeCap.Round), topLeft = Offset(2f, 2f),
                    size = androidx.compose.ui.geometry.Size(size.width - 4, size.height - 4))
            }
            Coin(Modifier.size(132.dp), color = Fp.ink, ridgeAlpha = { i -> 0.35f + 0.65f * ((sin((wave.value * 6.2832f) - i * 0.9f) + 1f) / 2f) })
        }
        Spacer(Modifier.height(10.dp))
        Text("${left}s", style = Type.mono, color = Fp.ink2)
        Spacer(Modifier.weight(1f))
        Text("DEMO · SIMULATED THUMBS", style = Type.monoSmall, color = Fp.ink2, modifier = Modifier.align(Alignment.Start))
        Spacer(Modifier.height(10.dp))
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Fp.paper2)) {
            (tray.map<Shopper, Shopper?> { it } + listOf(null)).forEachIndexed { i, s ->
                if (i > 0) Box(Modifier.fillMaxWidth().height(1.dp).background(Fp.rule))
                Row(
                    Modifier.fillMaxWidth().clickable(enabled = !opening) { onTap(s) }.padding(horizontal = 18.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Coin(Modifier.size(22.dp), color = if (s == null) Fp.ink3 else Fp.ink)
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(s?.name ?: "Unregistered thumb", style = Type.body, color = Fp.ink)
                        Text(when (s?.accountType) { null -> "Not enrolled"; "STUDENT_NON_PTA" -> "Student account"; else -> "Salary account" }, style = Type.label, color = Fp.ink2)
                    }
                    Text("Tap", style = Type.label, color = Fp.ink2)
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Text("Cancel sale", style = Type.lead, color = Fp.ink2, modifier = Modifier.clickable(onClick = onCancel).padding(12.dp))
        Spacer(Modifier.height(100.dp))
    }
}

@Composable
private fun Checking(amount: String, shopper: String?) {
    val t = rememberInfiniteTransition(label = "check").animateFloat(0.9f, 1f, infiniteRepeatable(tween(420), RepeatMode.Reverse), label = "c")
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Coin(Modifier.size((132 * t.value).dp), color = Fp.ink)
        Spacer(Modifier.height(24.dp))
        Text("Risk Engine checking…", style = Type.lead, color = Fp.ink)
        Text("PKR $amount${shopper?.let { " · $it" } ?: ""}", style = Type.body, color = Fp.ink2)
    }
}

@Composable
private fun Result(done: Sell.Done, onNewSale: () -> Unit) {
    val r = done.result
    val ok = r.outcome == "SUCCESS"
    val haptic = LocalHapticFeedback.current
    LaunchedEffect(r) { haptic.performHapticFeedback(if (ok) HapticFeedbackType.LongPress else HapticFeedbackType.TextHandleMove) }
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.weight(1f))
        Box(Modifier.size(84.dp).clip(CircleShape).background(if (ok) Fp.settle else Fp.paper2), contentAlignment = Alignment.Center) {
            Text(if (ok) "✓" else "–", style = Type.display, color = if (ok) Fp.paper else Fp.ink2)
        }
        Spacer(Modifier.height(24.dp))
        Text(if (ok) "Settled" else "Not paid", style = Type.display, color = if (ok) Fp.settle else Fp.ink)
        Spacer(Modifier.height(8.dp))
        Text(bannerFor(r.outcome, r.amount), style = Type.lead, color = Fp.ink2, textAlign = TextAlign.Center,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive })
        if (ok) {
            Spacer(Modifier.height(28.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Fp.paper2).padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Line("Shopper", r.shopper ?: "—")
                Line("Gross", "PKR ${r.amount}")
                Line("Fee", "PKR ${r.fee}")
                Line("Net to you", "PKR ${r.net}")
                r.processingMs?.let { Line("Time", "${"%.2f".format(it / 1000.0)} s") }
                r.raastRef?.let { Line("Raast ref (simulated)", it) }
            }
        }
        Spacer(Modifier.weight(1f))
        Box(Modifier.fillMaxWidth().height(60.dp).clip(RoundedCornerShape(50)).background(Fp.ink).clickable(onClick = onNewSale), contentAlignment = Alignment.Center) {
            Text("New sale", style = Type.lead, color = Fp.paper)
        }
        Spacer(Modifier.height(112.dp))
    }
}

@Composable
private fun Line(k: String, v: String) = Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
    Text(k, style = Type.body, color = Fp.ink2)
    Text(v, style = Type.mono, color = Fp.ink)
}

/** SPEC View A: offline never queues a sale. An inverted ink card the cashier can't miss. */
@Composable
private fun TakeCash(amount: String, onNewSale: () -> Unit) = Column(
    Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally,
) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(Fp.ink).padding(28.dp)) {
        Text("INTERNET DOWN", style = Type.monoSmall, color = Fp.night2)
        Spacer(Modifier.height(12.dp))
        Text("Take cash", style = Type.hero, color = Fp.nightText)
        Spacer(Modifier.height(8.dp))
        Text("PKR $amount. This sale was not charged and won't be charged later.", style = Type.lead, color = Fp.night2)
    }
    Spacer(Modifier.height(24.dp))
    Text("New sale", style = Type.lead, color = Fp.ink, modifier = Modifier.clickable(onClick = onNewSale).padding(12.dp))
}

@Composable
private fun Failure(message: String, onNewSale: () -> Unit) = Column(
    Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally,
) {
    Text("Couldn't finish", style = Type.display, color = Fp.ink)
    Spacer(Modifier.height(8.dp))
    Text(message, style = Type.lead, color = Fp.ink2, textAlign = TextAlign.Center)
    Spacer(Modifier.height(24.dp))
    Text("Back to keypad", style = Type.lead, color = Fp.ink, modifier = Modifier.clickable(onClick = onNewSale).padding(12.dp))
}
