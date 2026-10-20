export function pageMeta(title: string, description = "Formularios de neurodesarrollo para familias en NEUROPLAN.") {
  return { meta: [
    { title: `${title} — NEUROPLAN` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — NEUROPLAN` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] };
}