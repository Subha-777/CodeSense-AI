// Redirects to GitHub's own authorize page. GitHub's OAuth flow is
// redirect-based (not a popup like Google's) - after the user approves
// access, GitHub sends them back to VITE_GITHUB_REDIRECT_URI with a
// temporary code, which the GithubCallback page then exchanges for login.
function GithubAuthButton() {
  const handleClick = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI;
    const scope = "read:user user:email";

    const authUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  return (
    <button type="button" className="github-btn" onClick={handleClick}>
      <span className="github-btn-icon">⚫</span> Sign in with GitHub
    </button>
  );
}

export default GithubAuthButton;