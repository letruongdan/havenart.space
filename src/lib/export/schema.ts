import Ajv from 'ajv';
import type { JournalEntry, DraftEntry } from '../db/schema';

export const BACKUP_APP_ID = 'haven-art' as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;
export const BACKUP_VERSION = 1 as const;

export interface BackupMetadata {
  totalEntries: number;
  activeEntries?: number;
  deletedEntries?: number;
  encryptedEntries?: number;
  [key: string]: unknown;
}

export interface BackupPayload {
  app: typeof BACKUP_APP_ID;
  version: number | string;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string | number;
  entries: JournalEntry[];
  drafts?: DraftEntry[];
  metadata?: BackupMetadata;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: BackupPayload;
}

export const BACKUP_JSON_SCHEMA = {
  type: 'object',
  required: ['app', 'version', 'schemaVersion', 'exportedAt', 'entries'],
  properties: {
    app: {
      type: 'string',
      const: BACKUP_APP_ID,
    },
    version: {
      anyOf: [
        { type: 'number' },
        { type: 'string', minLength: 1 },
      ],
    },
    schemaVersion: {
      type: 'number',
      const: BACKUP_SCHEMA_VERSION,
    },
    exportedAt: {
      anyOf: [
        { type: 'string', minLength: 1 },
        { type: 'number' },
      ],
    },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'body', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string' },
          body: { type: 'string' },
          mood: { type: 'string' },
          createdAt: { type: 'number' },
          updatedAt: { type: 'number' },
          deletedAt: {
            anyOf: [
              { type: 'number' },
              { type: 'null' },
            ],
          },
        },
        additionalProperties: true,
      },
    },
    drafts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'body', 'updatedAt'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          mood: { type: 'string' },
          updatedAt: { type: 'number' },
        },
        additionalProperties: true,
      },
    },
    metadata: {
      type: 'object',
      properties: {
        totalEntries: { type: 'number' },
        activeEntries: { type: 'number' },
        deletedEntries: { type: 'number' },
        encryptedEntries: { type: 'number' },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

// Initialize Ajv with robust ESM/CJS compatibility
const AjvClass = (Ajv as unknown as { default?: typeof Ajv }).default || Ajv;
const ajv = new AjvClass({ allErrors: true });
const compiledSchemaValidator = ajv.compile(BACKUP_JSON_SCHEMA);

/**
 * Validates a backup JSON string or payload object against the strict versioned Haven Art schema.
 * Returns valid status, error messages, and parsed BackupPayload if valid.
 */
export function validateImportPayload(input: unknown): ValidationResult {
  let parsed: unknown = input;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (e: any) {
      return {
        valid: false,
        errors: [`JSON parse error: ${e?.message || 'Invalid JSON syntax'}`],
      };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      errors: ['Payload must be a non-null JSON object'],
    };
  }

  const isValid = compiledSchemaValidator(parsed);

  if (!isValid) {
    const errors = compiledSchemaValidator.errors
      ? compiledSchemaValidator.errors.map((err) => {
          const path = err.instancePath ? `${err.instancePath}: ` : '';
          const message = err.message || 'Invalid format';
          return `${path}${message}`;
        })
      : ['Schema validation failed'];

    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    errors: [],
    data: parsed as BackupPayload,
  };
}

/**
 * Convenience validator accepting a JSON string directly.
 */
export function validateBackup(jsonString: string): ValidationResult {
  return validateImportPayload(jsonString);
}
