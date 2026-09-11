import { useEffect, useRef } from "react";
import axios from "axios";

// Renders Google's own "Sign in with Google" button and handles the
// whole flow: Google gives us a signed credential, we send it to our
// backend to verify + log the user in, then hand the result back via
// onSuccess/onError so the parent page decides what happens next.
function GoogleAuthButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/google`,
            { credential: response.credential }
          );
          onSuccess(res.data);
        } catch (err) {
          onError(err.response?.data?.error || "Google sign-in failed");
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
    });
  }, [onSuccess, onError]);

  return <div ref={buttonRef}></div>;
}

export default GoogleAuthButton;