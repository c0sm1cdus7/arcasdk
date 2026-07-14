/**
 * CUIT Value Object
 * Represents a valid CUIT (Clave Única de Identificación Tributaria)
 * Immutable value object with validation
 */
export class CUIT {
  private constructor(private readonly value: number) {
    this.validate();
  }

  /**
   * Factory method to create a CUIT
   * @param value CUIT as number or string
   * @returns CUIT instance
   * @throws Error if CUIT is invalid
   */
  static create(value: number | string): CUIT {
    const numValue = typeof value === "string" ? parseInt(value, 10) : value;
    return new CUIT(numValue);
  }

  /**
   * Validates the CUIT format
   * @throws Error if CUIT is invalid
   */
  private validate(): void {
    if (!Number.isInteger(this.value)) {
      throw new Error("CUIT debe ser un número entero");
    }

    const cuitStr = this.value.toString();

    // CUIT debe tener 11 dígitos
    if (cuitStr.length !== 11) {
      throw new Error(
        `CUIT inválido: debe tener 11 dígitos, tiene ${cuitStr.length}`
      );
    }

    // Validar que no sea todo ceros
    if (this.value === 0) {
      throw new Error("CUIT inválido: no puede ser 0");
    }

    // Validar dígito verificador (mod-11). El checksum de un CUIT es determinístico:
    // si no coincide, el CUIT es inválido — no existe un caso válido que lo falle.
    if (!this.isValidChecksum(cuitStr)) {
      throw new Error(
        `CUIT inválido: dígito verificador incorrecto ("${cuitStr}")`
      );
    }
  }

  /**
   * Validates CUIT checksum (dígito verificador) using the AFIP mod-11 algorithm.
   * @param cuitStr CUIT as string
   * @returns true if checksum is valid
   */
  private isValidChecksum(cuitStr: string): boolean {
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
      sum += parseInt(cuitStr[i], 10) * multipliers[i];
    }

    const mod = sum % 11;
    // Verificador = 11 - mod, con 11 -> 0. Cuando mod === 1 el verificador sería 10,
    // que no es un dígito válido, por lo que ningún CUIT válido cae en ese caso
    // (queda correctamente rechazado al no coincidir con un único dígito 0-9).
    const checkDigit = mod === 0 ? 0 : 11 - mod;
    const lastDigit = parseInt(cuitStr[10], 10);

    return checkDigit === lastDigit;
  }

  /**
   * Gets the CUIT value as number
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Gets the CUIT value as string
   */
  toString(): string {
    return this.value.toString();
  }

  /**
   * Formats CUIT with dashes (XX-XXXXXXXX-X)
   */
  toFormattedString(): string {
    const cuitStr = this.value.toString();
    return `${cuitStr.substring(0, 2)}-${cuitStr.substring(
      2,
      10
    )}-${cuitStr.substring(10)}`;
  }

  /**
   * Compares two CUITs for equality
   * @param other Other CUIT to compare
   * @returns true if equal
   */
  equals(other: CUIT): boolean {
    return this.value === other.value;
  }

  /**
   * Creates a copy of this CUIT
   */
  clone(): CUIT {
    return new CUIT(this.value);
  }
}
