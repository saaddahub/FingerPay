package pk.fingerpay.terminal

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import pk.fingerpay.terminal.ui.components.Coin
import pk.fingerpay.terminal.ui.components.Glyph
import pk.fingerpay.terminal.ui.components.Icon
import pk.fingerpay.terminal.ui.screens.ActivityScreen
import pk.fingerpay.terminal.ui.screens.HomeScreen
import pk.fingerpay.terminal.ui.screens.PairScreen
import pk.fingerpay.terminal.ui.screens.SellScreen
import pk.fingerpay.terminal.ui.screens.SettingsScreen
import pk.fingerpay.terminal.ui.screens.SignInScreen
import pk.fingerpay.terminal.ui.theme.FingerPayTheme
import pk.fingerpay.terminal.ui.theme.Fp
import pk.fingerpay.terminal.ui.theme.Motion
import pk.fingerpay.terminal.ui.theme.Type

class MainActivity : FragmentActivity() {
    private val vm: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FingerPayTheme {
                val state by vm.state.collectAsStateWithLifecycle()
                Box(Modifier.fillMaxSize().background(Fp.paper)) {
                    when (state.screen) {
                        Screen.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Coin(Modifier.size(56.dp), color = Fp.ink) }
                        Screen.SignIn -> Box(Modifier.windowInsetsPadding(WindowInsets.safeDrawing)) { SignInScreen(state.busy, state.notice, vm::signIn) }
                        Screen.Pair -> Box(Modifier.windowInsetsPadding(WindowInsets.safeDrawing)) { PairScreen(state, vm::pair, { vm.signOut() }) }
                        Screen.Main -> Main(state)
                    }
                }
            }
        }
    }

    @Composable
    private fun Main(state: UiState) {
        LaunchedEffect(state.tab) { if (state.tab == Tab.Home || state.tab == Tab.Activity) vm.refresh() }
        Box(Modifier.fillMaxSize().statusBarsPadding()) {
            AnimatedContent(state.tab, transitionSpec = { fadeIn(tween(200)) togetherWith fadeOut(tween(120)) }, label = "tab") { tab ->
                when (tab) {
                    Tab.Home -> HomeScreen(
                        state,
                        onCharge = { vm.select(Tab.Sell) },
                        onFreeze = { vm.setFrozen(true) },
                        onUnfreeze = { confirmWithPhone("Unfreeze this terminal") { vm.setFrozen(false) } },
                        onActivity = { vm.select(Tab.Activity) },
                        onRefresh = vm::refresh,
                    )
                    Tab.Sell -> SellScreen(state, vm::key, vm::preset, vm::charge, vm::tap, vm::cancel, vm::newSale)
                    Tab.Activity -> ActivityScreen(state)
                    Tab.Settings -> SettingsScreen(state, { vm.signOut() }, { confirmWithPhone("Forget this terminal") { vm.forgetTerminal() } })
                }
            }
            if (state.offline) OfflineBanner(Modifier.align(Alignment.TopCenter))
            state.notice?.let { Notice(it, Modifier.align(Alignment.TopCenter)) { vm.dismissNotice() } }
            TabBar(state.tab, vm::select, Modifier.align(Alignment.BottomCenter))
        }
    }

    /** The phone's own fingerprint (or screen lock) confirms sensitive actions. It never takes payments (SPEC §11). */
    private fun confirmWithPhone(title: String, onOk: () -> Unit) {
        val allowed = BIOMETRIC_STRONG or DEVICE_CREDENTIAL
        if (BiometricManager.from(this).canAuthenticate(allowed) != BiometricManager.BIOMETRIC_SUCCESS) {
            // No screen lock set up on this phone (common on emulators): the server still requires an owner session.
            onOk(); return
        }
        BiometricPrompt(this, ContextCompat.getMainExecutor(this), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onOk()
        }).authenticate(
            BiometricPrompt.PromptInfo.Builder().setTitle(title).setSubtitle("Confirm it's you").setAllowedAuthenticators(allowed).build(),
        )
    }
}

@Composable
private fun TabBar(current: Tab, onSelect: (Tab) -> Unit, modifier: Modifier = Modifier) {
    val tabs = listOf(Tab.Home to Glyph.Home, Tab.Sell to Glyph.Sell, Tab.Activity to Glyph.List, Tab.Settings to Glyph.Settings)
    BoxWithConstraints(
        modifier.navigationBarsPadding().padding(horizontal = 24.dp, vertical = 12.dp).fillMaxWidth().height(64.dp)
            .shadow(18.dp, RoundedCornerShape(50), ambientColor = Fp.ink, spotColor = Fp.ink)
            .clip(RoundedCornerShape(50)).background(Fp.paper.copy(alpha = 0.94f)),
    ) {
        val slot = maxWidth / tabs.size
        val x by animateDpAsState(slot * tabs.indexOfFirst { it.first == current }, Motion.sheet(), label = "pill")
        Box(Modifier.offset(x = x).width(slot).height(64.dp).padding(6.dp).clip(RoundedCornerShape(50)).background(Fp.paper2))
        Row(Modifier.fillMaxSize()) {
            tabs.forEach { (tab, glyph) ->
                Column(
                    Modifier.weight(1f).fillMaxSize()
                        .clickable(remember { MutableInteractionSource() }, indication = null) { onSelect(tab) }
                        .semantics { contentDescription = tab.name; selected = tab == current },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
                ) {
                    Icon(glyph, tint = if (tab == current) Fp.ink else Fp.ink2, size = 20.dp)
                    Spacer(Modifier.height(2.dp))
                    Text(tab.name, style = Type.monoSmall, color = if (tab == current) Fp.ink else Fp.ink2)
                }
            }
        }
    }
}

@Composable
private fun OfflineBanner(modifier: Modifier) = Box(
    modifier.padding(12.dp).clip(RoundedCornerShape(50)).background(Fp.ink).padding(horizontal = 16.dp, vertical = 10.dp),
) { Text("Offline · take cash, nothing is queued", style = Type.label, color = Fp.nightText) }

@Composable
private fun Notice(text: String, modifier: Modifier, onDismiss: () -> Unit) = Box(
    modifier.padding(12.dp).fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Fp.ink).clickable(onClick = onDismiss).padding(16.dp),
) { Text(text, style = Type.body, color = Fp.nightText) }
