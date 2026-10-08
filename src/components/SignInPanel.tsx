"use client";

import { signIn } from "next-auth/react";
import { th } from "@/copy/th";

export function SignInPanel({ failed, signedOut }: { failed: boolean; signedOut: boolean }) {
  return (
    <section className="stack">
      <p className="app-name">{th.appName}</p>
      {signedOut && (
        <div role="status" className="alert alert-info">
          <p>
            <strong>{th.signin.signedOutTitle}</strong>
          </p>
          <p>{th.signin.signedOutBody}</p>
        </div>
      )}
      {failed && (
        <div role="alert" className="alert alert-danger">
          <p>
            <strong>{th.signin.failedTitle}</strong>
          </p>
          <p>{th.signin.failedBody}</p>
        </div>
      )}
      {!signedOut && (
        <>
          <h1 className="h1">{th.signin.title}</h1>
          <p>{th.signin.body}</p>
        </>
      )}
      <button type="button" className="btn btn-primary" onClick={() => signIn("google", { callbackUrl: "/" })}>
        {th.signin.button}
      </button>
    </section>
  );
}
