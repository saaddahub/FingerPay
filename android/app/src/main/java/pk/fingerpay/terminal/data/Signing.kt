package pk.fingerpay.terminal.data

import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Base64

/** Terminal request signing, byte-for-byte the server's format (SPEC §4.5, src/lib/fp/signing.ts). */
object Signing {
    private val b64url = Base64.getUrlEncoder().withoutPadding()
    private val stamp = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)
    private val random = SecureRandom()

    fun timestamp(now: Instant = Instant.now()): String = stamp.format(now)

    fun nonce(): String = ByteArray(16).also(random::nextBytes).let(b64url::encodeToString)

    fun signedString(method: String, pathWithQuery: String, terminalId: String, timestamp: String, nonce: String, body: String): String {
        val bodyHash = b64url.encodeToString(MessageDigest.getInstance("SHA-256").digest(body.toByteArray(Charsets.UTF_8)))
        return "FPv1\n${method.uppercase()}\n$pathWithQuery\n$terminalId\n$timestamp\n$nonce\n$bodyHash"
    }

    fun encode(bytes: ByteArray): String = b64url.encodeToString(bytes)

    /** Android's SHA256withECDSA returns ASN.1 DER; the server wants IEEE-P1363 r‖s, 32 bytes each. */
    fun derToP1363(der: ByteArray): ByteArray {
        require(der.size >= 8 && der[0] == 0x30.toByte()) { "not a DER sequence" }
        var i = 2
        if (der[1].toInt() and 0x80 != 0) i = 2 + (der[1].toInt() and 0x7f)
        fun readInt(): ByteArray {
            require(der[i] == 0x02.toByte()) { "expected INTEGER" }
            val len = der[i + 1].toInt() and 0xff
            val v = der.copyOfRange(i + 2, i + 2 + len)
            i += 2 + len
            return v
        }
        val r = readInt()
        val s = readInt()
        fun to32(v: ByteArray): ByteArray {
            val trimmed = v.dropWhile { it == 0.toByte() }.toByteArray()
            require(trimmed.size <= 32) { "integer too long" }
            return ByteArray(32 - trimmed.size) + trimmed
        }
        return to32(r) + to32(s)
    }
}
