"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-vote-ink/35 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 40, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-soft"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-vote-ink">{title}</h2>
              <Button size="icon" variant="soft" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
