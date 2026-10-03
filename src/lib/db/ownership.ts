import { getCurrentUser } from '../auth/user-client';
export function journalOwner(): string { return getCurrentUser()?.id || 'guest'; }
export function journalDatabaseName(owner: string): string {
  return owner === 'guest' ? 'haven_db' : `haven_db_user_${encodeURIComponent(owner)}`;
}
