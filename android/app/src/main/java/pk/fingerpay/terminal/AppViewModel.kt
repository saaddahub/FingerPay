package pk.fingerpay.terminal

import android.app.Application
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import pk.fingerpay.terminal.data.Api
import pk.fingerpay.terminal.data.AccountProfile
import pk.fingerpay.terminal.data.AccountResponse
import pk.fingerpay.terminal.data.ApiException
import pk.fingerpay.terminal.data.Charge
import pk.fingerpay.terminal.data.Me
import pk.fingerpay.terminal.data.OfflineException
import pk.fingerpay.terminal.data.Sale
import pk.fingerpay.terminal.data.SecureStore
import pk.fingerpay.terminal.data.Shopper
import pk.fingerpay.terminal.data.Signing
import pk.fingerpay.terminal.data.Summary
import pk.fingerpay.terminal.data.TerminalKeys
import pk.fingerpay.terminal.data.TerminalSelf
import pk.fingerpay.terminal.data.ThumbResult
import java.time.Instant

enum class Screen { Loading, SignIn, Profile, Wallet, Pair, Main }
enum class Tab { Home, Sell, Activity, Settings }

sealed interface Sell {
    data class Idle(val entry: String = "") : Sell
    data class Opening(val amount: String) : Sell
    data class Waiting(val charge: Charge, val startedAt: Long) : Sell
    data class Paying(val charge: Charge, val shopper: String?) : Sell
    data class Done(val result: ThumbResult) : Sell
    data class TakeCash(val amount: String) : Sell
    data class Failed(val message: String) : Sell
}

data class UiState(
    val screen: Screen = Screen.Loading,
    val tab: Tab = Tab.Home,
    val me: Me? = null,
    val account: AccountResponse? = null,
    val terminal: TerminalSelf? = null,
    val summary: Summary? = null,
    val ledger: List<Sale> = emptyList(),
    val tray: List<Shopper> = emptyList(),
    val sell: Sell = Sell.Idle(),
    val busy: Boolean = false,
    val freezing: Boolean = false,
    val offline: Boolean = false,
    val notice: String? = null,
    val verificationEmail: String? = null,
)

