import { IsObject } from 'class-validator';

/**
 * Asignación de terceros a confirmar. Forma: { [slotExternalId]: groupLetter }.
 * Ej: { "wc-r32-03": "A", "wc-r32-06": "C", ... } (8 entradas).
 * La validación semántica (candidatos válidos, 8 grupos distintos, que hayan
 * clasificado) se hace en el service.
 */
export class ConfirmR32ThirdsDto {
  @IsObject()
  assignment!: Record<string, string>;
}
