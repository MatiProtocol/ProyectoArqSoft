export type CustomerProfile = {
  id: string;
  email: string;
  name?: string;
};

export interface CustomerProfileClient {
  getUserDetail(userId: string): Promise<CustomerProfile>;
}
