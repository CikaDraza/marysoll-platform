// app/components/marketing/MarketingHomePage.tsx
"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AuthStatusButton } from "../auth/AuthStatusButton";
import Image from "next/image";
import { PricingCards } from "./PricingCards";
import PromoAnimation from "./PromoAnimation";
import {
  DEFAULT_MARKETING_LANDING,
  normalizeMarketingLanding,
} from "@/lib/marketing-landing-defaults";
import type { MarketingLandingStructure } from "@/types/marketing-landing";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const bubblePop: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

const typingIndicator = {
  animate: {
    opacity: [0.4, 1, 0.4],
    transition: { duration: 1.5, repeat: Infinity },
  },
};

// ── Video preload overlay (brand intro pre autoplay) ─────────────────────────
// Ukupno trajanje sekvence pre nego što video sme da krene.
const VIDEO_INTRO_MS = 2400;
// Safety: ako `canplaythrough` nikad ne stigne, otkrij video posle ovoga.
const VIDEO_BUFFER_MAX_MS = 7000;

const overlayStagger: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.25, staggerChildren: 0.28 } },
};

const overlayItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

const overlayLogo: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

// ============================================
// CHAT SIMULATION COMPONENT
// ============================================
const chatScript = [
  {
    text: "Hej! 👋 Ja sam Marysoll. Kako se zove tvoj salon?",
    sender: "marysoll" as const,
  },
  { text: "Studio Anja 💅", sender: "user" as const },
  { text: "Divno! Studio Anja — lepo zvuči. 💜", sender: "marysoll" as const },
  { text: "A tvoj email?", sender: "marysoll" as const },
  { text: "anja@studioanja.rs", sender: "user" as const },
  { text: "Super! Sada ću ti podesiti sve...", sender: "marysoll" as const },
  { text: "✅ Tvoj salon je spreman!", sender: "marysoll" as const },
];

