package pk.fingerpay.terminal.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Money arrives as exact decimal strings and is only displayed, never computed (CLAUDE.md).

@Serializable data class Session(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("expires_in") val expiresIn: Long = 3600,
    val expiresAtMs: Long = 0,
)

@Serializable data class SessionResponse(
    val signedIn: Boolean = false,
    val requiresCode: Boolean = false,
    val session: Session? = null,
)

@Serializable data class Me(val role: String, val displayName: String, val storeName: String? = null) {
    val isOwner get() = role == "MERCHANT_OWNER"
    val canSell get() = role == "MERCHANT_OWNER" || role == "MERCHANT_CASHIER"
}

@Serializable data class AccountProfile(
    val accountType: String,
    val fullName: String,
    val phone: String,
    val dateOfBirth: String,
    val address: String,
    val city: String,
    val postalCode: String,
    val occupation: String,
    val consent: Boolean,
    val businessName: String? = null,
    val businessType: String? = null,
    val businessAddress: String? = null,
    val businessCity: String? = null,
    val registrationNumber: String? = null,
)
@Serializable data class WalletActivity(val label: String, val amount: String, val createdAt: String)
@Serializable data class DemoWallet(val profile: AccountProfile, val balance: String, val currency: String, val demo: Boolean, val activity: List<WalletActivity>)
@Serializable data class AccountResponse(val email: String, val wallet: DemoWallet? = null)

@Serializable data class Paired(val terminalId: String, val storeName: String? = null)

@Serializable data class TerminalSelf(val terminalId: String, val label: String, val storeName: String, val frozen: Boolean)

@Serializable data class FreezeResult(val terminalId: String, val frozen: Boolean)

@Serializable data class Charge(val chargeId: String, val amount: String, val expiresAt: String)

@Serializable data class ThumbResult(
    val outcome: String,
    val amount: String? = null,
    @SerialName("mdr_fee") val fee: String? = null,
    @SerialName("net_to_merchant") val net: String? = null,
    val cashback: String? = null,
    @SerialName("raast_ref") val raastRef: String? = null,
    @SerialName("processing_ms") val processingMs: Long? = null,
    @SerialName("customer_display_name") val shopper: String? = null,
)

@Serializable data class Shopper(val customerId: String, val name: String, val accountType: String)
@Serializable data class FingerTray(val shoppers: List<Shopper>)

@Serializable data class Sale(
    val attemptId: String,
    val occurredAt: String,
    val shopper: String? = null,
    val gross: String,
    val fee: String? = null,
    val net: String? = null,
    val status: String,
    val outcome: String,
    val terminal: String? = null,
)
@Serializable data class Ledger(val sales: List<Sale>)

@Serializable data class Summary(
    val day: String,
    @SerialName("gross_sales") val gross: String,
    @SerialName("mdr_fees") val fees: String,
    @SerialName("fees_saved_vs_card_pos") val saved: String,
    @SerialName("net_settled_today") val net: String,
    @SerialName("transactions_today") val count: Int,
    @SerialName("declines_today") val declines: Int,
    @SerialName("allied_bank_balance") val bankBalance: String? = null,
    @SerialName("screenshots_avoided") val screenshotsAvoided: Int = 0,
    @SerialName("month_tx_count") val monthCount: Int = 0,
    @SerialName("store_name") val storeName: String? = null,
)

@Serializable data class ApiErrorBody(val error: ApiErrorDetail)
@Serializable data class ApiErrorDetail(val code: String, val message: String)

class ApiException(val status: Int, val code: String, message: String) : Exception(message)
class OfflineException(cause: Throwable) : Exception("offline", cause)
