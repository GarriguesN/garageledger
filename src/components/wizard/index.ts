// Kit de asistentes. Los formularios de la app importan siempre desde aquí:
//
//   import { Wizard, FormSection, SummaryStep } from "@/components/wizard";
//
// Si un formulario necesita una pieza que no está en esta lista, se añade
// aquí —no se escribe una variante suelta dentro de la pantalla.

export { default as Wizard } from "./Wizard";
export type { WizardProps, WizardSuccess } from "./Wizard";
export { default as WizardLayout } from "./WizardLayout";
export { default as WizardHeader } from "./WizardHeader";
export { default as WizardProgress } from "./WizardProgress";
export { default as WizardStep } from "./WizardStep";
export { default as WizardFooter } from "./WizardFooter";
export { default as StepNavigation } from "./StepNavigation";
export { default as FormSection } from "./FormSection";
export { default as InputCard } from "./InputCard";
export { default as ImageUploadStep } from "./ImageUploadStep";
export { default as SummaryStep } from "./SummaryStep";
export type { SummaryGroup, SummaryRow } from "./SummaryStep";
export { default as SuccessState } from "./SuccessState";
export type { WizardStepDef, WizardStepContext } from "./types";
