/**
 * Auth token helpers, kept separate from the jQuery based helpers in this
 * folder so non-page contexts (backend) don't bundle jQuery.
 */
export const getAuthToken = () => {
  return (
    document.querySelector<HTMLMetaElement>('meta[name="auth-token"]')
      ?.content || null
  );
};

export const setAuthToken = (token: string | null) => {
  let authToken = document.querySelector<HTMLMetaElement>(
    'meta[name="auth-token"]'
  );
  if (!authToken) {
    authToken = document.createElement("meta");
    authToken.name = "auth-token";
    document.head.appendChild(authToken);
  }
  authToken.content = token || "";
};
