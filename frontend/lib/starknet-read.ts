import { Contract, RpcProvider } from "starknet";

const DEFAULT_RPC = "https://starknet-sepolia-rpc.publicnode.com";

/**
 * Simple utility to read from any Starknet contract via RPC.
 * Works with Dojo contracts and standard Cairo contracts.
 */
export async function readContract<T = unknown>(
  contractAddress: string,
  abi: object[],
  method: string,
  args: unknown[] = [],
  rpcUrl =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_STARKNET_READ_RPC_URL) ||
    DEFAULT_RPC
): Promise<T> {
  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const contract = new Contract(abi, contractAddress, provider);
  const result = await contract.call(method, args, {
    blockIdentifier: "latest",
  });
  return result as T;
}
