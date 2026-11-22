package pk.fingerpay.terminal.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.jsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import pk.fingerpay.terminal.BuildConfig
import java.io.IOException
import java.util.concurrent.TimeUnit

/** FingerPay API client. Staff calls carry the Supabase access token; terminal calls are also signed with the
 *  Keystore key (SPEC §4.5). Nothing sensitive is logged; there is no HTTP logging interceptor at all. */
class Api(private val store: SecureStore, private val keys: TerminalKeys) {
    val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
    private val http = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .callTimeout(12, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json".toMediaType()
    private val refreshLock = Mutex()
    private var session: Session? = null

    // ── Supabase Auth (GoTrue REST) ─────────────────────────────────────────────────────────────────
    suspend fun restore(): Boolean {
        session = store.get("session")?.let { runCatching { json.decodeFromString<Session>(it) }.getOrNull() }
        return session != null
    }

    suspend fun signIn(email: String, password: String) {
        val body = buildJsonObject { put("email", email.trim()); put("password", password) }.toString()
        saveSession(auth("password", body))
    }

    suspend fun signUp(email: String, password: String): Boolean {
        val body = buildJsonObject { put("email", email.trim()); put("password", password) }.toString()
        val (code, text) = send(Request.Builder().url("${BuildConfig.SUPABASE_URL}/auth/v1/signup")
            .header("apikey", BuildConfig.SUPABASE_ANON_KEY).post(body.toRequestBody(jsonType)).build())
        if (code !in 200..299) throw ApiException(code, "AUTH", "Could not create your account. Try signing in if you already registered.")
        if (!json.parseToJsonElement(text).jsonObject.containsKey("access_token")) return false
        val s = json.decodeFromString<Session>(text)
        saveSession(s.copy(expiresAtMs = System.currentTimeMillis() + s.expiresIn * 1000))
        return true
    }

    suspend fun account(): AccountResponse = call("GET", "/api/v1/account")
    suspend fun completeAccount(profile: AccountProfile): AccountResponse =
        call("POST", "/api/v1/account", json.encodeToString(AccountProfile.serializer(), profile))

    suspend fun signOut() {
        session?.let { s -> runCatching { send(Request.Builder().url("${BuildConfig.SUPABASE_URL}/auth/v1/logout").post(ByteArray(0).toRequestBody()).header("apikey", BuildConfig.SUPABASE_ANON_KEY).header("Authorization", "Bearer ${s.accessToken}").build()) } }
        session = null
        store.put("session", null)
    }

    private suspend fun auth(grant: String, body: String): Session {
        val req = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=$grant")
            .header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .post(body.toRequestBody(jsonType))
            .build()
        val (code, text) = send(req)
        if (code !in 200..299) throw ApiException(code, "AUTH", if (code == 400) "Email or password is wrong." else "Sign-in failed.")
        val s = json.decodeFromString<Session>(text)
        return s.copy(expiresAtMs = System.currentTimeMillis() + s.expiresIn * 1000)
    }

    private suspend fun saveSession(s: Session) {
        session = s
        store.put("session", json.encodeToString(Session.serializer(), s))
    }

    private suspend fun accessToken(): String = refreshLock.withLock {
        val s = session ?: throw ApiException(401, "FP401", "Signed out")
        if (System.currentTimeMillis() < s.expiresAtMs - 60_000) return s.accessToken
        val fresh = auth("refresh_token", buildJsonObject { put("refresh_token", s.refreshToken) }.toString())
        saveSession(fresh)
        fresh.accessToken
    }

    // ── FingerPay API ───────────────────────────────────────────────────────────────────────────────
    suspend fun me(): Me = call("GET", "/api/v1/me")
    suspend fun pair(label: String): Paired {
        val spki = keys.create()
        val body = buildJsonObject { put("label", label); put("publicKey", spki) }.toString()
        return call("POST", "/api/v1/terminals/pair", body)
    }
    suspend fun terminalSelf(id: String): TerminalSelf = call("GET", "/api/v1/terminals/self", terminalId = id)
    suspend fun setFrozen(id: String, frozen: Boolean): FreezeResult =
        call("POST", "/api/v1/terminals/$id/freeze", buildJsonObject { put("frozen", frozen) }.toString())
    suspend fun openCharge(id: String, amount: String): Charge =
        call("POST", "/api/v1/pos/charges", buildJsonObject { put("amount", amount) }.toString(), terminalId = id)
    suspend fun demoThumb(id: String, chargeId: String, customerId: String?): ThumbResult {
        val body = JsonObject(mapOf("source" to JsonPrimitive("demo"), "customerId" to JsonPrimitive(customerId))).toString()
        return call("POST", "/api/v1/pos/charges/$chargeId/thumb", body, terminalId = id)
    }
    suspend fun cancelCharge(id: String, chargeId: String): Unit =
        call<JsonObject>("POST", "/api/v1/pos/charges/$chargeId/cancel", "{}", terminalId = id).let { }
    suspend fun recordOffline(id: String, amount: String, occurredAt: String): Unit =
        call<JsonObject>("POST", "/api/v1/pos/offline-events", buildJsonObject { put("amount", amount); put("occurredAt", occurredAt) }.toString(), terminalId = id).let { }
    suspend fun ledger(): Ledger = call("GET", "/api/v1/merchant/ledger")
    suspend fun summary(): Summary = call("GET", "/api/v1/merchant/summary")
    suspend fun fingerTray(): FingerTray = call("GET", "/api/v1/demo/finger-tray")

    private suspend inline fun <reified T> call(method: String, path: String, body: String? = null, terminalId: String? = null): T {
        val b = Request.Builder().url(BuildConfig.API_BASE_URL + path)
            .header("Authorization", "Bearer ${accessToken()}")
            .header("Accept", "application/json")
        val text = body ?: ""
        if (terminalId != null) {
            val ts = Signing.timestamp()
            val nonce = Signing.nonce()
            val sig = keys.sign(Signing.signedString(method, path, terminalId, ts, nonce, text))
            b.header("X-FP-Terminal", terminalId).header("X-FP-Timestamp", ts).header("X-FP-Nonce", nonce).header("X-FP-Signature", sig)
        }
        b.method(method, if (method == "GET") null else text.toRequestBody(jsonType))
        val (code, resp) = send(b.build())
        if (code !in 200..299) {
            val err = runCatching { json.decodeFromString<ApiErrorBody>(resp).error }.getOrNull()
            throw ApiException(code, err?.code ?: "HTTP_$code", err?.message ?: "Something went wrong.")
        }
        return json.decodeFromString(resp)
    }

    private suspend fun send(req: Request): Pair<Int, String> = withContext(Dispatchers.IO) {
        try {
            http.newCall(req).execute().use { it.code to (it.body?.string() ?: "") }
        } catch (e: IOException) {
            throw OfflineException(e)
        }
    }
}
