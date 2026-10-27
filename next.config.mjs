/** @type {import('next').NextConfig} */
const nextConfig = {
  // libsql ships a native binary; keep it out of the webpack bundle
  serverExternalPackages: ["@libsql/client", "libsql"],
};
export default nextConfig;