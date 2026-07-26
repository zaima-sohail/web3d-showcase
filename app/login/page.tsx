"use client";

import { useState } from "react";

export default function LoginPage() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    console.log(data);

    if (data.success) {
      alert("Login Successful");
      localStorage.setItem("token", data.token);
      window.location.href = "/admin";
    } else {
      alert(data.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900">

      <form
        onSubmit={login}
        className="bg-white rounded-xl p-8 w-96"
      >

        <h1 className="text-3xl font-bold text-center mb-8 text-black">
          Admin Login
        </h1>

        <input
          className="w-full border p-3 rounded mb-4 text-black"
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-6 text-black"
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="w-full bg-blue-600 text-white p-3 rounded"
        >
          Login
        </button>

      </form>

    </main>
  );
}