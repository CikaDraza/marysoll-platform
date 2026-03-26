// app/components/marketing/MarketingHomePage.tsx
"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthStatusButton } from "../auth/AuthStatusButton";
import Image from "next/image";

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
      <div className="space-y-3 min-h-[280px] max-h-[320px] overflow-hidden">
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
    text: "MarySoll.app — samo joj kažeš šta ti treba i ona organizuje sve",
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
      }, index * 2000);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="bg-gray-900 rounded-3xl p-6 w-full max-w-lg mx-auto shadow-2xl"
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
        animate={visibleMessages.length >= 6 ? { opacity: 1, scale: 1 } : {}}
        className="mt-4 p-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl text-center"
      >
        <p className="text-white text-sm font-medium mb-4">
          💜 MarySoll — Tvoja drugarica iz salona
        </p>
        <Link
          href="/register"
          className="w-2/3 inline-block bg-white text-violet-600 px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition"
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
// PRICING CARD COMPONENT
// ============================================
function PricingCard({
  plan,
  price,
  description,
  features,
  popular = false,
  index,
}: {
  plan: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      whileHover={{ y: -10, transition: { duration: 0.2 } }}
      className={`relative rounded-3xl p-8 ${
        popular
          ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-2xl scale-105"
          : "bg-white text-gray-800 shadow-lg border border-gray-100"
      }`}
    >
      {popular && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-pink-500 text-white px-4 py-1 rounded-full text-xs font-bold"
        >
          Najpopularniji
        </motion.div>
      )}

      <h3
        className={`text-xl font-bold mb-2 ${popular ? "text-white" : "text-violet-600"}`}
      >
        {plan}
      </h3>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold">{price}</span>
        {price !== "0€" && <span className="text-sm opacity-70">/mes</span>}
      </div>

      <p
        className={`text-sm mb-6 ${popular ? "text-violet-100" : "text-gray-500"}`}
      >
        {description}
      </p>

      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className="flex items-center gap-3 text-sm"
          >
            <span className="text-green-400">✓</span>
            <span>{feature}</span>
          </motion.li>
        ))}
      </ul>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-3 rounded-xl font-semibold transition ${
          popular
            ? "bg-white text-violet-600 hover:bg-gray-100"
            : "bg-violet-600 text-white hover:bg-violet-700"
        }`}
      >
        {price === "0€" ? "Upoznaj Mary →" : "Izaberi Mary →"}
      </motion.button>
    </motion.div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export function MarketingHomePageSecond() {
  const [scrollY, setScrollY] = useState(0);

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
              <Image
                width={136}
                height={40}
                alt="Marysoll je napravila nešto posebno"
                src={"/marysoll-tetra-logo.svg"}
                className="h-10 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="text-md/9 text-(--tetra-color) heading-font">
                  MarySoll
                </span>
                <small className="text-[0.5rem] text-(--tetra-color) -mt-1.5">
                  je napravila nešto posebno
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
              className="bg-(--tetra-color) text-white px-5 py-2 rounded-full text-sm font-semibold transition shadow-lg shadow-violet-200"
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
              className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
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
              <span className="text-violet-600 font-semibold">Mary</span> mi je
              ime,{" "}
              <span className="text-violet-600 font-semibold">
                soll - solution
              </span>
              , jer sam tu da ti pružim{" "}
              <span className="font-semibold">rešenje</span>
            </motion.p>
            <motion.ul
              variants={fadeInUp}
              className="flex flex-col items-start gap-4 mt-6 leading-relaxed max-w-xl"
            >
              <li className="w-auto items-center rounded-md bg-purple-50 px-2 py-1 text-sm font-medium text-purple-700 inset-ring inset-ring-purple-700/10">
                ✔ sistem za zakazivanje
              </li>
              <li className="w-auto items-center rounded-md bg-purple-50 px-2 py-1 text-sm font-medium text-purple-700 inset-ring inset-ring-purple-700/10">
                ✔ sistem za komunikaciju sa klijentima
              </li>
              <li className="w-auto items-center rounded-md bg-purple-50 px-2 py-1 text-sm font-medium text-purple-700 inset-ring inset-ring-purple-700/10">
                ✔ automatski podsetnici
              </li>
            </motion.ul>

            <motion.p
              variants={fadeInUp}
              className="mt-6 text-xl text-gray-600 leading-relaxed max-w-xl"
            >
              Organizujem ti{" "}
              <span className="text-violet-600 font-semibold">salon</span>,{" "}
              <span className="text-violet-600 font-semibold">
                fitnes centar
              </span>
              , <span className="text-violet-600 font-semibold">kliniku</span>,{" "}
              <span className="text-violet-600 font-semibold">spa</span>…
              <br />
              <span className="text-gray-500">
                da možeš da se baviš kreativnijim stvarima, da gledaš posao kao
                hobi.
              </span>
            </motion.p>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-gray-500 max-w-lg"
            >
              Zaboravi na haos sa terminima, papirnim beležnicama i klijentima
              koji ne dolaze. Ja to rešavam za tebe.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.a
                href="/register"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group inline-flex items-center justify-center gap-2 bg-violet-600 text-white px-8 py-4 rounded-xl font-semibold text-md hover:bg-violet-700 transition shadow-xl shadow-violet-200"
              >
                Daj mi da ti pomognem
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.a>

              <motion.a
                href="#demo"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-8 py-4 rounded-xl shadow-xl shadow-violet-200 font-semibold text-md hover:text-violet-600 transition"
              >
                👀 Vidi kako radi
              </motion.a>
            </motion.div>
            {/* Social Proof */}
            <motion.div
              variants={fadeInUp}
              className="mt-8 flex items-center gap-4 justify-center lg:justify-start text-sm text-gray-500"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-300 to-purple-400 border-2 border-white"
                  />
                ))}
              </div>
              <p>
                <span className="font-semibold text-gray-800">500+</span> salona
                već koristi Mary
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
            {[
              {
                old: "Ne samo platforma za zakazivanje",
                new: "Mary ti organizuje dan 💜",
              },
              { old: "Ne AI asistent", new: "Mary ti savetuje 💡" },
              { old: "Automatski podsetnici", new: "Mary te podseća 🔔" },
              { old: "Analitika", new: "Mary ti kaže šta radi 📊" },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm"
              >
                <p className="text-gray-400 text-sm mb-2">{item.old}</p>
                <p className="text-gray-800 font-semibold text-lg">
                  {item.new}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          FRIENDS CHAT SECTION (Social Proof)
      ============================================ */}
      <section className="py-24 bg-gradient-to-br from-violet-900 to-purple-900">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-white mb-6"
            >
              &quot;Zakazala sam preko Mary&quot; 💅
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
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Mary rešava, ti uživaš
            </h2>
            <p className="text-gray-500">
              Sve što ti je smetalo — Mary pretvara u prednost
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              problem="😒 Klijenti zaborave da dođu?"
              solution="Mary ih podseća automatski. SMS, email, WhatsApp — šta god želiš."
              emoji="🔔"
              index={0}
            />
            <FeatureCard
              problem="🤦‍♀️ Puna si zakazivanja u 3 ujutru?"
              solution="Mary prima zakazivanja 24/7. Ti samo potvrdiš ujutru."
              emoji="📅"
              index={1}
            />
            <FeatureCard
              problem="🤷‍♀️ Ne znaš ko ti je najbolji klijent?"
              solution="Mary zna sve — ko dolazi redovno, ko preporučuje, ko zaslužuje popust."
              emoji="💜"
              index={2}
            />
          </div>
        </div>
      </section>

      {/* ============================================
          PRICING SECTION
      ============================================ */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Izaberi svoju Mary
            </h2>
            <p className="text-gray-500">
              Počni besplatno. Nadograđuj kada rasteš.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 items-center">
            <PricingCard
              plan="Upoznaj Mary"
              price="0€"
              description="Mary ti pomaže sa 10 klijenata mesečno"
              features={[
                "Online zakazivanje",
                "Email podsetnici",
                "Osnovna statistika",
                "Mary podrška",
              ]}
              index={0}
            />
            <PricingCard
              plan="Mary je tu"
              price="19€"
              description="Mary radi puno radno vreme za tebe"
              features={[
                "Neograničeni klijenti",
                "SMS + WhatsApp",
                "Mary asistent",
                "Newsletter",
                "Prioritetna podrška",
              ]}
              popular={true}
              index={1}
            />
            <PricingCard
              plan="Mary + tim"
              price="49€"
              description="Mary organizuje sve. A u timu su i Klaudija i Kiki"
              features={[
                "Više lokacija",
                "Timski rad",
                "API pristup",
                "Bela oznaka",
                "Dedicated Mary",
              ]}
              index={2}
            />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-gray-500 text-sm mb-4">
              Sve cene su sa PDV-om. Bez skrivenih troškova.
            </p>
            <motion.a
              href="/register"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-10 py-4 rounded-2xl font-semibold text-lg hover:bg-violet-700 transition shadow-xl shadow-violet-200"
            >
              Počni sa Mary već danas
              <span>→</span>
            </motion.a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
