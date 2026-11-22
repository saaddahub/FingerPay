package pk.fingerpay.terminal.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import pk.fingerpay.terminal.BuildConfig
import pk.fingerpay.terminal.UiState
import pk.fingerpay.terminal.data.AccountProfile
import pk.fingerpay.terminal.ui.components.Coin
import pk.fingerpay.terminal.ui.theme.Fp
import pk.fingerpay.terminal.ui.theme.Type
import java.time.LocalDate

private val isMerchant = BuildConfig.ACCOUNT_TYPE == "merchant"
private val roleName = if (isMerchant) "Merchant" else "Customer"
private val totalSteps = if (isMerchant) 4 else 3
private const val passwordHint = "12+ characters, with uppercase, lowercase, a number and a symbol."

@Composable
private fun SignupLayout(
    title: String,
    description: String,
    step: Int?,
    action: String,
    busy: Boolean = false,
    notice: String? = null,
    secondary: String,
    onSecondary: () -> Unit,
    onAction: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    val scroll = rememberScrollState()
    LaunchedEffect(title) { scroll.scrollTo(0) }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 540.dp).fillMaxSize().imePadding()) {
            Row(
                Modifier.fillMaxWidth().padding(start = 24.dp, end = 12.dp, top = 6.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Coin(Modifier.size(28.dp), color = Fp.ink)
                Column(Modifier.weight(1f)) {
                    Text("FingerPay", style = Type.lead, color = Fp.ink)
                    Text(roleName, style = Type.label, color = Fp.ink2)
                }
                TextButton(onClick = onSecondary, enabled = !busy, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(secondary, style = Type.label, color = Fp.ink)
                }
            }
            Column(
                Modifier.weight(1f).verticalScroll(scroll).padding(start = 24.dp, end = 24.dp, top = 12.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (step != null) {
                    Text("Step $step of $totalSteps", style = Type.monoSmall, color = Fp.ink2)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        repeat(totalSteps) { index ->
                            Box(Modifier.weight(1f).height(3.dp).background(if (index < step) Fp.ink else Fp.rule, RoundedCornerShape(2.dp)))
                        }
                    }
                }
                Text(title, modifier = Modifier.padding(top = 4.dp).semantics { heading() }, style = Type.display, color = Fp.ink)
                if (description.isNotEmpty()) Text(description, style = Type.body, color = Fp.ink2)
                content()
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(Fp.rule))
            Column(Modifier.fillMaxWidth().background(Fp.paper).padding(horizontal = 24.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (notice != null) Text(notice, style = Type.body, color = Fp.ink,
                    modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite })
                Button(onClick = onAction, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Fp.ink, contentColor = Fp.paper)) {
                    Text(if (busy) "Please wait…" else action, style = Type.lead)
                }
            }
        }
    }
}

@Composable
private fun WelcomeCredit() {
    val shape = RoundedCornerShape(20.dp)
    Box(Modifier.fillMaxWidth().clip(shape).background(Fp.ink)) {
        Coin(Modifier.align(Alignment.CenterEnd).padding(end = 12.dp).size(112.dp), color = Fp.nightText.copy(alpha = .16f))
        Column(Modifier.padding(horizontal = 18.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text("Welcome credit", style = Type.label, color = Fp.nightText)
            Text("PKR 200", style = Type.title, color = Fp.nightText)
            Text("Demo credit · no cash value", style = Type.label, color = Fp.night2)
        }
    }
}

@Composable
private fun SignupField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    type: KeyboardType = KeyboardType.Text,
    hint: String? = null,
    support: String? = null,
    secret: Boolean = false,
    enabled: Boolean = true,
) {
    var revealed by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        enabled = enabled,
        label = { Text(label, style = Type.label) },
        placeholder = if (hint == null) null else {{ Text(hint, style = Type.body) }},
        supportingText = if (support == null) null else {{ Text(support, style = Type.label, color = Fp.ink2) }},
        trailingIcon = if (!secret) null else {{
            TextButton(onClick = { revealed = !revealed }, enabled = enabled, modifier = Modifier.heightIn(min = 48.dp)) {
                Text(if (revealed) "Hide" else "Show", style = Type.label, color = Fp.ink2)
            }
        }},
        keyboardOptions = KeyboardOptions(keyboardType = type, autoCorrectEnabled = false, imeAction = ImeAction.Next),
        visualTransformation = if (secret && !revealed) PasswordVisualTransformation() else VisualTransformation.None,
        textStyle = Type.lead,
        singleLine = true,
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = Fp.ink3, focusedBorderColor = Fp.ink),
    )
}

