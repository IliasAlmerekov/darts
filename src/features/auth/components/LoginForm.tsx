import { useState } from "react";
import { useLogin } from "../hooks/useLogin";

interface LoginFormProps {
  onSuccessRedirect?: string;
}

export function LoginForm({ onSuccessRedirect }: LoginFormProps) {
  const { login, loading, error } = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
    if (onSuccessRedirect) {
      // navigation is handled in the hook when backend sends redirect; this is a fallback.
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div>{error}</div>}
      <div>
        <label>
          Email
          <input
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            name="_username"
          />
        </label>
      </div>
      <div>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            name="_password"
          />
        </label>
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
