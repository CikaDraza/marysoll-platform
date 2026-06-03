"use client";

/**
 * Klijentska Paddle.js inicijalizacija (overlay/hosted checkout).
 * Koristi se na /checkout stranici na koju se korisnik preusmerava
 * nakon kreiranja transakcije (vidi src/lib/paddle.ts → createPaddleTransaction).
 *
 * Singleton — initializePaddle se poziva samo jednom po učitavanju stranice.
 */

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

export function getPaddle(): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox";
    const token = isSandbox
      ? process.env.NEXT_PUBLIC_PADDLE_TEST_CLIENT_TOKEN
      : process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

    paddlePromise = initializePaddle({
      environment: isSandbox ? "sandbox" : "production",
      token: token!,
    });
  }
  return paddlePromise;
}
