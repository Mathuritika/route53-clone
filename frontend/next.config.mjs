/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudscape ships ES modules + CSS that Next must compile
  transpilePackages: ["@cloudscape-design/components", "@cloudscape-design/component-toolkit"],
};
export default nextConfig;
