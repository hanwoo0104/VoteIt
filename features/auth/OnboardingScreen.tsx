"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/common/Logo";

export function OnboardingScreen() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-white px-9 pb-[calc(42px+env(safe-area-inset-bottom))] pt-[calc(136px+env(safe-area-inset-top))]">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        <Logo className="w-[130px]" />
        <h1 className="mt-6 text-[29px] font-black leading-[1.14] tracking-normal text-black">
          정치는 싸움이 아니라,
          <br />
          대화니까<span className="text-vote-red">.</span>
        </h1>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, type: "spring", stiffness: 260, damping: 30 }}
        className="mt-auto space-y-4"
      >
        <Link
          href="/signup"
          className="flex h-[52px] w-full items-center justify-center rounded-full bg-[linear-gradient(100deg,#244868_0%,#e05261_100%)] px-5 text-[16px] font-semibold text-white shadow-soft transition active:scale-[0.98]"
        >
          <span className="font-black">전화번호로</span>
          <span className="ml-1 font-medium text-white/88">바로 시작하기</span>
        </Link>

        <Link
          href="/login"
          className="block text-center text-[14px] font-medium text-slate-400 transition active:scale-[0.98]"
        >
          이미 계정이 있나요? 로그인하기
        </Link>

        <p className="text-center text-[12px] font-medium text-slate-300">VoteIt은 로그인 후 이용할 수 있어요.</p>
      </motion.section>
    </main>
  );
}
