"use client";

// Marco compartido por todas las pantallas del vehículo: barra inferior
// contextual, los asistentes que se abren desde el [+] y el contexto que
// permite abrirlos desde cualquier punto de dentro.
//
// Vive en el layout de /coches/[id] para que la barra no se desmonte al
// cambiar de pestaña — de otro modo parpadearía en cada navegación— y para
// que el asistente que estés rellenando no dependa de la pantalla que haya
// debajo.

import { createContext, useContext, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppBottomNavigation, AppToast } from "@/components/ui";
import { useToast } from "@/components/ui/AppToast";
import { AppScreenFrame } from "@/components/ui/AppLayout";
import ExpenseWizard from "@/components/wizards/ExpenseWizard";
import DocumentWizard, { type DocumentUpload } from "@/components/wizards/DocumentWizard";

interface CarShellContextValue {
  /** Abre el asistente de gasto. Con `categoryId` salta directo al
   *  formulario de esa categoría (accesos rápidos del resumen). */
  openExpenseWizard: (categoryId?: string) => void;
  /** Abre el asistente de documento desde cualquier pantalla del vehículo. */
  openDocumentWizard: () => void;
}

const CarShellContext = createContext<CarShellContextValue | null>(null);

/** Disponible en cualquier componente cliente bajo /coches/[id]. */
export function useCarShell(): CarShellContextValue {
  const ctx = useContext(CarShellContext);
  if (!ctx) {
    throw new Error("useCarShell debe usarse dentro de <CarShell>");
  }
  return ctx;
}

export interface CarShellProps {
  carId: number;
  currentKm: number;
  stations: string[];
  children: React.ReactNode;
}

export default function CarShell({ carId, currentKm, stations, children }: CarShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast, show, dismiss } = useToast();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [presetCategory, setPresetCategory] = useState<string | undefined>();
  const [docOpen, setDocOpen] = useState(false);
  // Cambia en cada apertura para remontar el asistente: así empieza limpio
  // (paso y campos) sin necesidad de un efecto que resetee su estado.
  const [wizardKey, setWizardKey] = useState(0);
  const [docKey, setDocKey] = useState(0);
  // Desde qué pantalla se abrió la hoja. Cambiar de pantalla la cierra: es
  // lo que espera cualquiera al tocar un enlace desde dentro —el
  // "Recordatorio" lleva al asistente de mantenimiento— y evita que la hoja
  // se quede flotando sobre la pantalla nueva. Se compara al renderizar en
  // vez de cerrarla desde un efecto, que provoca un render en cascada.
  const [openedFrom, setOpenedFrom] = useState(pathname);
  const sameScreen = openedFrom === pathname;

  function openExpenseWizard(categoryId?: string) {
    setPresetCategory(categoryId);
    setWizardKey((k) => k + 1);
    setOpenedFrom(pathname);
    setWizardOpen(true);
  }

  function openDocumentWizard() {
    setDocKey((k) => k + 1);
    setOpenedFrom(pathname);
    setDocOpen(true);
  }

  async function uploadDocument(opts: DocumentUpload) {
    const fd = new FormData();
    fd.append("car_id", String(carId));
    fd.append("file", opts.file, opts.filename);
    if (opts.documentType) fd.append("document_type", opts.documentType);
    if (opts.validUntil) fd.append("valid_until", opts.validUntil);
    if (opts.reminderMonths != null) fd.append("reminder_months", String(opts.reminderMonths));

    const res = await fetch("/api/attachments", { method: "POST", body: fd });
    if (!res.ok) throw new Error("No se pudo subir el documento");
    show("Documento subido");
    router.refresh();
  }

  return (
    <CarShellContext.Provider value={{ openExpenseWizard, openDocumentWizard }}>
      <AppScreenFrame>
        {children}
        {/* El [+] abre el asistente directamente, por su primer paso: la
            rejilla "¿Qué quieres añadir?". Elegir ahí es el mismo gesto que
            elegir en un menú desplegable, pero sin sacar una lista encima de
            la pantalla antes de empezar el formulario. */}
        <AppBottomNavigation carId={carId} onAdd={() => openExpenseWizard()} />
      </AppScreenFrame>

      {/* Las keys llevan prefijo: los dos asistentes son hermanos y sus
          contadores empiezan en 0, así que sin él React vería dos hijos con
          la misma key y trataría uno como el otro. */}
      <ExpenseWizard
        key={`gasto-${wizardKey}`}
        open={wizardOpen && sameScreen}
        onClose={() => setWizardOpen(false)}
        carId={carId}
        currentKm={currentKm}
        stations={stations}
        initialCategoryId={presetCategory}
        reminderHref={`/coches/${carId}/mantenimiento/nuevo`}
      />

      <DocumentWizard
        key={`documento-${docKey}`}
        open={docOpen && sameScreen}
        onClose={() => setDocOpen(false)}
        presetType={null}
        onUpload={uploadDocument}
      />

      <AppToast toast={toast} onDismiss={dismiss} />
    </CarShellContext.Provider>
  );
}
