import { ValidationException } from "../domain/exception.ts";

export class Validator<T> {
  private errors: string[] = [];
  private constructor(private instance: T) {}
  static of<U>(instance: U): Validator<U> {
    return new Validator(instance);
  }

  check(condition: boolean, errorMessage: string): this {
    if (!condition) this.errors.push(errorMessage);
    return this;
  }
  isNotNull(value: unknown, fieldName: string): this {
    if (value == null) this.errors.push(`${fieldName} no puede ser nulo`);
    return this;
  }
  isNotEmpty(value: string | null | undefined, fieldName: string): this {
    if (value == null || value.trim().length === 0) {
      this.errors.push(`${fieldName} no puede estar vacío`);
    }
    return this;
  }
  hasMaxLength(
    value: string | null | undefined,
    fieldName: string,
    maxLength: number,
  ): this {
    if (value != null && value.length > maxLength) {
      this.errors.push(
        `${fieldName} excede el máximo de ${maxLength} caracteres`,
      );
    }
    return this;
  }
  validate(): void {
    if (this.errors.length > 0) throw new ValidationException(this.errors);
  }
  getErrors(): string[] {
    return this.errors;
  }
}
