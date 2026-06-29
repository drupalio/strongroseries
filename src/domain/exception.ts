export class EntityNotFoundException extends Error {
  entityName: string;
  entityId: unknown;
  constructor(entityName: string, entityId: unknown) {
    super(`${entityName} no encontrado con id: ${entityId}`);
    this.name = "EntityNotFoundException";
    this.entityName = entityName;
    this.entityId = entityId;
  }
}

export class ValidationException extends Error {
  errors: string[];
  constructor(errors: string[] | string) {
    const list = Array.isArray(errors) ? errors : [errors];
    super(list.join(", "));
    this.name = "ValidationException";
    this.errors = list;
  }
}

export class DataIntegrityException extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DataIntegrityException";
    if (cause !== undefined) (this as any).cause = cause;
  }
}
