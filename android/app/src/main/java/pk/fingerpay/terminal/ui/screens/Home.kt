package pk.fingerpay.terminal.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import pk.fingerpay.terminal.UiState
import pk.fingerpay.terminal.ui.components.Coin
import pk.fingerpay.terminal.ui.components.FrostCrystals
import pk.fingerpay.terminal.ui.components.Glyph
import pk.fingerpay.terminal.ui.components.Icon
import pk.fingerpay.terminal.ui.components.frost
import pk.fingerpay.terminal.ui.theme.Fp
import pk.fingerpay.terminal.ui.theme.Motion
import pk.fingerpay.terminal.ui.theme.Type
import kotlin.math.abs

enum class CardId { Today, Terminal, Month }

@Composable
fun HomeScreen(
    state: UiState,
    onCharge: () -> Unit,
    onFreeze: () -> Unit,
    onUnfreeze: () -> Unit,
    onActivity: () -> Unit,
    onRefresh: () -> Unit,
) {
    val order = remember { mutableStateListOf(CardId.Today, CardId.Terminal, CardId.Month) }
    val frozen = state.terminal?.frozen == true
    val summary = state.summary

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(20.dp))
        Text(state.terminal?.storeName ?: state.me?.storeName ?: "FingerPay", style = Type.label, color = Fp.ink2)
        Spacer(Modifier.height(6.dp))
        Text("Today", style = Type.display, color = Fp.ink)
        Spacer(Modifier.height(18.dp))
        Text("Net settled", style = Type.monoSmall, color = Fp.ink2)
        Row(verticalAlignment = Alignment.Bottom) {
            Text("PKR ", style = Type.title, color = Fp.ink2, modifier = Modifier.padding(bottom = 8.dp))
            Text(summary?.net ?: "—", style = Type.amount, color = Fp.ink)
        }
        Text(
            if (summary == null) "Loading today's sales…" else "${summary.count} sales · ${summary.screenshotsAvoided} screenshots avoided",
            style = Type.body, color = Fp.ink2,
        )
        Spacer(Modifier.height(28.dp))

        CardStack(order = order, state = state, frozen = frozen)

        Spacer(Modifier.height(28.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Action("Charge", Glyph.Thumb, enabled = !frozen, onClick = onCharge)
            Action(if (frozen) "Unfreeze" else "Freeze", if (frozen) Glyph.Thaw else Glyph.Snow, busy = state.freezing) {
                // Bring the terminal card to the front first, so the freeze happens where the eye already is.
                order.remove(CardId.Terminal); order.add(0, CardId.Terminal)
                if (frozen) onUnfreeze() else onFreeze()
            }
            Action("Activity", Glyph.List, onClick = onActivity)
            Action("Refresh", Glyph.Refresh, onClick = onRefresh)
        }
        Spacer(Modifier.height(120.dp))
    }
}

@Composable
private fun Action(label: String, glyph: Glyph, enabled: Boolean = true, busy: Boolean = false, onClick: () -> Unit) {
    val haptic = LocalHapticFeedback.current
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(72.dp)) {
        Box(
            Modifier.size(56.dp).clip(CircleShape).background(if (enabled) Fp.paper2 else Fp.paper2.copy(alpha = 0.5f))
                .clickable(enabled = enabled && !busy) { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); onClick() }
                .semantics { contentDescription = label },
            contentAlignment = Alignment.Center,
        ) { Icon(glyph, tint = if (enabled) Fp.ink else Fp.ink3) }
        Spacer(Modifier.height(8.dp))
        Text(label, style = Type.label, color = if (enabled) Fp.ink else Fp.ink3)
    }
}

/** Three cards, swipe to cycle (velocity-projected, Apple-style), tap the front card to flip it. */
@Composable
private fun CardStack(order: MutableList<CardId>, state: UiState, frozen: Boolean) {
    val scope = rememberCoroutineScope()
    val drag = remember { Animatable(0f) }
    var flipped by remember { mutableStateOf(false) }
    val flip by animateFloatAsState(if (flipped) 180f else 0f, Motion.sheet(), label = "flip")
    var width by remember { mutableIntStateOf(1) }
    val density = LocalDensity.current
    val haptic = LocalHapticFeedback.current

    // The freeze: progress 0 → 1 over 1.1 s, ice spreading from the bottom edge where the Freeze button sits.
    val frost by animateFloatAsState(if (frozen) 1f else 0f, tween(1100, easing = FastOutSlowInEasing), label = "frost")
    LaunchedEffect(frozen) { if (frozen) haptic.performHapticFeedback(HapticFeedbackType.LongPress) }

    Box(
        Modifier.fillMaxWidth().aspectRatio(1.586f / 1.12f)
            .onSizeChanged { width = it.width }
            .pointerInput(Unit) {
                val tracker = VelocityTracker()
                detectHorizontalDragGestures(
                    onDragStart = { tracker.resetTracking() },
                    onHorizontalDrag = { change, amount ->
                        tracker.addPosition(change.uptimeMillis, change.position)
                        scope.launch { drag.snapTo(drag.value + amount) }
                    },
                    onDragEnd = {
                        val v = tracker.calculateVelocity().x
                        val projected = drag.value + v * 0.18f // momentum projection (MOTION.md / Apple §6)
                        scope.launch {
                            if (abs(projected) > width * 0.33f) {
                                drag.animateTo(if (projected < 0) -width.toFloat() else width.toFloat(), Motion.ui(), v)
                                if (projected < 0) order.add(order.removeAt(0)) // front card goes to the back
                                else order.add(0, order.removeAt(order.lastIndex)) // back card comes to the front
                                flipped = false
                                drag.snapTo(0f)
                            } else drag.animateTo(0f, Motion.release(), v)
                        }
                    },
                )
            },
        contentAlignment = Alignment.BottomCenter,
    ) {
        order.asReversed().forEachIndexed { revIdx, id ->
            val depth = order.lastIndex - revIdx // 0 = front
            val lift by animateFloatAsState(depth.toFloat(), Motion.sheet(), label = "depth")
            val isFront = depth == 0
            Box(
                Modifier.fillMaxWidth().aspectRatio(1.586f)
                    .graphicsLayer {
                        translationY = -lift * with(density) { 16.dp.toPx() }
                        scaleX = 1f - lift * 0.05f
                        scaleY = 1f - lift * 0.05f
                        alpha = 1f - lift * 0.18f
                        if (isFront) {
                            translationX = drag.value
                            rotationZ = drag.value / width * 6f
                            rotationY = flip
                            cameraDistance = 14f * density.density
                        }
                    }
                    .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, enabled = isFront) { flipped = !flipped }
                    .semantics { contentDescription = "${label(id)} card" },
            ) {
                val showBack = isFront && flip > 90f
                CardFace(id, state, back = showBack, frost = if (id == CardId.Terminal) frost else 0f, sheen = if (isFront) drag.value / width else 0f)
            }
        }
    }
}

