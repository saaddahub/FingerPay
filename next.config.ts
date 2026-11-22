import type { NextConfig } from "next";

// Headers that need no per-request nonce. The CSP (nonce-based) is set in src/proxy.ts (SPEC §4.6).
const staticSecurityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // No remote or user images: keep the image optimizer out of the attack surface.
  images: { unoptimized: true },
  turbopack: {
    // Self-host the theme font (see src/app/fonts.css); the generated theme module imports this path.
    resolveAlias: { "@astryxdesign/theme-neutral/fonts.css": "./src/app/fonts.css" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: staticSecurityHeaders },
      { source: "/downloads/:file*.apk", headers: [
        { key: "Content-Type", value: "application/vnd.android.package-archive" },
        { key: "Content-Disposition", value: "attachment" },
      ] },
    ];
  },
};

export default nextConfig;
