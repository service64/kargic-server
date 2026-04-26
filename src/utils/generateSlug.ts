export const generateSlug = (name: string, option: string) => {
  const base = `${name}-${option}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base}-${Date.now()}`;
};
