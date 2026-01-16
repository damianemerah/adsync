// lib/constants/locations-ng.ts
export const NIGERIAN_LOCATIONS = [
  { name: "Lagos State", key: "2574", type: "region", country: "NG" },
  {
    name: "Abuja Federal Capital Territory",
    key: "2566",
    type: "region",
    country: "NG",
  },
  { name: "Rivers State", key: "2592", type: "region", country: "NG" },
  { name: "Kano State", key: "2571", type: "region", country: "NG" },
  { name: "Oyo State", key: "2588", type: "region", country: "NG" },
  // ... add the rest of the 36 states
  { name: "Lagos (City)", key: "112233", type: "city", country: "NG" }, // Example ID
];

export function findLocation(query: string) {
  return NIGERIAN_LOCATIONS.filter((loc) =>
    loc.name.toLowerCase().includes(query.toLowerCase())
  );
}
