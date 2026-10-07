import { describe, expect, it, vi } from "vitest";
import { runLogin } from "./login-cookie.mjs";

type CookieJar = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: unknown }[]) => void;
};

const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-fixture",
  CHECKPOINT_PASSWORD: "pw-SECRET",
};
const ARGS = ["--email", "checkpoint.a@aaa.com", "--out", "/tmp/cookie-a.txt"];

function setup({ error = null as { message: string } | null } = {}) {
  const signIn = vi.fn();
  const createClient = vi.fn(
    (_url: string, _key: string, options: { cookies: CookieJar; isSingleton?: boolean }) => ({
      auth: {
        signInWithPassword: signIn.mockImplementation(async () => {
          if (!error) {
            options.cookies.setAll([
              { name: "sb-ref-auth-token.0", value: "chunk0-SECRET" },
              { name: "sb-ref-auth-token.1", value: "chunk1-SECRET" },
            ]);
          }
          return { error };
        }),
      },
    }),
  );
  const writeFile = vi.fn(async () => undefined);
  const out: string[] = [];
  const err: string[] = [];
  const deps = {
    env: { ...ENV },
    createClient,
    writeFile,
    stdout: (line: string) => out.push(line),
    stderr: (line: string) => err.push(line),
  };
  return { createClient, signIn, writeFile, out, err, deps };
}

describe("unit 8 login-cookie.mjs (US-012)", () => {
  it("signs in with a non-singleton browser client backed by an in-memory jar", async () => {
    const { createClient, signIn, deps } = setup();

    const code = await runLogin(ARGS, deps);

    expect(code).toBe(0);
    const [url, key, options] = createClient.mock.calls[0];
    expect(url).toBe(ENV.NEXT_PUBLIC_SUPABASE_URL);
    expect(key).toBe(ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    expect(options.isSingleton).toBe(false);
    expect(typeof options.cookies.getAll).toBe("function");
    expect(signIn).toHaveBeenCalledWith({ email: "checkpoint.a@aaa.com", password: "pw-SECRET" });
  });

  it("writes every cookie as a Cookie header to --out with mode 0o600", async () => {
    const { writeFile, deps } = setup();

    await runLogin(ARGS, deps);

    expect(writeFile).toHaveBeenCalledWith(
      "/tmp/cookie-a.txt",
      "sb-ref-auth-token.0=chunk0-SECRET; sb-ref-auth-token.1=chunk1-SECRET",
      { mode: 0o600 },
    );
  });

  it("prints only the path and cookie count, never cookie values or the password", async () => {
    const { out, err, deps } = setup();

    await runLogin(ARGS, deps);

    const printed = [...out, ...err].join("\n");
    expect(printed).toContain("/tmp/cookie-a.txt");
    expect(printed).toContain("2");
    expect(printed).not.toMatch(/SECRET/);
  });

  it.each([
    ["--email", ["--out", "/tmp/c.txt"], {}],
    ["--out", ["--email", "a@aaa.com"], {}],
    ["CHECKPOINT_PASSWORD", ARGS, { CHECKPOINT_PASSWORD: "" }],
    ["NEXT_PUBLIC_SUPABASE_URL", ARGS, { NEXT_PUBLIC_SUPABASE_URL: "" }],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", ARGS, { NEXT_PUBLIC_SUPABASE_ANON_KEY: "" }],
  ])("exits non-zero in Traditional Chinese without signing in when %s is missing", async (_name, argv, envPatch) => {
    const { createClient, writeFile, err, deps } = setup();
    deps.env = { ...deps.env, ...envPatch };

    const code = await runLogin(argv, deps);

    expect(code).not.toBe(0);
    expect(createClient).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(err.join("\n")).toMatch(/[一-鿿]/);
  });

  it("reports the Supabase error and writes nothing when sign-in fails", async () => {
    const { writeFile, err, deps } = setup({ error: { message: "Invalid login credentials" } });

    const code = await runLogin(ARGS, deps);

    expect(code).not.toBe(0);
    expect(writeFile).not.toHaveBeenCalled();
    expect(err.join("\n")).toContain("Invalid login credentials");
    expect(err.join("\n")).toMatch(/[一-鿿]/);
  });

  it("never reads the service role key", async () => {
    const { deps } = setup();
    const env = new Proxy(deps.env, {
      get(target, prop) {
        if (prop === "SUPABASE_SERVICE_ROLE_KEY") {
          throw new Error("service role key must not be read");
        }
        return target[prop as keyof typeof target];
      },
    });

    await expect(runLogin(ARGS, { ...deps, env })).resolves.toBe(0);
  });
});
