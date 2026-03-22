// src/types/block-type-map.ts

import { BaseBlock } from "./landing-block";

export type ServicePriceBlock = BaseBlock;
export type AuthBlock = BaseBlock;
export type AppointmentCalendarBlock = BaseBlock;
export type NewsletterFormBlock = BaseBlock;
export type LoginBlock = BaseBlock;
export type RegisterBlock = BaseBlock;
export type TestimonialBlock = BaseBlock;
export type WhyChooseUsBlock = BaseBlock;

export interface BlockTypeMap {
  ServicePriceBlock: ServicePriceBlock;
  AuthBlock: AuthBlock;
  AppointmentCalendarBlock: AppointmentCalendarBlock;
  NewsletterFormBlock: NewsletterFormBlock;
  LoginBlock: LoginBlock;
  RegisterBlock: RegisterBlock;
  TestimonialBlock: TestimonialBlock;
  WhyChooseUsBlock: WhyChooseUsBlock;
}
