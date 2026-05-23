/** Row for `GET /importer-profile/admin` (paginated importers). */
export type AdminImporterListRowDto = {
  userId: string;
  companyName: string;
  importLicense: string;
  businessType: string;
  country: string;
};
