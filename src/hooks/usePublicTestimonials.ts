import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api";
import { useCallback, useState } from "react";
import { ITestimonial } from "@/types";

export function usePublicTestimonials() {
  return useQuery<ITestimonial[]>({
    queryKey: ["public-testimonials"],
    queryFn: async () => {
      const { data } = await publicApi.get("/testimonials/public");
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minuta
    refetchOnWindowFocus: false,
  });
}

export function useTestimonialNavigation(testimonials: ITestimonial[]) {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextTestimonial = useCallback(() => {
    setActiveIndex((current) =>
      current === testimonials.length - 1 ? 0 : current + 1
    );
  }, [testimonials.length]);

  const prevTestimonial = useCallback(() => {
    setActiveIndex((current) =>
      current === 0 ? testimonials.length - 1 : current - 1
    );
  }, [testimonials.length]);

  const goToTestimonial = useCallback(
    (index: number) => {
      if (index >= 0 && index < testimonials.length) {
        setActiveIndex(index);
      }
    },
    [testimonials.length]
  );

  const activeTestimonial = testimonials[activeIndex] || null;

  return {
    activeIndex,
    activeTestimonial,
    nextTestimonial,
    prevTestimonial,
    goToTestimonial,
    totalTestimonials: testimonials.length,
  };
}
