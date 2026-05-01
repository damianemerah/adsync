import { connection } from "next/server";
import { Suspense } from "react";
import { GeneralSettingsForm } from "./general-settings-form";
import GeneralSettingsLoading from "./loading";

export default async function GeneralSettingsPage() {
  await connection();
  
  return (
    <Suspense fallback={<GeneralSettingsLoading />}>
      <GeneralSettingsForm />
    </Suspense>
  );
}
