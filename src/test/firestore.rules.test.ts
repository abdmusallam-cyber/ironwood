import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestContext,
} from "@firebase/rules-unit-testing";
import { setDoc, getDoc, doc, collection, getDocs, query, where, limit, serverTimestamp } from "firebase/firestore";
import fs from "fs";

/**
 * FIREBASE RULES TEST UNIT
 */

let testEnv: RulesTestEnvironment;

describe("Firestore Security Rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "iron-wood-test-" + Date.now(),
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  function getUnauthenticatedContext() {
    return testEnv.unauthenticatedContext();
  }

  function getAuthenticatedContext(uid: string, email: string, email_verified = true) {
    return testEnv.authenticatedContext(uid, {
      email,
      email_verified,
    });
  }

  const adminEmail = "Abd.Musallam@gmail.com";

  test("unauthenticated users can read products", async () => {
    const db = getUnauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "products/test-product")));
  });

  test("unauthenticated users cannot write products", async () => {
    const db = getUnauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "products/test-product"), { title: "Fail" }));
  });

  test("bootstrapped admin can create product", async () => {
    const db = getAuthenticatedContext("admin-uid", adminEmail).firestore();
    await assertSucceeds(
      setDoc(doc(db, "products/p1"), {
        title: "Table",
        price: 1000,
        stock: 5,
        category: "wood",
        imageUrl: "http://example.com/img.jpg",
      })
    );
  });

  test("regular user cannot create product", async () => {
    const db = getAuthenticatedContext("user-uid", "user@example.com").firestore();
    await assertFails(
      setDoc(doc(db, "products/p1"), {
        title: "Table",
        price: 1000,
        stock: 5,
        category: "wood",
        imageUrl: "http://example.com/img.jpg",
      })
    );
  });

  test("user can create their own order", async () => {
    const uid = "user-123";
    const db = getAuthenticatedContext(uid, "user@example.com").firestore();
    await assertSucceeds(
      setDoc(doc(db, "orders/o1"), {
        userId: uid,
        items: [],
        total: 100,
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );
  });

  test("user cannot create order for others", async () => {
    const db = getAuthenticatedContext("user-A", "a@example.com").firestore();
    await assertFails(
      setDoc(doc(db, "orders/o1"), {
        userId: "user-B",
        items: [],
        total: 100,
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );
  });

  test("user cannot modify order status", async () => {
    const uid = "user-123";
    const db = getAuthenticatedContext(uid, "user@example.com").firestore();
    // Setup existing order using admin or privileged context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "orders/o1"), {
        userId: uid,
        status: "pending",
      });
    });

    await assertFails(
      setDoc(doc(db, "orders/o1"), {
        userId: uid,
        status: "delivered",
        updatedAt: serverTimestamp(),
      }, { merge: true })
    );
  });

  test("unauthenticated user can query users by username", async () => {
    const db = getUnauthenticatedContext().firestore();
    await assertSucceeds(
      getDocs(query(collection(db, "users"), where("username", "==", "alice"), limit(1)))
    );
  });

  test("authenticated user can create their own user document", async () => {
    const uid = "user-123";
    const db = getAuthenticatedContext(uid, "user@example.com").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users", uid), {
        username: "user-123",
        displayName: "User 123",
        email: "user@example.com",
      })
    );
  });

  test("authenticated user cannot create another user's document", async () => {
    const db = getAuthenticatedContext("user-A", "a@example.com").firestore();
    await assertFails(
      setDoc(doc(db, "users", "user-B"), {
        username: "user-B",
        displayName: "User B",
        email: "b@example.com",
      })
    );
  });

  test("authenticated user can read their own user document", async () => {
    const uid = "user-123";
    const db = getAuthenticatedContext(uid, "user@example.com").firestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/user-123"), {
        username: "user-123",
        displayName: "User 123",
        email: "user@example.com",
      });
    });

    await assertSucceeds(getDoc(doc(db, "users", uid)));
  });
});
