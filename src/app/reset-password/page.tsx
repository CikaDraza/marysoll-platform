import MiniLoader from "@/components/ai/MiniLoader";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { Y2KResetPasswordForm } from "@/components/themes/shared/Y2KResetPasswordForm";
import { SearchParamsReader } from "@/components/renderingError/SearchParamsReader";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { SalonProfile } from "@/models/SalonProfile";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reset password",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Resolve the landing theme of the tenant who owns this reset token.
 * The reset link is served on the platform domain (no tenant context), so we
 * map token → TenantUser.tenantId → SalonProfile.landingTheme to decide whether
 * to render the Y2K (theme-8) form.
 */
async function getTokenTheme(token?: string): Promise<string | null> {
  if (!token || token.length < 10) return null;
  try {
    await connectToDB();
    const user = (await TenantUser.findOne({ resetPasswordToken: token })
      .select("tenantId")
      .lean()) as { tenantId?: unknown } | null;
    if (!user?.tenantId) return null;
    const profile = (await SalonProfile.findOne({ tenantId: user.tenantId })
      .select("landingTheme")
      .lean()) as { landingTheme?: string } | null;
    return profile?.landingTheme ?? null;
  } catch {
    return null;
  }
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const theme = await getTokenTheme(token);

  if (theme === "theme-8") {
    return (
      <Suspense fallback={<MiniLoader text="Proveravamo link..." />}>
        <SearchParamsReader />
        <Y2KResetPasswordForm />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <Suspense fallback={<MiniLoader text="Proveravamo link..." />}>
        <SearchParamsReader />
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
