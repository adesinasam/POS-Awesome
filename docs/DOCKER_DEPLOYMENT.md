# Docker Deployment

POS Awesome is a Frappe app and should be baked into the same custom Frappe
image that contains ERPNext. The app-level Docker contract is:

- Frappe branch: `version-16` for the current RetailMind bench deployment,
  or `version-15` for ERPNext 15 deployments
- Required app: `erpnext`
- POS Awesome app: `posawesome`
- Frontend assets must be built with `bench build --app posawesome`
- Existing sites must run `bench --site <site> install-app posawesome` once, then
  `bench --site <site> migrate`

## Frappe Docker Custom Image

Use `docker/apps.json` as the default app list for the Frappe Docker custom
image build. It targets ERPNext/Frappe 16 to match the current RetailMind bench.
For ERPNext/Frappe 15 deployments, use `docker/apps.version-15.json` instead.
Both lists include ERPNext first and POS Awesome second so dependency loading
matches `posawesome/hooks.py`.

From a `frappe_docker` checkout:

```bash
export APPS_JSON=/path/to/POS-Awesome-V15/docker/apps.json
export FRAPPE_BRANCH=version-16
export IMAGE_TAG=posawesome:version-16
export APPS_JSON_BASE64="$(base64 "$APPS_JSON" | tr -d '\n')"

docker build \
  --build-arg FRAPPE_PATH=https://github.com/frappe/frappe \
  --build-arg FRAPPE_BRANCH="$FRAPPE_BRANCH" \
  --build-arg APPS_JSON_BASE64="$APPS_JSON_BASE64" \
  --tag "$IMAGE_TAG" \
  -f images/custom/Containerfile .
```

For a production release, pin the POS Awesome entry in `docker/apps.json` to the
exact release tag instead of a moving branch before building the image.

For ERPNext/Frappe 15:

```bash
export APPS_JSON=/path/to/POS-Awesome-V15/docker/apps.version-15.json
export FRAPPE_BRANCH=version-15
export IMAGE_TAG=posawesome:version-15
```

## Site Install

After deploying the image and creating a site:

```bash
bench --site <site-name> install-app erpnext
bench --site <site-name> install-app posawesome
bench --site <site-name> migrate
bench build --app posawesome
bench --site <site-name> clear-cache
```

For an existing site that already has ERPNext installed:

```bash
bench --site <site-name> install-app posawesome
bench --site <site-name> migrate
bench build --app posawesome
bench --site <site-name> clear-cache
```

## Verification

Before tagging a Docker image as release-ready:

```bash
yarn build
yarn verify:build
bench build --app posawesome
bench --site <site-name> list-apps
```

`bench --site <site-name> list-apps` must include `erpnext` and `posawesome`.
The POS route should load `/app/posapp` without stale chunk errors after a hard
refresh.

## Runtime Notes

- Do not install POS Awesome as a separate sidecar container. It must be present
  inside the Frappe backend image so hooks, fixtures, patches, Python modules,
  and static assets are available to all web, worker, scheduler, and websocket
  containers.
- Keep the same image tag across web, worker, scheduler, and websocket services.
- If a site was served by an older POS Awesome bundle, clear browser storage or
  use the in-app update prompt after deployment so the service worker activates
  the new asset manifest.
