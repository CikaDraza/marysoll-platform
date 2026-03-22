import { AxiosError } from "axios";

export default function getApiError(err: unknown): string {
  const axiosErr = err as AxiosError<{ error?: string; message?: string }>;

  return (
    axiosErr?.response?.data?.error ||
    axiosErr?.response?.data?.message ||
    axiosErr?.message ||
    "Došlo je do greške pri prijavi"
  );
}
