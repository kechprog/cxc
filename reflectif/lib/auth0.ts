import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { DbHandlers } from "@/lib/db/handlers";

export const auth0 = new Auth0Client({
  async beforeSessionSaved(session) {
    const db = DbHandlers.getInstance();
    db.ensureUser(session.user.sub);
    return session;
  },
});
