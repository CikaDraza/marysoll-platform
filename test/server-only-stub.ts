/**
 * `server-only` je Next-ov marker koji obara build ako se modul uvuče u
 * klijentski bundle. U vitest (node) okruženju paket ne postoji, pa se
 * aliasira na ovaj no-op — marker ostaje na snazi u pravom build-u, a testovi
 * mogu da uvezu server module.
 */
export {};
