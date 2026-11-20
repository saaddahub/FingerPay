package pk.fingerpay.terminal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import pk.fingerpay.terminal.UiState
import pk.fingerpay.terminal.data.Sale
import pk.fingerpay.terminal.ui.components.Coin
import pk.fingerpay.terminal.ui.theme.Fp
import pk.fingerpay.terminal.ui.theme.Type
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val clock = DateTimeFormatter.ofPattern("h:mm a").withZone(ZoneId.of("Asia/Karachi"))

@Composable
fun ActivityScreen(state: UiState) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Activity", style = Type.display, color = Fp.ink)
            Text("Today, Asia/Karachi", style = Type.body, color = Fp.ink2)
            Spacer(Modifier.height(20.dp))
        }
        if (state.ledger.isEmpty()) item {
            Text("No sales yet today. Your first thumb sale shows up here the moment it settles.", style = Type.lead, color = Fp.ink2)
        }
        items(state.ledger, key = { it.attemptId }) { SaleRow(it) }
        item { Spacer(Modifier.height(120.dp)) }
    }
}

@Composable
private fun SaleRow(s: Sale) {
    val settled = s.status == "SETTLED"
    Column {
        Box(Modifier.fillMaxWidth().height(1.dp).background(Fp.rule))
        Row(Modifier.fillMaxWidth().padding(vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(8.dp).clip(CircleShape).background(if (settled) Fp.settle else Fp.ink3))
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                // Privacy: shopper names only on settled sales (database rule); declines never say who.
                Text(s.shopper ?: statusLabel(s.status), style = Type.body, color = Fp.ink)
                Text("${runCatching { clock.format(Instant.parse(s.occurredAt)) }.getOrDefault("")} · ${s.terminal ?: ""}", style = Type.label, color = Fp.ink2)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("PKR ${s.gross}", style = Type.mono, color = if (settled) Fp.ink else Fp.ink2)
                if (settled && s.net != null) Text("net ${s.net}", style = Type.monoSmall, color = Fp.ink2)
            }
        }
    }
}

private fun statusLabel(status: String) = when (status) {
    "DECLINED" -> "Declined · PKR 0 fee"
    "OFFLINE_CASH" -> "Taken in cash (offline)"
    "REVERSED" -> "Reversed"
    else -> status.lowercase().replaceFirstChar { it.uppercase() }
}

@Composable
fun SettingsScreen(state: UiState, onSignOut: () -> Unit, onForget: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(20.dp))
        Text("Settings", style = Type.display, color = Fp.ink)
        Spacer(Modifier.height(24.dp))
        Group {
            Pair2("Signed in as", state.me?.displayName ?: "—")
            Pair2("Role", if (state.me?.isOwner == true) "Owner" else "Cashier")
            Pair2("Store", state.terminal?.storeName ?: "—")
            Pair2("Terminal", state.terminal?.label ?: "—")
            Pair2("Status", if (state.terminal?.frozen == true) "Frozen" else "Active")
        }
        Spacer(Modifier.height(16.dp))
        Text(
            "Freeze or unfreeze from the Home screen. Freezing stops new charges at once; unfreezing needs the owner and this phone's fingerprint.",
            style = Type.body, color = Fp.ink2,
        )
        Spacer(Modifier.height(28.dp))
        Text("Sign out", style = Type.lead, color = Fp.ink, modifier = Modifier.clickable(onClick = onSignOut).padding(vertical = 12.dp))
        if (state.me?.isOwner == true) {
            Text("Forget this terminal on this phone", style = Type.lead, color = Fp.ink2, modifier = Modifier.clickable(onClick = onForget).padding(vertical = 12.dp))
        }
        Spacer(Modifier.weight(1f))
        Text(
            "FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed.",
            style = Type.label.copy(fontWeight = androidx.compose.ui.text.font.FontWeight(400)), color = Fp.ink2,
        )
        Spacer(Modifier.height(120.dp))
    }
}

@Composable
private fun Group(content: @Composable () -> Unit) =
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Fp.paper2).padding(horizontal = 18.dp, vertical = 6.dp)) { content() }

@Composable
private fun Pair2(k: String, v: String) = Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
    Text(k, style = Type.body, color = Fp.ink2)
    Text(v, style = Type.body, color = Fp.ink)
}

