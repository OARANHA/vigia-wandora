ALTER TABLE latitude.oauth_applications
DROP CONSTRAINT IF EXISTS oauth_applications_redirect_urls_safe_url_list;
--> statement-breakpoint
ALTER TABLE latitude.oauth_applications
ADD CONSTRAINT oauth_applications_redirect_urls_safe_url_list
CHECK (
  redirect_urls IS NULL
  OR btrim(redirect_urls) = ''
  OR (
    redirect_urls ~* '^\s*[a-z][a-z0-9+.-]*:[^,[:space:]]+(\s*,\s*[a-z][a-z0-9+.-]*:[^,[:space:]]+)*\s*$'
    AND redirect_urls !~* '(^|,)\s*(javascript|data|vbscript|file)\s*:'
  )
);
