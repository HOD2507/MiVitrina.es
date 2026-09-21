import { Transform } from "class-transformer";

/** Recorta espacios de los extremos antes de validar (un mensaje de solo espacios no debe pasar el MinLength). */
export const Trim = () => Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value));
