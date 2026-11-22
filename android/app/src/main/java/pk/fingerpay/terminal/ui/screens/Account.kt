package pk.fingerpay.terminal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import pk.fingerpay.terminal.BuildConfig
import pk.fingerpay.terminal.UiState
import pk.fingerpay.terminal.ui.components.Coin
import pk.fingerpay.terminal.ui.theme.Fp
import pk.fingerpay.terminal.ui.theme.Type
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val merchant = BuildConfig.ACCOUNT_TYPE == "merchant"
private val appName = if (merchant) "FingerPay Merchant" else "FingerPay Customer"
@Composable
private fun AccountPage(content: @Composable () -> Unit) {
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Coin(Modifier.size(44.dp), color = Fp.ink)
        Text(appName, style = Type.label, color = Fp.ink2)
        content()
        Text("Student prototype · Demo credit only. No real money or biometrics processed.", style = Type.label, color = Fp.ink2)
    }
}

@Composable
private fun Notice(message: String?) {
    if (message != null) Text(message, style = Type.body, color = Fp.ink,
        modifier = Modifier.fillMaxWidth().background(Fp.paper2, RoundedCornerShape(12.dp)).padding(16.dp).semantics { liveRegion = LiveRegionMode.Polite })
}

@Composable
private fun AccountButton(label: String, busy: Boolean, action: () -> Unit) {
    Button(onClick = action, enabled = !busy, modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.buttonColors(containerColor = Fp.ink, contentColor = Fp.paper)) {
        Text(if (busy) "Please wait…" else label, style = Type.lead, modifier = Modifier.padding(8.dp))
    }
}

@Composable
fun AccountWalletScreen(state: UiState, onRefresh: () -> Unit, onSignOut: () -> Unit) {
    val wallet = state.account?.wallet ?: return
    var tab by remember { mutableStateOf("Wallet") }
    var hidden by remember { mutableStateOf(false) }
    val profile = wallet.profile
    AccountPage {
        if (profile.accountType != BuildConfig.ACCOUNT_TYPE) {
            Text("Open FingerPay ${profile.accountType.replaceFirstChar { it.uppercase() }}", style = Type.title, color = Fp.ink)
            Text("This account belongs in the other app. Sign out here and use the matching app.", style = Type.body, color = Fp.ink2)
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                listOf("Wallet", "Activity", "Profile").forEach { item ->
                    TextButton(onClick = { tab = item }) { Text(item, color = if (tab == item) Fp.ink else Fp.ink2) }
                }
            }
            when (tab) {
                "Wallet" -> {
                    Text(if (merchant) profile.businessName.orEmpty() else "Hello, ${profile.fullName.substringBefore(' ')}.", style = Type.display, color = Fp.ink)
                    Column(Modifier.fillMaxWidth().background(Fp.paper2, RoundedCornerShape(24.dp)).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Text("Demo balance · PKR", style = Type.label, color = Fp.ink2)
                        Text(if (hidden) "••••" else wallet.balance, style = Type.amount, color = Fp.ink)
                        Text("Signup credit received. No cash value.", style = Type.body, color = Fp.ink2)
                        TextButton(onClick = { hidden = !hidden }) { Text(if (hidden) "Show balance" else "Hide balance", color = Fp.ink) }
                    }
                    Text(if (merchant) "Your business profile is saved. Ask your FingerPay administrator to activate your shop and connect a terminal before accepting payments."
                        else "Your personal wallet is ready. Bank linking and fingerprint enrolment are separate steps and are not available through this demo signup.", style = Type.body, color = Fp.ink2)
                    AccountButton("Refresh wallet", state.busy, onRefresh)
                }
                "Activity" -> {
                    Text("Activity.", style = Type.display, color = Fp.ink)
                    wallet.activity.forEach { activity ->
                        Column(Modifier.fillMaxWidth().background(Fp.paper2, RoundedCornerShape(16.dp)).padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(activity.label, style = Type.title, color = Fp.ink)
                            Text("+ PKR ${activity.amount}", style = Type.mono, color = Fp.settle)
                            val date = DateTimeFormatter.ofPattern("dd MMM uuuu").withZone(ZoneId.of("Asia/Karachi")).format(Instant.parse(activity.createdAt))
                            Text("$date · Demo credit", style = Type.label, color = Fp.ink2)
                        }
                    }
                    Text("Payments, transfers and withdrawals are not enabled for demo credit.", style = Type.body, color = Fp.ink2)
                }
                "Profile" -> {
                    Text("Your details.", style = Type.display, color = Fp.ink)
                    val details = listOf("Email" to state.account.email, "Full name" to profile.fullName, "Mobile" to profile.phone,
                        "Date of birth" to profile.dateOfBirth, "Occupation" to profile.occupation,
                        "Home address" to profile.address, "City" to profile.city, "Postal code" to profile.postalCode) +
                        if (merchant) listOf("Business name" to profile.businessName.orEmpty(), "Business type" to profile.businessType.orEmpty(),
                            "Business address" to profile.businessAddress.orEmpty(), "Business city" to profile.businessCity.orEmpty(), "Registration / NTN" to profile.registrationNumber.orEmpty()) else emptyList()
                    details.forEach { (label, value) -> Column {
                        Text(label, style = Type.label, color = Fp.ink2)
                        Text(value.ifBlank { "Not provided" }, style = Type.lead, color = Fp.ink)
                    } }
                }
            }
        }
        Notice(state.notice)
        TextButton(onClick = onSignOut, enabled = !state.busy) { Text("Sign out", color = Fp.ink) }
    }
}
