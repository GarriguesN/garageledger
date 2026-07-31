// Pantalla 8 del mockup: Documentos del vehículo.

import { AppHeader } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../lib/loadCar";
import { getCarDocuments } from "@/lib/db/attachments";
import DocumentsClient from "./DocumentsClient";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);
  const documents = getCarDocuments(car.id);

  return (
    <>
      <AppHeader title="Documentos" />
      <AppScreenMain hasBottomNav className="pt-2">
        <DocumentsClient carId={car.id} documents={documents} />
      </AppScreenMain>
    </>
  );
}
