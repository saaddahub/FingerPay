import { z } from "zod";

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const dateOfBirth = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const date = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v && v >= "1900-01-01" && date < new Date();
}, "Enter a valid date of birth in the past.");

const personal = {
  fullName: text(2, 120),
  phone: z.string().trim().regex(/^(?:\+92|0)3\d{9}$/, "Enter a Pakistani mobile number, e.g. 03001234567."),
  dateOfBirth,
  address: text(5, 240),
  city: text(2, 80),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Enter a five-digit postal code."),
  occupation: text(2, 80),
  consent: z.literal(true),
};

export const signupProfileSchema = z.discriminatedUnion("accountType", [
  z.strictObject({ accountType: z.literal("customer"), ...personal }),
  z.strictObject({
    accountType: z.literal("merchant"), ...personal,
    businessName: text(2, 120),
    businessType: text(2, 80),
    businessAddress: text(5, 240),
    businessCity: text(2, 80),
    registrationNumber: text(0, 60),
  }),
]);

export type SignupProfile = z.infer<typeof signupProfileSchema>;
export type DemoWallet = {
  profile: SignupProfile;
  balance: string;
  currency: "PKR";
  demo: true;
  activity: { label: string; amount: string; createdAt: string }[];
};

export const credentialsSchema = z.strictObject({
  action: z.enum(["signup", "login", "verify", "resend"]),
  email: z.email().max(254),
  password: z.string().min(1).max(128),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code from your email.").optional(),
}).superRefine((v, ctx) => {
  if ((v.action === "signup" || v.action === "resend" || v.action === "verify") && (v.password.length < 12 || !/[a-z]/.test(v.password) || !/[A-Z]/.test(v.password) || !/\d/.test(v.password) || !/[^A-Za-z0-9]/.test(v.password))) {
    ctx.addIssue({ code: "custom", path: ["password"], message: "Use at least 12 characters, including uppercase, lowercase, a number and a symbol." });
  }
  if (v.action === "verify" && !v.code) {
    ctx.addIssue({ code: "custom", path: ["code"], message: "Enter the 6-digit verification code from your email." });
  }
});
