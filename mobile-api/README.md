# SANAD native mobile API bridge

This server-only Worker verifies Firebase RS256 ID tokens for `salamoon-services`
before forwarding marketplace requests to the existing private SANAD Site.
The upstream repeats its current Firebase lookup and all SQL authorization,
account-state, financial and rate-limit checks. Customer/worker/admin data
remains in the existing D1 database; this does not create a second marketplace.

The `/` and `/health` routes expose only service status. API paths require Firebase credentials;
unverified email is allowed only for `POST /api/marketplace/signup-role`, matching
the upstream contract. Native login uses the Firebase SDK directly. Cookies,
client-supplied Site headers and upstream redirects are never forwarded.

Set `UPSTREAM_ACCESS_TOKEN` only as a runtime server secret using the existing
Site's supported service credential. Do not put it in Git, Dart defines, CI
artifacts or the APK. It is sent only to the exact upstream SANAD origin.

Deployment needs a separately reachable mobile API origin. Preserve the original
Site's private audience. A new Site starts private; changing the new bridge to
public reachability requires the owner's explicit instruction. Firebase checks
continue to protect all marketplace operations after that change.

The upstream perimeter still applies its own IP limit to bridge traffic; this
supports the current personal trial but should be reviewed before wider rollout.
This bridge is not a payment provider or a new anonymous data endpoint.

Run tests: `node --test mobile-api/test/*.test.mjs`.
