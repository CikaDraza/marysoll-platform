import Image from "next/image";

const DEFAULT_IMAGES = [
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1772025932/salon/dd8p6j5stlaynb5p83qc.jpg",
    alt: "Gallery image 1",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1771732589/salon/natipzrwnxngxf54lcxb.jpg",
    alt: "Gallery image 2",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1772025932/salon/dd8p6j5stlaynb5p83qc.jpg",
    alt: "Gallery image 3",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1771732589/salon/natipzrwnxngxf54lcxb.jpg",
    alt: "Gallery image 4",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1772025932/salon/dd8p6j5stlaynb5p83qc.jpg",
    alt: "Gallery image 5",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1771732589/salon/natipzrwnxngxf54lcxb.jpg",
    alt: "Gallery image 6",
  },
];

interface Props {
  images?: { src: string; alt?: string }[];
}

export function Theme3GallerySoft({ images }: Props) {
  const finalImages =
    images && images.length > 0 ? images : DEFAULT_IMAGES;

  return (
    <section className="bg-[#F3EFEA] py-24">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {finalImages.map((img, i) => (
          <Image
            width={500}
            height={400}
            alt={img.alt || `Gallery image ${i + 1}`}
            key={i}
            src={img.src}
            className="rounded-2xl object-cover w-full h-56"
          />
        ))}
      </div>
    </section>
  );
}
