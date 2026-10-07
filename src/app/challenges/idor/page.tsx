"use client";

import { useState } from "react";

const USERS = {
  alice: {
    id: "jyf0p1mpr8uzse8x5n5elu3e",
    name: "Alice",
  },
  bob: {
    id: "hque1xik6a5tpv09jdscwc12",
    name: "Bob",
  },
};

const CHALLENGE_ID = "mdnadfami67fmlhmna70rvv4";

type Order = {
  id: number;
  userId: string;
  product: string;
  amount: number;
};

type FindingResult = {
  correct: boolean;
  score: number;
  severity?: string;
  findingId?: string;
  message?: string;
};

export default function IDORChallengePage() {
  const [currentUser, setCurrentUser] = useState<"alice" | "bob">("bob");
  const [orderId, setOrderId] = useState("1");

  const [result, setResult] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [severity, setSeverity] = useState("HIGH");
  const [evidence, setEvidence] = useState(
    "Bob can access Alice order #1 using GET /api/orders/1. Expected HTTP 403, actual HTTP 200."
  );

  const [findingResult, setFindingResult] =
    useState<FindingResult | null>(null);

  async function fetchOrder() {
    setLoading(true);
    setResult(null);
    setError("");
    setFindingResult(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          "X-User-ID": USERS[currentUser].id,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Request failed");
        return;
      }

      setResult(data);
    } catch {
      setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  }

  async function submitFinding() {
    setLoading(true);
    setError("");
    setFindingResult(null);

    try {
      const response = await fetch("/api/findings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: USERS[currentUser].id,
          challengeId: CHALLENGE_ID,
          severity,
          evidence,
        }),
      });

      const finding = await response.json();

      if (!response.ok) {
        setError(finding.error || "Failed to submit finding");
        return;
      }

      const resultResponse = await fetch(
        "/api/challenges/idor/result",
        {
          headers: {
            "X-User-ID": USERS[currentUser].id,
          },
        }
      );

      const score = await resultResponse.json();

      setFindingResult(score);
    } catch {
      setError("Failed to submit finding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div>
          <p className="text-sm text-gray-500">
            Security Testing Playground
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            IDOR Challenge
          </h1>

          <p className="mt-3 text-gray-400">
            Try to access an order that does not belong to the
            current user.
          </p>
        </div>

        {/* User Simulation */}
        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-xl font-semibold">
            Simulated User
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Choose which user is making the request.
          </p>

          <select
            value={currentUser}
            onChange={(e) =>
              setCurrentUser(e.target.value as "alice" | "bob")
            }
            className="mt-4 w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3"
          >
            <option value="alice">Alice</option>
            <option value="bob">Bob</option>
          </select>

          <div className="mt-3 rounded-lg bg-black p-3 text-sm">
            <span className="text-gray-500">User ID:</span>{" "}
            <span className="text-green-400">
              {USERS[currentUser].id}
            </span>
          </div>
        </div>

        {/* Order Lookup */}
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-xl font-semibold">
            Order Lookup
          </h2>

          <div className="mt-4 flex gap-3">
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2"
              placeholder="Order ID"
            />

            <button
              onClick={fetchOrder}
              disabled={loading}
              className="rounded-lg bg-white px-5 py-2 text-black font-medium"
            >
              {loading ? "Loading..." : "Get Order"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* API Response */}
        {result && (
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-lg font-semibold">
              API Response
            </h2>

            <pre className="mt-4 overflow-x-auto rounded-lg bg-black p-4 text-sm text-green-400">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Finding */}
        {result && (
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-xl font-semibold">
              Submit Finding
            </h2>

            <label className="mt-5 block text-sm text-gray-400">
              Severity
            </label>

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="mt-2 w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>

            <label className="mt-5 block text-sm text-gray-400">
              Evidence
            </label>

            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={5}
              className="mt-2 w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3"
            />

            <button
              onClick={submitFinding}
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-white px-5 py-3 text-black font-semibold"
            >
              {loading ? "Submitting..." : "Submit Finding"}
            </button>
          </div>
        )}

        {/* Result */}
        {findingResult && (
          <div
            className={`mt-6 rounded-xl border p-6 ${
              findingResult.correct
                ? "border-green-900 bg-green-950/30"
                : "border-red-900 bg-red-950/30"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                findingResult.correct
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {findingResult.correct
                ? "✓ CORRECT FINDING"
                : "✗ INCORRECT FINDING"}
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {findingResult.correct
                ? "IDOR Vulnerability Found"
                : "Finding Not Valid"}
            </h2>

            <div className="mt-6">
              <p className="text-sm text-gray-400">
                Score
              </p>

              <p className="text-4xl font-bold">
                {findingResult.score}
                <span className="ml-2 text-lg text-gray-500">
                  points
                </span>
              </p>
            </div>

            {findingResult.severity && (
              <div className="mt-4">
                <p className="text-sm text-gray-400">
                  Severity
                </p>

                <p className="font-semibold">
                  {findingResult.severity}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Objective */}
        <div className="mt-8 rounded-xl border border-yellow-900 bg-yellow-950/30 p-6">
          <h2 className="font-semibold text-yellow-400">
            🎯 Objective
          </h2>

          <p className="mt-2 text-gray-300">
            Find a way to access another user's order.
          </p>
        </div>
      </div>
    </main>
  );
}