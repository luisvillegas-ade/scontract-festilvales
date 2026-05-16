import ethersPlugin from "@nomicfoundation/hardhat-ethers";
import { defineConfig } from "hardhat/config";
import fs from "fs";
import path from "path";

// Carga robusta de .env
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      envContent.split("\n").forEach(line => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
          process.env[key.trim()] = value;
        }
      });
    }
  } catch (e) {}
}

loadEnv();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const FUJI_RPC_URL = process.env.FUJI_RPC_URL;

export default defineConfig({
  plugins: [ethersPlugin],
  solidity: "0.8.20",
  networks: {
    fuji: {
      type: "http",
      url: FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: PRIVATE_KEY ? [(PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : "0x" + PRIVATE_KEY)] : [],
      chainId: 43113,
    },
  },
});
