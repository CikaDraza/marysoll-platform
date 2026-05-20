// app/components/marketing/MarketingHomePage.tsx
"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthStatusButton } from "../auth/AuthStatusButton";
import Image from "next/image";
import { useMarketingCms } from "@/hooks/useMarketingCms";
import { PricingCards } from "./PricingCards";
import { DEFAULT_MARKETING_LANDING } from "@/lib/marketing-landing-defaults";

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

// ============================================
// CHAT SIMULATION COMPONENT
// ============================================
const chatScript = [
  {
    text: "Hej! 👋 Ja sam Mary. Kako se zove tvoj salon?",
    sender: "mary" as const,
  },
  { text: "Studio Anja 💅", sender: "user" as const },
  { text: "Divno! Studio Anja — lepo zvuči. 💜", sender: "mary" as const },
  { text: "A tvoj email?", sender: "mary" as const },
  { text: "anja@studioanja.rs", sender: "user" as const },
  { text: "Super! Sada ću ti podesiti sve...", sender: "mary" as const },
  { text: "✅ Tvoj salon je spreman!", sender: "mary" as const },
];

function FakeChatStream() {
  const [messages, setMessages] = useState<
    { id: number; text: string; sender: "mary" | "user"; delay: number }[]
  >([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= chatScript.length) return;

    const msg = chatScript[currentStep];
    const delay = msg.sender === "mary" ? 1500 : 800;

    async function simulateTyping() {
      if (msg.sender === "mary") {
        return setIsTyping(msg.sender === "mary");
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
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
          M
        </div>
        <div>
          <p className="font-semibold text-gray-800">Mary</p>
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
              className={`flex ${msg.sender === "mary" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.sender === "mary"
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
    text: "Preko Mary! Super je, sama mi nađe termin koji mi odgovara",
    sender: "right",
    name: "Anja",
  },
  { id: 5, text: "Mary? Šta je to? 🤔", sender: "left", name: "Maja" },
  {
    id: 6,
    text: "MarySoll.com — samo joj kažeš šta ti treba i ona organizuje sve",
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
          💜 MarySoll — Tvoja drugarica iz salona
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
export function MarketingHomePageSecond() {
  const [scrollY, setScrollY] = useState(0);
  const { landing } = useMarketingCms();
  const def = DEFAULT_MARKETING_LANDING;

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm">
                M
              </div>
              <div className="flex flex-col">
                <span className="text-md/9 text-(--tetra-color) heading-font">
                  MarySoll
                </span>
                <small className="text-[0.5rem] text-(--tetra-color) -mt-1">
                  je napravila nešto sasvim drugačije
                </small>
              </div>
            </Link>
          </motion.div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="#features" className="hover:text-violet-600 transition">
              Rešenja
            </Link>
            <Link href="#mary" className="hover:text-violet-600 transition">
              Ko je Mary?
            </Link>
            <Link href="#pricing" className="hover:text-violet-600 transition">
              Cene
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <AuthStatusButton theme="light" logoutRedirect="/" />
            <motion.a
              href="/register"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:block bg-violet-600 text-white px-5 py-2 rounded-full text-sm font-bold transition shadow-lg shadow-violet-200"
            >
              Počni besplatno
            </motion.a>
          </div>
        </div>
      </motion.header>

      {/* ============================================
          HERO SECTION
      ============================================ */}
      <section className="relative min-h-screen flex items-center pt-20">
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

        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
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
              className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight"
            >
              Hej, ja sam <span className="text-violet-600">Mary</span>. 👋
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="mt-6 text-xl text-gray-600 leading-relaxed max-w-xl"
            >
              <span className="text-violet-600 font-semibold">Tvoja</span>{" "}
              najbolja zaposlena u salonu.{" "}
              <span className="text-violet-600 font-semibold">
                Sređujem ti probleme{" "}
              </span>
              oko poruka, pitanja, zakazivanja.{" "}
              <span className="font-semibold">
                Dobijaćeš više termina. Salon će biti bez haosa.
              </span>
            </motion.p>
            <motion.ul
              variants={fadeInUp}
              className="flex flex-col items-start gap-4 mt-6 leading-relaxed max-w-xl"
            >
              {(landing.hero.badges.length
                ? landing.hero.badges
                : def.hero.badges
              ).map((badge) => (
                <li
                  key={badge.text}
                  className="w-auto items-center rounded-md bg-violet-50 px-2 py-1 text-sm font-medium text-violet-600 inset-ring inset-ring-purple-700/10"
                >
                  ✔ {badge.text}
                </li>
              ))}
            </motion.ul>

            <motion.p
              variants={fadeInUp}
              className="mt-6 text-xl text-gray-600 leading-relaxed max-w-xl"
            >
              Sa Marysoll:{" "}
              <span className="text-violet-600 font-semibold">
                Počni besplatno{" "}
              </span>{" "}
              i nadograđuj kada tvoj salon poraste. <br />
              <span className="text-violet-600 font-semibold">
                Zaboravi na papirne beležnice,
              </span>
              <br />
              <span className="text-gray-500">
                izgubljene poruke i haos oko termina.
              </span>
              <br />
              <span className="text-violet-600 font-semibold">
                Mary i njen tim pomažu ti da salon radi lakše, brže i
                organizovanije.
              </span>
            </motion.p>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-gray-500 max-w-lg"
            >
              Marysoll to rešava za tebe.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.a
                href={landing.hero.ctaPrimaryHref || def.hero.ctaPrimaryHref}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group inline-flex items-center justify-center gap-2 bg-violet-600 text-white px-8 py-4 rounded-xl font-semibold text-md hover:bg-violet-700 transition shadow-xl shadow-violet-200"
              >
                {landing.hero.ctaPrimaryText || def.hero.ctaPrimaryText}
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.a>

              <motion.a
                href={
                  landing.hero.ctaSecondaryHref || def.hero.ctaSecondaryHref
                }
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-8 py-4 rounded-xl shadow-xl shadow-violet-200 font-semibold text-md hover:text-violet-600 transition"
              >
                👀 {landing.hero.ctaSecondaryText || def.hero.ctaSecondaryText}
              </motion.a>
            </motion.div>
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
          </motion.div>

          {/* Right: Chat Demo */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <FakeChatStream />

            {/* Floating badges */}
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
      </section>

      {/* ============================================
          WHO IS MARY SECTION
      ============================================ */}
      <section id="mary" className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Marysoll nije samo softver
              <br />
              <span className="text-violet-600">
                Mary = devojka koja te razume
              </span>
            </h2>
          </motion.div>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {(landing.howItWorks.items.length
              ? landing.howItWorks.items
              : def.howItWorks.items
            ).map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm"
              >
                <p className="text-gray-400 text-sm mb-2">{item.oldTitle}</p>
                <p className="text-gray-800 font-semibold text-lg">
                  {item.newTitle}
                </p>
              </motion.div>
            ))}
          </div>
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
              &quot;Zakazala sam preko Marysoll&quot; 💅
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-violet-200 text-lg mb-8"
            >
              Kada devojke preporučuju Mary, to nije reklama — to je
              prijateljski savet. Mary postaje deo razgovora u kafićima, na
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
                💬 &quot;Pitaj Mary&quot;
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-white text-sm">
                📱 &quot;Zakazi preko Mary&quot;
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-white text-sm">
                💜 &quot;Mary zna kako&quot;
              </div>
            </motion.div>
          </div>

          <FriendsChat />
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
              Marysoll rešava, ti uživaš
            </h2>
            <p className="text-gray-500">
              Sve što ti je smetalo — Mary pretvara u prednost
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
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {landing.pricing.headline || def.pricing.headline}
            </h2>
            <p className="text-gray-500">
              Počni besplatno. Nadograđuj kada rasteš.
            </p>
          </motion.div>

          <PricingCards />
        </div>
      </section>
    </div>
  );
}
