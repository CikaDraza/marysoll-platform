import { api } from "@/lib/api";

function useMarkAsRead() {
  return async (testimonialId: string) => {
    await api.put(`/testimonials/mark-read/${testimonialId}`);
  };
}
export { useMarkAsRead };
