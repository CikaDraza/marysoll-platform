export interface Theme8VoucherServiceOption {
  id: string;
  name: string;
  price: number;
}

export interface Theme8VoucherRequestInput {
  purchaserName: string;
  purchaserInstagram: string;
  recipientName: string;
  serviceId: string;
}

export interface Theme8VoucherRequestResult {
  requestCode: string;
  serviceName: string;
  notificationSent: boolean;
  dmUrl: string;
  greetingName: string;
}
