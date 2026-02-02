import { useState } from "react";
import { useRegistration } from "../hooks/useRegistration";

export function RegistrationForm() {
  const { register, loading, error } = useRegistration();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(username, email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div>{error}</div>}
      <div>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            name="username"
          />
        </label>
      </div>
      <div>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            name="email"
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
            name="password"
          />
        </label>
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}
