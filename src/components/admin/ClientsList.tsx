import { useRouter, useSearchParams } from "next/navigation";
import Client360 from "./Client360/Client360";
import ClientDirectory from "./clients/ClientDirectory";

export default function ClientsList() {
  const router = useRouter();
  const selectedClientId = useSearchParams().get("clientId");

  if (!selectedClientId) return <ClientDirectory />;

  return (
    <Client360
      key={selectedClientId}
      clientId={selectedClientId}
      onBack={() => router.push("/dashboard?tab=klijenti")}
    />
  );
}
