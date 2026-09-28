import { useState, useCallback } from "react";
import { GeminiService } from "../services/gemini";

export function useGemini() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (method, ...args) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await GeminiService[method](...args);
      setData(result);
      return result;
    } catch (err) {
      const message =
        err.message || "Something went wrong. Please check your API key and try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { loading, error, data, execute, reset };
}
