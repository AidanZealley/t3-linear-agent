import { t3Config } from "../config.ts";
import { AuthorizationCleanupError, LocalAuthorization } from "./auth.ts";
import { CredentialFile } from "./credentials.ts";
import { connectMcp, T3Client } from "./client.ts";

async function main() {
  const config = t3Config();
  const command = process.argv[2] ?? "inspect";
  if (command === "pair") {
    const authorization = new LocalAuthorization(config);
    const file = new CredentialFile(config.credentialFile);
    await file.checkPath();
    // Pairing is initial authorization. Existing credentials renew through handover.
    try {
      await file.read();
      throw new Error(
        "A credential already exists. The running client owns renewal.",
      );
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      )
        throw error;
    }
    const credential = await authorization.issue();
    let connection;
    try {
      connection = await connectMcp(credential);
      await connection.call("t3_project_list", {});
      await file.write(credential);
    } catch {
      await authorization.revoke(credential);
      throw new Error(
        "T3 pairing verification failed. No credential was installed.",
      );
    } finally {
      await connection?.close();
    }
    console.log("T3 credential verified and saved securely.");
    return;
  }
  const client = await T3Client.create(config);
  try {
    if (command === "inspect") {
      console.log(
        JSON.stringify(
          {
            projects: await client.projects(),
            capabilities: await client.capabilities(),
          },
          null,
          2,
        ),
      );
    } else throw new Error("Use pair or inspect.");
  } finally {
    await client.close();
  }
}
main().catch((error: unknown) => {
  console.error(
    error instanceof AuthorizationCleanupError
      ? error.message
      : "T3 command failed. Check local configuration, authorization and handover state.",
  );
  process.exitCode = 1;
});
