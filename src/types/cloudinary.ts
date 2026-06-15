export interface CloudinaryImage {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  created_at: string;
  bytes: number;
  original_filename: string;
}

export interface CloudinaryListResponse {
  images: CloudinaryImage[];
}

// Video resursi dele isti oblik metapodataka kao slike.
export type CloudinaryVideo = CloudinaryImage;

export interface CloudinaryVideoListResponse {
  videos: CloudinaryVideo[];
}
