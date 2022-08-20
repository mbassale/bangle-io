import type { IDBPDatabase } from 'idb';

export function makeDbRecord<V>(key: string, value: V): DbRecord<V> {
  return {
    key,
    value,
    lastModified: Date.now(),
  };
}

export interface DbRecord<V> {
  key: string; // will always be the primary key
  value: V;
  lastModified: number;
}

export class DBKeyVal<V> {
  constructor(
    public readonly dbName: string,
    private _storeName: string,
    private _openDb: () => Promise<IDBPDatabase<any>>,
  ) {}

  async delete(uid: string): Promise<void> {
    const db = await this._openDb();

    await db.delete(this._storeName, uid);
  }

  async get(uid: string): Promise<V | undefined> {
    const db = await this._openDb();

    const result = (await db.get(this._storeName, uid)) as
      | DbRecord<V>
      | undefined;

    return result?.value;
  }

  async getAll(): Promise<V[]> {
    const db = await this._openDb();

    const results = (await db.getAll(this._storeName)) as Array<DbRecord<V>>;

    return results.map((r) => {
      return r.value;
    });
  }

  async put(key: string, val: V): Promise<void> {
    const db = await this._openDb();

    const result: DbRecord<V> = makeDbRecord(key, val);

    await db.put(this._storeName, result);
  }
}