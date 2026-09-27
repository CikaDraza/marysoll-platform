import { TeamInviteAcceptForm } from "@/components/auth/TeamInviteAcceptForm";

export default async function TeamInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <TeamInviteAcceptForm token={token} />
      </section>
    </main>
  );
}
