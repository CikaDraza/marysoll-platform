import { api } from "@/lib/api";

function useClientMarkAsRead() {
  return async (testimonialId: string) => {
    await api.put(`/testimonials/mark-client-read/${testimonialId}`);
  };
}
export { useClientMarkAsRead };
