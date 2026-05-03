/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // pdf-parse reads the filesystem at import time; keep it server-external
  // so Next.js doesn't try to bundle it through webpack.
  serverExternalPackages: ["pdf-parse"],
}

export default nextConfig
