"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { X, Globe } from "lucide-react";
import { useStarknetWallet } from "@/context/starknet-wallet-provider";
import { useNetwork } from "@starknet-react/core";

interface NetworkSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NetworkSwitcherModal({
  isOpen,
  onClose,
}: NetworkSwitcherModalProps) {
  const { connectors, connectWallet } = useStarknetWallet();
  const { chain } = useNetwork();

  const handleOpenWallet = () => {
    const connector = connectors[0]; // Cartridge – re-open to change network
    if (connector) connectWallet(connector);
    onClose();
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex z-[99] items-center justify-center ">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-md rounded-[12px] bg-[#010F10] p-[32px] border-[#003B3E] border-[1px]"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="w-full flex items-center justify-between relative mb-8">
              <h2 className="w-full text-[24px] font-[600] text-[#F0F7F7] text-left font-orbitron flex items-center gap-3">
                <Globe className="w-6 h-6 text-[#00F0FF]" />
                Switch Network
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-center space-y-6">
              <p className="text-[#F0F7F7] text-lg">
                Current network: <span className="text-[#00F0FF]">{chain?.name ?? "Starknet"}</span>. To change network, open Cartridge and select a different one.
              </p>

              <button
                type="button"
                onClick={handleOpenWallet}
                className="w-full py-4 px-6 bg-[#0FF0FC]/80 hover:bg-[#0FF0FC] text-[#0D191B] font-bold text-lg rounded-[12px] transition-all"
              >
                Open Cartridge
              </button>
            </div>

            <div className="mt-8 text-center text-gray-400 text-sm">
              Cartridge lets you switch between Starknet Sepolia and Mainnet
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}