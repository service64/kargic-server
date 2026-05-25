export type SellerVerificationStatus = 'Reviewing' | 'Verified' | 'Flagged';

export type SellerVerificationDocStage = 'complete' | 'warning' | 'pending';

/** Row for `GET /exporter-profile/admin/seller-verification`. */
export type AdminSellerVerificationRowDto = {
  userId: string;
  companyName: string;
  slug: string;
  displayId: string;
  submittedAt: string;
  verifyCompanyPercent: number;
  docs: [
    SellerVerificationDocStage,
    SellerVerificationDocStage,
    SellerVerificationDocStage,
    SellerVerificationDocStage,
    SellerVerificationDocStage,
  ];
  status: SellerVerificationStatus;
  companyType: string;
  logo: string | null;
};
