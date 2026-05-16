import { ethers } from "ethers";

async function main() {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
        console.log("No private key found");
        return;
    }
    const wallet = new ethers.Wallet(pk);
    console.log("Wallet address:", wallet.address);
}
main();
