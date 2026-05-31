export const IMPERSONATE_COOKIE = "hs-impersonate";

// Active project for the header switcher. Set by the proxy when visiting a
// /projects/[id] page; read by the layout (and Blog Studio) so the selected
// project persists across routes that have no project id in their URL.
export const ACTIVE_PROJECT_COOKIE = "hs-project";
