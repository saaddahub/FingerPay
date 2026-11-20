package pk.fingerpay.terminal.data

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.time.Instant

// Must match src/lib/fp/signing.test.ts on the server: a mismatch is a 401 at the counter.
class SigningTest {
    @Test fun layoutMatchesServer() {
        val s = Signing.signedString("post", "/api/v1/pos/charges?x=1", "0f8c6c2e-7b1d-4c39-9d7e-0a1b2c3d4e5f", "2026-11-20T10:00:00.000Z", "AAAAAAAAAAAAAAAAAAAAAA", "{\"amount\":\"180.00\"}")
        val lines = s.split("\n")
        assertEquals(7, lines.size)
        assertEquals("POST", lines[1])
        assertTrue(lines[6].matches(Regex("^[A-Za-z0-9_-]{43}$")))
    }

    @Test fun emptyBodyHashMatchesServer() {
        assertTrue(Signing.signedString("GET", "/p", "t", "ts", "n", "").endsWith("47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"))
    }

    @Test fun timestampAlwaysHasMilliseconds() {
        assertEquals("2026-11-20T10:00:00.000Z", Signing.timestamp(Instant.parse("2026-11-20T10:00:00Z")))
    }

    @Test fun nonceIs16Bytes() {
        assertEquals(22, Signing.nonce().length)
    }

    @Test fun derSignatureBecomes64ByteP1363ThatVerifies() {
        val kp = KeyPairGenerator.getInstance("EC").apply { initialize(ECGenParameterSpec("secp256r1")) }.generateKeyPair()
        repeat(50) {
            val msg = "message $it".toByteArray()
            val der = Signature.getInstance("SHA256withECDSA").apply { initSign(kp.private); update(msg) }.sign()
            val p1363 = Signing.derToP1363(der)
            assertEquals(64, p1363.size)
            val verifier = Signature.getInstance("SHA256withECDSAinP1363Format").apply { initVerify(kp.public); update(msg) }
            assertTrue(verifier.verify(p1363))
        }
    }

    @Test fun shortIntegersArePadded() {
        // r = 0x01, s = 0x00 0x80 (leading zero for sign): both become 32-byte big-endian
        val der = byteArrayOf(0x30, 0x07, 0x02, 0x01, 0x01, 0x02, 0x02, 0x00, 0x80.toByte())
        val out = Signing.derToP1363(der)
        assertArrayEquals(ByteArray(31) + byteArrayOf(1), out.copyOfRange(0, 32))
        assertArrayEquals(ByteArray(31) + byteArrayOf(0x80.toByte()), out.copyOfRange(32, 64))
    }
}