@Composable
fun SignInScreen(busy: Boolean, notice: String?, onSignIn: (String, String) -> Unit) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().imePadding().padding(horizontal = 24.dp)) {
        Spacer(Modifier.height(96.dp))
        Coin(Modifier.size(56.dp), color = Fp.ink)
        Spacer(Modifier.height(28.dp))
        Text("Pay with\nnothing.", style = Type.hero, color = Fp.ink)
        Spacer(Modifier.height(12.dp))
        Text("Sign in to run your shop's FingerPay terminal.", style = Type.lead, color = Fp.ink2)
        Spacer(Modifier.height(36.dp))
        Field("Email", email, { email = it }, KeyboardType.Email)
        Spacer(Modifier.height(12.dp))
        Field("Password", password, { password = it }, KeyboardType.Password, secret = true)
        notice?.let { Spacer(Modifier.height(12.dp)); Text(it, style = Type.body, color = Fp.ink) }
        Spacer(Modifier.weight(1f))
        val enabled = !busy && email.isNotBlank() && password.isNotEmpty()
        Box(
            Modifier.fillMaxWidth().height(60.dp).clip(RoundedCornerShape(50)).background(if (enabled) Fp.ink else Fp.paper2)
                .clickable(enabled = enabled) { onSignIn(email, password) },
            contentAlignment = Alignment.Center,
        ) { Text(if (busy) "Signing in…" else "Sign in", style = Type.lead, color = if (enabled) Fp.paper else Fp.ink3) }
        Spacer(Modifier.height(16.dp))
        Text("Student prototype · integrations simulated", style = Type.label, color = Fp.ink2, modifier = Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(28.dp))
    }
}

@Composable
fun PairScreen(state: UiState, onPair: (String) -> Unit, onSignOut: () -> Unit) {
    var label by rememberSaveable { mutableStateOf("Counter 1") }
    val owner = state.me?.isOwner == true
    Column(Modifier.fillMaxSize().imePadding().padding(horizontal = 24.dp)) {
        Spacer(Modifier.height(96.dp))
        Text("Pair this phone", style = Type.display, color = Fp.ink)
        Spacer(Modifier.height(12.dp))
        Text(
            if (owner) "This phone becomes a FingerPay terminal for ${state.me?.storeName ?: "your shop"}. It makes a signing key that never leaves its secure hardware."
            else "Ask the shop owner to sign in on this phone once to pair it as a terminal.",
            style = Type.lead, color = Fp.ink2,
        )
        Spacer(Modifier.height(32.dp))
        if (owner) Field("Terminal name", label, { label = it.take(60) }, KeyboardType.Text)
        state.notice?.let { Spacer(Modifier.height(12.dp)); Text(it, style = Type.body, color = Fp.ink) }
        Spacer(Modifier.weight(1f))
        if (owner) Box(
            Modifier.fillMaxWidth().height(60.dp).clip(RoundedCornerShape(50)).background(if (!state.busy) Fp.ink else Fp.paper2)
                .clickable(enabled = !state.busy) { onPair(label) },
            contentAlignment = Alignment.Center,
        ) { Text(if (state.busy) "Pairing…" else "Pair terminal", style = Type.lead, color = Fp.paper) }
        Text("Sign out", style = Type.lead, color = Fp.ink2, modifier = Modifier.align(Alignment.CenterHorizontally).clickable(onClick = onSignOut).padding(16.dp))
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun Field(label: String, value: String, onChange: (String) -> Unit, type: KeyboardType, secret: Boolean = false) {
    Column {
        Text(label, style = Type.label, color = Fp.ink2)
        Spacer(Modifier.height(6.dp))
        BasicTextField(
            value = value, onValueChange = onChange, singleLine = true, textStyle = Type.lead.copy(color = Fp.ink),
            cursorBrush = SolidColor(Fp.ink),
            visualTransformation = if (secret) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = type, imeAction = ImeAction.Next, autoCorrectEnabled = false),
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Fp.paper2).border(1.dp, Fp.rule, RoundedCornerShape(16.dp)).padding(horizontal = 16.dp, vertical = 16.dp),
        )
    }
}
