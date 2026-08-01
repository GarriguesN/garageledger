// Contrato de un asistente por pasos.
//
// Un asistente es una lista de pasos sobre un único objeto de valores. Cada
// paso declara qué pinta y qué exige para poder avanzar; el motor
// (Wizard.tsx) se encarga del resto: navegación, validación, foco, animación
// y guardado. Una pantalla nueva se escribe declarando pasos, nunca
// repitiendo la maquinaria.

export interface WizardStepContext<T> {
  values: T;
  /** Cambia un campo. Borra su error: corregir es señal suficiente. */
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Cambia varios campos a la vez (aplicar un preset). */
  patch: (values: Partial<T>) => void;
  /** Elige y avanza: aplica los cambios y pasa al siguiente paso sin tener
   *  que pulsar "Siguiente". Es para los pasos que solo piden elegir una
   *  casilla —el tipo de gasto, de mantenimiento o de documento—, donde
   *  pedir un segundo toque para confirmar lo ya elegido sobra. */
  pick: (values: Partial<T>) => void;
  /** Errores del paso actual, por nombre de campo. */
  errors: Record<string, string>;
  /** Salta a un paso por id. Lo usa el resumen para volver a editar. */
  goTo: (stepId: string) => void;
  /** Registra el nodo de un campo para poder enfocarlo si falla. */
  fieldRef: (name: string) => (el: HTMLElement | null) => void;
}

/** Textos que pueden depender de lo elegido: el resumen de un repostaje y
 *  el de un gasto genérico no se titulan igual, y la rama se decide dentro
 *  del propio asistente. */
export type WizardText<T> = string | ((values: T) => string);

export interface WizardStepDef<T> {
  /** Id estable: lo usan el resumen y los saltos entre pasos. */
  id: string;
  /** Título grande del paso. */
  title: WizardText<T>;
  /** Frase de apoyo bajo el título. */
  subtitle?: WizardText<T>;
  /** Etiqueta del botón primario. Por defecto "Siguiente" (y el label de
   *  guardado en el último paso). */
  nextLabel?: WizardText<T>;
  /** Errores por campo. Devolver un objeto vacío (o nada) = paso válido.
   *  Las claves con valor undefined se ignoran, para poder escribir la
   *  validación como un objeto con condiciones sin montar el diccionario a
   *  mano. */
  validate?: (values: T) => Record<string, string | undefined> | undefined;
  /** Pasos que solo existen para ciertos valores: la rama de combustible
   *  del asistente de gasto. Un paso oculto no cuenta en el progreso. */
  when?: (values: T) => boolean;
  render: (ctx: WizardStepContext<T>) => React.ReactNode;
}
