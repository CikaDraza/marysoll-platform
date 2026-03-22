import "mongoose";

declare module "mongoose" {
  interface LeanDocument<T> extends Document<T> {
    _id: string;
  }
}