/** Outcome codes → banner copy (SPEC View A). The UI maps codes, so Urdu can be added later. */
fun bannerFor(outcome: String, amount: String?): String = when (outcome) {
    "SUCCESS" -> "Payment successful — PKR ${amount ?: ""} received"
    "DECLINED_LOW_BALANCE" -> "Declined: insufficient balance. PKR 0 fee charged."
    "DECLINED_UNREGISTERED_THUMB" -> "Thumb not recognised. Enrol at an Allied Bank branch."
    "DECLINED_DUPLICATE_TAP" -> "Duplicate tap blocked. This sale was already paid."
    "DECLINED_LIMIT" -> "Declined: above the thumb-pay limit. PKR 0 fee charged."
    "DECLINED_THUMB_LOCKED" -> "Declined: thumb payments are locked by the owner."
    "DECLINED_ACCOUNT_INACTIVE" -> "Declined: account not active."
    "DECLINED_TERMINAL_THROTTLED" -> "Too many unknown thumbs. Terminal paused for 10 minutes."
    "CHARGE_LOCKED", "CHARGE_EXPIRED", "CHARGE_CANCELLED" -> "Start a new sale."
    else -> "Declined. PKR 0 fee charged."
}

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val store = SecureStore(app)
    private val keys = TerminalKeys(app)
    private val api = Api(store, keys)
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state
    private var terminalId: String? = null
    private var expiryJob: Job? = null
    private var pendingPassword: String = ""

    init { viewModelScope.launch { boot() } }

    private suspend fun boot() {
        if (!api.restore()) return _state.update { it.copy(screen = Screen.SignIn) }
        try {
            openAccount()
        } catch (e: OfflineException) {
            terminalId = store.get("terminalId")
            _state.update { it.copy(screen = if (terminalId == null || BuildConfig.ACCOUNT_TYPE == "customer") Screen.SignIn else Screen.Main, offline = true, notice = "Offline. Connect and sign in to load your account.") }
        } catch (e: ApiException) {
            api.signOut()
            _state.update { it.copy(screen = Screen.SignIn) }
        }
    }

    private fun launchSafely(block: suspend () -> Unit) = viewModelScope.launch {
        try {
            block()
            _state.update { it.copy(offline = false) }
        } catch (e: OfflineException) {
            _state.update { it.copy(offline = true, busy = false, freezing = false, notice = "Could not connect. Check your connection and try again.") }
        } catch (e: ApiException) {
            if (e.status == 401 && e.code == "AUTH") _state.update { it.copy(notice = e.message, busy = false) }
            else if (e.status == 401) signOut()
            else _state.update { it.copy(notice = friendly(e), busy = false, freezing = false) }
        }
    }

    private fun friendly(e: ApiException) = when {
        e.message?.contains("frozen") == true -> "This terminal is frozen. Unfreeze it to sell."
        e.status == 403 -> "Your role can't do that."
        e.status == 429 -> "Too many requests. Wait a moment."
        else -> e.message ?: "Something went wrong."
    }

    fun dismissNotice() = _state.update { it.copy(notice = null, verificationEmail = null) }
    fun select(tab: Tab) = _state.update { it.copy(tab = tab) }

    fun signIn(email: String, password: String) = launchSafely {
        _state.update { it.copy(busy = true, notice = null) }
        pendingPassword = password
        if (api.signIn(email, password)) {
            pendingPassword = ""
            openAccount()
        } else {
            _state.update { it.copy(busy = false, verificationEmail = email, notice = null) }
        }
    }

    fun signUp(email: String, password: String) = launchSafely {
        _state.update { it.copy(busy = true, notice = null) }
        pendingPassword = password
        if (api.signUp(email, password)) {
            pendingPassword = ""
            openAccount()
        } else {
            _state.update { it.copy(busy = false, verificationEmail = email, notice = null) }
        }
    }

    fun verifyCode(code: String) = launchSafely {
        val email = _state.value.verificationEmail ?: return@launchSafely
        _state.update { it.copy(busy = true, notice = null) }
        api.verifyEmailCode(email, pendingPassword, code)
        pendingPassword = ""
        _state.update { it.copy(verificationEmail = null) }
        openAccount()
    }

    fun resendCode() = launchSafely {
        val email = _state.value.verificationEmail ?: return@launchSafely
        _state.update { it.copy(busy = true, notice = null) }
        api.resendEmailCode(email, pendingPassword)
        _state.update { it.copy(busy = false, notice = "Sent a fresh 6-digit verification code to $email.") }
    }

    private suspend fun openAccount() {
        if (BuildConfig.ACCOUNT_TYPE == "merchant") {
            val me = try { api.me() } catch (e: ApiException) {
                if (e.status == 401 && e.code == "FP401") null else throw e
            }
            if (me != null) {
                if (!me.canSell) throw ApiException(403, "FP403", "This app is for merchants.")
                terminalId = store.get("terminalId")?.takeIf { keys.hasKey() }
                _state.update { it.copy(busy = false, me = me, screen = if (terminalId == null) Screen.Pair else Screen.Main) }
                if (terminalId != null) refresh()
                return
            }
        }
        val account = api.account()
        _state.update { it.copy(busy = false, account = account, screen = if (account.wallet == null) Screen.Profile else Screen.Wallet) }
    }

    fun completeAccount(profile: AccountProfile) = launchSafely {
        _state.update { it.copy(busy = true, notice = null) }
        val account = api.completeAccount(profile)
        _state.update { it.copy(busy = false, account = account, screen = Screen.Wallet) }
    }

    fun refreshAccount() = launchSafely {
        _state.update { it.copy(busy = true, notice = null) }
        val account = api.account()
        _state.update { it.copy(busy = false, account = account) }
    }

    fun pair(label: String) = launchSafely {
        _state.update { it.copy(busy = true, notice = null) }
        val paired = api.pair(label.ifBlank { "${Build.MANUFACTURER} ${Build.MODEL}".take(60) })
        terminalId = paired.terminalId
        store.put("terminalId", paired.terminalId)
        _state.update { it.copy(busy = false, screen = Screen.Main) }
        refresh()
    }

    fun refresh() = launchSafely {
        val id = terminalId ?: return@launchSafely
        flushOffline(id)
        val self = api.terminalSelf(id)
        val summary = api.summary()
        val ledger = api.ledger().sales
        val tray = runCatching { api.fingerTray().shoppers }.getOrDefault(emptyList())
        _state.update { it.copy(terminal = self, summary = summary, ledger = ledger, tray = tray) }
    }

    /** Freeze needs no extra check; unfreeze is called only after the phone's own biometric prompt succeeds. */
    fun setFrozen(frozen: Boolean) = launchSafely {
        val id = terminalId ?: return@launchSafely
        _state.update { it.copy(freezing = true) }
        val r = api.setFrozen(id, frozen)
        _state.update { s -> s.copy(freezing = false, terminal = s.terminal?.copy(frozen = r.frozen), sell = if (r.frozen) Sell.Idle() else s.sell) }
    }

    // ── Sell ─────────────────────────────────────────────────────────────────────────────────────────
    fun key(k: String) = _state.update { s ->
        val idle = s.sell as? Sell.Idle ?: return@update s
        val next = when (k) {
            "⌫" -> idle.entry.dropLast(1)
            "." -> if (idle.entry.contains('.') || idle.entry.isEmpty()) idle.entry else idle.entry + "."
            else -> {
                val candidate = (idle.entry + k).trimStart('0').ifEmpty { "0" }
                val decimals = candidate.substringAfter('.', "").length
                if (candidate.substringBefore('.').length > 6 || decimals > 2) idle.entry else if (idle.entry == "0") k else idle.entry + k
            }
        }
        s.copy(sell = Sell.Idle(next))
    }

    fun preset(amount: Int) = _state.update { it.copy(sell = Sell.Idle(amount.toString())) }

    fun charge() {
        val idle = _state.value.sell as? Sell.Idle ?: return
        val amount = normalise(idle.entry) ?: return
        val id = terminalId ?: return
        _state.update { it.copy(sell = Sell.Opening(amount)) }
        viewModelScope.launch {
            try {
                val charge = api.openCharge(id, amount)
                _state.update { it.copy(sell = Sell.Waiting(charge, System.currentTimeMillis()), offline = false) }
                expiryJob?.cancel()
                expiryJob = launch {
                    delay(120_000)
                    _state.update { s -> if (s.sell is Sell.Waiting) s.copy(sell = Sell.Done(ThumbResult("CHARGE_EXPIRED"))) else s }
                }
            } catch (e: OfflineException) {
                // SPEC View A: never queue a sale. Tell the cashier to take cash; record it for the ledger later.
                queueOffline(amount)
                _state.update { it.copy(sell = Sell.TakeCash(amount), offline = true) }
            } catch (e: ApiException) {
                _state.update { it.copy(sell = Sell.Failed(friendly(e))) }
            }
        }
    }

    fun tap(shopper: Shopper?) {
        val waiting = _state.value.sell as? Sell.Waiting ?: return
        val id = terminalId ?: return
        expiryJob?.cancel()
        _state.update { it.copy(sell = Sell.Paying(waiting.charge, shopper?.name)) }
        viewModelScope.launch {
            try {
                val r = api.demoThumb(id, waiting.charge.chargeId, shopper?.customerId)
                _state.update { it.copy(sell = Sell.Done(r)) }
                refresh()
            } catch (e: OfflineException) {
                // A timeout can double-charge if retried blindly (DESIGN.md backend issue): never assume, never retry here.
                _state.update { it.copy(sell = Sell.Failed("No reply from the server. Don't take cash yet: check Activity before charging again."), offline = true) }
            } catch (e: ApiException) {
                _state.update { it.copy(sell = Sell.Failed(friendly(e))) }
            }
        }
    }

    fun cancel() {
        val waiting = _state.value.sell as? Sell.Waiting
        expiryJob?.cancel()
        _state.update { it.copy(sell = Sell.Idle()) }
        val id = terminalId ?: return
        if (waiting != null) launchSafely { api.cancelCharge(id, waiting.charge.chargeId) }
    }

    fun newSale() {
        expiryJob?.cancel()
        _state.update { it.copy(sell = Sell.Idle()) }
    }

    fun signOut() = viewModelScope.launch {
        api.signOut()
        _state.value = UiState(screen = Screen.SignIn)
    }

    /** Owner: forget this terminal on this phone (the server keeps the record; revoke it from the owner's list). */
    fun forgetTerminal() = viewModelScope.launch {
        keys.delete()
        store.put("terminalId", null)
        terminalId = null
        _state.update { it.copy(screen = Screen.Pair, terminal = null) }
    }

    // "Take cash" sales are recorded for the ledger once the network is back. They are never charged.
    private suspend fun queueOffline(amount: String) {
        val queue = store.get("offlineQueue")?.split(";")?.filter { it.isNotBlank() }.orEmpty()
        store.put("offlineQueue", (queue + "$amount|${Signing.timestamp()}").takeLast(50).joinToString(";"))
    }

    private suspend fun flushOffline(id: String) {
        val queue = store.get("offlineQueue")?.split(";")?.filter { it.isNotBlank() }.orEmpty()
        val left = queue.toMutableList()
        for (item in queue) {
            val (amount, at) = item.split("|").let { it[0] to it[1] }
            try {
                api.recordOffline(id, amount, at)
                left.remove(item)
            } catch (e: ApiException) {
                if (e.status in 400..499) left.remove(item) // too old or invalid: the server won't take it, drop it
            }
        }
        store.put("offlineQueue", left.joinToString(";").ifEmpty { null })
    }

    private fun normalise(entry: String): String? {
        val v = entry.trimEnd('.')
        if (v.isEmpty() || v.all { it == '0' || it == '.' }) return null
        return v
    }

    companion object {
        fun nowIso(): String = Signing.timestamp(Instant.now())
    }
}
