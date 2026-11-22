package pk.fingerpay.terminal.ui.screens

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class SignupTest {
    @Test fun acceptsRealPastBirthDatesOnly() {
        val today = LocalDate.of(2026, 11, 21)
        assertTrue(validSignupBirthDate("2000-02-29", today))
        assertFalse(validSignupBirthDate("2001-02-29", today))
        assertFalse(validSignupBirthDate("2026-11-21", today))
        assertFalse(validSignupBirthDate("1899-12-31", today))
    }

    @Test fun requiresAllPasswordRulesBeforeSubmit() {
        assertTrue(validSignupPassword("FingerPay-123"))
        assertFalse(validSignupPassword("FingerPay1234"))
        assertFalse(validSignupPassword("Aa1!"))
    }
}
