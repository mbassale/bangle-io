import { BaseError } from '@bangle.io/utils';

export class WorkspaceError extends BaseError {}

export const WORKSPACE_NOT_FOUND_ERROR = 'WORKSPACE_NOT_FOUND_ERROR';
export const WORKSPACE_DELETED_MODIFY_ERROR = 'WORKSPACE_DELETED_MODIFY_ERROR';
export const WORKSPACE_PROVIDER_NOT_FOUND_ERROR =
  'WORKSPACE_PROVIDER_NOT_FOUND_ERROR';
export const NOTE_FORMAT_PROVIDER_NOT_FOUND_ERROR =
  'NOTE_FORMAT_PROVIDER_NOT_FOUND_ERROR';
export const WORKSPACE_ALREADY_EXISTS_ERROR = 'WORKSPACE_ALREADY_EXISTS_ERROR';
export const WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR =
  'WORKSPACE_STORAGE_PROVIDER_DOES_NOT_EXIST_ERROR';