function FakeChatStream() {
  const [messages, setMessages] = useState<
    { id: number; text: string; sender: "marysoll" | "user"; delay: number }[]
  >([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= chatScript.length) return;

    const msg = chatScript[currentStep];
    const delay = msg.sender === "marysoll" ? 1500 : 800;

    async function simulateTyping() {
      if (msg.sender === "marysoll") {
        return setIsTyping(msg.sender === "marysoll");
      }
    }
    simulateTyping();
    const timer = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: currentStep, text: msg.text, sender: msg.sender, delay },
      ]);
      setIsTyping(false);
      setCurrentStep((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStep]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-auto border border-violet-100"
    >
      {/* Chat Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-violet-100 mb-4">
        <Image
          src="/marysoll_elegant_logo.png"
          alt="Marysoll logo"
          width={192}
          height={192}
          className="h-8 w-8 object-contain"
        />
        <div>
          <p className="font-semibold text-gray-800">Marysoll</p>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Online
          </p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="space-y-3 min-h-[350px] max-h-[400px] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              variants={bubblePop}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`flex ${msg.sender === "marysoll" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.sender === "marysoll"
                    ? "bg-violet-100 text-violet-900 rounded-tl-sm"
                    : "bg-gray-100 text-gray-800 rounded-tr-sm"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-violet-100 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
              <motion.span
                variants={typingIndicator}
                animate="animate"
                className="w-2 h-2 bg-violet-400 rounded-full"
              />
              <motion.span
                variants={typingIndicator}
                animate="animate"
                className="w-2 h-2 bg-violet-400 rounded-full"
                style={{ animationDelay: "0.2s" }}
              />
              <motion.span
                variants={typingIndicator}
                animate="animate"
                className="w-2 h-2 bg-violet-400 rounded-full"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Placeholder */}
      <div className="mt-4 pt-4 border-t border-violet-100">
        <div className="bg-gray-50 rounded-full px-4 py-2.5 text-sm text-gray-400 flex items-center justify-between">
          <span>Napiši poruku...</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center text-white"
          >
            →
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// FRIEND CHAT SIMULATION (Social Proof)
// ============================================
const conversation = [
  {
    id: 1,
    text: "Hej, idemo na kafu u 5? ☕",
    sender: "left",
    name: "Maja",
  },
  {
    id: 2,
    text: "Ne mogu, zakazala sam termin za nokte 💅",
    sender: "right",
    name: "Anja",
  },
  {
    id: 3,
    text: "Gde si zakazala? Treba i ja da odem",
    sender: "left",
    name: "Maja",
  },
  {
    id: 4,
    text: "Preko Marysoll! Super je, sama mi nađe termin koji mi odgovara",
    sender: "right",
    name: "Anja",
  },
  { id: 5, text: "Marysoll? Šta je to? 🤔", sender: "left", name: "Maja" },
  {
    id: 6,
    text: "marysoll.com — samo joj kažeš šta ti treba i ona organizuje sve",
    sender: "right",
    name: "Anja",
  },
  {
    id: 7,
    text: "OMG, baš mi treba! Zakazujem odmah",
    sender: "left",
    name: "Maja",
  },
];

function FriendsChat() {
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);

  useEffect(() => {
    conversation.forEach((_, index) => {
      setTimeout(() => {
        setVisibleMessages((prev) => [...prev, index]);
      }, index * 800);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="bg-gray-900 rounded-3xl p-6 w-full max-w-lg h-[880px] lg:h-[768px] mx-auto shadow-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-pink-400 border-2 border-gray-900" />
            <div className="w-8 h-8 rounded-full bg-purple-400 border-2 border-gray-900" />
          </div>
          <span className="text-gray-300 text-sm">Maja & Anja</span>
        </div>
        <span className="text-gray-500 text-xs">Sada</span>
      </div>

      <div className="space-y-3 min-h-[300px]">
        <AnimatePresence>
          {conversation.map(
            (msg, index) =>
              visibleMessages.includes(index) && (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: msg.sender === "left" ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`flex ${msg.sender === "left" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.sender === "left"
                        ? "bg-gray-700 text-gray-100 rounded-tl-sm"
                        : "bg-violet-500 text-white rounded-tr-sm"
                    }`}
                  >
                    <p className="text-xs opacity-70 mb-1">{msg.name}</p>
                    <p>{msg.text}</p>
                  </div>
                </motion.div>
              ),
          )}
        </AnimatePresence>
      </div>

      {/* MarySoll CTA in chat */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={visibleMessages.length >= 7 ? { opacity: 1, scale: 1 } : {}}
        className="mt-4 p-4 bg-gradient-to-r from-violet-600 to-violet-700 rounded-2xl text-center"
      >
        <p className="text-white text-sm font-medium mb-4">
          💜 Marysoll — Tvoja drugarica iz salona
        </p>
        <Link
          href="/register"
          className="w-2/3 inline-block bg-white text-violet-600 px-4 py-3 rounded-full text-sm font-bold hover:scale-105 transition"
        >
          Zakazi i ti →
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// FEATURE CARD COMPONENT
// ============================================
function FeatureCard({
  problem,
  solution,
  emoji,
  index,
}: {
  problem: string;
  solution: string;
  emoji: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

      <motion.div
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
        className="text-4xl mb-4"
      >
        {emoji}
      </motion.div>

      <p className="text-red-500 text-sm font-medium mb-2 opacity-60">
        {problem}
      </p>

      <p className="text-gray-800 font-semibold leading-relaxed">{solution}</p>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 + index * 0.1 }}
        className="mt-4 flex items-center gap-2 text-violet-600 text-sm font-medium"
      >
        <span>Rešava Marysoll</span>
        <motion.span
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          →
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export function MarketingHomePageFirst({
  initialLanding,
}: {
  initialLanding?: MarketingLandingStructure;
}) {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false); // canplaythrough (dovoljno bafera)
  const [introDone, setIntroDone] = useState(false); // brand sekvenca odsvirana
  const [replayCycle, setReplayCycle] = useState(0); // okida ponovni intro posle svakog playthrough-a
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasPlayedRef = useRef(false); // garantuje da play() ide samo jednom po ciklusu
  const landing = normalizeMarketingLanding(initialLanding);
  const def = DEFAULT_MARKETING_LANDING;
  const navLinks = landing.header.navLinks.length
    ? landing.header.navLinks
    : def.header.navLinks;
  const heroCopy = (landing.hero.subheadline || def.hero.subheadline)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Brand sekvenca: traje VIDEO_INTRO_MS na svakom ciklusu (prvo otvaranje + svaki loop).
  // Video se u međuvremenu bafera preko preload="auto".
  useEffect(() => {
    if (!videoOpen) return;
    const introTimer = setTimeout(() => setIntroDone(true), VIDEO_INTRO_MS);
    return () => clearTimeout(introTimer);
  }, [videoOpen, replayCycle]);

  // Safety za buffering — samo na prvom otvaranju (kasnije je video već učitan).
  useEffect(() => {
    if (!videoOpen) return;
    const bufferTimer = setTimeout(() => setVideoReady(true), VIDEO_BUFFER_MAX_MS);
    return () => clearTimeout(bufferTimer);
  }, [videoOpen]);

  // Kad je i sekvenca gotova i video baferovan — skloni overlay i pusti video.
  useEffect(() => {
    if (!(videoOpen && introDone && videoReady)) return;
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {
        // Ako autoplay sa zvukom nije dozvoljen, pusti mutirano kao fallback.
        v.muted = true;
        v.play().catch(() => {});
      });
    }
  }, [videoOpen, introDone, videoReady]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Floating Navigation */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollY > 50
            ? "bg-white/90 backdrop-blur-md shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="font-bold text-2xl bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2"
          >
            <Link href="/" className="flex gap-2">
              {/* Monogram icon — always visible */}
              <Image
                src={"/marysoll_elegant_logo.png"}
                alt={"Marysoll logo"}
                width={192}
                height={192}
                className="h-12 w-12 object-contain"
                preload={true}
              />
              <div className="flex flex-col">
                <span className="text-md/9 text-(--tetra-color) heading-font">
                  Marysoll
                </span>
                <small className="text-[0.5rem] text-(--tetra-color) -mt-1">
                  je napravila nešto sasvim drugačije
                </small>
              </div>
            </Link>
          </motion.div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600">
            {navLinks.map((link) => (
              <Link
                key={`${link.text}-${link.href}`}
                href={link.href}
                className="hover:text-violet-600 transition"
              >
                {link.text}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <AuthStatusButton theme="light" logoutRedirect="/" />
            </div>
            <motion.a
              href={landing.header.ctaHref || def.header.ctaHref}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden lg:block bg-violet-600 text-white px-5 py-2 rounded-full text-sm font-bold transition shadow-lg shadow-violet-200"
            >
              {landing.header.ctaText || def.header.ctaText}
            </motion.a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-white/80 backdrop-blur shadow-lg shadow-violet-200 border border-violet-100"
              aria-label="Otvori meni"
            >
              <Bars3Icon className="size-5 text-gray-700" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <Transition
        show={mobileMenuOpen}
        as={Dialog}
        onClose={setMobileMenuOpen}
        className="lg:hidden"
      >
        <TransitionChild
          as="div"
          className="fixed inset-0 z-50"
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-black/50 z-10" />
        </TransitionChild>
        <TransitionChild
          as="div"
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm"
          enter="transform transition ease-in-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition ease-in-out duration-300"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <DialogPanel className="h-full bg-white px-6 py-6 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Image
                  src={"/marysoll_elegant_logo.png"}
                  alt={"Marysoll logo"}
                  width={192}
                  height={192}
                  className="h-12 w-12 object-contain"
                  preload={true}
                />
                <span className="font-bold text-lg bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Marysoll
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 cursor-pointer"
                aria-label="Zatvori meni"
              >
                <XMarkIcon className="size-5 text-violet-600 transition" />
              </button>
            </div>
            <div className="space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={`${link.text}-${link.href}`}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-gray-700 font-medium hover:text-violet-600"
                >
                  {link.text}
                </Link>
              ))}
              <div className="pt-2">
                <AuthStatusButton theme="light" logoutRedirect="/" />
              </div>
              <Link
                href={landing.header.ctaHref || def.header.ctaHref}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-3 bg-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-200"
              >
                {landing.header.ctaText || def.header.ctaText}
              </Link>
            </div>
          </DialogPanel>
        </TransitionChild>
      </Transition>

      {/* ============================================
          HERO SECTION
      ============================================ */}
      <section className="relative min-h-screen flex items-center py-20">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute -top-40 -right-40 w-96 h-96 bg-violet-200 rounded-full blur-3xl opacity-30"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-30"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-12">
          {/* Two-column: Left text + Right chat */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pb-24">
            {/* Left column */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              <motion.div
                variants={fadeInUp}
                className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium my-6"
              >
                <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
                Nova generacija salona
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-5xl lg:text-7xl font-bold leading-tight"
              >
                {(landing.hero.headline || def.hero.headline)
                  .split("\n")
                  .map((line, index) => (
                    <span
                      key={index}
                      className={`block ${index === 0 ? "text-gray-900" : "text-violet-600"}`}
                    >
                      {line}
                    </span>
                  ))}
              </motion.h1>

              <motion.div
                variants={fadeInUp}
                className="mt-6 text-xl text-gray-600 leading-relaxed max-w-xl space-y-3"
              >
                {heroCopy.map((line, index) => (
                  <p
                    key={line}
                    className={
                      index === 0
                        ? "text-2xl lg:text-xl font-bold text-gray-600"
                        : index === 1
                          ? "text-violet-600 font-semibold"
                          : "font-semibold"
                    }
                  >
                    {line}
                  </p>
                ))}
              </motion.div>

              {/* Hero badges (CMS) — full width, wrapping */}
              {(landing.hero.badges.length
                ? landing.hero.badges
                : def.hero.badges
              ).length > 0 && (
                <motion.ul
                  variants={staggerContainer}
                  className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3"
                >
                  {(landing.hero.badges.length
                    ? landing.hero.badges
                    : def.hero.badges
                  ).map((badge) => (
                    <motion.li
                      key={badge.text}
                      variants={fadeInUp}
                      className="w-auto items-center rounded-md bg-violet-50 px-2 py-1 text-sm font-medium text-violet-600 inset-ring inset-ring-purple-700/10"
                    >
                      ✔ {badge.text}
                    </motion.li>
                  ))}
                </motion.ul>
              )}

              <motion.div
                variants={fadeInUp}
                className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <motion.a
                  href={landing.hero.ctaPrimaryHref || def.hero.ctaPrimaryHref}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group inline-flex items-center justify-center gap-2 bg-violet-600 text-white px-6 py-4 rounded-xl font-semibold text-sm hover:bg-violet-700 transition shadow-xl shadow-violet-200"
                >
                  {landing.hero.ctaPrimaryText || def.hero.ctaPrimaryText}
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </motion.a>

                <motion.button
                  onClick={() => {
                    setVideoReady(false);
                    setIntroDone(false);
                    hasPlayedRef.current = false;
                    setVideoOpen(true);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-4 rounded-xl shadow-xl shadow-violet-200 font-semibold text-sm hover:text-violet-600 transition"
                >
                  👀{" "}
                  {landing.hero.ctaSecondaryText || def.hero.ctaSecondaryText}
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Right column: Chat Demo */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative flex justify-center lg:justify-end"
            >
              <p className="sr-only">
                Animacija koja prikazuje brzo kreiranje salona na Marysoll
                platformi — Mary AI asistent pita vlasnika salona kako mu se
                zove salon i koji je email, nakon čega je salon odmah spreman za
                online zakazivanje.
              </p>
              <FakeChatStream />

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-white rounded-xl px-4 py-2 shadow-lg border border-violet-100"
              >
                <p className="text-xs font-medium text-violet-600">
                  🎉 Novi klijent!
                </p>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-xl px-4 py-2 shadow-lg border border-violet-100"
              >
                <p className="text-xs font-medium text-green-600">
                  ✓ Termin potvrđen
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* ============================================ FOR WHO SECTION ============================================ */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mt-16 py-24"
            id="for-who"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left column — text */}
              <div className="text-center lg:text-left">
                <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
                  {landing.about.headline || def.about.headline}
                </h2>
                <motion.ul
                  variants={fadeInUp}
                  className="flex flex-col items-center lg:items-start gap-4 leading-relaxed"
                >
                  {(landing.about.bullets.length
                    ? landing.about.bullets
                    : def.about.bullets
                  ).map((bullet) => (
                    <li
                      key={bullet}
                      className="w-auto items-center rounded-md bg-violet-50 px-2 py-1 text-sm font-medium text-violet-600 inset-ring inset-ring-purple-700/10"
                    >
                      ✔ {bullet}
                    </li>
                  ))}
                </motion.ul>

                <motion.p
                  variants={fadeInUp}
                  className="mt-6 text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 space-y-3"
                >
                  {(landing.about.paragraphs.length
                    ? landing.about.paragraphs
                    : def.about.paragraphs
                  ).map((paragraph, index) => (
                    <span
                      key={paragraph}
                      className={
                        index % 2 === 0
                          ? "block text-violet-600 font-semibold"
                          : "block text-gray-500"
                      }
                    >
                      {paragraph}
                    </span>
                  ))}
                </motion.p>

                {/* Social Proof */}
                <motion.div
                  variants={fadeInUp}
                  className="mt-8 flex items-center gap-4 justify-center lg:justify-start text-sm text-gray-500"
                >
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Image
                        key={i}
                        src={`/assets/thumbnails/client-${i}.png`}
                        width={32}
                        height={32}
                        alt={`Avatar ${i}`}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-300 to-purple-400 border-2 border-white"
                      />
                    ))}
                  </div>
                  <p className="font-semibold text-gray-800">
                    {landing.hero.socialProofText || def.hero.socialProofText}
                  </p>
                </motion.div>
              </div>

              {/* Right column — promo animation */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="relative flex justify-center lg:justify-end"
              >
                <p className="sr-only">
                  Animacija koja prikazuje online zakazivanje bez DM haosa —
                  klijenti sami biraju uslugu i slobodan termin direktno kroz
                  Marysoll booking sistem, bez slanja poruka u Instagram DM.
                </p>
                <PromoAnimation />

                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -right-4 bg-white rounded-xl px-4 py-2 shadow-lg border border-violet-100"
                >
                  <p className="text-xs font-medium text-violet-600">
                    🎉 Online zakazivanje bez DM haosa!
                  </p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  className="absolute -bottom-4 -left-4 bg-white rounded-xl px-4 py-2 shadow-lg border border-violet-100"
                >
                  <p className="text-xs font-medium text-green-600">
                    ✓ Rast tvog beauty biznisa bez komplikacija
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          HOW it WORKS SECTION
      ============================================ */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {landing.howItWorks.headline || def.howItWorks.headline}
            </h2>
          </motion.div>

          <div className="mt-12 grid md:grid-cols-2 gap-6 text-left">
            {(landing.howItWorks.items.length
              ? landing.howItWorks.items
              : def.howItWorks.items
            ).map((item, index) => {
              const baseDelay = index * 0.18;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: baseDelay }}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
                >
                  {/* PRE */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: baseDelay + 0.1, duration: 0.3 }}
                    className="flex items-center gap-4"
                  >
                    <span className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-sm font-bold">
                      ✕
                    </span>
                    <span className="text-base text-gray-600 font-medium">
                      {item.oldTitle}
                    </span>
                  </motion.div>

                  <div className="border-t border-gray-200 my-4" />

                  {/* POSLE */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: baseDelay + 0.42, duration: 0.35 }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex-shrink-0 w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold">
                        ✓
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {item.newTitle}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-3 ml-[52px] text-sm text-gray-500 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          FEATURES SECTION
      ============================================ */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {landing.features.headline || def.features.headline}
            </h2>
            <p className="text-gray-500">
              Sve što ti je smetalo — Marysoll pretvara u prednost
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {(landing.features.cards.length
              ? landing.features.cards
              : def.features.cards
            ).map((card, i) => (
              <FeatureCard
                key={i}
                problem={card.problem}
                solution={card.solution}
                emoji={card.icon}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          PRICING SECTION
      ============================================ */}
      <section id="pricing" className="py-24 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              {landing.pricing.headline || def.pricing.headline}
            </h2>
            <p className="text-gray-500">
              {landing.pricing.paragraph || def.pricing.paragraph}
            </p>
            <h3 className="mt-8 text-2xl font-bold text-gray-900">
              {landing.pricing.plansTitle || def.pricing.plansTitle}
            </h3>
            <p className="mt-3 text-gray-500 max-w-3xl mx-auto">
              {landing.pricing.plansDescription || def.pricing.plansDescription}
            </p>
          </motion.div>

          <PricingCards plans={landing.pricing.plans} />
        </div>
      </section>

      {/* ============================================
          FRIENDS CHAT SECTION (Social Proof)
      ============================================ */}
      <section className="relative min-h-[1000px] py-24 bg-(--color-brand-900)">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Large circle top-right */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
          {/* Small circle bottom-left */}
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-purple-500/20 blur-2xl" />
          {/* Grid dots */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-white mb-6"
            >
              &quot;Zakazala sam preko MarySoll&quot; 💅
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-violet-200 text-lg mb-8"
            >
              Kada devojke preporučuju Marysoll, to nije reklama — to je
              prijateljski savet. Marysoll postaje deo razgovora u kafićima, na
              kafi, u salonima.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-4"
            >
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-white text-sm">
                💬 &quot;Pitaj Marysoll&quot;
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-white text-sm">
                📱 &quot;Zakazi preko Marysoll&quot;
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-white text-sm">
                💜 &quot;Marysoll zna kako&quot;
              </div>
            </motion.div>
          </div>

          <FriendsChat />
        </div>
      </section>

      {/* Video modal */}
      <AnimatePresence>
        {videoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setVideoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                ref={videoRef}
                src="/assets/video/marysoll-salon-platform.mp4"
                playsInline
                preload="auto"
                onCanPlayThrough={() => setVideoReady(true)}
                onEnded={() => {
                  // Kraj videa → ponovo prikaži overlay i restartuj ceo ciklus.
                  hasPlayedRef.current = false;
                  setIntroDone(false);
                  setReplayCycle((c) => c + 1);
                }}
                className="w-full h-auto rounded-2xl shadow-2xl"
              />

              {/* Preload overlay — brand intro (krugovi + sekvencijalni logo/tekst) */}
              <AnimatePresence>
                {!(introDone && videoReady) && (
                  <motion.div
                    key="video-overlay"
                    aria-hidden="true"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl bg-(--color-brand-900)"
                    style={{ pointerEvents: "none" }}
                  >
                    {/* Koncentrični krugovi (manji na mobilnom) */}
                    {[
                      "h-[110px] w-[110px] sm:h-[180px] sm:w-[180px]",
                      "h-[170px] w-[170px] sm:h-[280px] sm:w-[280px]",
                      "h-[230px] w-[230px] sm:h-[380px] sm:w-[380px]",
                    ].map((sizeCls, i) => (
                      <motion.div
                        key={i}
                        className={`absolute rounded-full border border-violet-400/25 ${sizeCls}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: [0.5, 0.18, 0.5] }}
                        transition={{
                          scale: {
                            duration: 1,
                            delay: 0.2 + i * 0.15,
                            ease: "easeOut",
                          },
                          opacity: {
                            duration: 2.4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          },
                        }}
                      />
                    ))}

                    {/* Brand sadržaj — sekvencijalno (kompaktnije na mobilnom) */}
                    <motion.div
                      className="relative z-10 flex flex-col items-center gap-2 px-4 sm:gap-4"
                      variants={overlayStagger}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div variants={overlayLogo}>
                        <Image
                          src="/marysoll_elegant_logo.png"
                          alt="Marysoll logo"
                          width={80}
                          height={80}
                          className="rounded-xl h-10 w-10 sm:rounded-2xl sm:h-20 sm:w-20"
                        />
                      </motion.div>
                      <motion.div
                        variants={overlayItem}
                        className="text-white text-lg sm:text-3xl font-extrabold tracking-tight"
                      >
                        Marysoll
                      </motion.div>
                      <motion.div
                        variants={overlayItem}
                        className="text-center text-[10px] sm:text-[12px] leading-relaxed max-w-[180px] sm:max-w-[220px]"
                        style={{ color: "#c4b5fd" }}
                      >
                        Beauty business operating system
                        <br />
                        za moderne salone
                      </motion.div>
                      <motion.div
                        variants={overlayItem}
                        className="px-4 py-1.5 sm:px-7 sm:py-2.5 rounded-full text-[10px] sm:text-[12px] font-bold text-white"
                        style={{
                          background: "linear-gradient(90deg,#7c3aed,#a855f7)",
                        }}
                      >
                        marysoll.com
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setVideoOpen(false)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white/90 hover:bg-white text-gray-800 rounded-full text-sm font-bold flex items-center justify-center shadow-lg transition"
                aria-label="Zatvori"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
