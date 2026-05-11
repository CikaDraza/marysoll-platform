"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { CloudinaryImage } from "@/types/cloudinary";
import { useCloudinaryImages } from "@/hooks/useCloudinaryImages";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export function ImageSelect({ value, onChange }: Props) {
  const { token } = useAuth();
  const { data, isLoading } = useCloudinaryImages(token);

  const images = data?.images ?? [];
  const selected =
    images.find((i) => i.secure_url === value) ?? images[0] ?? null;

  if (isLoading)
    return (
      <div className="text-sm text-gray-600 animate-pulse">Loading images…</div>
    );

  if (!images.length)
    return <div className="text-sm text-gray-500">No images found</div>;

  return (
    <Listbox
      value={selected}
      onChange={(img: CloudinaryImage) => onChange(img.secure_url)}
    >
      <div className="relative">
        <ListboxButton className="grid w-full grid-cols-1 rounded-md bg-white py-2 pr-2 pl-3 text-left outline-1 outline-gray-300">
          <span className="flex items-center gap-3 pr-6">
            <div className=" relative h-20 w-32">
              <Image
                fill
                src={selected?.secure_url}
                alt={selected?.public_id || "Selected image"}
                className="h-full w-full rounded object-cover"
              />
            </div>
            <span className="truncate text-sm text-gray-600">
              {selected?.public_id}
              {" - "}
              <span className="truncate text-sm">
                {Math.floor((selected?.bytes / 1024) * 100) / 100}
                {"kb"}
              </span>
            </span>
          </span>
          <ChevronUpDownIcon className="absolute right-2 top-2.5 size-4 text-gray-500" />
        </ListboxButton>

        <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5">
          {images.map((img) => (
            <ListboxOption
              key={img.public_id}
              value={img}
              className="group cursor-pointer px-3 py-2 data-focus:bg-(--secondary-color) data-focus:text-white"
            >
              <div className="flex items-center gap-3">
                <Image
                  width={48}
                  height={48}
                  src={img.secure_url}
                  alt={img.public_id || "Image"}
                  className="size-12 rounded object-cover"
                />
                <span className="truncate text-sm">{img.public_id}</span>
                {" - "}
                <span className="truncate text-sm">
                  {Math.floor((img.bytes / 1024) * 100) / 100}
                  {"kb"}
                </span>
              </div>

              <span className="absolute right-3 top-2.5 hidden group-data-selected:block">
                <CheckIcon className="size-4" />
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
