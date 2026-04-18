import Image from "next/image";

const IMAGES = [
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1772025932/salon/dd8p6j5stlaynb5p83qc.jpg",
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1771732589/salon/natipzrwnxngxf54lcxb.jpg",
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1772025932/salon/dd8p6j5stlaynb5p83qc.jpg",
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1771732589/salon/natipzrwnxngxf54lcxb.jpg",
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1772025932/salon/dd8p6j5stlaynb5p83qc.jpg",
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1771732589/salon/natipzrwnxngxf54lcxb.jpg",
];

export function Theme3GallerySoft() {
  return (
    <section className="bg-[#F3EFEA] py-24">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {IMAGES.map((img, i) => (
          <Image
            width={500}
            height={400}
            alt={`Gallery image ${i + 1}`}
            key={i}
            src={img}
            className="rounded-2xl object-cover w-full h-56"
          />
        ))}
      </div>
    </section>
  );
}
