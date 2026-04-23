import Image from "next/image";
import Link from "next/link";

interface Props {
  data: {
    logo: string;
    navigation: {
      label: string;
      href: string;
    }[];
    cta: {
      label: string;
      href: string;
    };
    social: {
      instagram: string | undefined;
      facebook: string | undefined;
      tiktok: string | undefined;
    };
  };
}

export function Theme5Header({ data }: Props) {
  return (
    <header className="bg-transparent absolute inset-0 border-b">
      <div className="max-w-7xl mx-auto flex justify-between items-center py-4 px-6">
        <div className="text-xl font-bold tracking-wide">
          {data?.logo ? (
            <Image
              width={720}
              height={720}
              alt={data?.logo}
              src={data?.logo}
              className="size-8 object-cover"
            />
          ) : (
            "MINA"
          )}
        </div>

        <nav className="hidden md:flex gap-6 text-sm uppercase">
          {data?.navigation?.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-gold">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
