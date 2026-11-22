import { test } from "node:test";
import assert from "node:assert/strict";
import { signupProfileSchema, credentialsSchema } from "./signup.ts";

const customer = { accountType: "customer", fullName: "Ayesha Khan", phone: "03001234567", dateOfBirth: "2000-02-29", address: "12 Test Street", city: "Lahore", postalCode: "54000", occupation: "Student", consent: true };
const merchant = { ...customer, accountType: "merchant", businessName: "Test Store", businessType: "Grocery", businessAddress: "25 Test Road", businessCity: "Lahore", registrationNumber: "" };

test("customer and merchant profiles require their own complete details", () => {
  assert.equal(signupProfileSchema.safeParse(customer).success, true);
  assert.equal(signupProfileSchema.safeParse(merchant).success, true);
  for (const change of [{ consent: false }, { dateOfBirth: "2001-02-29" }, { dateOfBirth: "2999-01-01" }, { phone: "123" }, { postalCode: "12" }, { fullName: " " }, { accountType: "BANK_ADMIN" }, { bonus: 99999 }]) {
    assert.equal(signupProfileSchema.safeParse({ ...customer, ...change }).success, false);
  }
  assert.equal(signupProfileSchema.safeParse({ ...customer, accountType: "merchant" }).success, false);
  assert.equal(signupProfileSchema.safeParse({ ...merchant, accountType: "customer" }).success, false);
});

test("signup requires a strong-length password while existing logins keep working", () => {
  assert.equal(credentialsSchema.safeParse({ action: "signup", email: "a@example.com", password: "short" }).success, false);
  assert.equal(credentialsSchema.safeParse({ action: "signup", email: "a@example.com", password: "a-long-password" }).success, false);
  assert.equal(credentialsSchema.safeParse({ action: "signup", email: "a@example.com", password: "A-long-password1!" }).success, true);
  assert.equal(credentialsSchema.safeParse({ action: "login", email: "a@example.com", password: "oldpass" }).success, true);
});