@Composable
fun AccountSignInScreen(
    state: UiState,
    onSignIn: (String, String) -> Unit,
    onSignUp: (String, String) -> Unit,
    onVerifyCode: (String) -> Unit,
    onResendCode: () -> Unit,
    clearNotice: () -> Unit,
) {
    var creating by rememberSaveable { mutableStateOf(true) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val focus = LocalFocusManager.current
    val verification = state.verificationEmail
    if (verification != null) {
        fun changeEmail() {
            creating = true
            email = verification
            otpCode = ""
            error = null
            clearNotice()
        }
        SignupLayout(
            title = "Enter 6-digit code",
            description = "We sent a 6-digit verification code to $verification. Enter it below to confirm your email and unlock your PKR 200 demo credit.",
            step = 1,
            action = "Verify & continue",
            busy = state.busy,
            notice = error ?: state.notice,
            secondary = "Change email",
            onSecondary = { changeEmail() },
            onAction = {
                val trimmed = otpCode.trim()
                if (trimmed.length != 6 || !trimmed.all(Char::isDigit)) {
                    error = "Enter the 6-digit verification code from your email."
                } else {
                    error = null
                    focus.clearFocus()
                    onVerifyCode(trimmed)
                }
            },
        ) {
            SignupField(
                label = "6-digit verification code",
                value = otpCode,
                onChange = { otpCode = it.filter(Char::isDigit).take(6); error = null },
                type = KeyboardType.Number,
                hint = "123456",
                support = "Valid for 15 minutes · Sent via FingerPay Mail",
                enabled = !state.busy,
            )
            TextButton(
                onClick = { error = null; onResendCode() },
                enabled = !state.busy,
                modifier = Modifier.heightIn(min = 48.dp),
            ) {
                Text("Resend 6-digit code", style = Type.label, color = Fp.ink)
            }
        }
        return
    }
    val submit = {
        error = when {
            !android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches() -> "Enter a valid email address."
            password.isEmpty() -> "Enter your password."
            creating && !validSignupPassword(password) -> passwordHint
            creating && password != confirm -> "Your passwords do not match."
            else -> null
        }
        if (error == null) {
            focus.clearFocus()
            if (creating) onSignUp(email.trim(), password) else onSignIn(email.trim(), password)
        }
    }
    SignupLayout(
        title = if (creating) "Create your account" else "Welcome back",
        description = if (!creating) "Sign in to your FingerPay $roleName account."
            else if (isMerchant) "Set up a wallet for your business." else "Set up your personal wallet.",
        step = if (creating) 1 else null,
        action = if (creating) "Create account" else "Sign in",
        busy = state.busy,
        notice = error ?: state.notice,
        secondary = if (creating) "Sign in" else "Create account",
        onSecondary = {
            focus.clearFocus()
            creating = !creating
            password = ""
            confirm = ""
            error = null
            clearNotice()
        },
        onAction = submit,
    ) {
        if (creating) WelcomeCredit()
        SignupField("Email address", email, { email = it.take(254); error = null }, KeyboardType.Email, "you@example.com", enabled = !state.busy)
        SignupField("Password", password, { password = it.take(128); error = null }, KeyboardType.Password,
            support = if (creating) passwordHint else null, secret = true, enabled = !state.busy)
        if (creating) SignupField("Confirm password", confirm, { confirm = it.take(128); error = null }, KeyboardType.Password, secret = true, enabled = !state.busy)
    }
}

internal fun validSignupPassword(password: String) = password.length >= 12 && password.any { it in 'a'..'z' } &&
    password.any { it in 'A'..'Z' } && password.any { it in '0'..'9' } && password.any { !it.isLetterOrDigit() }

internal fun validSignupBirthDate(value: String, today: LocalDate = LocalDate.now()): Boolean =
    runCatching { LocalDate.parse(value) in LocalDate.of(1900, 1, 1)..today.minusDays(1) }.getOrDefault(false)

@Composable
fun AccountDetailsScreen(state: UiState, onComplete: (AccountProfile) -> Unit, clearNotice: () -> Unit, onSignOut: () -> Unit) {
    var step by remember { mutableStateOf(2) }
    var fields by remember { mutableStateOf(mapOf<String, String>()) }
    var consent by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val focus = LocalFocusManager.current
    val last = step == totalSteps
    fun value(key: String) = fields[key].orEmpty().trim()
    fun back() {
        focus.clearFocus()
        error = null
        clearNotice()
        step--
    }
    BackHandler(enabled = step > 2 && !state.busy) { back() }

    @Composable
    fun Entry(key: String, label: String, limit: Int, type: KeyboardType = KeyboardType.Text, hint: String? = null) {
        SignupField(label, fields[key].orEmpty(), { fields = fields + (key to it.take(limit)); error = null }, type, hint, enabled = !state.busy)
    }

    SignupLayout(
        title = when (step) { 2 -> "About you"; 3 -> "Home address"; else -> "Your business" },
        description = if (step == 2) "Use sample details for this demo. Your profile is stored securely." else "",
        step = step,
        action = if (last) "Open my wallet" else "Continue",
        busy = state.busy,
        notice = error ?: state.notice,
        secondary = if (step == 2) "Sign out" else "Back",
        onSecondary = { if (step == 2) onSignOut() else back() },
        onAction = {
            error = when {
                step == 2 && value("fullName").length < 2 -> "Enter your full name."
                step == 2 && !Regex("^(?:\\+92|0)3\\d{9}$").matches(value("phone")) -> "Enter a Pakistani mobile number, like 03001234567."
                step == 2 && !validSignupBirthDate(value("dateOfBirth")) -> "Enter a valid birth date as YYYY-MM-DD."
                step == 2 && value("occupation").length < 2 -> "Enter your occupation."
                step == 3 && value("address").length < 5 -> "Enter your street address."
                step == 3 && value("city").length < 2 -> "Enter your city."
                step == 3 && !Regex("^\\d{5}$").matches(value("postalCode")) -> "Enter a five-digit postal code."
                step == 4 && (value("businessName").length < 2 || value("businessType").length < 2 || value("businessAddress").length < 5 || value("businessCity").length < 2) -> "Complete the business name, type, address and city."
                last && !consent -> "Agree to save your demo profile to continue."
                else -> null
            }
            if (error == null) {
                focus.clearFocus()
                if (last) onComplete(AccountProfile(
                    accountType = BuildConfig.ACCOUNT_TYPE, fullName = value("fullName"), phone = value("phone"),
                    dateOfBirth = value("dateOfBirth"), address = value("address"), city = value("city"),
                    postalCode = value("postalCode"), occupation = value("occupation"), consent = consent,
                    businessName = value("businessName").takeIf { isMerchant }, businessType = value("businessType").takeIf { isMerchant },
                    businessAddress = value("businessAddress").takeIf { isMerchant }, businessCity = value("businessCity").takeIf { isMerchant },
                    registrationNumber = value("registrationNumber").takeIf { isMerchant },
                )) else step++
            }
        },
    ) {
        when (step) {
            2 -> {
                Entry("fullName", "Full name", 120)
                Entry("phone", "Mobile number", 13, KeyboardType.Phone, "03001234567")
                Entry("dateOfBirth", "Date of birth", 10, hint = "YYYY-MM-DD")
                Entry("occupation", "Occupation", 80)
            }
            3 -> {
                Entry("address", "Street address", 240)
                Entry("city", "City", 80)
                Entry("postalCode", "Postal code", 5, KeyboardType.Number)
            }
            else -> {
                Entry("businessName", "Business name", 120)
                Entry("businessType", "Business type", 80)
                Entry("businessAddress", "Business address", 240)
                Entry("businessCity", "Business city", 80)
                Entry("registrationNumber", "Registration / NTN (optional)", 60)
            }
        }
        if (last) Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Fp.paper2)
                .toggleable(value = consent, enabled = !state.busy, role = Role.Checkbox) { consent = it; error = null }
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Checkbox(checked = consent, onCheckedChange = null, enabled = !state.busy)
            Text("Save my details for this demo. I understand the PKR 200 credit has no cash value.", style = Type.body, color = Fp.ink)
        }
    }
}
