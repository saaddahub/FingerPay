package pk.fingerpay.terminal.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import org.junit.Assert.*
import org.junit.Test
import pk.fingerpay.terminal.BuildConfig

class AccountTest {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    @Test fun customerPayloadOmitsMerchantDetails() {
        val profile = AccountProfile("customer", "Test User", "03001234567", "2000-01-31", "12 Test Street", "Lahore", "54000", "Student", true)
        val body = json.parseToJsonElement(json.encodeToString(AccountProfile.serializer(), profile)).jsonObject
        assertFalse(body.containsKey("businessName"))
        assertFalse(body.containsKey("registrationNumber"))
        assertFalse(body.containsKey("balance"))
        assertTrue(body.containsKey("consent"))
    }

    @Test fun appsHaveDistinctIdentities() {
        assertTrue(BuildConfig.ACCOUNT_TYPE in listOf("customer", "merchant"))
        assertTrue(BuildConfig.APPLICATION_ID.startsWith(if (BuildConfig.ACCOUNT_TYPE == "customer") "pk.fingerpay.customer" else "pk.fingerpay.terminal"))
    }
}
