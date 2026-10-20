export interface FrequentCompanyClientProvider {
  isFrequentCompanyClient(companyUserId: string): Promise<boolean>;
}
