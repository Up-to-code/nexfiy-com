/** @type {import('next').NextConfig} */
if (process.env.VERCEL_ENV === "production") {
  const requiredUrls = {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SITE_URL: process.env.SITE_URL,
    NEXFIY_INTERNAL_SITE_URL: process.env.NEXFIY_INTERNAL_SITE_URL,
  };
  const missing = Object.entries(requiredUrls)
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);
  if (missing.length) {
    throw new Error(
      `Production configuration is missing: ${missing.join(", ")}`,
    );
  }
  for (const [name, value] of Object.entries(requiredUrls)) {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error(`${name} must use HTTPS in production`);
    }
  }
  if (!requiredUrls.NEXT_PUBLIC_CONVEX_URL.endsWith(".convex.cloud")) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL must target a Convex deployment");
  }
  if (!requiredUrls.NEXT_PUBLIC_CONVEX_SITE_URL.endsWith(".convex.site")) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_SITE_URL must target a Convex HTTP deployment",
    );
  }
}

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.edgestore.dev",
      },
      {
        protocol: "https",
        hostname: "**.ufs.sh",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**",
      },
    ],
  },
};

export default nextConfig;
