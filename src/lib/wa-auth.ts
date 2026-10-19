// Baileys auth state backed by the database (so the linked session survives
// redeploys instead of living in local files). Mirrors useMultiFileAuthState
// but reads/writes rows in the WaSession table.
import {
  initAuthCreds,
  BufferJSON,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { prisma } from "./db";

async function readKey(key: string): Promise<unknown | null> {
  const row = await prisma.waSession.findUnique({ where: { key } });
  if (!row) return null;
  return JSON.parse(row.value, BufferJSON.reviver);
}

async function writeKey(key: string, value: unknown): Promise<void> {
  const str = JSON.stringify(value, BufferJSON.replacer);
  await prisma.waSession.upsert({
    where: { key },
    create: { key, value: str },
    update: { value: str },
  });
}

async function removeKey(key: string): Promise<void> {
  await prisma.waSession.deleteMany({ where: { key } });
}

export async function loadPrismaAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const creds: AuthenticationCreds =
    ((await readKey("creds")) as AuthenticationCreds) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [id: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readKey(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
              }
              if (value) data[id] = value as SignalDataTypeMap[typeof type];
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const type in data) {
            const typed = data[type as keyof SignalDataTypeMap];
            for (const id in typed) {
              const value = typed[id];
              const key = `${type}-${id}`;
              tasks.push(value ? writeKey(key, value) : removeKey(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeKey("creds", creds),
  };
}

export async function clearAuthState(): Promise<void> {
  await prisma.waSession.deleteMany({});
}
