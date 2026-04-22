import Image from "next/image";

export function Theme3AboutSoft() {
  return (
    <section className="bg-[#F3EFEA] py-24">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <Image
          width={600}
          height={500}
          alt="About us image"
          src="https://res.cloudinary.com/dufo1t5li/image/upload/v1770896288/salon/svgc0l829bx5e62n2xg2.jpg"
          className="rounded-3xl object-cover w-auto h-[500px]"
        />

        <div>
          <h2 className="text-4xl font-serif text-[#2B2B2B] mb-6">
            {"O nama"}
          </h2>

          <p className="text-[#6B6B6B] leading-relaxed">
            {
              "Naš salon pruža nežnu i profesionalnu negu uz pažnju prema svakom detalju."
            }
          </p>
        </div>
      </div>
    </section>
  );
}
