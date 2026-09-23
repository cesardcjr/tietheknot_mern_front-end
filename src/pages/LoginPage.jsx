import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import Swal from "sweetalert2";

const SECRET_QUESTIONS = [
  "What was the name of your first pet?",
  "What was the name of the street you grew up on?",
  "What was your childhood nickname?",
  "What was the first name of your favorite teacher?",
  "In which city were you born?",
  "What is your favorite food?",
];

export default function LoginPage() {
  const { loginUser, registerUser, resetPassword } = useApp();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    contactNumber: "",
    secretQuestion: "",
    secretAnswer: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      return Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please enter both username and password.",
        confirmButtonColor: "#226b45",
      });
    }
    try {
      setLoading(true);
      const user = await loginUser(form.username, form.password);
      await Swal.fire({
        icon: "success",
        title: `Welcome, ${user.fullName}!`,
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: err.response?.data?.message || "Invalid username or password.",
        confirmButtonColor: "#226b45",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const { username, password, fullName, contactNumber, secretQuestion, secretAnswer } = form;
    if (!username || !password || !fullName || !contactNumber || !secretQuestion || !secretAnswer) {
      return Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all fields.",
        confirmButtonColor: "#226b45",
      });
    }
    if (password.length < 6) {
      return Swal.fire({
        icon: "warning",
        title: "Weak Password",
        text: "Password must be at least 6 characters.",
        confirmButtonColor: "#226b45",
      });
    }
    try {
      setLoading(true);
      await registerUser({ username, password, fullName, contactNumber, secretQuestion, secretAnswer });

      // Show success alert and wait for user confirmation
      await Swal.fire({
        icon: "success",
        title: "Account Created Successfully!",
        html: "Your account has been created.<br/><br/><strong>Please wait for Admin's approval to gain access</strong>",
        confirmButtonColor: "#226b45",
        confirmButtonText: "OK",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      // Reset form and switch to login after confirmation
      setForm({
        username: "",
        password: "",
        fullName: "",
        contactNumber: "",
        secretQuestion: "",
        secretAnswer: "",
        newPassword: "",
      });
      setMode("login");
    } catch (err) {
      console.error("Registration failed:", err);
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: err.response?.data?.message || "Something went wrong.",
        confirmButtonColor: "#226b45",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const { username, secretQuestion, secretAnswer, newPassword } = form;
    if (!username || !secretQuestion || !secretAnswer || !newPassword) {
      return Swal.fire({ icon: "warning", title: "Missing Fields", text: "Please fill in all fields.", confirmButtonColor: "#226b45" });
    }
    if (newPassword.length < 6) {
      return Swal.fire({ icon: "warning", title: "Weak Password", text: "Your new password must be at least 6 characters.", confirmButtonColor: "#226b45" });
    }
    try {
      setLoading(true);
      const result = await resetPassword({ username, secretQuestion, secretAnswer, newPassword });
      await Swal.fire({ icon: "success", title: "Password Reset", text: result.message, confirmButtonColor: "#226b45" });
      setForm({ username: "", password: "", fullName: "", contactNumber: "", secretQuestion: "", secretAnswer: "", newPassword: "" });
      setMode("login");
    } catch (err) {
      Swal.fire({ icon: "error", title: "Password Reset Failed", text: err.response?.data?.message || "Unable to reset the password.", confirmButtonColor: "#226b45" });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (mode === "login") handleLogin();
      else if (mode === "register") handleRegister();
      else handlePasswordReset();
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-deco" />
      <div className="login-card">
        <div className="login-logo">
          <i className="fa-solid fa-rings-wedding" />
        </div>
        <h1 className="login-title">TieTheKnot PH</h1>
        <p className="login-subtitle">Your Event Planning Companion</p>

        {/* Tab switcher */}
        <div className="login-tabs">
          <button
            className={`login-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            Sign In
          </button>
          <button
            className={`login-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
          <button
            className={`login-tab ${mode === "forgot" ? "active" : ""}`}
            onClick={() => setMode("forgot")}
          >
            Reset Password
          </button>
        </div>

        {mode === "login" ? (
          <>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label htmlFor="login-username">Username</label>
              <div className="input-icon-wrap">
                <i className="fa fa-user" />
                <input
                  type="text"
                  id="login-username"
                  name="username"
                  placeholder="Enter username"
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="login-password">Password</label>
              <div className="input-icon-wrap">
                <i className="fa fa-lock" />
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <button
              className="btn-primary btn-full"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <p
              style={{
                marginTop: "1rem",
                textAlign: "center",
                fontSize: "0.85rem",
                color: "var(--text2)",
              }}
            >
              No account yet?{" "}
              <button
                onClick={() => setMode("register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Register here
              </button>
            </p>
            <button type="button" className="login-text-button" onClick={() => setMode("forgot")}>Forgot password?</button>
          </>
        ) : mode === "register" ? (
          <>
            <div className="form-group" style={{ marginBottom: "0.9rem" }}>
              <label htmlFor="register-full-name">Full Name *</label>
              <div className="input-icon-wrap">
                <i className="fa fa-id-card" />
                <input
                  type="text"
                  id="register-full-name"
                  name="fullName"
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: "0.9rem" }}>
              <label htmlFor="register-username">Username *</label>
              <div className="input-icon-wrap">
                <i className="fa fa-user" />
                <input
                  type="text"
                  id="register-username"
                  name="username"
                  placeholder="Choose a username"
                  value={form.username}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: "0.9rem" }}>
              <label htmlFor="register-password">Password *</label>
              <div className="input-icon-wrap">
                <i className="fa fa-lock" />
                <input
                  type="password"
                  id="register-password"
                  name="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="register-contact">Contact Number *</label>
              <div className="input-icon-wrap">
                <i className="fa fa-phone" />
                <input
                  type="tel"
                  id="register-contact"
                  name="contactNumber"
                  placeholder="e.g. 09171234567"
                  value={form.contactNumber}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: "0.9rem" }}>
              <label htmlFor="register-secret-question">Secret Question *</label>
              <select id="register-secret-question" name="secretQuestion" value={form.secretQuestion} onChange={handleChange} onKeyDown={handleKeyDown}>
                <option value="">Choose a question</option>
                {SECRET_QUESTIONS.map((question) => <option key={question} value={question}>{question}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="register-secret-answer">Secret Answer *</label>
              <div className="input-icon-wrap"><i className="fa fa-key" /><input type="password" id="register-secret-answer" name="secretAnswer" placeholder="Your answer" autoComplete="off" value={form.secretAnswer} onChange={handleChange} onKeyDown={handleKeyDown} /></div>
              <small className="form-help">Use an answer you can remember. It is required to reset your password.</small>
            </div>
            <button
              className="btn-primary btn-full"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
            <p
              style={{
                marginTop: "1rem",
                textAlign: "center",
                fontSize: "0.85rem",
                color: "var(--text2)",
              }}
            >
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Sign in
              </button>
            </p>
          </>
        ) : (
          <>
            <p className="login-reset-intro">Verify your account details to set a new password.</p>
            <div className="form-group" style={{ marginBottom: "0.9rem" }}>
              <label htmlFor="reset-username">Username</label>
              <div className="input-icon-wrap"><i className="fa fa-user" /><input type="text" id="reset-username" name="username" placeholder="Enter username" autoComplete="username" value={form.username} onChange={handleChange} onKeyDown={handleKeyDown} /></div>
            </div>
            <div className="form-group" style={{ marginBottom: "0.9rem" }}>
              <label htmlFor="reset-secret-question">Secret Question</label>
              <select id="reset-secret-question" name="secretQuestion" value={form.secretQuestion} onChange={handleChange} onKeyDown={handleKeyDown}><option value="">Choose your question</option>{SECRET_QUESTIONS.map((question) => <option key={question} value={question}>{question}</option>)}</select>
            </div>
            <div className="form-group" style={{ marginBottom: "0.9rem" }}>
              <label htmlFor="reset-secret-answer">Secret Answer</label>
              <div className="input-icon-wrap"><i className="fa fa-key" /><input type="password" id="reset-secret-answer" name="secretAnswer" placeholder="Your answer" autoComplete="off" value={form.secretAnswer} onChange={handleChange} onKeyDown={handleKeyDown} /></div>
            </div>
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="reset-new-password">New Password</label>
              <div className="input-icon-wrap"><i className="fa fa-lock" /><input type="password" id="reset-new-password" name="newPassword" placeholder="At least 6 characters" autoComplete="new-password" value={form.newPassword} onChange={handleChange} onKeyDown={handleKeyDown} /></div>
            </div>
            <button className="btn-primary btn-full" onClick={handlePasswordReset} disabled={loading}>{loading ? "Resetting password…" : "Reset Password"}</button>
            <p className="login-switch-copy">Remembered it? <button type="button" className="login-text-button" onClick={() => setMode("login")}>Sign in</button></p>
          </>
        )}
        <p className="login-footer">© 2025 TieTheKnot PH</p>
      </div>
    </div>
  );
}
