package pk.fingerpay.terminal.data

import android.content.Context
import android.content.pm.PackageManager
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.security.keystore.StrongBoxUnavailableException
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64

/** The terminal's ECDSA P-256 key, generated inside the Android Keystore (StrongBox when present) and never
 *  exportable. Only the public key (SPKI) leaves the phone, once, at pairing (SPEC §4.5, §11). */
class TerminalKeys(private val context: Context) {
    private val alias = "fp-terminal-key"
    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    fun hasKey(): Boolean = keyStore.containsAlias(alias)

    /** Creates a fresh key (replacing any old one) and returns its SPKI DER as base64. */
    fun create(): String {
        if (hasKey()) keyStore.deleteEntry(alias)
        val strongBox = context.packageManager.hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE)
        val pair = try {
            generate(strongBox)
        } catch (e: StrongBoxUnavailableException) {
            generate(false)
        }
        return Base64.getEncoder().encodeToString(pair.public.encoded)
    }

    private fun generate(strongBox: Boolean) = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore").run {
        initialize(
            KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN)
                .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setIsStrongBoxBacked(strongBox)
                .build(),
        )
        generateKeyPair()
    }

    fun sign(message: String): String {
        val key = keyStore.getKey(alias, null) as PrivateKey
        val der = Signature.getInstance("SHA256withECDSA").run {
            initSign(key)
            update(message.toByteArray(Charsets.UTF_8))
            sign()
        }
        return Signing.encode(Signing.derToP1363(der))
    }

    fun delete() {
        if (hasKey()) keyStore.deleteEntry(alias)
    }
}