private fun label(id: CardId) = when (id) { CardId.Today -> "Today"; CardId.Terminal -> "This terminal"; CardId.Month -> "This month" }

@Composable
private fun CardFace(id: CardId, state: UiState, back: Boolean, frost: Float, sheen: Float) {
    var size by remember { mutableStateOf(IntSize(1, 1)) }
    val origin = Offset(size.width / 2f, size.height.toFloat())
    Box(
        Modifier.fillMaxSize().clip(RoundedCornerShape(22.dp))
            .onSizeChanged { size = it }
            .background(Brush.linearGradient(listOf(Color(0xFF1C1C1F), Fp.ink, Color(0xFF141416))))
            .graphicsLayer { if (back) rotationY = 180f },
    ) {
        Box(Modifier.fillMaxSize().frost(frost, origin)) {
            // Moving sheen: light catches the card as it's dragged.
            Box(Modifier.fillMaxSize().background(Brush.linearGradient(
                listOf(Color.Transparent, Color.White.copy(alpha = 0.07f), Color.Transparent),
                start = Offset(size.width * (-0.4f + sheen), 0f), end = Offset(size.width * (0.6f + sheen), size.height.toFloat()),
            )))
            if (back) CardBack(id, state) else CardFront(id, state, frozen = frost > 0.5f)
        }
        if (id == CardId.Terminal) FrostCrystals(frost, origin)
    }
}

@Composable
private fun CardFront(id: CardId, state: UiState, frozen: Boolean) {
    val s = state.summary
    Box(Modifier.fillMaxSize().padding(22.dp)) {
        Text(label(id).uppercase(), style = Type.monoSmall, color = Fp.night2, modifier = Modifier.align(Alignment.TopStart))
        Coin(Modifier.size(40.dp).align(Alignment.TopEnd), color = Fp.nightText.copy(alpha = 0.92f))
        Column(Modifier.align(Alignment.BottomStart)) {
            when (id) {
                CardId.Today -> {
                    Money(s?.gross)
                    Text("Gross sales", style = Type.label, color = Fp.night2)
                }
                CardId.Terminal -> {
                    Text(state.terminal?.label ?: "This phone", style = Type.title, color = Fp.nightText)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(7.dp).clip(CircleShape).background(if (frozen) Fp.ice else Fp.settleNight))
                        Spacer(Modifier.width(8.dp))
                        Text(if (frozen) "Frozen · no new charges" else "Accepting thumbs", style = Type.label, color = if (frozen) Fp.ice else Fp.night2)
                    }
                }
                CardId.Month -> {
                    Text("${s?.monthCount ?: "—"}", style = Type.amount.copy(fontSize = 44.sp, lineHeight = 44.sp), color = Fp.nightText)
                    Text("Thumb sales this month", style = Type.label, color = Fp.night2)
                }
            }
        }
    }
}

@Composable
private fun Money(value: String?) = Row(verticalAlignment = Alignment.Bottom) {
    Text("PKR ", style = Type.label, color = Fp.night2, modifier = Modifier.padding(bottom = 6.dp))
    Text(value ?: "—", style = Type.amount.copy(fontSize = 40.sp, lineHeight = 40.sp), color = Fp.nightText)
}

@Composable
private fun CardBack(id: CardId, state: UiState) {
    val s = state.summary
    val rows: List<Pair<String, String>> = when (id) {
        CardId.Today -> listOf("Gross" to "PKR ${s?.gross ?: "—"}", "Fees" to "PKR ${s?.fees ?: "—"}", "Saved vs 2.5% card" to "PKR ${s?.saved ?: "—"}", "Declines" to "${s?.declines ?: "—"}")
        CardId.Terminal -> listOf("Store" to (state.terminal?.storeName ?: "—"), "Terminal" to (state.terminal?.terminalId?.take(8) ?: "—"), "Key" to "Android Keystore", "Signed" to "Every request")
        CardId.Month -> listOf("Allied Bank (simulated)" to "PKR ${s?.bankBalance ?: "—"}", "Screenshots avoided" to "${s?.screenshotsAvoided ?: "—"}", "Settles over" to "Raast (simulated)")
    }
    Column(Modifier.fillMaxSize().padding(22.dp), verticalArrangement = Arrangement.SpaceEvenly) {
        rows.forEach { (k, v) ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(k, style = Type.label.copy(fontWeight = FontWeight(400)), color = Fp.night2)
                Text(v, style = Type.mono, color = Fp.nightText)
            }
        }
    }
}
