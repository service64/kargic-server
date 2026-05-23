/** Row for `GET /exporter-profile/admin` (paginated exporters). */
export type AdminExporterListRowDto = {
  userId: string;
  companyName: string;
  verifyCompanyPercent: number;
  logo: string | null;
};
